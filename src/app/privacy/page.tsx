export const metadata = {
  title: 'Privacy Policy — Outroll',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mb-10 text-sm text-muted">Last updated August 11, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Overview</h2>
          <p>
            Outroll is operated by OneTrack Media Inc. (&ldquo;we,&rdquo; &ldquo;us&rdquo;) at
            outroll.me, a marketplace connecting artists with independent music curators. This
            policy explains what information we collect from artists and curators who use the
            site, why we collect it, and how it&rsquo;s handled.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Information artists provide</h2>
          <p>
            When you submit a campaign as an artist, we collect your email address, an optional
            name or artist handle, and the pitch content you submit for each curator (a link to
            your asset folder and a written narrative). Payment is processed directly by Stripe;
            we do not receive or store your card details. Your email is used solely to send your
            no-login dashboard link and status updates about your campaign.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Information curators provide</h2>
          <p>
            When you apply and sign up as a curator, we collect your email address, a chosen
            username, and your listing details (platform, genre, price). Payouts are handled
            through Stripe Connect; we do not store your bank account details.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">
            Connected social media accounts
          </h2>
          <p className="mb-3">
            To verify that a curator genuinely controls the account they&rsquo;re listing
            promotion on, we ask curators to connect their Instagram (and optionally other
            platforms) via that platform&rsquo;s official login. When you connect an account, we
            request read-only access to:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Your basic profile information (username, account ID)</li>
            <li>Your public follower count</li>
            <li>Your profile photo, which we download once and use as your display photo on
              Outroll</li>
          </ul>
          <p className="mt-3">
            We do not post on your behalf, message your followers, or request any permission
            beyond what&rsquo;s needed to verify your account and display your real follower
            count. The access token issued by the platform is stored so we can periodically
            re-verify your account; you can revoke this access at any time from that
            platform&rsquo;s own security/apps settings, which immediately invalidates our
            access.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">How we use this information</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>To operate the marketplace: matching artist campaigns with curator listings,
              processing payments, and tracking the status of each promotion</li>
            <li>To verify curator identity and prevent fraud (someone claiming to run an account
              they don&rsquo;t control)</li>
            <li>To send transactional emails — campaign confirmations, status updates, and
              payout notifications. We do not send marketing email</li>
            <li>To display accurate, verified follower counts and profile photos on public
              listings</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Third parties we use</h2>
          <p>
            We rely on a small number of service providers to operate Outroll: Stripe (payment
            processing and payouts), Resend (transactional email delivery), and Vercel and Neon
            (hosting and database infrastructure). Each processes data only as needed to provide
            their service to us, under their own privacy policies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Data retention</h2>
          <p>
            We retain account and campaign information for as long as your account is active or
            as needed to resolve disputes and comply with our legal obligations. If you&rsquo;d
            like your data deleted, contact us using the details below and we&rsquo;ll remove
            what we&rsquo;re not legally required to keep.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Contact</h2>
          <p>
            Questions about this policy or your data can be sent to{' '}
            <a href="mailto:admin@outroll.me" className="text-ink underline">
              admin@outroll.me
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
