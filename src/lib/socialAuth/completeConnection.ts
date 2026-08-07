import { prisma } from '@/lib/db';
import { verifyConnectState } from './state';
import { exchangeCode, fetchProfile } from './index';
import type { GatedPlatform } from '@/lib/constants';

// Shared by all three callback routes: verify the state token, exchange the code, fetch the
// verified profile, and upsert the SocialConnection row. `expectedPlatform` is passed by the
// Google/TikTok callbacks (their route is 1:1 with a platform); the Meta callback omits it
// since one Meta app's callback serves both Instagram and Facebook Reels, disambiguated by
// what was encoded into `state` when the connect flow started.
export async function completeConnection(searchParams: URLSearchParams, expectedPlatform?: GatedPlatform) {
  const code = searchParams.get('code');
  const stateToken = searchParams.get('state');
  if (!code || !stateToken) {
    throw new Error('Missing code or state from provider redirect.');
  }

  const state = await verifyConnectState(stateToken);
  if (!state) {
    throw new Error('This connection link expired or is invalid. Try connecting again.');
  }
  if (expectedPlatform && state.platform !== expectedPlatform) {
    throw new Error('Platform mismatch between request and callback.');
  }
  const platform = state.platform;

  const { accessToken, refreshToken, expiresInSeconds } = await exchangeCode(platform, code, state.codeVerifier);
  const profile = await fetchProfile(platform, accessToken);

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
      tokenExpiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null,
    },
    update: {
      externalUserId: profile.externalUserId,
      externalHandle: profile.handle,
      followerCount: profile.followerCount,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null,
    },
  });

  return platform;
}
