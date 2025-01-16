import Decimal from 'decimal.js';

export const DecimalHelper = {
  fromString(value: string | number | Decimal): Decimal {
    return value instanceof Decimal ? value : new Decimal(value.toString());
  },

  subtract(
    a: string | number | Decimal,
    b: string | number | Decimal,
  ): Decimal {
    return this.fromString(a).sub(this.fromString(b));
  },

  add(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return this.fromString(a).add(this.fromString(b));
  },

  multiply(
    a: string | number | Decimal,
    b: string | number | Decimal,
  ): Decimal {
    return this.fromString(a).mul(this.fromString(b));
  },

  divide(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return this.fromString(a).div(this.fromString(b));
  },

  toString(decimal: Decimal, precision?: number): string {
    return precision ? decimal.toFixed(precision) : decimal.toString();
  },

  isGreaterThan(
    a: string | number | Decimal,
    b: string | number | Decimal,
  ): boolean {
    return this.fromString(a).greaterThan(this.fromString(b));
  },

  isLessThan(
    a: string | number | Decimal,
    b: string | number | Decimal,
  ): boolean {
    return this.fromString(a).lessThan(this.fromString(b));
  },

  isGreaterThanOrEqualTo(
    a: string | number | Decimal,
    b: string | number | Decimal,
  ): boolean {
    return this.fromString(a).greaterThanOrEqualTo(this.fromString(b));
  },

  isLessThanOrEqualTo(
    a: string | number | Decimal,
    b: string | number | Decimal,
  ): boolean {
    return this.fromString(a).lessThanOrEqualTo(this.fromString(b));
  },

  isEqualTo(
    a: string | number | Decimal,
    b: string | number | Decimal,
  ): boolean {
    return this.fromString(a).equals(this.fromString(b));
  },

  toNumber(value: string | number | Decimal): number {
    return this.fromString(value).toNumber();
  },
};
