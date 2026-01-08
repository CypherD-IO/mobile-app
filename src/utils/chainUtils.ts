import { ChainBackendNames } from "../constants/server";
import { EVM_ONLY_CHAINS, SOLANA_ONLY_CHAINS, COSMOS_ONLY_CHAINS } from "../constants/enum";

export function getTargetChainBackendName(chain: string): string {
    if (EVM_ONLY_CHAINS.includes(chain)) {
      return ChainBackendNames.ETH;
    }
    if (COSMOS_ONLY_CHAINS.includes(chain)) {
      return ChainBackendNames.OSMOSIS;
    }
    if (SOLANA_ONLY_CHAINS.includes(chain)) {
      return ChainBackendNames.SOLANA;
    }
    throw new Error('Invalid chain name: ' + chain);
  }