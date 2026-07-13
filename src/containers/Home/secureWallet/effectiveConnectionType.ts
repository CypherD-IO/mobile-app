import { ConnectionTypes } from '../../../constants/enum';
import { getConnectionType } from '../../../core/asyncStorage';

/**
 * The wallet's connection type for the winddown / Secure Wallet flow, resolved
 * to null if it can't be read.
 */
export const getEffectiveConnectionType =
  async (): Promise<ConnectionTypes | null> => {
    return await getConnectionType().catch(() => null);
  };
