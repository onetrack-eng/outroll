import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY || undefined;
const resend = new Resend(apiKey ?? 're_placeholder');
const FROM = process.env.EMAIL_FROM ?? 'Outroll <notifications@outroll.me>';

// Minimal, restrained HTML shell — matches the "Apple Store, not ad-tech" tone from spec
// section 7. Every email in this file goes through this one wrapper for consistency.
function shell(heading: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `
  <div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#111;">
    <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#6b6b6b;margin-bottom:24px;">Outroll</div>
    <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">${heading}</h1>
    <div style="font-size:15px;line-height:1.6;color:#333;">${bodyHtml}</div>
    ${
      cta
        ? `<a href="${cta.url}" style="display:inline-block;margin-top:28px;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">${cta.label}</a>`
        : ''
    }
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;">Outroll</div>
  </div>`;
}

async function send(to: string, subject: string, html: string) {
  if (!apiKey) {
    console.warn(`[resend] RESEND_API_KEY not set — skipping send of "${subject}" to ${to}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

// --- Artists ---------------------------------------------------------------

export async function sendMagicLinkEmail(to: string, url: string, curatorCount: number) {
  await send(
    to,
    'Your Outroll campaign',
    shell(
      'Your campaign is live',
      `<p>Your submission${curatorCount > 1 ? 's have' : ' has'} gone out to ${curatorCount} curator${curatorCount > 1 ? 's' : ''}. This link is your dashboard — no account or password needed. Bookmark it to track status, and to file a dispute if something goes wrong after a post goes live.</p>`,
      { label: 'View your dashboard', url }
    )
  );
}

export async function sendArtistHoldStatusEmail(
  to: string,
  url: string,
  curatorName: string,
  status: 'accepted' | 'declined' | 'refunded' | 'posted'
) {
  const copy: Record<typeof status, { heading: string; body: string }> = {
    accepted: {
      heading: `${curatorName} accepted your pitch`,
      body: `<p>Your payment for this slot has been captured. ${curatorName} now has 7 business days to post and share the live link.</p>`,
    },
    declined: {
      heading: `${curatorName} declined your pitch`,
      body: `<p>This hold has been released and refunded in full — no action needed on your end.</p>`,
    },
    refunded: {
      heading: `Your hold with ${curatorName} was refunded`,
      body: `<p>This submission wasn't actioned in time, so it was automatically refunded in full.</p>`,
    },
    posted: {
      heading: `${curatorName} posted your campaign`,
      body: `<p>The live link is on your dashboard. You have one week to review it and file a dispute if something's wrong — otherwise ${curatorName} is paid automatically once the week closes.</p>`,
    },
  } as const;

  const { heading, body } = copy[status];
  await send(to, heading, shell(heading, body, { label: 'View your dashboard', url }));
}

export async function sendDisputeOutcomeEmail(
  to: string,
  url: string,
  curatorName: string,
  outcome: 'refunded' | 'curator_paid'
) {
  const heading = outcome === 'refunded' ? 'Your dispute was resolved — refunded' : 'Your dispute was resolved';
  const body =
    outcome === 'refunded'
      ? `<p>After review, your hold with ${curatorName} has been fully refunded.</p>`
      : `<p>After review, the hold with ${curatorName} has been released for payout. Thanks for your patience.</p>`;
  await send(to, heading, shell(heading, body, { label: 'View your dashboard', url }));
}

// --- Curators ----------------------------------------------------------------

export async function sendCuratorApplicationApproved(to: string, signupUrl: string) {
  await send(
    to,
    "You're approved on Outroll",
    shell(
      "You're in",
      `<p>Your curator application has been approved. Set up your login and connect payouts to start receiving submissions.</p>`,
      { label: 'Finish signup', url: signupUrl }
    )
  );
}

export async function sendCuratorApplicationDeclined(to: string) {
  await send(
    to,
    'Your Outroll application',
    shell(
      'Application update',
      `<p>Thanks for applying to Outroll. We won't be moving forward with your application at this time.</p>`
    )
  );
}

export async function sendCuratorNewSubmissionEmail(
  to: string,
  artistLabel: string,
  dashboardUrl: string
) {
  await send(
    to,
    'New submission on Outroll',
    shell(
      'New pitch waiting on you',
      `<p>${artistLabel} submitted a pitch for one of your listings. You have 7 business days to accept or decline.</p>`,
      { label: 'Review submission', url: dashboardUrl }
    )
  );
}

export async function sendCuratorPayoutEmail(to: string, amountLabel: string) {
  await send(
    to,
    "You've been paid",
    shell('Payout released', `<p>${amountLabel} has been transferred to your connected account.</p>`)
  );
}

export async function sendCuratorDisputeResolvedEmail(
  to: string,
  outcome: 'refunded' | 'curator_paid'
) {
  const heading = outcome === 'curator_paid' ? 'Dispute resolved in your favor' : 'Dispute resolved';
  const body =
    outcome === 'curator_paid'
      ? `<p>After review, the hold has been released for payout to you.</p>`
      : `<p>After review, this hold was refunded to the artist in full. No payout will be issued for it.</p>`;
  await send(to, heading, shell(heading, body));
}

export async function sendCuratorPasswordResetEmail(to: string, url: string) {
  await send(
    to,
    'Reset your Outroll password',
    shell(
      'Reset your password',
      `<p>We got a request to reset the password on your Outroll curator account. This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.</p>`,
      { label: 'Reset password', url }
    )
  );
}

export async function sendCuratorDisputeFiledEmail(to: string, dashboardUrl: string) {
  await send(
    to,
    'A dispute was filed on Outroll',
    shell(
      'Dispute filed',
      `<p>An artist has disputed a post on one of your holds. The payout for this hold is paused while we review — no action is needed from you right now.</p>`,
      { label: 'View submission', url: dashboardUrl }
    )
  );
}
