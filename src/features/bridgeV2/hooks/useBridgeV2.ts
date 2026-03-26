import { useCallback, useContext, useRef, useState } from 'react';
import { get } from 'lodash';
import { HdWalletContext } from '../../../core/util';
import { ChainIdNameMapping } from '../../../constants/data';
import { getConnectionType } from '../../../core/asyncStorage';
import useBridgeV2Api from '../api';
import { filterBridgeV2ChainsByConnectionType } from '../filterBridgeV2ChainsByConnection';
import { CosmosMessagePayload } from '../executeCosmosMessages';
import {
  encodeErc20ApproveData,
  normalizeEvmCalldata,
  tryDecodeErc20ApproveCalldata,
} from '../evmTxViem';

function toErrorString(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (o.message != null && typeof o.message === 'string' && o.message.trim() !== '') {
      return o.message;
    }
    /** ARCH API: `{ errors: [{ message: "..." }] }` — HttpRequest may pass `errors[0]` or full body */
    if (Array.isArray(o.errors) && o.errors.length > 0) {
      const first = o.errors[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && first !== null && 'message' in first) {
        return String((first as { message: unknown }).message);
      }
    }
    if ('message' in o && o.message != null) {
      return String(o.message);
    }
  }
  return String(err);
}
import {
  BridgeV2Chain,
  BridgeV2CosmosMessagesRequestDto,
  BridgeV2ExecutionResult,
  BridgeV2QuoteEvmTransaction,
  BridgeV2QuoteRequestDto,
  BridgeV2QuoteResponse,
  BridgeV2SignReviewPayload,
  BridgeV2StatusResponse,
  BridgeV2StatusSubstatus,
  BridgeV2Token,
  BridgeV2TokensResponse,
  BRIDGE_V2_USER_REJECTED_SIGN,
  ExecutionEvent,
  ExecutionStep,
  EXPLORER_BASE_URLS,
  HYPERLIQUID_CHAIN_ID,
  LIFI_SUBSTATUS_LABELS,
  SOLANA_CHAIN_ID,
  handleExecutionEvent,
} from '../types';
import {
  buildCosmosSignReview,
  buildEvmApprovalSignReview,
  buildEvmSignReview,
  buildRouteLegSummary,
  buildSolanaSignReview,
} from '../signReviewPayloads';

export type BridgeV2Step =
  | 'idle'
  | 'quoting'
  | 'quoted'
  | 'executing'
  | 'polling'
  | 'completed'
  | 'failed';

export interface BridgeV2Executors {
  executeEvmApprovalThenSwap: (
    approvalTx: any,
    swapTx: any,
    decimals: number,
  ) => Promise<BridgeV2ExecutionResult>;
  executeEvmTransaction: (
    tx: BridgeV2QuoteEvmTransaction,
  ) => Promise<BridgeV2ExecutionResult>;
  executeSolanaTransaction: (
    serializedTx: string,
  ) => Promise<BridgeV2ExecutionResult>;
  executeCosmosMessages: (
    cosmosTx: CosmosMessagePayload,
  ) => Promise<BridgeV2ExecutionResult>;
}

const STATUS_POLL_INTERVAL = 5_000;
const STATUS_POLL_MAX_ATTEMPTS = 120;
const SKIP_POLL_INTERVAL = 3_000;
const SKIP_POLL_MAX_ATTEMPTS = 80;

function getSkipOperationLabel(
  operation: any,
  chainNames: Record<string, string>,
): string {
  if (operation.swap) {
    const venueName =
      operation.swap.swap_venue?.name ?? operation.swap.swap_in?.swap_venue?.name;
    return venueName ? `Swapping on ${venueName}` : 'Swapping tokens';
  }
  if (operation.transfer) {
    const toChain = chainNames[operation.transfer.to_chain_id] ?? operation.transfer.to_chain_id;
    return `Transferring to ${toChain}`;
  }
  if (operation.axelar_transfer) {
    const toChain = chainNames[operation.axelar_transfer.to_chain_id] ?? operation.axelar_transfer.to_chain_id;
    return `Bridging via Axelar to ${toChain}`;
  }
  if (operation.cctp_transfer) {
    const toChain = chainNames[operation.cctp_transfer.to_chain_id] ?? operation.cctp_transfer.to_chain_id;
    return `CCTP transfer to ${toChain}`;
  }
  if (operation.hyperlane_transfer) {
    const toChain = chainNames[operation.hyperlane_transfer.to_chain_id] ?? operation.hyperlane_transfer.to_chain_id;
    return `Bridging via Hyperlane to ${toChain}`;
  }
  if (operation.bank_send) {
    return 'Sending tokens';
  }
  return 'Processing';
}

/** Best-effort chain id for explorer links on Skip route tracking steps. */
function getSkipOperationExplorerChainId(operation: any, fallbackChainId: string): string {
  if (operation.swap?.swap_in?.chain_id) return String(operation.swap.swap_in.chain_id);
  if (operation.swap?.swap_out?.chain_id) return String(operation.swap.swap_out.chain_id);
  if (operation.transfer?.from_chain_id) return String(operation.transfer.from_chain_id);
  if (operation.transfer?.chain_id) return String(operation.transfer.chain_id);
  if (operation.axelar_transfer?.from_chain_id) return String(operation.axelar_transfer.from_chain_id);
  if (operation.cctp_transfer?.from_chain_id) return String(operation.cctp_transfer.from_chain_id);
  if (operation.hyperlane_transfer?.from_chain_id) {
    return String(operation.hyperlane_transfer.from_chain_id);
  }
  if (operation.bank_send?.chain_id) return String(operation.bank_send.chain_id);
  return fallbackChainId;
}

function resolveErc20TokenMeta(
  tokenContract: string,
  chainId: string,
  tokensByChain: BridgeV2TokensResponse,
  sourceToken: BridgeV2Token,
  destToken: BridgeV2Token,
): { decimals: number; symbol: string } | undefined {
  const cid = String(chainId);
  const isSvm = cid === SOLANA_CHAIN_ID;
  const norm = (s: string) => (isSvm ? s.trim() : s.toLowerCase());
  const c = norm(tokenContract);
  if (!c) return undefined;
  if (sourceToken.chainId === cid && norm(sourceToken.tokenContract || '') === c) {
    return { decimals: sourceToken.decimals, symbol: sourceToken.symbol };
  }
  if (destToken.chainId === cid && norm(destToken.tokenContract || '') === c) {
    return { decimals: destToken.decimals, symbol: destToken.symbol };
  }
  const list = tokensByChain[cid] ?? [];
  const hit = list.find(t => norm(t.tokenContract || '') === c);
  if (hit) return { decimals: hit.decimals, symbol: hit.symbol };
  return undefined;
}

export default function useBridgeV2() {
  const hdWalletContext = useContext<any>(HdWalletContext);

  const {
    getBridgeV2Chains,
    getBridgeV2Tokens,
    postBridgeV2Quote,
    postBridgeV2Messages,
    getBridgeV2Status,
  } = useBridgeV2Api();

  const [chains, setChains] = useState<BridgeV2Chain[]>([]);
  const [tokensByChain, setTokensByChain] = useState<BridgeV2TokensResponse>({});
  /** Latest token cache for loadTokens to skip redundant network calls. */
  const tokensByChainRef = useRef(tokensByChain);
  tokensByChainRef.current = tokensByChain;
  /** Chain IDs with an in-flight tokens request (prevents duplicate parallel fetches for the same chain). */
  const tokensFetchInflightRef = useRef<Set<string>>(new Set());
  const [quote, setQuote] = useState<BridgeV2QuoteResponse | null>(null);
  const [statusInfo, setStatusInfo] = useState<BridgeV2StatusResponse | null>(null);
  const [step, setStep] = useState<BridgeV2Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [loading, setLoading] = useState({
    chains: false,
    tokens: false,
    quote: false,
    execute: false,
    status: false,
  });

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quoteAbortRef = useRef<AbortController | null>(null);
  const quoteRequestSeqRef = useRef(0);

  const emit = useCallback(
    (event: ExecutionEvent) => handleExecutionEvent(event, setExecutionSteps),
    [],
  );

  const getAddressForChainId = useCallback(
    (chainId: string): string => {
      const chainName = get(ChainIdNameMapping, chainId, '');
      if (!chainName) return '';
      return get(hdWalletContext, ['state', 'wallet', chainName, 'address'], '');
    },
    [hdWalletContext],
  );

  const getAddressesForChains = useCallback(
    (chainIds: string[]): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const id of chainIds) {
        const key = String(id);
        const addr = getAddressForChainId(key)?.trim();
        if (addr) result[key] = addr;
      }
      return result;
    },
    [getAddressForChainId],
  );

  const loadChains = useCallback(
    async (forceFetch?: boolean) => {
      setLoading(prev => ({ ...prev, chains: true }));
      setError(null);
      const resp = await getBridgeV2Chains({ forceFetch });
      setLoading(prev => ({ ...prev, chains: false }));

      if (resp.isError || !resp.data) {
        setError(resp.error ? toErrorString(resp.error) : 'Failed to load chains');
        return [];
      }
      let filtered = resp.data.filter(c => c.chainId !== HYPERLIQUID_CHAIN_ID);
      try {
        const connectionType = await getConnectionType();
        filtered = filterBridgeV2ChainsByConnectionType(filtered, connectionType);
      } catch {
        /* keep Hyperliquid-filtered list if AsyncStorage read fails */
      }
      setChains(filtered);
      /** Drop token caches for chains the user can’t use (e.g. Solana-only login). */
      const allowed = new Set(filtered.map(c => c.chainId));
      setTokensByChain(prev => {
        const next: typeof prev = {};
        for (const id of allowed) {
          if (prev[id]) next[id] = prev[id];
        }
        return next;
      });
      return filtered;
    },
    [getBridgeV2Chains],
  );

  const loadTokens = useCallback(
    async (chainIds: string[], forceFetch?: boolean) => {
      const unique = [...new Set(chainIds.map(id => String(id)))].filter(Boolean);

      const missing = unique.filter(id => {
        if (tokensFetchInflightRef.current.has(id)) return false;
        if (forceFetch) return true;
        /** Loaded = key exists (including `[]`); only `undefined` means never fetched. */
        return tokensByChainRef.current[id] === undefined;
      });

      if (missing.length === 0) {
        return {};
      }

      for (const id of missing) {
        tokensFetchInflightRef.current.add(id);
      }

      setLoading(prev => ({ ...prev, tokens: true }));
      setError(null);

      try {
        const resp = await getBridgeV2Tokens({ chainIds: missing, forceFetch });

        if (resp.isError || !resp.data) {
          setError(resp.error ? toErrorString(resp.error) : 'Failed to load tokens');
          return {};
        }

        const filtered: BridgeV2TokensResponse = {};
        for (const [chainId, tokens] of Object.entries(resp.data)) {
          if (chainId !== HYPERLIQUID_CHAIN_ID) {
            filtered[chainId] = tokens;
          }
        }
        /** Mark every requested chain so we don’t refetch forever on empty API lists / omitted keys. */
        for (const id of missing) {
          if (filtered[id] === undefined) {
            filtered[id] = [];
          }
        }

        setTokensByChain(prev => ({ ...prev, ...filtered }));
        return filtered;
      } finally {
        for (const id of missing) {
          tokensFetchInflightRef.current.delete(id);
        }
        setLoading(prev => ({ ...prev, tokens: false }));
      }
    },
    [getBridgeV2Tokens],
  );

  function validateQuoteInput(input: BridgeV2QuoteRequestDto): string | null {
    if (!input.sourceChainId) return 'Source chain is required';
    if (!input.destChainId) return 'Destination chain is required';
    if (!input.sourceTokenDenom) return 'Source token is required';
    if (!input.destTokenDenom) return 'Destination token is required';
    if (!input.amountIn || input.amountIn === '0') return 'Amount must be greater than 0';
    if (!/^\d+$/.test(input.amountIn)) return 'Amount must be an integer string in smallest units';
    if (!input.fromAddress?.trim()) return 'From address is required';
    if (
      input.slippage !== undefined &&
      (input.slippage < 0.001 || input.slippage > 0.5)
    ) {
      return 'Slippage must be between 0.001 and 0.5';
    }
    return null;
  }

  const fetchQuote = useCallback(
    async (input: BridgeV2QuoteRequestDto) => {
      const validationError = validateQuoteInput(input);
      if (validationError) {
        setError(validationError);
        return null;
      }

      quoteAbortRef.current?.abort();
      const ac = new AbortController();
      quoteAbortRef.current = ac;
      const seq = ++quoteRequestSeqRef.current;

      setStep('quoting');
      setLoading(prev => ({ ...prev, quote: true }));
      setError(null);
      setQuote(null);

      const resp = await postBridgeV2Quote(input, { signal: ac.signal });

      if (seq !== quoteRequestSeqRef.current) {
        return null;
      }

      setLoading(prev => ({ ...prev, quote: false }));

      if (resp.isError || !resp.data) {
        /** Stay on the form so we can show the message; `failed` is for post-quote execution only. */
        setStep('idle');
        setError(resp.error ? toErrorString(resp.error) : 'Failed to fetch quote');
        return null;
      }

      setQuote(resp.data);
      setStep('quoted');
      return resp.data;
    },
    [postBridgeV2Quote],
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (txHash: string, sourceChainId: string, destChainId: string) => {
      setStep('polling');
      setLoading(prev => ({ ...prev, status: true }));
      emit({
        type: 'step_added',
        stepId: 'lifi-status',
        label: 'Waiting for bridge confirmation',
        chainId: destChainId,
      });
      emit({ type: 'step_started', stepId: 'lifi-status' });
      let attempts = 0;

      const poll = async (): Promise<void> => {
        if (attempts >= STATUS_POLL_MAX_ATTEMPTS) {
          setStep('failed');
          setError('Status polling timed out');
          emit({ type: 'step_failed', stepId: 'lifi-status', error: 'Polling timed out' });
          setLoading(prev => ({ ...prev, status: false }));
          return;
        }
        attempts++;

        const resp = await getBridgeV2Status({ txHash, sourceChainId, destChainId });

        if (resp.isError || !resp.data) {
          pollingRef.current = setTimeout(poll, STATUS_POLL_INTERVAL);
          return;
        }

        setStatusInfo(resp.data);

        const subLabel =
          resp.data.substatusMessage ??
          (resp.data.substatus ? LIFI_SUBSTATUS_LABELS[resp.data.substatus] : undefined);
        if (subLabel) {
          emit({ type: 'step_label_updated', stepId: 'lifi-status', label: subLabel });
        }

        const terminalStatuses: string[] = ['DONE', 'FAILED'];
        const terminalSubstatuses = [
          BridgeV2StatusSubstatus.COMPLETED,
          BridgeV2StatusSubstatus.REFUNDED,
          BridgeV2StatusSubstatus.UNKNOWN_ERROR,
          BridgeV2StatusSubstatus.BRIDGE_NOT_AVAILABLE,
          BridgeV2StatusSubstatus.CHAIN_NOT_AVAILABLE,
        ];

        const isTerminal =
          terminalStatuses.includes(resp.data.status) ||
          (resp.data.substatus &&
            terminalSubstatuses.includes(resp.data.substatus));

        if (isTerminal) {
          const isSuccess =
            resp.data.status === 'DONE' ||
            resp.data.substatus === BridgeV2StatusSubstatus.COMPLETED;
          if (isSuccess) {
            emit({
              type: 'step_completed',
              stepId: 'lifi-status',
              txHash: resp.data.receivingTxHash,
              chainId: destChainId,
            });
          } else {
            emit({ type: 'step_failed', stepId: 'lifi-status', error: resp.data.substatusMessage ?? 'Bridge failed' });
          }
          setStep(isSuccess ? 'completed' : 'failed');
          if (!isSuccess) setError(resp.data.substatusMessage ?? 'Bridge failed');
          setLoading(prev => ({ ...prev, status: false }));
          return;
        }

        pollingRef.current = setTimeout(poll, STATUS_POLL_INTERVAL);
      };

      await poll();
    },
    [getBridgeV2Status],
  );

  const pollSkipStatus = useCallback(
    async (txHash: string, chainId: string, routeOperations: any[]) => {
      setStep('polling');
      setLoading(prev => ({ ...prev, status: true }));

      const chainNames: Record<string, string> = {};
      chains.forEach(c => { chainNames[c.chainId] = c.prettyName; });

      const stepIds: string[] = [];
      routeOperations.forEach((op, idx) => {
        const stepId = `skip-track-${idx}`;
        const label = getSkipOperationLabel(op, chainNames);
        stepIds.push(stepId);
        emit({
          type: 'step_added',
          stepId,
          label,
          chainId: getSkipOperationExplorerChainId(op, chainId),
        });
      });
      if (stepIds.length > 0) {
        emit({ type: 'step_started', stepId: stepIds[0] });
      }

      try {
        await fetch('https://api.skip.money/v2/tx/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tx_hash: txHash, chain_id: chainId }),
        });
      } catch (_e) {
        // fire-and-forget
      }

      let lastCompletedIndex = -1;
      let attempts = 0;

      const poll = async (): Promise<void> => {
        if (attempts >= SKIP_POLL_MAX_ATTEMPTS) {
          setStep('failed');
          setError('Skip status polling timed out');
          const failId = stepIds.find((_, i) => i > lastCompletedIndex);
          if (failId) emit({ type: 'step_failed', stepId: failId, error: 'Polling timed out' });
          setLoading(prev => ({ ...prev, status: false }));
          return;
        }
        attempts++;

        try {
          const response = await fetch(
            `https://api.skip.money/v2/tx/status?tx_hash=${txHash}&chain_id=${chainId}`,
          );
          const data = await response.json();

          if (!data) {
            pollingRef.current = setTimeout(poll, SKIP_POLL_INTERVAL);
            return;
          }

          const transferSeq: any[] = data.transfer_sequence ?? [];
          for (let i = 0; i < transferSeq.length && i < stepIds.length; i++) {
            const entry = transferSeq[i];
            const transferData =
              entry.ibc_transfer ?? entry.axelar_transfer ??
              entry.cctp_transfer ?? entry.hyperlane_transfer;
            if (!transferData) continue;

            const state: string = transferData.state ?? '';
            const isSuccess = state.includes('SUCCESS') || state.includes('RECEIVED');
            const isFailed = state.includes('FAILURE') || state.includes('FAILED');

            if (isSuccess && i > lastCompletedIndex) {
              emit({ type: 'step_completed', stepId: stepIds[i] });
              lastCompletedIndex = i;
              if (i + 1 < stepIds.length) {
                emit({ type: 'step_started', stepId: stepIds[i + 1] });
              }
            } else if (isFailed) {
              emit({ type: 'step_failed', stepId: stepIds[i], error: `Transfer failed: ${state}` });
            }
          }

          if (data.state === 'STATE_COMPLETED_SUCCESS') {
            stepIds.forEach(id => emit({ type: 'step_completed', stepId: id }));
            setStep('completed');
            setLoading(prev => ({ ...prev, status: false }));
            return;
          }

          if (data.state === 'STATE_COMPLETED_ERROR' || data.state === 'STATE_ABANDONED') {
            const errorMsg = data.error?.message ?? data.state;
            const failId = stepIds.find((_, idx) => idx > lastCompletedIndex);
            if (failId) emit({ type: 'step_failed', stepId: failId, error: errorMsg });
            setStep('failed');
            setError(errorMsg);
            setLoading(prev => ({ ...prev, status: false }));
            return;
          }
        } catch (_e) {
          // transient error, keep polling
        }

        pollingRef.current = setTimeout(poll, SKIP_POLL_INTERVAL);
      };

      await poll();
    },
    [chains, emit],
  );

  /**
   * Executors are passed in at call-time rather than being hook dependencies.
   * This avoids pulling wagmi/viem hooks into the render path of components
   * that mount outside the WagmiProvider tree (e.g. global bottom sheets).
   */
  const executeRoute = useCallback(
    async (
      quoteResp: BridgeV2QuoteResponse,
      sourceToken: BridgeV2Token,
      destToken: BridgeV2Token,
      quoteInput: BridgeV2QuoteRequestDto,
      executors: BridgeV2Executors,
      options: {
        /** Required: user must review and swipe before any signing / keychain use. */
        confirmBeforeSign: (payload: BridgeV2SignReviewPayload) => Promise<boolean>;
      },
    ): Promise<BridgeV2ExecutionResult> => {
      const { confirmBeforeSign } = options;
      const requireSignReview = async (payload: BridgeV2SignReviewPayload) => {
        const ok = await confirmBeforeSign(payload);
        if (!ok) throw new Error(BRIDGE_V2_USER_REJECTED_SIGN);
      };

      const routeSummary = buildRouteLegSummary(quoteResp, sourceToken, destToken, chains);

      setStep('executing');
      setLoading(prev => ({ ...prev, execute: true }));
      setError(null);
      setExecutionSteps([]);

      try {
        const inputValidationError = validateQuoteInput(quoteInput);
        if (inputValidationError) {
          throw new Error(inputValidationError);
        }

        if (quoteResp.provider === 'lifi') {
          const execution = quoteResp.execution;
          if (!execution) {
            throw new Error('LiFi quote missing execution data');
          }

          const hasApproval = !!execution.approvalTransaction;
          const swapChainId =
            execution.type === 'solana'
              ? 'solana'
              : execution.swapTransaction
                ? String(execution.swapTransaction.chainId)
                : String(quoteResp.sourceChainId);

          if (hasApproval) {
            emit({
              type: 'step_added',
              stepId: 'lifi-approval',
              label: 'Approve token allowance',
              chainId: String(execution.approvalTransaction!.chainId),
            });
            emit({ type: 'step_started', stepId: 'lifi-approval' });
          }

          const swapLabel =
            execution.type === 'solana' ? 'Send Solana transaction' : 'Send transaction';
          emit({ type: 'step_added', stepId: 'lifi-swap', label: swapLabel, chainId: swapChainId });
          if (!hasApproval) {
            emit({ type: 'step_started', stepId: 'lifi-swap' });
          }

          let result: BridgeV2ExecutionResult;

          if (execution.type === 'evm') {
            if (!execution.swapTransaction) {
              throw new Error('LiFi EVM execution missing swap transaction');
            }

            if (execution.approvalTransaction) {
              const approveTx = execution.approvalTransaction;
              const decoded = tryDecodeErc20ApproveCalldata(approveTx.data);
              if (decoded) {
                await requireSignReview(
                  buildEvmApprovalSignReview(
                    'lifi-approval',
                    approveTx.to,
                    decoded.spender,
                    decoded.amount,
                    String(approveTx.chainId),
                    routeSummary,
                    {
                      decimals: sourceToken.decimals,
                      symbol: sourceToken.symbol,
                      headline: 'Review approval transaction',
                    },
                  ),
                );
              } else {
                await requireSignReview(
                  buildEvmSignReview(
                    'lifi-approval',
                    'Review approval transaction',
                    approveTx,
                    'Token allowance for LiFi route',
                    routeSummary,
                  ),
                );
              }
              result = await executors.executeEvmTransaction(execution.approvalTransaction);
              if (result.isError) {
                const errMsg = toErrorString(result.error ?? 'Approval failed');
                emit({ type: 'step_failed', stepId: 'lifi-approval', error: errMsg });
                setStep('failed');
                setError(errMsg);
                setLoading(prev => ({ ...prev, execute: false }));
                return result;
              }
              emit({
                type: 'step_completed',
                stepId: 'lifi-approval',
                txHash: result.hash,
                chainId: String(approveTx.chainId),
              });
              emit({ type: 'step_started', stepId: 'lifi-swap' });
            }

            await requireSignReview(
              buildEvmSignReview(
                'lifi-swap',
                'Review swap / bridge transaction',
                execution.swapTransaction,
                'Main LiFi transaction',
                routeSummary,
              ),
            );
            result = await executors.executeEvmTransaction(execution.swapTransaction);
          } else if (execution.type === 'solana') {
            if (!execution.serializedTransaction) {
              throw new Error('LiFi Solana execution missing serialized transaction');
            }
            await requireSignReview(
              buildSolanaSignReview(
                'lifi-solana',
                execution.serializedTransaction,
                'Review Solana transaction',
                'LiFi bridge / swap',
                routeSummary,
              ),
            );
            result = await executors.executeSolanaTransaction(execution.serializedTransaction);
          } else {
            throw new Error(`Unsupported execution type: ${execution.type}`);
          }

          setLoading(prev => ({ ...prev, execute: false }));

          if (result.isError) {
            const errMsg = toErrorString(result.error ?? 'Execution failed');
            /** Always the main LiFi tx step (matches `step_completed` below). Approval errors return earlier; never infer from error text. */
            emit({ type: 'step_failed', stepId: 'lifi-swap', error: errMsg });
            setStep('failed');
            setError(errMsg);
            return result;
          }

          const txHash = result.hash ?? result.txn;
          emit({ type: 'step_completed', stepId: 'lifi-swap', txHash, chainId: swapChainId });

          if (txHash) {
            pollStatus(txHash, quoteResp.sourceChainId, quoteResp.destChainId);
          } else {
            setStep('completed');
          }
          return result;
        }

        if (quoteResp.provider === 'skip') {
          const requiredChains = quoteResp.requiredChainAddresses ?? [];
          const addressesByChain = getAddressesForChains(requiredChains);

          /** Non-empty guaranteed by {@link validateQuoteInput} at start of `executeRoute`. */
          const fromAddressTrimmed = quoteInput.fromAddress!.trim();

          const missingChainAddresses = requiredChains.filter(
            cid => !(addressesByChain[String(cid)] ?? '').trim(),
          );
          if (missingChainAddresses.length > 0) {
            throw new Error(
              `Missing wallet address for: ${missingChainAddresses.join(', ')}. Connect these chains in your wallet to continue.`,
            );
          }

          const toTrimmed = quoteInput.toAddress?.trim();
          const messagesBody: BridgeV2CosmosMessagesRequestDto = {
            ...quoteInput,
            fromAddress: fromAddressTrimmed,
            toAddress: toTrimmed || undefined,
            addressesByChain,
          };

          const messagesResp = await postBridgeV2Messages(messagesBody);
          if (messagesResp.isError || !messagesResp.data) {
            throw new Error(messagesResp.error ? toErrorString(messagesResp.error) : 'Failed to fetch Cosmos messages');
          }

          const rawMessages = messagesResp.data.messages as any;
          const txs: any[] = rawMessages?.txs ?? rawMessages?.msgs ?? (Array.isArray(rawMessages) ? rawMessages : []);
          if (txs.length === 0) {
            throw new Error('No transaction messages returned');
          }

          txs.forEach((tx: any, i: number) => {
            if (tx.cosmos_tx) {
              const chainId = tx.cosmos_tx.chain_id;
              const chainName = chains.find(c => c.chainId === chainId)?.prettyName ?? chainId;
              emit({
                type: 'step_added',
                stepId: `skip-cosmos-${i}`,
                label: `Sign · ${chainName}`,
                chainId,
              });
              return;
            }
            if (tx.evm_tx) {
              const evmTx = tx.evm_tx;
              const chainName =
                chains.find(c => c.chainId === evmTx.chain_id)?.prettyName ?? evmTx.chain_id;
              const approvals = evmTx.required_erc20_approvals ?? [];
              const n = approvals.length;
              for (let a = 0; a < n; a++) {
                const suffix = n > 1 ? ` (${a + 1}/${n})` : '';
                emit({
                  type: 'step_added',
                  stepId: `skip-${i}-approval-${a}`,
                  label: `Approve token${suffix} · ${chainName}`,
                  chainId: evmTx.chain_id,
                });
              }
              emit({
                type: 'step_added',
                stepId: `skip-${i}-send`,
                label: `Send transaction · ${chainName}`,
                chainId: evmTx.chain_id,
              });
              return;
            }
            emit({
              type: 'step_added',
              stepId: `skip-other-${i}`,
              label: `Step ${i + 1}`,
              chainId: quoteResp.sourceChainId,
            });
          });

          let lastResult: BridgeV2ExecutionResult = { isError: true, error: 'No transactions executed' };
          let firstTxHash: string | undefined;

          for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];

            if (tx.evm_tx) {
              const evmTx = tx.evm_tx;
              const approvals = evmTx.required_erc20_approvals ?? [];

              for (let a = 0; a < approvals.length; a++) {
                const approval = approvals[a];
                emit({ type: 'step_started', stepId: `skip-${i}-approval-${a}` });
                const meta = resolveErc20TokenMeta(
                  approval.token_contract,
                  evmTx.chain_id,
                  tokensByChain,
                  sourceToken,
                  destToken,
                );
                await requireSignReview(
                  buildEvmApprovalSignReview(
                    `skip-${i}-approval-${a}`,
                    approval.token_contract,
                    approval.spender,
                    approval.amount,
                    evmTx.chain_id,
                    routeSummary,
                    meta ? { decimals: meta.decimals, symbol: meta.symbol } : undefined,
                  ),
                );
                const approvalData = encodeErc20ApproveData(approval.spender, approval.amount);
                const approvalResult = await executors.executeEvmTransaction({
                  to: approval.token_contract,
                  value: '0',
                  data: approvalData,
                  chainId: evmTx.chain_id,
                });
                if (approvalResult.isError) {
                  emit({
                    type: 'step_failed',
                    stepId: `skip-${i}-approval-${a}`,
                    error: `Approval failed: ${approvalResult.error}`,
                  });
                  throw new Error(`Approval failed: ${approvalResult.error}`);
                }
                const apprHash = approvalResult.hash ?? approvalResult.txn;
                emit({
                  type: 'step_completed',
                  stepId: `skip-${i}-approval-${a}`,
                  txHash: apprHash,
                  chainId: evmTx.chain_id,
                });
                if (!firstTxHash && apprHash) firstTxHash = apprHash;
              }

              emit({ type: 'step_started', stepId: `skip-${i}-send` });
              await requireSignReview(
                buildEvmSignReview(
                  `skip-${i}-evm`,
                  `Review transaction — ${chains.find(c => c.chainId === evmTx.chain_id)?.prettyName ?? evmTx.chain_id}`,
                  {
                    to: evmTx.to,
                    value: evmTx.value ?? '0',
                    data: normalizeEvmCalldata(evmTx.data),
                    chainId: evmTx.chain_id,
                  },
                  'Skip route — EVM step',
                  routeSummary,
                ),
              );
              lastResult = await executors.executeEvmTransaction({
                to: evmTx.to,
                value: evmTx.value ?? '0',
                data: normalizeEvmCalldata(evmTx.data),
                chainId: evmTx.chain_id,
              });
              if (lastResult.isError) {
                emit({
                  type: 'step_failed',
                  stepId: `skip-${i}-send`,
                  error: lastResult.error ?? 'Transaction failed',
                });
                throw new Error(lastResult.error ?? 'Transaction failed');
              }
              const sendHash = lastResult.hash ?? lastResult.txn;
              emit({
                type: 'step_completed',
                stepId: `skip-${i}-send`,
                txHash: sendHash,
                chainId: evmTx.chain_id,
              });
              if (!firstTxHash && sendHash) firstTxHash = sendHash;
              continue;
            }

            if (tx.cosmos_tx) {
              emit({ type: 'step_started', stepId: `skip-cosmos-${i}` });
              const cosmosTx: CosmosMessagePayload = {
                msgs: tx.cosmos_tx.msgs,
                signer_address: tx.cosmos_tx.signer_address,
                chain_id: tx.cosmos_tx.chain_id,
              };
              await requireSignReview(
                buildCosmosSignReview(
                  `skip-${i}-cosmos`,
                  `Review Cosmos messages — ${chains.find(c => c.chainId === cosmosTx.chain_id)?.prettyName ?? cosmosTx.chain_id}`,
                  cosmosTx,
                  routeSummary,
                ),
              );
              lastResult = await executors.executeCosmosMessages(cosmosTx);
              if (lastResult.isError) {
                emit({
                  type: 'step_failed',
                  stepId: `skip-cosmos-${i}`,
                  error: lastResult.error ?? 'Transaction failed',
                });
                throw new Error(lastResult.error ?? 'Transaction failed');
              }
              const cHash = lastResult.hash ?? lastResult.txn;
              emit({
                type: 'step_completed',
                stepId: `skip-cosmos-${i}`,
                txHash: cHash,
                chainId: cosmosTx.chain_id,
              });
              if (!firstTxHash && cHash) firstTxHash = cHash;
              continue;
            }

            lastResult = { isError: true, error: `Unknown tx type at index ${i}` };
            emit({
              type: 'step_failed',
              stepId: `skip-other-${i}`,
              error: lastResult.error ?? 'Unknown step',
            });
            throw new Error(lastResult.error ?? 'Unknown tx type');
          }

          setLoading(prev => ({ ...prev, execute: false }));
          const firstChainId = txs[0]?.evm_tx?.chain_id ?? txs[0]?.cosmos_tx?.chain_id ?? quoteResp.sourceChainId;
          const routeOps = messagesResp.data.route?.operations ?? [];

          if (firstTxHash && routeOps.length > 0) {
            pollSkipStatus(firstTxHash, firstChainId, routeOps);
          } else {
            setStep('completed');
          }
          return lastResult;
        }

        throw new Error(`Unknown provider: ${quoteResp.provider}`);
      } catch (err: unknown) {
        setLoading(prev => ({ ...prev, execute: false }));
        const raw = toErrorString(err) || 'Execution failed';
        const isUserReject = raw === BRIDGE_V2_USER_REJECTED_SIGN;
        setStep('failed');
        setError(isUserReject ? 'Signing was declined. No further transactions were sent.' : raw);
        return { isError: true, error: isUserReject ? BRIDGE_V2_USER_REJECTED_SIGN : raw };
      }
    },
    [
      postBridgeV2Messages,
      pollStatus,
      pollSkipStatus,
      getAddressesForChains,
      chains,
      tokensByChain,
      emit,
    ],
  );

  const reset = useCallback(() => {
    stopPolling();
    quoteAbortRef.current?.abort();
    quoteAbortRef.current = null;
    quoteRequestSeqRef.current += 1;
    setStep('idle');
    setQuote(null);
    setStatusInfo(null);
    setError(null);
    setExecutionSteps([]);
    setLoading({ chains: false, tokens: false, quote: false, execute: false, status: false });
  }, [stopPolling]);

  return {
    chains,
    tokensByChain,
    quote,
    statusInfo,
    step,
    error,
    loading,
    executionSteps,

    loadChains,
    loadTokens,
    fetchQuote,
    executeRoute,
    pollStatus,
    pollSkipStatus,
    stopPolling,
    reset,

    getAddressForChainId,
    getAddressesForChains,
  };
}
