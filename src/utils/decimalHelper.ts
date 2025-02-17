import Decimal from 'decimal.js';

export const DecimalHelper = {
  fromString(value: string | number | Decimal | bigint): Decimal {
    if (value instanceof Decimal) return value;
    try {
      if (typeof value === 'bigint') {
        return new Decimal(value.toString());
      }
      return new Decimal(value.toString());
    } catch {
      return new Decimal(0);
    }
  },

  subtract(
    a: string | number | Decimal | bigint,
    b:
      | string
      | number
      | Decimal
      | bigint
      | Array<string | number | Decimal | bigint>,
  ): Decimal {
    if (Array.isArray(b)) {
      return b.reduce<Decimal>(
        (result, value) => this.fromString(result).sub(this.fromString(value)),
        this.fromString(a),
      );
    }
    return this.fromString(a).sub(this.fromString(b));
  },

  add(
    a: string | number | Decimal | bigint,
    b:
      | string
      | number
      | Decimal
      | bigint
      | Array<string | number | Decimal | bigint>,
  ): Decimal {
    if (Array.isArray(b)) {
      return b.reduce<Decimal>(
        (result, value) => this.fromString(result).add(this.fromString(value)),
        this.fromString(a),
      );
    }
    return this.fromString(a).add(this.fromString(b));
  },

  multiply(
    a: string | number | Decimal | bigint,
    b:
      | string
      | number
      | Decimal
      | bigint
      | Array<string | number | Decimal | bigint>,
  ): Decimal {
    if (Array.isArray(b)) {
      return b.reduce<Decimal>(
        (result, value) => this.fromString(result).mul(this.fromString(value)),
        this.fromString(a),
      );
    }
    return this.fromString(a).mul(this.fromString(b));
  },

  divide(
    a: string | number | Decimal | bigint,
    b:
      | string
      | number
      | Decimal
      | bigint
      | Array<string | number | Decimal | bigint>,
  ): Decimal {
    if (Array.isArray(b)) {
      return b.reduce<Decimal>(
        (result, value) => this.fromString(result).div(this.fromString(value)),
        this.fromString(a),
      );
    }
    return this.fromString(a).div(this.fromString(b));
  },

  toString(decimal: Decimal, precision?: number): string {
    return precision
      ? this.floor(decimal, precision).toString()
      : decimal.toString();
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

  notEqual(
    a: string | number | Decimal,
    b: string | number | Decimal,
  ): boolean {
    return !this.fromString(a).equals(this.fromString(b));
  },

  toNumber(value: string | number | Decimal): number {
    return this.fromString(value).toNumber();
  },

  pow(base: number, exponent: number): Decimal {
    return new Decimal(base).pow(exponent);
  },

  toInteger(value: string | number | Decimal, decimals: number): Decimal {
    return this.multiply(value, this.pow(10, decimals));
  },

  toDecimal(value: string | number | Decimal, decimals: number): Decimal {
    return this.divide(value, this.pow(10, decimals));
  },

  ceil(value: string | number | Decimal, precision: number): Decimal {
    return this.fromString(value).toDecimalPlaces(precision, Decimal.ROUND_UP);
  },

  floor(value: string | number | Decimal, precision: number): Decimal {
    return this.fromString(value).toDecimalPlaces(
      precision,
      Decimal.ROUND_DOWN,
    );
  },

  round(value: string | number | Decimal, precision: number): Decimal {
    return this.fromString(value).toDecimalPlaces(
      precision,
      Decimal.ROUND_HALF_UP,
    );
  },
};
