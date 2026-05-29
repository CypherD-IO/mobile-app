import type {
  DeBankToken,
  IDecodedTransactionResponse,
} from '../models/txnDecode.interface';
import type { NormalizedPermit, PermitItem } from './permitParser';
import { isKnownDrainerAddress } from '../constants/knownDrainers';

const UINT256_MAX = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
);

const NEAR_MAX_THRESHOLD = UINT256_MAX / 2n;

const OVER_BALANCE_MULTIPLE_BLOCK = 10;

export type ApproveRiskLevel = 'none' | 'info' | 'warn' | 'danger';

export interface ApproveRiskAssessment {
  level: ApproveRiskLevel;
  isScamToken: boolean;
  isSuspiciousToken: boolean;
  isScamSpender: boolean;
  isUnlimited: boolean;
  isOverBalance: boolean;
  isFarOverBalance: boolean;
  amountRaw: bigint | null;
  amountFormatted: string | null;
  approveUsdValue: number | null;
  reasons: string[];
  requiresHardGate: boolean;
}

export function isNearMaxAllowance(amount: bigint): boolean {
  return amount >= NEAR_MAX_THRESHOLD;
}

function safeParseAmount(value: string | number | undefined): bigint | null {
  if (value === undefined || value === null) return null;
  try {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null;
      return BigInt(Math.trunc(value));
    }
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      return BigInt(trimmed);
    }
    return BigInt(trimmed.split('.')[0]);
  } catch {
    return null;
  }
}

export type ApproveBannerCopy = {
  level: ApproveRiskLevel;
  titleKey: string;
  message: string;
} | null;

export interface PermitRiskAssessment {
  level: ApproveRiskLevel;
  isUnlimited: boolean;
  isFarOverBalance: boolean;
  isOverBalance: boolean;
  isScamSpender: boolean;
  requiresHardGate: boolean;
  perItem: PermitItemAssessment[];
}

export interface PermitItemAssessment {
  item: PermitItem;
  isUnlimited: boolean;
  isOverBalance: boolean;
  isFarOverBalance: boolean;
  balanceRaw: bigint | null;
}

export function assessPermitRisk(
  permit: NormalizedPermit | null | undefined,
  balanceLookup: (tokenAddress: string) => bigint | null,
  remoteScamSpender = false,
): PermitRiskAssessment {
  const empty: PermitRiskAssessment = {
    level: 'none',
    isUnlimited: false,
    isFarOverBalance: false,
    isOverBalance: false,
    isScamSpender: false,
    requiresHardGate: false,
    perItem: [],
  };
  if (!permit) return empty;

  let isUnlimited = false;
  let isOverBalance = false;
  let isFarOverBalance = false;
  // Union of server-side check (ScamSniffer + manual list) and the in-app
  // bundled floor so older arch versions still flag known drainers.
  const isScamSpender = remoteScamSpender || isKnownDrainerAddress(permit.spender);
  const perItem: PermitItemAssessment[] = [];

  for (const item of permit.items) {
    const balanceRaw = balanceLookup(item.token);
    const overBalance =
      !item.isUnlimited && balanceRaw !== null && item.amount > balanceRaw;
    const farOverBalance =
      !item.isUnlimited &&
      balanceRaw !== null &&
      balanceRaw > 0n &&
      item.amount > balanceRaw * BigInt(OVER_BALANCE_MULTIPLE_BLOCK);
    if (item.isUnlimited) isUnlimited = true;
    if (overBalance) isOverBalance = true;
    if (farOverBalance) isFarOverBalance = true;
    perItem.push({
      item,
      isUnlimited: item.isUnlimited,
      isOverBalance: overBalance,
      isFarOverBalance: farOverBalance,
      balanceRaw,
    });
  }

  const requiresHardGate = isScamSpender || isUnlimited || isFarOverBalance;
  const level: ApproveRiskLevel =
    isScamSpender || isUnlimited || isFarOverBalance
      ? 'danger'
      : isOverBalance
        ? 'warn'
        : 'none';
  return {
    level,
    isUnlimited,
    isFarOverBalance,
    isOverBalance,
    isScamSpender,
    requiresHardGate,
    perItem,
  };
}

export function permitBannerCopy(risk: PermitRiskAssessment): ApproveBannerCopy {
  if (risk.isScamSpender) {
    return {
      level: 'danger',
      titleKey: 'SCAM_WARNING_TITLE',
      message:
        'Spender address is on our known-drainer list. Do not sign.',
    };
  }
  if (risk.isUnlimited) {
    return {
      level: 'danger',
      titleKey: 'ACKNOWLEDGE_RISK_TITLE',
      message:
        'Site requests an off-chain unlimited approval (permit). Scammers use this to drain wallets without spending gas.',
    };
  }
  if (risk.isFarOverBalance) {
    return {
      level: 'danger',
      titleKey: 'ACKNOWLEDGE_RISK_TITLE',
      message:
        'Permit amount is far above your current balance. Common drainer pattern.',
    };
  }
  if (risk.isOverBalance) {
    return {
      level: 'warn',
      titleKey: 'SUSPICIOUS_WARNING_TITLE',
      message:
        'Permit amount exceeds your current balance. Verify before signing.',
    };
  }
  return null;
}

export function approveBannerCopy(risk: ApproveRiskAssessment): ApproveBannerCopy {
  if (risk.isScamSpender) {
    return {
      level: 'danger',
      titleKey: 'SCAM_WARNING_TITLE',
      message:
        'Spender address is on our known-drainer list. Do not approve.',
    };
  }
  if (risk.isScamToken) {
    return {
      level: 'danger',
      titleKey: 'SCAM_WARNING_TITLE',
      message: 'Token flagged as scam by our database.',
    };
  }
  if (risk.isUnlimited) {
    return {
      level: 'danger',
      titleKey: 'ACKNOWLEDGE_RISK_TITLE',
      message:
        'Site requests unlimited approval. Scammers use this to drain wallets.',
    };
  }
  if (risk.isFarOverBalance) {
    return {
      level: 'danger',
      titleKey: 'ACKNOWLEDGE_RISK_TITLE',
      message:
        'Approval amount is far above your current balance. Common drainer pattern.',
    };
  }
  if (risk.isSuspiciousToken) {
    return {
      level: 'warn',
      titleKey: 'SUSPICIOUS_WARNING_TITLE',
      message: 'Token marked as suspicious by our database.',
    };
  }
  return null;
}

export function sendBannerCopy(sendRisk: {
  isScam: boolean;
  isSuspicious: boolean;
  isScamRecipient: boolean;
}): ApproveBannerCopy {
  // Recipient flag has the highest priority: sending to a known drainer
  // typically means immediate fund loss.
  if (sendRisk.isScamRecipient) {
    return {
      level: 'danger',
      titleKey: 'SCAM_WARNING_TITLE',
      message:
        'Recipient address is on our known-drainer list. Funds sent here are usually lost.',
    };
  }
  if (sendRisk.isScam) {
    return {
      level: 'danger',
      titleKey: 'SCAM_WARNING_TITLE',
      message: 'A token in this transaction is flagged as scam.',
    };
  }
  if (sendRisk.isSuspicious) {
    return {
      level: 'warn',
      titleKey: 'SUSPICIOUS_WARNING_TITLE',
      message: 'A token in this transaction is marked as suspicious.',
    };
  }
  return null;
}

export function assessApproveRisk(
  decoded: IDecodedTransactionResponse | null | undefined,
  walletBalanceRaw?: bigint | null,
): ApproveRiskAssessment {
  const empty: ApproveRiskAssessment = {
    level: 'none',
    isScamToken: false,
    isSuspiciousToken: false,
    isScamSpender: false,
    isUnlimited: false,
    isOverBalance: false,
    isFarOverBalance: false,
    amountRaw: null,
    amountFormatted: null,
    approveUsdValue: null,
    reasons: [],
    requiresHardGate: false,
  };
  const approval = decoded?.type_token_approval;
  if (!approval) return empty;

  const token: DeBankToken | undefined = approval.token;
  const isScamToken = Boolean(token?.is_scam);
  const isSuspiciousToken = Boolean(token?.is_suspicious);
  // Union of two signals so older backends that don't return the field still fall
  // back to the bundled list. `is_scam_spender` comes from arch's SecurityService
  // (ScamSniffer + manual list) — broader coverage than the in-app constants.
  const isScamSpender =
    Boolean(approval.is_scam_spender) || isKnownDrainerAddress(approval.spender);

  const amountRaw =
    safeParseAmount(token?.raw_amount_str) ??
    safeParseAmount(token?.raw_amount_hex_str) ??
    safeParseAmount(approval.token_amount);

  const isUnlimited =
    Boolean(approval.is_infinity) ||
    (amountRaw !== null && isNearMaxAllowance(amountRaw));

  const balanceRaw = walletBalanceRaw ?? null;
  const isOverBalance =
    amountRaw !== null && balanceRaw !== null && balanceRaw >= 0n
      ? !isUnlimited && amountRaw > balanceRaw
      : false;
  const isFarOverBalance =
    amountRaw !== null && balanceRaw !== null && balanceRaw > 0n
      ? !isUnlimited &&
        amountRaw > balanceRaw * BigInt(OVER_BALANCE_MULTIPLE_BLOCK)
      : false;

  const approveUsdValue =
    typeof approval.token_amount === 'number' &&
    typeof token?.price === 'number'
      ? approval.token_amount * token.price
      : null;

  const reasons: string[] = [];
  let level: ApproveRiskLevel = 'none';

  if (isScamSpender) {
    reasons.push('Spender address flagged as known drainer.');
    level = 'danger';
  }
  if (isScamToken) {
    reasons.push('Token flagged as scam by our database.');
    level = 'danger';
  }
  if (isUnlimited) {
    reasons.push(
      'Site requests unlimited approval. Scammers use this to drain wallets.',
    );
    if (level !== 'danger') level = 'danger';
  }
  if (isFarOverBalance) {
    reasons.push(
      'Approval amount is far above your current balance. Common drainer pattern.',
    );
    if (level !== 'danger') level = 'danger';
  } else if (isOverBalance) {
    reasons.push("Approval amount exceeds your current token balance.");
  }
  if (isSuspiciousToken && level === 'none') {
    reasons.push('Token marked as suspicious.');
    level = 'warn';
  }

  const requiresHardGate = isScamSpender || isUnlimited || isFarOverBalance;

  return {
    level,
    isScamToken,
    isSuspiciousToken,
    isScamSpender,
    isUnlimited,
    isOverBalance,
    isFarOverBalance,
    amountRaw,
    amountFormatted: token?.raw_amount_str ?? null,
    approveUsdValue,
    reasons,
    requiresHardGate,
  };
}

export function assessSendRisk(
  decoded: IDecodedTransactionResponse | null | undefined,
): {
  level: ApproveRiskLevel;
  isScam: boolean;
  isSuspicious: boolean;
  isScamRecipient: boolean;
  reasons: string[];
} {
  if (!decoded) {
    return {
      level: 'none',
      isScam: false,
      isSuspicious: false,
      isScamRecipient: false,
      reasons: [],
    };
  }
  let isScam = false;
  let isSuspicious = false;
  const visit = (token: DeBankToken | undefined) => {
    if (!token) return;
    if (token.is_scam) isScam = true;
    if (token.is_suspicious) isSuspicious = true;
  };
  visit(decoded.type_send?.token);
  for (const token of decoded.balance_change?.send_token_list ?? []) {
    visit(token);
  }
  for (const token of decoded.balance_change?.receive_token_list ?? []) {
    visit(token);
  }
  // Recipient blocklist hit comes from arch's SecurityService check on
  // `type_send.to_addr`. Bundled drainer list is not consulted here because
  // it is spender-focused; the server already unions ScamSniffer + manual.
  const isScamRecipient = Boolean(decoded.type_send?.is_scam_recipient);
  const reasons: string[] = [];
  if (isScamRecipient) {
    reasons.push(
      'Recipient address is on our known-drainer list.',
    );
  }
  if (isScam) reasons.push('A token in this transaction is flagged as scam.');
  if (isSuspicious && !isScam) {
    reasons.push('A token in this transaction is marked as suspicious.');
  }
  return {
    level: isScamRecipient || isScam ? 'danger' : isSuspicious ? 'warn' : 'none',
    isScam,
    isSuspicious,
    isScamRecipient,
    reasons,
  };
}

