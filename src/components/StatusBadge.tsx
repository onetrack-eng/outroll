import { Badge } from '@/components/ui/Badge';

const CONFIG: Record<string, { label: string; tone: 'neutral' | 'success' | 'danger' | 'warning' }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  ACCEPTED: { label: 'Accepted', tone: 'neutral' },
  DECLINED: { label: 'Declined', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  POSTED: { label: 'Posted', tone: 'success' },
  DISPUTED: { label: 'Disputed', tone: 'danger' },
  PAID: { label: 'Paid', tone: 'success' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}
