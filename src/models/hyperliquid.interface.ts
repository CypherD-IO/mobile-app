import { HyperLiquidTransfers } from '../constants/enum';

export interface ISpotTransfer {
  type: HyperLiquidTransfers.SPOT_TRANSFER;
  token: string;
  amount: string;
  usdcValue: string;
  user: string;
  destination: string;
  fee: string;
  nativeTokenFee: string;
}

export interface IPerpTransfer {
  type: HyperLiquidTransfers.PERPETUAL_TRANSFER;
  usdc: string;
  user: string;
  destination: string;
  fee: string;
}

export interface IHyperLiquidTransfer {
  time: number;
  hash: string;
  delta: ISpotTransfer | IPerpTransfer;
}
