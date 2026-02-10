/**
 * useRewardsDistributor Hook
 *
 * Custom hook for interacting with the Rewards Distributor smart contract
 * on Base (mainnet) chain. Handles claiming rewards with Merkle proofs.
 *
 * Contract: 0x204f179de0c6decae6ae93e7427139016dd16c2a
 * Chain: Base (Chain ID: 8453 / 0x2105)
 */

import * as Sentry from '@sentry/react-native';
import { useContext } from 'react';
import { encodeFunctionData } from 'viem';
import { get } from 'lodash';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { getViemPublicClient, getWeb3Endpoint } from '../../core/util';
import useTransactionManager from '../useTransactionManager';
import { ChainConfigMapping } from '../../constants/server';

/**
 * Rewards Distributor Contract Configuration (Base mainnet)
 */
// TODO: Change to Base mainnet contract
const REWARDS_DISTRIBUTOR_CONTRACT =
  '0x3aDCB5664d9ABB0bD7991Bcd295E095a95295BE5' as const;

/**
 * ABI for the claimMultiple function
 */
const REWARDS_DISTRIBUTOR_ABI = [
  {
    name: 'claimMultiple',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'proofs',
        type: 'bytes32[][]',
        internalType: 'bytes32[][]',
      },
      {
        name: 'rootIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'values',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ] as const,
    outputs: [],
  },
] as const;

/**
 * Parameters for claiming rewards
 */
export interface ClaimRewardsParams {
  /**
   * Array of Merkle proofs for each claim
   * Each proof is an array of bytes32 hashes
   */
  proofs: Array<Array<`0x${string}`>>;

  /**
   * Array of root IDs corresponding to each claim
   */
  rootIds: bigint[];

  /**
   * Array of token amounts to claim
   * Must claim full amount for each rootId
   */
  values: bigint[];

  /**
   * User's Ethereum address
   */
  fromAddress: `0x${string}`;
}

/**
 * Result of a claim transaction
 */
export interface ClaimResult {
  /**
   * Transaction hash
   */
  hash?: string;

  /**
   * Whether the transaction was successful
   */
  isError: boolean;

  /**
   * Error message if transaction failed
   */
  error?: string | Error | unknown;
}

/**
 * Custom hook for Rewards Distributor contract interactions
 * Uses the same pattern as airdrop claim via useTransactionManager
 */
export default function useRewardsDistributor() {
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { executeTransferContract } = useTransactionManager();

  /**
   * Execute rewards claim contract call
   * Similar to executeAirdropClaimContract pattern
   */
  const executeRewardsClaimContract = async (
    params: ClaimRewardsParams,
  ): Promise<ClaimResult> => {
    try {
      // Use Base mainnet chain
      const chain = 'base';
      const chainConfig = get(ChainConfigMapping, chain);

      if (!chainConfig) {
        console.error('❌ Chain config not found for Base');
        throw new Error('Chain configuration not found');
      }

      // Get public client for Base
      const publicClient = getViemPublicClient(
        getWeb3Endpoint(chainConfig, globalContext),
      );

      // Encode the claimMultiple function call
      const contractData = encodeFunctionData({
        abi: REWARDS_DISTRIBUTOR_ABI,
        functionName: 'claimMultiple',
        args: [params.proofs, params.rootIds, params.values],
      });

      // Execute the contract call using the transaction manager
      const resp = await executeTransferContract(
        {
          publicClient,
          chain: chainConfig,
          amountToSend: '0', // No ETH needed for claim
          toAddress: REWARDS_DISTRIBUTOR_CONTRACT,
          contractAddress: REWARDS_DISTRIBUTOR_CONTRACT,
          contractDecimals: 18,
          contractData,
          isErc20: true, // Treat as ERC20 contract call
        },
        undefined, // No abort signal for rewards distributor
      );

      if (resp.isError) {
        throw new Error('Contract execution failed');
      }

      return resp;
    } catch (error) {
      Sentry.captureException(error);
      return { isError: true, error };
    }
  };

  /**
   * Main function to claim rewards
   * Wrapper around executeRewardsClaimContract for backwards compatibility
   */
  const claimRewards = async (
    params: ClaimRewardsParams,
  ): Promise<ClaimResult> => {
    try {
      // Validate parameters
      if (
        params.proofs.length !== params.rootIds.length ||
        params.rootIds.length !== params.values.length
      ) {
        throw new Error(
          'Invalid parameters: proofs, rootIds, and values must have the same length',
        );
      }

      if (params.proofs.length === 0) {
        console.error('❌ No claims provided');
        throw new Error('No claims provided');
      }

      const result = await executeRewardsClaimContract(params);
      return result;
    } catch (error) {
      console.error('❌ Error claiming rewards:', error);
      Sentry.captureException(error);

      return {
        isError: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  return {
    /**
     * Claim multiple rewards with Merkle proofs
     */
    claimRewards,

    /**
     * Execute rewards claim contract (same pattern as airdrop)
     */
    executeRewardsClaimContract,

    /**
     * Contract address
     */
    contractAddress: REWARDS_DISTRIBUTOR_CONTRACT,
  };
}
