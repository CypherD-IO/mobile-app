export class GasPriceDetail {
  chainId!: string;
  gasPrice!: number;
  tokenPrice!: number;
  isEIP1559Supported?: boolean;
  maxFee?: number;
  baseFee?: number;
  priorityFee?: number;
}
