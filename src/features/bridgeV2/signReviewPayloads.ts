import { formatUnits } from 'viem';
import type { CosmosMessagePayload } from './executeCosmosMessages';
import { buildCosmosInlineSignDetail, shortCosmosAddr } from './cosmosSignSummary';
import {
  evmChainPrettyName,
  formatErc20ApprovalAmount,
  formatEvmNativeValue,
  shortEvmAddr,
  summarizeSolanaSerializedBase64,
} from './evmSolanaSignSummary';
import type {
  BridgeV2Chain,
  BridgeV2QuoteEvmTransaction,
  BridgeV2QuoteResponse,
  BridgeV2RouteLegSummary,
  BridgeV2SignReviewPayload,
  BridgeV2Token,
} from './types';

function trimTrailingZeros(amount: string): string {
  if (!amount.includes('.')) return amount;
  const t = amount.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  return t.endsWith('.') ? t.slice(0, -1) : t;
}

/** Build “you send / you receive” lines from the active quote (same numbers as review UI). */
export function buildRouteLegSummary(
  quote: BridgeV2QuoteResponse,
  sourceToken: BridgeV2Token,
  destToken: BridgeV2Token,
  chains: BridgeV2Chain[],
): BridgeV2RouteLegSummary | undefined {
  try {
    const sendRaw = BigInt(quote.amountIn);
    const recvRaw = BigInt(quote.estimatedAmountOut);
    const sendAmt = trimTrailingZeros(formatUnits(sendRaw, sourceToken.decimals));
    const recvAmt = trimTrailingZeros(formatUnits(recvRaw, destToken.decimals));
    const srcChain =
      chains.find(c => c.chainId === sourceToken.chainId)?.prettyName ?? sourceToken.chainId;
    const dstChain =
      chains.find(c => c.chainId === destToken.chainId)?.prettyName ?? destToken.chainId;
    return {
      youSendLine: `${sendAmt} ${sourceToken.symbol} · ${srcChain}`,
      youReceiveLine: `~${recvAmt} ${destToken.symbol} · ${dstChain}`,
    };
  } catch {
    return undefined;
  }
}

function applyRoute(
  inline: BridgeV2SignReviewPayload['inline'],
  route?: BridgeV2RouteLegSummary,
): BridgeV2SignReviewPayload['inline'] {
  if (!route) return inline;
  return {
    ...inline,
    youSendLine: route.youSendLine,
    youReceiveLine: route.youReceiveLine,
  };
}

export function buildEvmSignReview(
  reviewId: string,
  title: string,
  tx: BridgeV2QuoteEvmTransaction,
  subtitle?: string,
  route?: BridgeV2RouteLegSummary,
): BridgeV2SignReviewPayload {
  const chainLabel = evmChainPrettyName(String(tx.chainId));
  const valueWei = tx.value ?? '0';
  let message: string;
  let amountLabel: string;
  let amountValue: string;
  try {
    const v = BigInt(valueWei);
    if (v === 0n) {
      message = 'Contract call';
      amountLabel = 'Native value';
      amountValue = '0 (none sent)';
    } else {
      message = 'Send native token';
      amountLabel = 'Send';
      amountValue = formatEvmNativeValue(valueWei);
    }
  } catch {
    message = 'EVM transaction';
    amountLabel = 'Value';
    amountValue = formatEvmNativeValue(valueWei);
  }

  return {
    reviewId,
    title,
    subtitle: subtitle ?? chainLabel,
    kind: 'evm',
    inline: applyRoute(
      {
        headline: title,
        network: chainLabel,
        message,
        amountLabel,
        amountValue,
        recipientLabel: 'To',
        recipientValue: shortEvmAddr(tx.to, 12, 10),
      },
      route,
    ),
  };
}

export type EvmApprovalSignReviewOpts = {
  /** Token decimals for human-readable allowance (avoids huge raw integers). */
  decimals?: number;
  symbol?: string;
  /** Panel title; default "Approve for bridge". */
  headline?: string;
};

export function buildEvmApprovalSignReview(
  reviewId: string,
  tokenContract: string,
  spender: string,
  amount: string,
  chainId: string,
  route?: BridgeV2RouteLegSummary,
  opts?: EvmApprovalSignReviewOpts,
): BridgeV2SignReviewPayload {
  const chainLabel = evmChainPrettyName(String(chainId));
  const headline = opts?.headline ?? 'Approve for bridge';
  return {
    reviewId,
    title: 'Approve token spending',
    subtitle: `${chainLabel} · allowance`,
    kind: 'evm',
    inline: applyRoute(
      {
        headline,
        network: chainLabel,
        message: 'ERC-20 approval',
        amountLabel: 'Approved amount',
        amountValue: formatErc20ApprovalAmount(amount, opts?.decimals, opts?.symbol),
        recipientLabel: 'Spender',
        recipientValue: shortEvmAddr(spender, 12, 10),
        extraLabel: 'Token contract',
        extraValue: shortEvmAddr(tokenContract, 12, 10),
      },
      route,
    ),
  };
}

export function buildCosmosSignReview(
  reviewId: string,
  title: string,
  cosmosTx: CosmosMessagePayload,
  route?: BridgeV2RouteLegSummary,
): BridgeV2SignReviewPayload {
  const first = cosmosTx.msgs?.[0];
  const detail = first
    ? buildCosmosInlineSignDetail(first.msg_type_url, first.msg)
    : { messageType: 'Cosmos transaction', amountLabel: 'Info', amountValue: 'No messages' };
  const more = cosmosTx.msgs.length > 1 ? ` (+${cosmosTx.msgs.length - 1})` : '';

  return {
    reviewId,
    title,
    subtitle: cosmosTx.chain_id,
    kind: 'cosmos',
    inline: applyRoute(
      {
        headline: title,
        network: cosmosTx.chain_id,
        signer: shortCosmosAddr(cosmosTx.signer_address, 14, 8),
        message: `${detail.messageType}${more}`,
        amountLabel: detail.amountLabel,
        amountValue: detail.amountValue,
        recipientLabel: detail.recipientLabel,
        recipientValue: detail.recipientValue,
      },
      route,
    ),
  };
}

export function buildSolanaSignReview(
  reviewId: string,
  serializedTransactionBase64: string,
  title = 'Review Solana transaction',
  subtitle = 'Bridge / swap on Solana',
  route?: BridgeV2RouteLegSummary,
): BridgeV2SignReviewPayload {
  const parsed = summarizeSolanaSerializedBase64(serializedTransactionBase64);
  const n = parsed.instructionCount;

  return {
    reviewId,
    title,
    subtitle,
    kind: 'solana',
    inline: applyRoute(
      {
        headline: title,
        network: 'Solana',
        message: 'Solana transaction',
        amountLabel: 'Instructions',
        amountValue: n != null ? String(n) : '—',
        recipientLabel: 'Fee payer',
        recipientValue: parsed.feePayerShort ?? '—',
      },
      route,
    ),
  };
}
