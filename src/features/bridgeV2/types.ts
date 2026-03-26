export type BridgeV2Provider = 'lifi' | 'skip';

export type EcosystemsEnum = 'cosmos' | 'evm' | 'tron' | 'solana';

export type BridgeV2Chain = {
  chainId: string;
  chainName: string;
  prettyName: string;
  chainType: EcosystemsEnum;
  logoUrl: string;
  bech32Prefix: string;
  isLifi: boolean;
  isSkip: boolean;
};

export type BridgeV2ChainsResponse = BridgeV2Chain[];

export type BridgeV2Token = {
  denom: string;
  chainId: string;
  isNative: boolean;
  isEvm: boolean;
  isSvm: boolean;
  symbol: string;
  name: string;
  logoUrl: string;
  tokenContract: string;
  decimals: number;
  coingeckoId: string;
  recommendedSymbol: string;
  isLifi: boolean;
  isSkip: boolean;
  price: number;
};

export type BridgeV2TokensResponse = Record<string, BridgeV2Token[]>;

export type BridgeV2QuoteFee = {
  name: string;
  amount: string;
  amountUsd?: string;
  chainId?: string;
  tokenSymbol?: string;
  tokenAddressOrDenom?: string;
  feeType: 'fee' | 'gas';
};

export type BridgeV2QuoteEvmTransaction = {
  to: string;
  value: string;
  data: string;
  chainId: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
};

export type BridgeV2QuoteExecutionData = {
  type: 'evm' | 'solana';
  swapTransaction?: BridgeV2QuoteEvmTransaction;
  approvalTransaction?: BridgeV2QuoteEvmTransaction;
  serializedTransaction?: string;
  warnings?: string[];
};

export type BridgeV2QuoteResponse = {
  provider: BridgeV2Provider;
  sourceChainId: string;
  sourceTokenDenom: string;
  destChainId: string;
  destTokenDenom: string;
  amountIn: string;
  estimatedAmountOut: string;
  minimumAmountOut: string;
  estimatedDurationSeconds?: number;
  amountInUsd?: string;
  amountOutUsd?: string;
  routeId?: string;
  routeTool?: string;
  txsRequired?: number;
  fees: BridgeV2QuoteFee[];
  execution?: BridgeV2QuoteExecutionData;
  requiredChainAddresses?: string[];
};

export type BridgeV2QuoteRequestDto = {
  sourceChainId: string;
  sourceTokenDenom: string;
  destChainId: string;
  destTokenDenom: string;
  amountIn: string;
  fromAddress?: string;
  toAddress?: string;
  slippage?: number;
};

export type BridgeV2CosmosMessagesRequestDto = BridgeV2QuoteRequestDto & {
  fromAddress: string;
  toAddress?: string;
  addressesByChain?: Record<string, string>;
};

export type BridgeQuoteResponseType = {
  amount_in: string;
  amount_out: string;
  chain_ids: string[];
  required_chain_addresses: string[];
  dest_asset_chain_id: string;
  dest_asset_denom: string;
  does_swap: boolean;
  estimated_amount_out: string;
  operations: Array<{
    transfer?: any;
    swap?: any;
    axelar_transfer?: any;
    bank_send?: any;
    cctp_transfer?: any;
    hyperlane_transfer?: any;
    tx_index: number;
    amount_in: string;
    amount_out: string;
  }>;
  source_asset_chain_id: string;
  source_asset_denom: string;
  swap_venue: {
    chain_id: string;
    name: string;
  };
  txs_required: number;
  usd_amount_in: string;
  usd_amount_out: string;
  swap_price_impact_percent?: string;
  warning?: {
    type: 'LOW_INFO_WARNING' | 'BAD_PRICE_WARNING';
    message: string;
  };
  estimated_fees: Array<{
    fee_type: 'SMART_RELAY';
    bridge_id: 'IBC' | 'AXELAR' | 'CCTP' | 'HYPERLANE';
    amount: string;
    usd_amount: string;
    chain_id: string;
    tx_index: number;
    origin_asset: {
      denom: string;
      chain_id: string;
      origin_denom: string;
      origin_chain_id: string;
      trace: string;
      is_cw20: boolean;
      is_evm: boolean;
      is_svm: boolean;
      symbol: string;
      name: string;
      logo_uri: string;
      decimals: number;
      description: string;
      coingecko_id: string;
      recommended_symbol: string;
    };
  }>;
  amount: string;
  usd_amount: string;
  origin_asset: {
    chain_id: string;
    coingecko_id?: string;
    decimals?: number;
    denom: string;
    description?: string;
    is_cw20: boolean;
    is_evm: boolean;
    is_svm: boolean;
    logo_uri?: string;
    name?: string;
    origin_chain_id: string;
    origin_denom: string;
    recommended_symbol?: string;
    symbol?: string;
    token_contract?: string;
    trace: string;
  };
  chain_id: string;
  tx_index: number;
  operation_index?: number;
  estimated_route_duration_seconds: number;
};

export type BridgeV2CosmosMessagesResponse = {
  provider: 'skip';
  sourceChainId: string;
  destChainId: string;
  requiredChainAddresses: string[];
  usedAddresses: Record<string, string>;
  route: BridgeQuoteResponseType;
  messages: unknown;
};

export enum BridgeV2StatusSubstatus {
  WAIT_SOURCE_CONFIRMATIONS = 'WAIT_SOURCE_CONFIRMATIONS',
  WAIT_DESTINATION_TRANSACTION = 'WAIT_DESTINATION_TRANSACTION',
  BRIDGE_NOT_AVAILABLE = 'BRIDGE_NOT_AVAILABLE',
  CHAIN_NOT_AVAILABLE = 'CHAIN_NOT_AVAILABLE',
  REFUND_IN_PROGRESS = 'REFUND_IN_PROGRESS',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  REFUNDED = 'REFUNDED',
}

export type BridgeV2StatusRequestDto = {
  txHash: string;
  sourceChainId?: string;
  destChainId?: string;
  bridge?: string;
};

export type BridgeV2StatusResponse = {
  provider: 'lifi';
  txHash: string;
  sourceChainId?: string;
  destChainId?: string;
  bridge?: string;
  status: string;
  substatus?: BridgeV2StatusSubstatus;
  substatusMessage?: string;
  sendingTxHash?: string;
  receivingTxHash?: string;
  bridgeExplorerUrl?: string;
  rawStatus: Record<string, unknown>;
};

export type BridgeV2ExecutionResult = {
  isError: boolean;
  hash?: string;
  txn?: string;
  error?: string;
  chainId?: string;
};

/** Human-readable bridge legs for sign review (from quoted route). */
export type BridgeV2RouteLegSummary = {
  youSendLine: string;
  youReceiveLine: string;
};

/**
 * Minimal copy for the inline sign panel on the bridge processing screen
 * (no separate modal).
 */
export type BridgeV2SignReviewInline = {
  headline: string;
  network: string;
  /** From quote: asset + chain you’re spending */
  youSendLine?: string;
  /** From quote: asset + chain you expect to receive */
  youReceiveLine?: string;
  /** Cosmos / Solana fee payer; omitted for generic EVM tx when unknown */
  signer?: string;
  /** Short type label, e.g. "IBC transfer", "ERC-20 approval" */
  message: string;
  /** Row label + value, e.g. "Amount" / "500000 uusdc" or "Send" / "0.1 ETH (native)" */
  amountLabel: string;
  amountValue: string;
  /** e.g. "To" / bech32 or "Spender" / 0x… */
  recipientLabel?: string;
  recipientValue?: string;
  /** Optional third row (e.g. token contract on approval) */
  extraLabel?: string;
  extraValue?: string;
};

/** Passed to confirmBeforeSign; rendered inline on the transaction processing UI. */
export type BridgeV2SignReviewPayload = {
  /** Stable key for React lists */
  reviewId: string;
  title: string;
  subtitle?: string;
  kind: 'evm' | 'cosmos' | 'solana';
  inline: BridgeV2SignReviewInline;
};

export const BRIDGE_V2_USER_REJECTED_SIGN = 'USER_REJECTED_SIGN';

export const COSMOS_CHAIN_IDS = [
  'cosmoshub-4',
  'osmosis-1',
  'noble-1',
  'injective-1',
  'coreum-mainnet-1',
] as const;

export const EVM_CHAIN_IDS = [
  '1',
  '137',
  '43114',
  '42161',
  '10',
  '56',
  '8453',
  '324',
] as const;

export const SOLANA_CHAIN_ID = 'solana' as const;

/** ARCH / quote API: native EVM asset — use zero address, not 0xeeee… placeholders. */
export const EVM_NATIVE_QUOTE_TOKEN_DENOM =
  '0x0000000000000000000000000000000000000000' as const;

/** ARCH / LiFi quote API: native SOL mint id (not WSOL, not free-form labels). */
export const SOLANA_NATIVE_QUOTE_TOKEN_DENOM =
  '11111111111111111111111111111111' as const;

export const HYPERLIQUID_CHAIN_ID = 'hyperliquid' as const;

export function isCosmosChainId(chainId: string): boolean {
  return (COSMOS_CHAIN_IDS as readonly string[]).includes(chainId);
}

export function isEvmChainId(chainId: string): boolean {
  return (EVM_CHAIN_IDS as readonly string[]).includes(chainId);
}

export function isSolanaChainId(chainId: string): boolean {
  return chainId === SOLANA_CHAIN_ID;
}

// ─── Execution Step Tracking ──────────────────────────────────────

export type ExecutionStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type ExecutionStep = {
  id: string;
  label: string;
  status: ExecutionStepStatus;
  /** Chain id for block explorer (matches quote `sourceChainId` / API chain_id strings). */
  chainId?: string;
  txHash?: string;
  error?: string;
};

export type ExecutionEvent =
  | { type: 'step_added'; stepId: string; label: string; chainId?: string }
  | { type: 'step_started'; stepId: string }
  | { type: 'step_label_updated'; stepId: string; label: string }
  | { type: 'step_completed'; stepId: string; txHash?: string; chainId?: string }
  | { type: 'step_failed'; stepId: string; error: string };

export function handleExecutionEvent(
  event: ExecutionEvent,
  setSteps: React.Dispatch<React.SetStateAction<ExecutionStep[]>>,
) {
  setSteps(prev => {
    switch (event.type) {
      case 'step_added':
        if (prev.some(s => s.id === event.stepId)) return prev;
        return [
          ...prev,
          {
            id: event.stepId,
            label: event.label,
            status: 'pending' as const,
            ...(event.chainId !== undefined ? { chainId: event.chainId } : {}),
          },
        ];
      case 'step_started':
        return prev.map(s => s.id === event.stepId ? { ...s, status: 'in_progress' as const, error: undefined } : s);
      case 'step_label_updated':
        return prev.map(s => s.id === event.stepId ? { ...s, label: event.label } : s);
      case 'step_completed':
        return prev.map(s =>
          s.id === event.stepId
            ? {
                ...s,
                status: 'completed' as const,
                ...(event.txHash !== undefined ? { txHash: event.txHash } : {}),
                ...(event.chainId !== undefined ? { chainId: event.chainId } : {}),
              }
            : s,
        );
      case 'step_failed':
        return prev.map(s => s.id === event.stepId ? { ...s, status: 'failed' as const, error: event.error } : s);
      default:
        return prev;
    }
  });
}

export const LIFI_SUBSTATUS_LABELS: Record<string, string> = {
  WAIT_SOURCE_CONFIRMATIONS: 'Waiting for source chain confirmation',
  WAIT_DESTINATION_TRANSACTION: 'Waiting for destination chain transaction',
  BRIDGE_NOT_AVAILABLE: 'Bridge not available',
  REFUND_IN_PROGRESS: 'Refund in progress',
  COMPLETED: 'Bridge completed',
  PARTIAL: 'Partially completed',
};

export const EXPLORER_BASE_URLS: Record<string, string> = {
  '1': 'https://etherscan.io/tx/',
  '137': 'https://polygonscan.com/tx/',
  '43114': 'https://snowtrace.io/tx/',
  '42161': 'https://arbiscan.io/tx/',
  '10': 'https://optimistic.etherscan.io/tx/',
  '56': 'https://bscscan.com/tx/',
  '8453': 'https://basescan.org/tx/',
  '324': 'https://explorer.zksync.io/tx/',
  solana: 'https://solscan.io/tx/',
  'cosmoshub-4': 'https://www.mintscan.io/cosmos/txs/',
  'osmosis-1': 'https://www.mintscan.io/osmosis/txs/',
  'noble-1': 'https://www.mintscan.io/noble/txs/',
  'injective-1': 'https://www.mintscan.io/injective/txs/',
  'coreum-mainnet-1': 'https://www.mintscan.io/coreum/txs/',
};

/** Block explorer URL for a tx hash, or null if unknown. */
export function getTxExplorerUrl(chainId: string, txHash: string): string | null {
  const base = EXPLORER_BASE_URLS[chainId];
  const h = (txHash || '').trim();
  if (!base || !h) return null;
  return `${base}${h}`;
}
