import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const { campaignCreate, campaignDelete, holdCreate, holdUpdate, holdDeleteMany } = vi.hoisted(() => ({
  campaignCreate: vi.fn(),
  campaignDelete: vi.fn(),
  holdCreate: vi.fn(),
  holdUpdate: vi.fn(),
  holdDeleteMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    campaign: { create: campaignCreate, delete: campaignDelete },
    hold: { create: holdCreate, update: holdUpdate, deleteMany: holdDeleteMany },
  },
}));

const { verifyCheckoutDraft } = vi.hoisted(() => ({ verifyCheckoutDraft: vi.fn() }));
vi.mock('@/lib/checkoutToken', () => ({ verifyCheckoutDraft }));

const { createHoldPaymentIntent, cancelPaymentIntent } = vi.hoisted(() => ({
  createHoldPaymentIntent: vi.fn(),
  cancelPaymentIntent: vi.fn(),
}));
vi.mock('@/lib/stripe', () => ({ createHoldPaymentIntent, cancelPaymentIntent }));

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
  verifyCheckoutDraft.mockReset();
  createHoldPaymentIntent.mockReset();
  cancelPaymentIntent.mockReset();

  campaignCreate.mockResolvedValue({ id: 'campaign-1' });
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

  it('creates a campaign and one unconfirmed PaymentIntent per pitch, returning a clientSecret for each', async () => {
    verifyCheckoutDraft.mockResolvedValue(draft);
    holdCreate.mockResolvedValueOnce({ id: 'hold-1' }).mockResolvedValueOnce({ id: 'hold-2' });
    createHoldPaymentIntent
      .mockResolvedValueOnce({ id: 'pi_1', client_secret: 'pi_1_secret' })
      .mockResolvedValueOnce({ id: 'pi_2', client_secret: 'pi_2_secret' });

    const res = await POST(fakeRequest({ checkoutToken: 'good', paymentMethodId: 'pm_1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.campaignId).toBe('campaign-1');
    expect(body.magicLinkUrl).toBe('http://localhost:3000/dashboard/fixed-token');
    expect(body.holds).toEqual([
      { holdId: 'hold-1', clientSecret: 'pi_1_secret' },
      { holdId: 'hold-2', clientSecret: 'pi_2_secret' },
    ]);
    // Confirmation must NOT happen here — it's created but left unconfirmed, per off-session
    // 3D Secure limitations (see createHoldPaymentIntent's comment in src/lib/stripe.ts).
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
  });

  it('unwinds everything when a later PaymentIntent fails to be created: cancels prior PIs and deletes the campaign', async () => {
    verifyCheckoutDraft.mockResolvedValue(draft);
    holdCreate.mockResolvedValueOnce({ id: 'hold-1' }).mockResolvedValueOnce({ id: 'hold-2' });
    createHoldPaymentIntent
      .mockResolvedValueOnce({ id: 'pi_1', client_secret: 'pi_1_secret' })
      .mockRejectedValueOnce(new Error('stripe error'));

    const res = await POST(fakeRequest({ checkoutToken: 'good', paymentMethodId: 'pm_1' }));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toMatch(/something went wrong/i);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(holdDeleteMany).toHaveBeenCalledWith({ where: { campaignId: 'campaign-1' } });
    expect(campaignDelete).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
  });

  it('unwinds when a PaymentIntent is created without a client secret', async () => {
    verifyCheckoutDraft.mockResolvedValue({ ...draft, pitches: [draft.pitches[0]] });
    holdCreate.mockResolvedValueOnce({ id: 'hold-1' });
    createHoldPaymentIntent.mockResolvedValueOnce({ id: 'pi_1', client_secret: null });

    const res = await POST(fakeRequest({ checkoutToken: 'good', paymentMethodId: 'pm_1' }));

    expect(res.status).toBe(402);
    expect(holdDeleteMany).toHaveBeenCalledWith({ where: { campaignId: 'campaign-1' } });
    expect(campaignDelete).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
  });

  it('does not let a cancelPaymentIntent failure during unwind block cleanup', async () => {
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
      .mockResolvedValueOnce({ id: 'pi_1', client_secret: 's1' })
      .mockResolvedValueOnce({ id: 'pi_2', client_secret: 's2' })
      .mockRejectedValueOnce(new Error('card declined'));
    cancelPaymentIntent.mockRejectedValueOnce(new Error('stripe timeout')).mockResolvedValueOnce(undefined);

    const res = await POST(fakeRequest({ checkoutToken: 'good', paymentMethodId: 'pm_1' }));

    expect(res.status).toBe(402);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(2);
    expect(cancelPaymentIntent).toHaveBeenNthCalledWith(1, 'pi_1');
    expect(cancelPaymentIntent).toHaveBeenNthCalledWith(2, 'pi_2');
    expect(campaignDelete).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
  });
});
