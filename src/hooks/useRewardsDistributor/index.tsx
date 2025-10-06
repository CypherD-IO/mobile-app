/**
 * useRewardsDistributor Hook
 *
 * Custom hook for interacting with the Rewards Distributor smart contract
 * on Base (mainnet) chain. Handles claiming rewards with Merkle proofs.
 *
 * Contract: 0x204f179de0c6decae6ae93e7427139016dd16c2a
 * Chain: Base (Chain ID: 8453 / 0x2105)
 */

// import { useNavigation } from '@react-navigation/native';
import { useWalletInfo } from '@reown/appkit-wagmi-react-native';
import * as Sentry from '@sentry/react-native';
import { getChainId } from '@wagmi/core';
import { useContext } from 'react';
import { Platform } from 'react-native';
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  Hex,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
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
  const hdWalletContext = useContext(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { walletInfo } = useWalletInfo();
  const { showModal, hideModal } = useGlobalModalContext();

  /**
   * Get transaction receipt and wait for confirmation on Base mainnet
   */
  const getTransactionReceipt = async (
    hash: `0x${string}`,
  ): Promise<`0x${string}`> => {
    const publicClient = createPublicClient({
      chain: base,
      transport: http('https://mainnet.base.org'),
    });

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        pollingInterval: 1500,
      });

      if (receipt.status === 'success') {
        return hash;
      }
      throw new Error('Transaction reverted on Base');
    } catch (error) {
      console.error('❌ Error waiting for transaction receipt:', error);
      throw error;
    }
  };

  /**
   * Encode the claimMultiple function call
   */
  const encodeClaimMultiple = (params: ClaimRewardsParams): `0x${string}` => {
    try {
      const data = encodeFunctionData({
        abi: REWARDS_DISTRIBUTOR_ABI,
        functionName: 'claimMultiple',
        args: [params.proofs, params.rootIds, params.values],
      });

      return data;
    } catch (error) {
      console.error('❌ Error encoding function call:', error);
      throw error;
    }
  };

  /**
   * Estimate gas for the claim transaction
   * Using a safe default on Base
   */
  const estimateClaimGas = async (
    params: ClaimRewardsParams,
  ): Promise<bigint> => {
    // Use a safe default gas limit for claim transactions
    // ClaimMultiple typically uses ~150k-300k gas depending on number of claims
    const defaultGas = 500000n;

    return defaultGas;
  };

  /**
   * Handle chain switching if needed (WalletConnect)
   */
  const ensureCorrectChain = async (): Promise<boolean> => {
    try {
      const connectionType = await getConnectionType();

      // For native wallet, we don't need to switch chains
      if (connectionType !== ConnectionTypes.WALLET_CONNECT) {
        return true;
      }

      if (!wagmiConfig) {
        console.warn('⚠️ Wagmi config not initialized for chain switching');
        return true; // Proceed anyway for native wallet
      }

      const connectedChain: number = getChainId(wagmiConfig);

      if (connectedChain !== base.id) {
        // Show warning modal for MetaMask on Android
        if (
          walletInfo?.name === 'MetaMask Wallet' &&
          Platform.OS === 'android'
        ) {
          showModal('state', {
            type: 'warning',
            title: 'Switch to Base',
            description:
              "If you don't see a switch chain popup in your MetaMask wallet, please manually change the connected chain to Base.",
            onSuccess: hideModal,
          });
        }

        await switchChainAsync({
          chainId: base.id,
        });

        hideModal();
        await sleepFor(1000);

        return true;
      }

      return true;
    } catch (error) {
      console.error('❌ Error switching chain:', error);
      Sentry.captureException(error);

      showModal('state', {
        type: 'error',
        title: "Couldn't Switch Chain",
        description:
          'Failed to switch to Base chain. Please switch manually in your wallet.',
        onSuccess: hideModal,
        onFailure: hideModal,
      });

      return false;
    }
  };

  /**
   * Send claim transaction using WalletConnect (Base)
   */
  const claimViaWalletConnect = async (
    params: ClaimRewardsParams,
  ): Promise<`0x${string}`> => {
    // Ensure we're on the correct chain
    const chainSwitched = await ensureCorrectChain();
    if (!chainSwitched) {
      throw new Error('Failed to switch to Base chain');
    }

    // Encode the function call
    const data = encodeClaimMultiple(params);

    // Estimate gas
    const gas = await estimateClaimGas(params);

    // Set up timeout for user signing
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_resolve, _reject) => {
      timer = setTimeout(() => {
        _reject(
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
        chainId: base.id,
      });

      const hash = await Promise.race([sendTransactionPromise, timeoutPromise]);

      cleanup();

      // Wait for confirmation
      const receipt = await getTransactionReceipt(hash);
      return receipt;
    } catch (error) {
      cleanup();
      throw error;
    }
  };

  /**
   * Send claim transaction using native wallet (private key) on Base
   */
  const claimViaNativeWallet = async (
    params: ClaimRewardsParams,
  ): Promise<`0x${string}`> => {
    // Load private key from keychain
    const pin = hdWalletContext?.state?.pinValue ?? '';

    const privateKey = await loadPrivateKeyFromKeyChain(false, pin);

    if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
      const account = privateKeyToAccount(privateKey as Hex);
      if (
        params.fromAddress &&
        account.address.toLowerCase() !== params.fromAddress.toLowerCase()
      ) {
        throw new Error('From address does not match the loaded wallet');
      }

      // Create wallet client with Base RPC
      const client = createWalletClient({
        account,
        chain: base,
        transport: http('https://mainnet.base.org'),
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

      let hash: `0x${string}`;

      if (connectionType === ConnectionTypes.WALLET_CONNECT) {
        hash = await claimViaWalletConnect(params);
      } else {
        hash = await claimViaNativeWallet(params);
      }

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
    chain: base,
  };
}
