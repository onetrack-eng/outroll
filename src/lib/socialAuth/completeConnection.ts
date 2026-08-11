import { prisma } from '@/lib/db';
import { verifyConnectState } from './state';
import { exchangeCode, fetchProfile } from './index';
import type { GatedPlatform } from '@/lib/constants';

// Canonical profile URL for a verified handle, used to fill CuratorApplication.profileUrl when
// an applicant verifies via OAuth instead of pasting a link manually. Not every provider
// returns a handle (see fetchProfile in each provider module), so this is best-effort.
const PROFILE_URL_BASE: Record<GatedPlatform, string> = {
  INSTAGRAM: 'https://instagram.com/',
  FACEBOOK_REELS: 'https://facebook.com/',
  TIKTOK: 'https://tiktok.com/@',
  YOUTUBE_SHORTS: 'https://youtube.com/@',
};

// Shared by all three callback routes. Always resolves to a redirect path -- never throws --
// so a failure partway through (expired state, provider error, revoked draft) still sends the
// visitor somewhere sensible with an explanation, instead of the callback route needing its own
// try/catch and having to guess which flow (dashboard vs. application) it was for. `expectedPlatform`
// is passed by the Google/TikTok callbacks (their route is 1:1 with a platform); the Meta callback
// omits it since one Meta app's callback serves both Instagram and Facebook Reels, disambiguated
// by what was encoded into `state` when the connect flow started.
export async function completeConnection(
  searchParams: URLSearchParams,
  expectedPlatform?: GatedPlatform
): Promise<string> {
  let errorRedirectBase = '/curator/dashboard/listings';

  try {
    const code = searchParams.get('code');
    const stateToken = searchParams.get('state');
    if (!code || !stateToken) {
      throw new Error('Missing code or state from provider redirect.');
    }

    const state = await verifyConnectState(stateToken);
    if (!state) {
      throw new Error('This connection link expired or is invalid. Try connecting again.');
    }
    errorRedirectBase = state.kind === 'application' ? '/apply' : '/curator/dashboard/listings';

    if (expectedPlatform && state.platform !== expectedPlatform) {
      throw new Error('Platform mismatch between request and callback.');
    }
    const platform = state.platform;

    const { accessToken, refreshToken, expiresInSeconds } = await exchangeCode(platform, code, state.codeVerifier);
    const profile = await fetchProfile(platform, accessToken);
    const tokenExpiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null;

    if (state.kind === 'curator') {
      await prisma.socialConnection.upsert({
        where: { curatorId_platform: { curatorId: state.curatorId, platform } },
        create: {
          curatorId: state.curatorId,
          platform,
          externalUserId: profile.externalUserId,
          externalHandle: profile.handle,
          followerCount: profile.followerCount,
          accessToken,
          refreshToken,
          tokenExpiresAt,
        },
        update: {
          externalUserId: profile.externalUserId,
          externalHandle: profile.handle,
          followerCount: profile.followerCount,
          accessToken,
          refreshToken,
          tokenExpiresAt,
        },
      });
      // Whichever gated platform the curator connects (most recently) becomes their display
      // photo — see Curator.profilePhotoUrl. Only set when the provider actually returned one.
      if (profile.profilePhotoDataUrl) {
        await prisma.curator.update({
          where: { id: state.curatorId },
          data: { profilePhotoUrl: profile.profilePhotoDataUrl },
        });
      }
      return `/curator/dashboard/listings?connected=${platform}`;
    }

    // Applicant verifying the account they're applying with — no Curator row exists yet, so
    // this fills in the draft CuratorApplication instead of a SocialConnection. Carried over to
    // a real SocialConnection at signup time (see /api/curator/signup).
    const application = await prisma.curatorApplication.findUnique({ where: { id: state.applicationId } });
    if (!application || !application.oauthPending) {
      throw new Error('This application draft is no longer valid. Please start your application again.');
    }

    await prisma.curatorApplication.update({
      where: { id: application.id },
      data: {
        followerCount: profile.followerCount,
        profileUrl: profile.handle ? `${PROFILE_URL_BASE[platform]}${profile.handle}` : application.profileUrl,
        verifiedExternalUserId: profile.externalUserId,
        verifiedExternalHandle: profile.handle,
        verifiedAccessToken: accessToken,
        verifiedRefreshToken: refreshToken,
        verifiedTokenExpiresAt: tokenExpiresAt,
        verifiedProfilePhotoDataUrl: profile.profilePhotoDataUrl,
        oauthPending: false,
      },
    });

    return '/apply?submitted=1';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed.';
    return `${errorRedirectBase}?connection_error=${encodeURIComponent(message)}`;
  }
}
