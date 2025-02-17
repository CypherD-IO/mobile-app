export interface ICardLimits {
  cCode: string;
  currentLimit: { d: number; m: number };
  cusL: {
    dom: { atm: number; ecom: number; pos: number; tap: number; wal: number };
    intl: { dis: boolean };
  };
  maxLimit: { d: number; m: number };
  planLimit: { d: number; m: number };
}
