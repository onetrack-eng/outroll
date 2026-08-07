import { SignJWT, jwtVerify } from 'jose';

// Short-lived, signed, stateless "draft campaign" token. We validate pricing against the DB
// once at /api/checkout, sign the result, and hand it back to the client — nothing is written
// to Postgres until payment is actually confirmed in /api/checkout/confirm. Keeps an abandoned
// checkout from ever leaving an orphaned Campaign/Hold row behind.

const TTL_SECONDS = 60 * 30; // 30 minutes — long enough to enter card details

export interface DraftPitch {
  listingId: string;
  curatorId: string;
  assetLink: string;
  narrative: string;
  context: string;
  priceCents: number;
  platformFeeCents: number;
  totalChargeCents: number;
}

export interface CheckoutDraft {
  artistEmail: string;
  artistName?: string;
  customerId: string;
  pitches: DraftPitch[];
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  return new TextEncoder().encode(secret);
}

export async function signCheckoutDraft(draft: CheckoutDraft): Promise<string> {
  return new SignJWT({ draft })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyCheckoutDraft(token: string): Promise<CheckoutDraft | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return (payload as any).draft ?? null;
  } catch {
    return null;
  }
}
