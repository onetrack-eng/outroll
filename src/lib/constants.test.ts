import { describe, expect, it } from 'vitest';
import { computeCharge } from './constants';

describe('computeCharge', () => {
  it('adds the platform fee on top of the curator price', () => {
    expect(computeCharge(10000)).toEqual({
      priceCents: 10000,
      platformFeeCents: 2000,
      totalChargeCents: 12000,
    });
  });

  it('rounds the fee to the nearest cent rather than truncating', () => {
    // 333 * 0.20 = 66.6 -> rounds up to 67
    expect(computeCharge(333)).toEqual({
      priceCents: 333,
      platformFeeCents: 67,
      totalChargeCents: 400,
    });
  });

  it('rounds down when the fractional cent is below the midpoint', () => {
    // 302 * 0.20 = 60.4 -> rounds down to 60
    expect(computeCharge(302)).toEqual({
      priceCents: 302,
      platformFeeCents: 60,
      totalChargeCents: 362,
    });
  });

  it('handles a zero price', () => {
    expect(computeCharge(0)).toEqual({
      priceCents: 0,
      platformFeeCents: 0,
      totalChargeCents: 0,
    });
  });
});
