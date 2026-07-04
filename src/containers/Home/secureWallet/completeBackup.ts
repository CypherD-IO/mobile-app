import {
  setSecureWalletLastVerifiedAt,
  setWinddownStepCompleted,
} from '../../../core/asyncStorage';

/**
 * Marks the wallet backup complete: flags the Home "backup" step done and
 * stamps the last-verified time. Call only after a successful verify/confirm.
 */
export const completeSecureWalletBackup = async (): Promise<void> => {
  await setWinddownStepCompleted('backup');
  await setSecureWalletLastVerifiedAt(Date.now());
};
