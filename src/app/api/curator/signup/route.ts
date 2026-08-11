import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, setCuratorSession } from '@/lib/auth';
import { curatorSignupSchema } from '@/lib/validations';
import { isGatedPlatform } from '@/lib/constants';

// Completes curator signup after admin approval — sets a password, creates the login-able
// Curator record, and (spec section 2: "set their own price" per platform) publishes any
// platform/price rows the curator entered during signup as live listings immediately.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = curatorSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const { token, username, password, displayName, listings } = parsed.data;

  const application = await prisma.curatorApplication.findUnique({ where: { signupToken: token } });
  if (!application || application.status !== 'APPROVED' || application.signupTokenUsed) {
    return NextResponse.json({ error: 'This signup link is invalid or already used.' }, { status: 400 });
  }

  const usernameTaken = await prisma.curator.findUnique({ where: { username } });
  if (usernameTaken) {
    return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
  }

  // Only ever null while oauthPending (mid-verification) -- an approved, non-pending
  // application always has these filled in (self-reported at creation, or OAuth-verified by
  // completeConnection.ts). This should be unreachable; it's a defensive guard, not expected
  // user-facing behavior.
  if (application.followerCount == null || application.profileUrl == null) {
    return NextResponse.json({ error: 'This application is missing required data. Contact support.' }, { status: 409 });
  }
  const { followerCount, profileUrl } = application;

  const passwordHash = await hashPassword(password);

  const curator = await prisma.$transaction(async (tx) => {
    const created = await tx.curator.create({
      data: {
        email: application.email,
        username,
        passwordHash,
        displayName,
        platform: application.platform,
        genre: application.genre,
        followerCount,
        profileUrl,
        profilePhotoUrl: application.verifiedProfilePhotoDataUrl,
        applicationId: application.id,
      },
    });
    await tx.curatorApplication.update({
      where: { id: application.id },
      data: { signupTokenUsed: true },
    });
    if (listings.length > 0) {
      await tx.listing.createMany({
        data: listings.map((listing) => ({
          curatorId: created.id,
          platform: listing.platform,
          genre: application.genre,
          priceCents: listing.priceCents,
        })),
      });
    }

    // Carry over an already-verified account from the application step so the curator isn't
    // asked to reconnect something they already proved ownership of during OAuth verification
    // (see completeConnection.ts) — they land on their dashboard already "Connected" for it.
    if (application.verifiedExternalUserId && isGatedPlatform(application.platform)) {
      await tx.socialConnection.create({
        data: {
          curatorId: created.id,
          platform: application.platform,
          externalUserId: application.verifiedExternalUserId,
          externalHandle: application.verifiedExternalHandle,
          followerCount,
          accessToken: application.verifiedAccessToken!,
          refreshToken: application.verifiedRefreshToken,
          tokenExpiresAt: application.verifiedTokenExpiresAt,
        },
      });
    }

    return created;
  });

  await setCuratorSession(curator.id);
  return NextResponse.json({ ok: true });
}
