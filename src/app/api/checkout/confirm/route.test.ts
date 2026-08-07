import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const { campaignCreate, campaignDelete, holdCreate, holdUpdate, holdDeleteMany, curatorFindMany } =
  vi.hoisted(() => ({
    campaignCreate: vi.fn(),
    campaignDelete: vi.fn(),
    holdCreate: vi.fn(),
    holdUpdate: vi.fn(),
    holdDeleteMany: vi.fn(),
    curatorFindMany: vi.fn(),
  }));

vi.mock('@/lib/db', () => ({
  prisma: {
    campaign: { create: campaignCreate, delete: campaignDelete },
    hold: { create: holdCreate, update: holdUpdate, deleteMany: holdDeleteMany },
    curator: { findMany: curatorFindMany },
  },
}));

const { verifyCheckoutDraft } = vi.hoisted(() => ({ verifyCheckoutDraft: vi.fn() }));
vi.mock('@/lib/checkoutToken', () => ({ verifyCheckoutDraft }));

const { createHoldPaymentIntent, cancelPaymentIntent } = vi.hoisted(() => ({
  createHoldPaymentIntent: vi.fn(),
  cancelPaymentIntent: vi.fn(),
}));
vi.mock('@/lib/stripe', () => ({ createHoldPaymentIntent, cancelPaymentIntent }));

const { sendMagicLinkEmail, sendCuratorNewSubmissionEmail } = vi.hoisted(() => ({
  sendMagicLinkEmail: vi.fn(),
  sendCuratorNewSubmissionEmail: vi.fn(),
}));
vi.mock('@/lib/resend', () => ({ sendMagicLinkEmail, sendCuratorNewSubmissionEmail }));

vi.mock('@/lib/magicLink', () => ({
  generateMagicLinkToken: () => 'fixed-token',
  magicLinkUrl: (token: string) => `http://localhost:3000/dashboard/${token}`,
}));

const { POST } = await import('./route');

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const draft = {
  artistEmail: 'artist@example.com',
  artistName: 'Test Artist',
  customerId: 'cus_123',
  pitches: [
    {
      listingId: 'listing-1',
      curatorId: 'curator-1',
      assetLink: 'https://drive.google.com/x',
      narrative: 'narrative one',
      context: '',
      priceCents: 10000,
      platformFeeCents: 2000,
      totalChargeCents: 12000,
    },
    {
      listingId: 'listing-2',
      curatorId: 'curator-2',
      assetLink: 'https://drive.google.com/y',
      narrative: 'narrative two',
      context: '',
      priceCents: 5000,
      platformFeeCents: 1000,
      totalChargeCents: 6000,
    },
  ],
};

beforeEach(() => {
  campaignCreate.mockReset();
  campaignDelete.mockReset();
  holdCreate.mockReset();
  holdUpdate.mockReset();
  holdDeleteMany.mockReset();
  curatorFindMany.mockReset();
  verifyCheckoutDraft.mockReset();
  createHoldPaymentIntent.mockReset();
  cancelPaymentIntent.mockReset();
  sendMagicLinkEmail.mockReset();
  sendCuratorNewSubmissionEmail.mockReset();

  campaignCreate.mockResolvedValue({ id: 'campaign-1' });
  curatorFindMany.mockResolvedValue([]);
  cancelPaymentIntent.mockResolvedValue(undefined);
});

describe('POST /api/checkout/confirm', () => {
  it('rejects a request missing the checkout token or payment method', async () => {
    const res = await POST(fakeRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects a checkout token that fails verification (e.g. expired)', async () => {
    verifyCheckoutDraft.mockResolvedValue(null);

    const res = await POST(fakeRequest({ checkoutToken: 'bad', paymentMethodId: 'pm_1' }));

    expect(res.status).toBe(400);
    expect(campaignCreate).not.toHaveBeenCalled();
  });

  it('creates a campaign, one hold per pitch, and one PaymentIntent per hold on the happy path', async () => {
    verifyCheckoutDraft.mockResolvedValue(draft);
    holdCreate
      .mockResolvedValueOnce({ id: 'hold-1' })
      .mockResolvedValueOnce({ id: 'hold-2' });
    createHoldPaymentIntent
      .mockResolvedValueOnce({ id: 'pi_1' })
      .mockResolvedValueOnce({ id: 'pi_2' });

    const res = await POST(fakeRequest({ checkoutToken: 'good', paymentMethodId: 'pm_1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.magicLinkUrl).toBe('http://localhost:3000/dashboard/fixed-token');
    expect(holdCreate).toHaveBeenCalledTimes(2);
    expect(createHoldPaymentIntent).toHaveBeenCalledTimes(2);
    expect(createHoldPaymentIntent).toHaveBeenNthCalledWith(1, {
      amountCents: 12000,
      customerId: 'cus_123',
      paymentMethodId: 'pm_1',
      holdId: 'hold-1',
      campaignId: 'campaign-1',
    });
    expect(holdUpdate).toHaveBeenCalledWith({
      where: { id: 'hold-1' },
      data: { stripePaymentIntentId: 'pi_1' },
    });
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
    expect(campaignDelete).not.toHaveBeenCalled();
    expect(sendMagicLinkEmail).toHaveBeenCalledWith('artist@example.com', expect.any(String), 2);
  });

  it('unwinds everything when a later PaymentIntent fails: cancels prior PIs and deletes the campaign', async () => {
    verifyCheckoutDraft.mockResolvedValue(draft);
    holdCreate
      .mockResolvedValueOnce({ id: 'hold-1' })
      .mockResolvedValueOnce({ id: 'hold-2' });
    createHoldPaymentIntent
      .mockResolvedValueOnce({ id: 'pi_1' }) // first curator's charge succeeds
      .mockRejectedValueOnce(new Error('card declined')); // second one fails

    const res = await POST(fakeRequest({ checkoutToken: 'good', paymentMethodId: 'pm_1' }));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toMatch(/could not be charged/i);

    // The already-authorized first PaymentIntent must be canceled rather than left dangling.
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_1');

    // No half-finished campaign/holds should survive the unwind.
    expect(holdDeleteMany).toHaveBeenCalledWith({ where: { campaignId: 'campaign-1' } });
    expect(campaignDelete).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });

    // And the artist must never be emailed a dashboard link for a campaign that doesn't exist.
    expect(sendMagicLinkEmail).not.toHaveBeenCalled();
  });

  it('still unwinds correctly when the very first PaymentIntent fails (nothing to cancel)', async () => {
    verifyCheckoutDraft.mockResolvedValue(draft);
    holdCreate.mockResolvedValueOnce({ id: 'hold-1' });
    createHoldPaymentIntent.mockRejectedValueOnce(new Error('card declined'));

    const res = await POST(fakeRequest({ checkoutToken: 'good', paymentMethodId: 'pm_1' }));

    expect(res.status).toBe(402);
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
    expect(holdDeleteMany).toHaveBeenCalledWith({ where: { campaignId: 'campaign-1' } });
    expect(campaignDelete).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
  });

  it('does not let a cancelPaymentIntent failure during unwind block cleanup of the other PIs', async () => {
    const threePitchDraft = {
      ...draft,
      pitches: [...draft.pitches, { ...draft.pitches[0], listingId: 'listing-3', curatorId: 'curator-3' }],
    };
    verifyCheckoutDraft.mockResolvedValue(threePitchDraft);
    holdCreate
      .mockResolvedValueOnce({ id: 'hold-1' })
      .mockResolvedValueOnce({ id: 'hold-2' })
      .mockResolvedValueOnce({ id: 'hold-3' });
    createHoldPaymentIntent
      .mockResolvedValueOnce({ id: 'pi_1' })
      .mockResolvedValueOnce({ id: 'pi_2' })
      .mockRejectedValueOnce(new Error('card declined'));
    cancelPaymentIntent.mockRejectedValueOnce(new Error('stripe timeout')).mockResolvedValueOnce(undefined);

    const res = await POST(fakeRequest({ checkoutToken: 'good', paymentMethodId: 'pm_1' }));

    expect(res.status).toBe(402);
    // Both prior PaymentIntents get a cancel attempt even though the first one throws.
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(2);
    expect(cancelPaymentIntent).toHaveBeenNthCalledWith(1, 'pi_1');
    expect(cancelPaymentIntent).toHaveBeenNthCalledWith(2, 'pi_2');
    expect(campaignDelete).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
  });
});
