import { useEffect } from 'react';
import useEvmExecution from './executeEvmTx';
import useSolanaExecution from './executeSolanaTx';
import useCosmosExecution from './executeCosmosMessages';
import { registerBridgeExecutors } from './executionBridge';

/**
 * Renders nothing. Must be mounted inside the WagmiProvider tree so that
 * wagmi-dependent hooks (useTransactionManager → useEthSigner → useSwitchChain, etc.)
 * have access to the WagmiContext. Registers the resulting execution functions
 * into a module-level registry so that components outside the WagmiProvider
 * (e.g. GlobalBottomSheet content) can invoke them.
 */
export default function BridgeV2ExecutionRegistrar(): null {
  const { executeEvmApprovalThenSwap, executeEvmTransaction } = useEvmExecution();
  const { executeSolanaTransaction } = useSolanaExecution();
  const { executeCosmosMessages } = useCosmosExecution();

  useEffect(() => {
    registerBridgeExecutors({
      executeEvmApprovalThenSwap,
      executeEvmTransaction,
      executeSolanaTransaction,
      executeCosmosMessages,
    });
  }, [executeEvmApprovalThenSwap, executeEvmTransaction, executeSolanaTransaction, executeCosmosMessages]);

  return null;
}
