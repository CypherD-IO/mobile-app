import type {
  DeBankToken,
  IDecodedTransactionResponse,
} from '../models/txnDecode.interface';

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

export function approveBannerCopy(risk: ApproveRiskAssessment): ApproveBannerCopy {
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
}): ApproveBannerCopy {
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
    if (level !== 'danger') level = 'warn';
  }
  if (isSuspiciousToken && level === 'none') {
    reasons.push('Token marked as suspicious.');
    level = 'warn';
  }

  const requiresHardGate = isUnlimited || isFarOverBalance;

  return {
    level,
    isScamToken,
    isSuspiciousToken,
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
  reasons: string[];
} {
  if (!decoded) {
    return { level: 'none', isScam: false, isSuspicious: false, reasons: [] };
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
  const reasons: string[] = [];
  if (isScam) reasons.push('A token in this transaction is flagged as scam.');
  if (isSuspicious && !isScam) {
    reasons.push('A token in this transaction is marked as suspicious.');
  }
  return {
    level: isScam ? 'danger' : isSuspicious ? 'warn' : 'none',
    isScam,
    isSuspicious,
    reasons,
  };
}

