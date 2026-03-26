import { useContext } from 'react';
import { get } from 'lodash';
import { formatUnits } from 'viem';
import { ALL_CHAINS } from '../../constants/server';
import useTransactionManager from '../../hooks/useTransactionManager';
import { getViemPublicClient, getWeb3Endpoint } from '../../core/util';
import { GlobalContext } from '../../core/globalContext';
import {
  bridgeTxMinGasFromQuote,
  normalizeEvmAddress,
  normalizeEvmCalldata,
  parseEvmTxValueToBigInt,
} from './evmTxViem';
import {
  BridgeV2ExecutionResult,
  BridgeV2QuoteEvmTransaction,
} from './types';

export default function useEvmExecution() {
  const { executeTransferContract } = useTransactionManager();
  const globalContext = useContext<any>(GlobalContext);

  async function executeEvmTransaction(
    tx: BridgeV2QuoteEvmTransaction,
  ): Promise<BridgeV2ExecutionResult> {
    try {
      const numericChainId = Number(tx.chainId);
      const currentChain = ALL_CHAINS.find(
        chain => chain.chainIdNumber === numericChainId,
      );

      if (!currentChain) {
        return { isError: true, error: `Chain not found for chainId ${tx.chainId}` };
      }

      const rpc = getWeb3Endpoint(currentChain, globalContext);
      if (!rpc) {
        return { isError: true, error: `No RPC endpoint for chainId ${tx.chainId}` };
      }

      const publicClient = getViemPublicClient(rpc);
      const contractData = normalizeEvmCalldata(tx.data);
      const valueWei = parseEvmTxValueToBigInt(tx.value);
      const isNativeTransfer = valueWei > 0n;
      const minGasLimit = bridgeTxMinGasFromQuote(tx.gasLimit);

      const hash = await executeTransferContract(
        {
          publicClient,
          chain: currentChain,
          amountToSend: isNativeTransfer
            ? formatUnits(valueWei, 18)
            : '0',
          toAddress: normalizeEvmAddress(tx.to),
          contractAddress: normalizeEvmAddress(tx.to),
          contractDecimals: isNativeTransfer ? 18 : 0,
          contractData,
          isErc20: !isNativeTransfer,
          minGasLimit,
        },
        undefined,
      );

      if (hash.isError) {
        const errMsg = hash.error instanceof Error
          ? hash.error.message
          : typeof hash.error === 'string'
            ? hash.error
            : JSON.stringify(hash.error) ?? 'Transaction failed';
        return { isError: true, error: errMsg };
      }
      return { isError: false, hash: hash.hash, chainId: tx.chainId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { isError: true, error: msg };
    }
  }

  async function executeEvmApprovalThenSwap(
    approvalTx: BridgeV2QuoteEvmTransaction | undefined,
    swapTx: BridgeV2QuoteEvmTransaction,
    tokenDecimals: number,
  ): Promise<BridgeV2ExecutionResult> {
    if (approvalTx) {
      const approvalResult = await executeEvmTransaction(approvalTx);
      if (approvalResult.isError) {
        return { isError: true, error: `Approval failed: ${approvalResult.error}` };
      }
    }

    return executeEvmTransaction(swapTx);
  }

  return { executeEvmTransaction, executeEvmApprovalThenSwap };
}
