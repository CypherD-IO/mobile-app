import Web3 from 'web3';

export interface EthTransaction {
  from: string;
  to: string;
  gasPrice: number;
  value: string | number;
  gas: string | number;
}

export interface RawTransaction {
  web3: Web3;
  transactionToBeSigned: EthTransaction;
}
