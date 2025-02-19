import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Hex } from 'viem';

export type EVM_ONLY_CHAINS_TYPE =
  | 'ETH'
  | 'POLYGON'
  | 'AVALANCHE'
  | 'ARBITRUM'
  | 'OPTIMISM'
  | 'BSC';

export type EVM_CHAINS_TYPE = EVM_ONLY_CHAINS_TYPE;

export type COSMOS_CHAINS_TYPE =
  | 'COSMOS'
  | 'OSMOSIS'
  | 'JUNO'
  | 'STARGAZE'
  | 'NOBLE';

export type ALL_CHAINS_TYPE = EVM_CHAINS_TYPE | COSMOS_CHAINS_TYPE;

export interface NavigationProps {
  navigation: NavigationProp<ParamListBase>;
}

export type TransactionResponse =
  | {
      isError: false;
      hash: string;
      gasFeeInCrypto?: string;
    }
  | {
      isError: true;
      error: unknown;
    };

export type CheckAllowanceResponse = Promise<
  | {
      isError: false;
      hasEnoughAllowance: true;
    }
  | {
      isError: false;
      hasEnoughAllowance: false;
      tokens: bigint;
    }
  | {
      isError: true;
      error: unknown;
    }
>;

export type EvmGasEstimation =
  | { isError: true; error: unknown }
  | ({
      isError?: undefined;
      gasLimit: number;
      gasFeeInCrypto: string;
    } & (
      | { isEIP1599Supported: false; gasPrice: Hex }
      | {
          isEIP1599Supported: true;
          priorityFee: number;
          baseFee: number;
          maxFee: number;
        }
    ));

export type CosmosGasEstimation =
  | { isError: true; error: unknown }
  | {
      isError: false;
      gasFeeInCrypto: string;
      gasLimit: string;
      gasPrice: number;
      fee: {
        gas: string;
        amount: Array<{ denom: string; amount: string }>;
      };
    };

export type SolanaGasEstimation =
  | {
      isError: true;
      error: unknown;
    }
  | {
      isError: false;
      gasFeeInCrypto: string;
      gasPrice: number;
    };

export type EvmGasPriceBackendResponse =
  | {
      gasPrice: 0;
      tokenPrice: 0;
      chainId: string;
    }
  | {
      gasPrice: number;
      tokenPrice: number;
      chainId: string;
    }
  | {
      chainId: string;
      isEIP1599Supported: true;
      tokenPrice: number;
      factor: number;
      enforceFactor: boolean;
      maxFee: number;
      baseFee: number;
      priorityFee: number;
      gasPrice: number;
    }
  | {
      chainId: string;
      isEIP1599Supported: false;
      tokenPrice: number;
      factor: number;
      enforceFactor: boolean;
      gasPrice: number;
    };

export interface CosmosGasPriceBackendResponse {
  chainId: string;
  gasPrice: number;
  gasLimitMultiplier: number;
}
