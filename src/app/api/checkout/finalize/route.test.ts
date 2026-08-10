import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const { campaignFindUnique, holdFindMany } = vi.hoisted(() => ({
  campaignFindUnique: vi.fn(),
  holdFindMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    campaign: { findUnique: campaignFindUnique },
    hold: { findMany: holdFindMany },
  },
}));

const { paymentIntentsRetrieve } = vi.hoisted(() => ({ paymentIntentsRetrieve: vi.fn() }));
vi.mock('@/lib/stripe', () => ({
  stripe: { paymentIntents: { retrieve: paymentIntentsRetrieve } },
}));

vi.mock('@/lib/magicLink', () => ({
  magicLinkUrl: (token: string) => `http://localhost:3000/dashboard/${token}`,
}));

const { sendMagicLinkEmail, sendCuratorNewSubmissionEmail } = vi.hoisted(() => ({
  sendMagicLinkEmail: vi.fn(),
  sendCuratorNewSubmissionEmail: vi.fn(),
}));
vi.mock('@/lib/resend', () => ({ sendMagicLinkEmail, sendCuratorNewSubmissionEmail }));

const { POST } = await import('./route');

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  campaignFindUnique.mockReset();
  holdFindMany.mockReset();
  paymentIntentsRetrieve.mockReset();
  sendMagicLinkEmail.mockReset();
  sendCuratorNewSubmissionEmail.mockReset();
  sendMagicLinkEmail.mockResolvedValue(undefined);
  sendCuratorNewSubmissionEmail.mockResolvedValue(undefined);

  campaignFindUnique.mockResolvedValue({
    id: 'campaign-1',
    artistEmail: 'artist@example.com',
    artistName: 'Test Artist',
    magicLinkToken: 'tok',
  });
});

describe('POST /api/checkout/finalize', () => {
  it('rejects a request missing campaignId', async () => {
    const res = await POST(fakeRequest({}));
    expect(res.status).toBe(400);
  });

  it('404s for a campaign that does not exist (e.g. already aborted)', async () => {
    campaignFindUnique.mockResolvedValue(null);
    const res = await POST(fakeRequest({ campaignId: 'nope' }));
    expect(res.status).toBe(404);
  });

  it('sends the artist and curator emails once every PaymentIntent is confirmed on Stripe', async () => {
    holdFindMany.mockResolvedValue([
      { id: 'hold-1', stripePaymentIntentId: 'pi_1', curator: { email: 'curator1@example.com' } },
      { id: 'hold-2', stripePaymentIntentId: 'pi_2', curator: { email: 'curator2@example.com' } },
    ]);
    paymentIntentsRetrieve.mockResolvedValue({ status: 'requires_capture' });

    const res = await POST(fakeRequest({ campaignId: 'campaign-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.magicLinkUrl).toBe('http://localhost:3000/dashboard/tok');
    expect(sendMagicLinkEmail).toHaveBeenCalledWith('artist@example.com', expect.any(String), 2);
    expect(sendCuratorNewSubmissionEmail).toHaveBeenCalledTimes(2);
    expect(sendCuratorNewSubmissionEmail).toHaveBeenCalledWith(
      'curator1@example.com',
      'Test Artist',
      expect.stringContaining('hold-1')
    );
  });

  it('refuses to finalize (and sends no emails) if a PaymentIntent is not actually confirmed yet', async () => {
    // Guards against a buggy or malicious client calling finalize before every hold in the
    // campaign has actually cleared 3D Secure / confirmation on Stripe's side.
    holdFindMany.mockResolvedValue([
      { id: 'hold-1', stripePaymentIntentId: 'pi_1', curator: { email: 'c1@example.com' } },
      { id: 'hold-2', stripePaymentIntentId: 'pi_2', curator: { email: 'c2@example.com' } },
    ]);
    paymentIntentsRetrieve
      .mockResolvedValueOnce({ status: 'requires_capture' })
      .mockResolvedValueOnce({ status: 'requires_action' });

    const res = await POST(fakeRequest({ campaignId: 'campaign-1' }));

    expect(res.status).toBe(409);
    expect(sendMagicLinkEmail).not.toHaveBeenCalled();
    expect(sendCuratorNewSubmissionEmail).not.toHaveBeenCalled();
  });

  it('refuses to finalize a hold that never got a PaymentIntent at all', async () => {
    holdFindMany.mockResolvedValue([{ id: 'hold-1', stripePaymentIntentId: null, curator: { email: 'c1@example.com' } }]);

    const res = await POST(fakeRequest({ campaignId: 'campaign-1' }));

    expect(res.status).toBe(409);
    expect(paymentIntentsRetrieve).not.toHaveBeenCalled();
    expect(sendMagicLinkEmail).not.toHaveBeenCalled();
  });
});
