import { beforeEach, describe, expect, it, vi } from 'vitest';

const { holdFindMany, holdUpdate } = vi.hoisted(() => ({
  holdFindMany: vi.fn(),
  holdUpdate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    hold: {
      findMany: holdFindMany,
      update: holdUpdate,
    },
  },
}));

const { cancelPaymentIntent, refundPaymentIntent, transferToCurator } = vi.hoisted(() => ({
  cancelPaymentIntent: vi.fn(),
  refundPaymentIntent: vi.fn(),
  transferToCurator: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  cancelPaymentIntent,
  refundPaymentIntent,
  transferToCurator,
}));

const { sendArtistHoldStatusEmail, sendCuratorPayoutEmail } = vi.hoisted(() => ({
  sendArtistHoldStatusEmail: vi.fn(),
  sendCuratorPayoutEmail: vi.fn(),
}));

vi.mock('@/lib/resend', () => ({
  sendArtistHoldStatusEmail,
  sendCuratorPayoutEmail,
}));

const { runDeadlineSweep } = await import('./deadlineSweep');

const PAST = new Date(Date.now() - 60 * 60 * 1000);
const FUTURE = new Date(Date.now() + 60 * 60 * 1000);

function findManyByStatus(fixtures: Record<string, unknown[]>) {
  holdFindMany.mockImplementation(async ({ where }: { where: { status: string } }) => {
    return fixtures[where.status] ?? [];
  });
}

beforeEach(() => {
  holdFindMany.mockReset();
  holdUpdate.mockReset();
  cancelPaymentIntent.mockReset();
  refundPaymentIntent.mockReset();
  transferToCurator.mockReset();
  sendArtistHoldStatusEmail.mockReset();
  sendCuratorPayoutEmail.mockReset();
});

describe('runDeadlineSweep', () => {
  describe('transition 1: accept-window timeout', () => {
    it('cancels the authorization and refunds the hold when the curator never responds', async () => {
      findManyByStatus({
        PENDING: [
          {
            id: 'hold-1',
            stripePaymentIntentId: 'pi_123',
            campaign: { artistEmail: 'artist@example.com', magicLinkToken: 'tok' },
            curator: { displayName: 'Some Curator' },
          },
        ],
      });

      const result = await runDeadlineSweep();

      expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_123');
      expect(holdUpdate).toHaveBeenCalledWith({
        where: { id: 'hold-1' },
        data: { status: 'REFUNDED', refundedAt: expect.any(Date) },
      });
      expect(sendArtistHoldStatusEmail).toHaveBeenCalledWith(
        'artist@example.com',
        expect.stringContaining('/dashboard/tok'),
        'Some Curator',
        'refunded'
      );
      expect(result.acceptTimeouts).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('does not call Stripe when the hold never got a PaymentIntent', async () => {
      findManyByStatus({
        PENDING: [
          {
            id: 'hold-2',
            stripePaymentIntentId: null,
            campaign: { artistEmail: 'a@example.com', magicLinkToken: 'tok2' },
            curator: { displayName: 'Curator Two' },
          },
        ],
      });

      const result = await runDeadlineSweep();

      expect(cancelPaymentIntent).not.toHaveBeenCalled();
      expect(result.acceptTimeouts).toBe(1);
    });

    it('records an error and continues past one failure to the next hold', async () => {
      findManyByStatus({
        PENDING: [
          {
            id: 'hold-fail',
            stripePaymentIntentId: 'pi_fail',
            campaign: { artistEmail: 'a@example.com', magicLinkToken: 't' },
            curator: { displayName: 'X' },
          },
          {
            id: 'hold-ok',
            stripePaymentIntentId: 'pi_ok',
            campaign: { artistEmail: 'b@example.com', magicLinkToken: 't2' },
            curator: { displayName: 'Y' },
          },
        ],
      });
      cancelPaymentIntent.mockImplementation(async (id: string) => {
        if (id === 'pi_fail') throw new Error('stripe down');
      });

      const result = await runDeadlineSweep();

      expect(result.acceptTimeouts).toBe(1);
      expect(result.errors).toEqual(['accept-timeout hold hold-fail: stripe down']);
      // The second hold in the batch still gets processed despite the first one throwing.
      expect(holdUpdate).toHaveBeenCalledWith({
        where: { id: 'hold-ok' },
        data: { status: 'REFUNDED', refundedAt: expect.any(Date) },
      });
    });
  });

  describe('transition 2: post-window timeout', () => {
    it('refunds an already-captured charge when the curator accepts but never posts', async () => {
      findManyByStatus({
        ACCEPTED: [
          {
            id: 'hold-3',
            stripePaymentIntentId: 'pi_captured',
            campaign: { artistEmail: 'artist@example.com', magicLinkToken: 'tok3' },
            curator: { displayName: 'Late Curator' },
          },
        ],
      });

      const result = await runDeadlineSweep();

      expect(refundPaymentIntent).toHaveBeenCalledWith('pi_captured');
      expect(cancelPaymentIntent).not.toHaveBeenCalled();
      expect(holdUpdate).toHaveBeenCalledWith({
        where: { id: 'hold-3' },
        data: { status: 'REFUNDED', refundedAt: expect.any(Date) },
      });
      expect(result.postTimeouts).toBe(1);
    });
  });

  describe('transition 3: undisputed payout release', () => {
    it('transfers to the curator and stores the resulting transfer id on the hold', async () => {
      // Regression test: transferToCurator()'s return value was previously discarded, so
      // Hold.stripeTransferId never got persisted even though the payout succeeded.
      findManyByStatus({
        POSTED: [
          {
            id: 'hold-4',
            priceCents: 15000,
            payoutReleaseAt: PAST,
            curator: { stripeAccountId: 'acct_123', email: 'curator@example.com' },
          },
        ],
      });
      transferToCurator.mockResolvedValue({ id: 'tr_abc123' });

      const result = await runDeadlineSweep();

      expect(transferToCurator).toHaveBeenCalledWith({
        amountCents: 15000,
        destinationAccountId: 'acct_123',
        holdId: 'hold-4',
      });
      expect(holdUpdate).toHaveBeenCalledWith({
        where: { id: 'hold-4' },
        data: { status: 'PAID', paidAt: expect.any(Date), stripeTransferId: 'tr_abc123' },
      });
      expect(sendCuratorPayoutEmail).toHaveBeenCalledWith('curator@example.com', '$150.00');
      expect(result.payoutsReleased).toBe(1);
    });

    it('records an error and skips the transfer when the curator has no connected account', async () => {
      findManyByStatus({
        POSTED: [
          {
            id: 'hold-5',
            priceCents: 5000,
            payoutReleaseAt: PAST,
            curator: { stripeAccountId: null, email: 'curator@example.com' },
          },
        ],
      });

      const result = await runDeadlineSweep();

      expect(transferToCurator).not.toHaveBeenCalled();
      expect(holdUpdate).not.toHaveBeenCalled();
      expect(result.payoutsReleased).toBe(0);
      expect(result.errors).toEqual(['payout hold hold-5: curator has no connected Stripe account yet']);
    });

    it('does not release a payout whose hold window has not actually elapsed', async () => {
      // Belt-and-suspenders: even if the DB query's `lt: now` filter were ever wrong, the
      // in-process isPast() re-check should still prevent an early payout.
      findManyByStatus({
        POSTED: [
          {
            id: 'hold-6',
            priceCents: 5000,
            payoutReleaseAt: FUTURE,
            curator: { stripeAccountId: 'acct_456', email: 'c@example.com' },
          },
        ],
      });

      const result = await runDeadlineSweep();

      expect(transferToCurator).not.toHaveBeenCalled();
      expect(result.payoutsReleased).toBe(0);
    });

    it('records an error and continues when the Stripe transfer itself fails', async () => {
      findManyByStatus({
        POSTED: [
          {
            id: 'hold-7',
            priceCents: 5000,
            payoutReleaseAt: PAST,
            curator: { stripeAccountId: 'acct_789', email: 'c@example.com' },
          },
        ],
      });
      transferToCurator.mockRejectedValue(new Error('insufficient available funds'));

      const result = await runDeadlineSweep();

      expect(holdUpdate).not.toHaveBeenCalled();
      expect(result.payoutsReleased).toBe(0);
      expect(result.errors).toEqual(['payout hold hold-7: insufficient available funds']);
    });
  });

  it('runs all three transitions independently in a single sweep', async () => {
    findManyByStatus({
      PENDING: [
        {
          id: 'p1',
          stripePaymentIntentId: null,
          campaign: { artistEmail: 'a@example.com', magicLinkToken: 't' },
          curator: { displayName: 'A' },
        },
      ],
      ACCEPTED: [
        {
          id: 'a1',
          stripePaymentIntentId: 'pi_1',
          campaign: { artistEmail: 'b@example.com', magicLinkToken: 't2' },
          curator: { displayName: 'B' },
        },
      ],
      POSTED: [
        {
          id: 'pay1',
          priceCents: 1000,
          payoutReleaseAt: PAST,
          curator: { stripeAccountId: 'acct_1', email: 'c@example.com' },
        },
      ],
    });
    transferToCurator.mockResolvedValue({ id: 'tr_1' });

    const result = await runDeadlineSweep();

    expect(result).toEqual({
      acceptTimeouts: 1,
      postTimeouts: 1,
      payoutsReleased: 1,
      errors: [],
    });
  });
});
