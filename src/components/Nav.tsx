import { getCuratorSession } from '@/lib/auth';
import { NavLinks } from '@/components/NavLinks';

// Server component so it can check the curator session cookie (httpOnly, only readable
// server-side via next/headers) — the actual interactive markup lives in NavLinks, a client
// component, since it also needs the cart item count from CartProvider's context.
export async function Nav() {
  const session = await getCuratorSession();
  return <NavLinks isCuratorLoggedIn={session !== null} />;
}
