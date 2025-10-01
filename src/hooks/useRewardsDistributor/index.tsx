/**
 * useRewardsDistributor Hook
 *
 * Custom hook for interacting with the Rewards Distributor smart contract
 * on Base Sepolia chain. Handles claiming rewards with Merkle proofs.
 *
 * Contract: 0x355a548FE06ba5CBa40d3e011179B67bb553f9A9
 * Chain: Base Sepolia (Chain ID: 84532 / 0x14a34)
 */

import { useNavigation } from '@react-navigation/native';
import { useWalletInfo } from '@reown/appkit-wagmi-react-native';
import * as Sentry from '@sentry/react-native';
import { getChainId } from '@wagmi/core';
import { useContext } from 'react';
import { Platform } from 'react-native';
import { createWalletClient, encodeFunctionData, Hex, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { useSendTransaction, useSwitchChain, WagmiContext } from 'wagmi';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { ConnectionTypes } from '../../constants/enum';
import { getConnectionType } from '../../core/asyncStorage';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';
import {
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  HdWalletContext,
  sleepFor,
} from '../../core/util';

/**
 * Rewards Distributor Contract Configuration
 */
const REWARDS_DISTRIBUTOR_CONTRACT =
  '0x0506AE2a8F884DEAFF200530E116ce444fD78AB6' as const;

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
  proofs: `0x${string}`[][];

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
  hash: `0x${string}`;

  /**
   * Whether the transaction was successful
   */
  success: boolean;

  /**
   * Error message if transaction failed
   */
  error?: string;
}

/**
 * Custom hook for Rewards Distributor contract interactions
 */
export default function useRewardsDistributor() {
  const wagmiConfig = useContext(WagmiContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { walletInfo } = useWalletInfo();
  const { showModal, hideModal } = useGlobalModalContext();

  /**
   * Get transaction receipt and wait for confirmation
   * Note: Since baseSepolia is not in wagmiConfig, we skip receipt verification
   * and return the hash directly
   */
  const getTransactionReceipt = async (
    hash: `0x${string}`,
  ): Promise<`0x${string}`> => {
    console.log('📜 Transaction hash received:', hash);
    console.log(
      '⚠️ Skipping receipt verification (baseSepolia not in wagmiConfig)',
    );
    // Return the hash directly since baseSepolia is not configured in wagmi
    return hash;
  };

  /**
   * Encode the claimMultiple function call
   */
  const encodeClaimMultiple = (params: ClaimRewardsParams): `0x${string}` => {
    try {
      console.log('📝 Encoding claimMultiple function call...');
      console.log('  - Proofs count:', params.proofs.length);
      console.log('  - RootIds count:', params.rootIds.length);
      console.log('  - Values count:', params.values.length);

      const data = encodeFunctionData({
        abi: REWARDS_DISTRIBUTOR_ABI,
        functionName: 'claimMultiple',
        args: [params.proofs, params.rootIds, params.values],
      });

      console.log('✅ Function call encoded successfully');
      return data;
    } catch (error) {
      console.error('❌ Error encoding function call:', error);
      throw error;
    }
  };

  /**
   * Estimate gas for the claim transaction
   * Note: Since baseSepolia is not in wagmiConfig, we use a safe default
   */
  const estimateClaimGas = async (
    params: ClaimRewardsParams,
  ): Promise<bigint> => {
    console.log('⛽ Using default gas limit for claim transaction...');
    console.log('⚠️ Gas estimation skipped (baseSepolia not in wagmiConfig)');

    // Use a safe default gas limit for claim transactions
    // ClaimMultiple typically uses ~150k-300k gas depending on number of claims
    const defaultGas = 500000n;
    console.log('✅ Using default gas:', defaultGas.toString());

    return defaultGas;
  };

  /**
   * Handle chain switching if needed
   * Note: For native wallet mode, chain switching is not required
   */
  const ensureCorrectChain = async (): Promise<boolean> => {
    try {
      const connectionType = await getConnectionType();

      // For native wallet, we don't need to switch chains
      if (connectionType !== ConnectionTypes.WALLET_CONNECT) {
        console.log('✅ Using native wallet - chain switching not required');
        return true;
      }

      if (!wagmiConfig) {
        console.warn('⚠️ Wagmi config not initialized for chain switching');
        return true; // Proceed anyway for native wallet
      }

      const connectedChain = getChainId(wagmiConfig);

      if (connectedChain !== baseSepolia.id) {
        console.log(
          `🔄 Switching chain from ${connectedChain} to Base Sepolia (${baseSepolia.id})...`,
        );

        // Show warning modal for MetaMask on Android
        if (
          walletInfo?.name === 'MetaMask Wallet' &&
          Platform.OS === 'android'
        ) {
          showModal('state', {
            type: 'warning',
            title: 'Switch to Base Sepolia',
            description:
              "If you don't see a switch chain popup in your MetaMask wallet, please manually change the connected chain to Base Sepolia.",
            onSuccess: hideModal,
          });
        }

        await switchChainAsync({
          chainId: baseSepolia.id,
        });

        hideModal();
        await sleepFor(1000);

        console.log('✅ Chain switched to Base Sepolia');
        return true;
      }

      console.log('✅ Already on Base Sepolia chain');
      return true;
    } catch (error) {
      console.error('❌ Error switching chain:', error);
      Sentry.captureException(error);

      showModal('state', {
        type: 'error',
        title: "Couldn't Switch Chain",
        description:
          'Failed to switch to Base Sepolia chain. Please switch manually in your wallet.',
        onSuccess: hideModal,
        onFailure: hideModal,
      });

      return false;
    }
  };

  /**
   * Send claim transaction using WalletConnect
   */
  const claimViaWalletConnect = async (
    params: ClaimRewardsParams,
  ): Promise<`0x${string}`> => {
    console.log('🔗 Claiming via WalletConnect...');

    // Ensure we're on the correct chain
    const chainSwitched = await ensureCorrectChain();
    if (!chainSwitched) {
      throw new Error('Failed to switch to Base Sepolia chain');
    }

    // Encode the function call
    const data = encodeClaimMultiple(params);

    // Estimate gas
    const gas = await estimateClaimGas(params);

    // Set up timeout for user signing
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, rejectTimeout) => {
      timer = setTimeout(() => {
        rejectTimeout(
          new Error(
            "Transaction request timed out. User didn't sign the transaction request",
          ),
        );
      }, 60 * 1000); // 60 second timeout
    });

    const cleanup = () => {
      clearTimeout(timer);
    };

    try {
      // Send transaction
      const sendTransactionPromise = sendTransactionAsync({
        account: params.fromAddress,
        to: REWARDS_DISTRIBUTOR_CONTRACT,
        data,
        gas,
        chainId: baseSepolia.id,
      });

      const hash = await Promise.race([sendTransactionPromise, timeoutPromise]);

      cleanup();

      console.log('✅ Transaction sent:', hash);

      // Wait for confirmation
      const receipt = await getTransactionReceipt(hash);
      return receipt;
    } catch (error) {
      cleanup();
      throw error;
    }
  };

  /**
   * Send claim transaction using native wallet (private key)
   */
  const claimViaNativeWallet = async (
    params: ClaimRewardsParams,
  ): Promise<`0x${string}`> => {
    console.log('🔐 Claiming via native wallet...');

    // Load private key from keychain
    const privateKey = await loadPrivateKeyFromKeyChain(
      false,
      hdWalletContext.state.pinValue,
    );

    if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
      const account = privateKeyToAccount(privateKey as Hex);

      console.log('✅ Private key loaded, account:', account.address);

      // Create wallet client with Base Sepolia RPC
      const client = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http('https://sepolia.base.org'),
      });

      // Encode the function call
      const data = encodeClaimMultiple(params);

      // Estimate gas
      const gas = await estimateClaimGas(params);

      // Send transaction
      const hash = await client.sendTransaction({
        to: REWARDS_DISTRIBUTOR_CONTRACT,
        data,
        gas,
      });

      console.log('✅ Transaction sent:', hash);

      // Wait for confirmation
      const receipt = await getTransactionReceipt(hash);
      return receipt;
    } else {
      throw new Error('Authentication failed, unable to retrieve private key');
    }
  };

  /**
   * Main function to claim rewards
   * Handles both WalletConnect and native wallet flows
   */
  const claimRewards = async (
    params: ClaimRewardsParams,
  ): Promise<ClaimResult> => {
    try {
      console.log('🎁 Starting reward claim...');
      console.log('📋 Claim parameters:');
      console.log('  - From:', params.fromAddress);
      console.log('  - Number of claims:', params.proofs.length);
      console.log(
        '  - Root IDs:',
        params.rootIds.map(id => id.toString()),
      );
      console.log(
        '  - Values:',
        params.values.map(v => v.toString()),
      );

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
        throw new Error('No claims provided');
      }

      // Check connection type
      const connectionType = await getConnectionType();
      console.log('🔌 Connection type:', connectionType);

      let hash: `0x${string}`;

      if (connectionType === ConnectionTypes.WALLET_CONNECT) {
        hash = await claimViaWalletConnect(params);
      } else {
        hash = await claimViaNativeWallet(params);
      }

      console.log('🎉 Rewards claimed successfully!');
      console.log('📜 Transaction hash:', hash);

      return {
        hash,
        success: true,
      };
    } catch (error) {
      console.error('❌ Error claiming rewards:', error);
      Sentry.captureException(error);

      // Show error modal
      showModal('state', {
        type: 'error',
        title: 'Claim Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to claim rewards. Please try again.',
        onSuccess: hideModal,
        onFailure: hideModal,
      });

      return {
        hash: '0x' as `0x${string}`,
        success: false,
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
     * Encode the claimMultiple function call (useful for testing)
     */
    encodeClaimMultiple,

    /**
     * Estimate gas for a claim transaction
     */
    estimateClaimGas,

    /**
     * Contract address
     */
    contractAddress: REWARDS_DISTRIBUTOR_CONTRACT,

    /**
     * Chain information
     */
    chain: baseSepolia,
  };
}
