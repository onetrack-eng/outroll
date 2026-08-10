import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const { holdFindMany, holdDeleteMany, campaignDeleteMany } = vi.hoisted(() => ({
  holdFindMany: vi.fn(),
  holdDeleteMany: vi.fn(),
  campaignDeleteMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    hold: { findMany: holdFindMany, deleteMany: holdDeleteMany },
    campaign: { deleteMany: campaignDeleteMany },
  },
}));

const { cancelPaymentIntent } = vi.hoisted(() => ({ cancelPaymentIntent: vi.fn() }));
vi.mock('@/lib/stripe', () => ({ cancelPaymentIntent }));

const { POST } = await import('./route');

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  holdFindMany.mockReset();
  holdDeleteMany.mockReset();
  campaignDeleteMany.mockReset();
  cancelPaymentIntent.mockReset();
  cancelPaymentIntent.mockResolvedValue(undefined);
});

describe('POST /api/checkout/abort', () => {
  it('rejects a request missing campaignId', async () => {
    const res = await POST(fakeRequest({}));
    expect(res.status).toBe(400);
  });

  it('cancels every hold PaymentIntent and deletes the campaign/holds', async () => {
    holdFindMany.mockResolvedValue([
      { id: 'hold-1', stripePaymentIntentId: 'pi_1' },
      { id: 'hold-2', stripePaymentIntentId: 'pi_2' },
    ]);

    const res = await POST(fakeRequest({ campaignId: 'campaign-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_2');
    expect(holdDeleteMany).toHaveBeenCalledWith({ where: { campaignId: 'campaign-1' } });
    expect(campaignDeleteMany).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
  });

  it('skips holds that never got a PaymentIntent, without erroring', async () => {
    holdFindMany.mockResolvedValue([{ id: 'hold-1', stripePaymentIntentId: null }]);

    const res = await POST(fakeRequest({ campaignId: 'campaign-1' }));

    expect(res.status).toBe(200);
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
    expect(holdDeleteMany).toHaveBeenCalledWith({ where: { campaignId: 'campaign-1' } });
  });

  it('still cleans up the DB rows even if a cancel call fails', async () => {
    holdFindMany.mockResolvedValue([{ id: 'hold-1', stripePaymentIntentId: 'pi_1' }]);
    cancelPaymentIntent.mockRejectedValue(new Error('stripe down'));

    const res = await POST(fakeRequest({ campaignId: 'campaign-1' }));

    expect(res.status).toBe(200);
    expect(holdDeleteMany).toHaveBeenCalledWith({ where: { campaignId: 'campaign-1' } });
    expect(campaignDeleteMany).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
  });
});
