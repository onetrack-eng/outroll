export const metadata = {
  title: 'Data Deletion Instructions — Outroll',
};

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">
        Data Deletion Instructions
      </h1>
      <p className="mb-10 text-sm text-muted">Last updated August 12, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">How to request deletion</h2>
          <p>
            To request deletion of your data from Outroll — including your curator account,
            application, and any connected social account information (such as an Instagram
            connection made through Meta login) — email{' '}
            <a href="mailto:admin@outroll.me" className="text-ink underline">
              admin@outroll.me
            </a>{' '}
            from the email address on your account and ask us to delete your data. We&rsquo;ll
            confirm the request and complete it within 30 days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">What gets deleted</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Your curator account, listings, and any connected social account tokens</li>
            <li>Your application details and any information collected during signup</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">What we may keep</h2>
          <p>
            As described in our{' '}
            <a href="/privacy" className="text-ink underline">
              Privacy Policy
            </a>
            , we retain campaign and payment records tied to completed or disputed transactions
            for as long as needed to resolve disputes and meet our legal and financial-recordkeeping
            obligations, even after an account deletion request. Records kept for this reason are
            not used for any other purpose.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Revoking access separately</h2>
          <p>
            You can also revoke Outroll&rsquo;s access to a connected social account at any time
            directly from that platform&rsquo;s own security or apps settings (for example,
            Instagram&rsquo;s Settings → Apps and Websites) — this immediately invalidates our
            access independently of any deletion request made here.
          </p>
        </section>
      </div>
    </div>
  );
}
