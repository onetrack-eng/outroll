export const metadata = {
  title: 'Terms of Service — Outroll',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">Terms of Service</h1>
      <p className="mb-10 text-sm text-muted">Last updated August 12, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Agreement</h2>
          <p>
            Outroll is operated by OneTrack Media Inc. (&ldquo;we,&rdquo; &ldquo;us&rdquo;) at
            outroll.me. By using the site to submit a campaign as an artist or to apply, list, or
            accept promotion slots as a curator, you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">The service</h2>
          <p>
            Outroll is a marketplace connecting artists with independent music curators across
            Instagram, TikTok, YouTube Shorts, and other platforms. Curators list paid promotion
            slots; artists browse listings and submit pitches. We are not a party to the
            promotional content itself — curators are independently responsible for the posts
            they create and publish.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Artists</h2>
          <p>
            No account is required. Payment is collected up front, but held — a curator&rsquo;s
            portion is not released until the promo is posted and the one-week review window
            closes without a dispute. Once a submission is made, it cannot be cancelled. You may
            file one dispute per hold within one week of it going live if the post materially
            fails to match what was agreed; disputes are reviewed and resolved by us at our
            discretion, either as a full refund or a full release of payment to the curator.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Curators</h2>
          <p>
            Applications are reviewed and approved manually — approval is not guaranteed, and we
            may decline any application at our discretion. Approved curators are responsible for
            posting accepted submissions within the stated window and for the accuracy of their
            listed price, platform, and follower information. Failing to respond to a submission
            or to post within the applicable window results in an automatic refund to the artist.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Payments</h2>
          <p>
            Payments are processed by Stripe, and curator payouts by Stripe Connect. We add a 20%
            platform fee on top of a curator&rsquo;s listed price, charged to the artist at
            checkout. We do not hold funds ourselves outside of Stripe&rsquo;s processing and
            payout infrastructure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Prohibited conduct</h2>
          <p>
            You may not use Outroll to misrepresent an account you do not control, submit
            fraudulent payment information, circumvent the payment or dispute process, or use the
            platform for any unlawful purpose.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Disclaimers</h2>
          <p>
            Outroll is provided &ldquo;as is.&rdquo; We do not guarantee the performance, reach,
            or outcome of any promotion, and we are not responsible for the content curators
            post. To the extent permitted by law, our liability for any claim relating to the
            service is limited to the amount you paid through Outroll in the three months before
            the claim arose.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of Outroll after a change
            is posted means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:admin@outroll.me" className="text-ink underline">
              admin@outroll.me
            </a>
            . See also our{' '}
            <a href="/privacy" className="text-ink underline">
              Privacy Policy
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
