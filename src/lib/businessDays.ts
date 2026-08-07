// Business-day math for the curator accept/post windows (spec section 3).
//
// OPEN ITEM (spec section 10): the spec explicitly flags that it's undecided whether
// US federal holidays should be excluded, or weekends only. This implementation excludes
// weekends only. If holiday exclusion is required later, swap `isBusinessDay` below for a
// holiday-calendar-aware check (e.g. the `@18f/us-federal-holidays` package) — every call
// site already goes through this one function.

function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
}

/** Adds N business days to `start`, landing on a business day. */
export function addBusinessDays(start: Date, count: number): Date {
  const result = new Date(start.getTime());
  let remaining = count;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isBusinessDay(result)) {
      remaining -= 1;
    }
  }
  return result;
}

export function addCalendarDays(start: Date, count: number): Date {
  const result = new Date(start.getTime());
  result.setUTCDate(result.getUTCDate() + count);
  return result;
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}
