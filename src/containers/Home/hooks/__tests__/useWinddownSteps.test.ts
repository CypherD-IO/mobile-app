/**
 * Unit tests for the pure winddown-step helpers: step applicability (which
 * drives the dynamic X/N denominator) and the completed/total summary.
 *
 * Heavy module deps are mocked so the registry can be imported in isolation.
 */

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('i18next', () => ({ t: (key: string, def?: string) => def ?? key }));
jest.mock('../../../../core/util', () => ({
  HdWalletContext: {},
  formatAmount: jest.fn(),
}));
jest.mock('../../../../core/HttpRequest', () => ({
  __esModule: true,
  default: () => ({ getWithAuth: jest.fn() }),
}));
jest.mock('../../../../core/globalContext', () => ({ GlobalContext: {} }));
jest.mock('../../../../core/asyncStorage', () => ({
  getWinddownStepsCompleted: jest.fn(async () => ({})),
  setWinddownStepCompleted: jest.fn(async () => undefined),
  getConnectionType: jest.fn(async () => 'seedPhrase'),
}));
jest.mock('../../../../store/sunsetStore', () => ({
  useSunset: () => ({ isSunsetEnabled: false, initialized: true, config: null }),
}));

import {
  getApplicableStepDefinitions,
  summarizeSteps,
} from '../useWinddownSteps';
import { WinddownStepStatus } from '../../types';
import { ConnectionTypes } from '../../../../constants/enum';
import { resolveWindDownDates } from '../../../../constants/winddown';

const ids = (ctx: {
  isReadOnlyWallet: boolean;
  hasCard: boolean;
  connectionType: ConnectionTypes | null;
  amounts?: { cardBalanceNum?: number };
}) =>
  getApplicableStepDefinitions({
    isReadOnlyWallet: ctx.isReadOnlyWallet,
    hasCard: ctx.hasCard,
    connectionType: ctx.connectionType,
    cardProfile: null,
    dates: resolveWindDownDates(null),
    amounts: ctx.amounts ?? {},
  }).map(def => def.id);

describe('getApplicableStepDefinitions', () => {
  it('includes all four steps for a card-holding seed wallet with a balance', () => {
    expect(
      ids({
        isReadOnlyWallet: false,
        hasCard: true,
        connectionType: ConnectionTypes.SEED_PHRASE,
        amounts: { cardBalanceNum: 100 },
      }),
    ).toEqual(['withdraw', 'claimRewards', 'claimIncentives', 'backup']);
  });

  it('hides the withdraw step when the balance amount is absent (no card balance)', () => {
    expect(
      ids({
        isReadOnlyWallet: false,
        hasCard: true,
        connectionType: ConnectionTypes.SEED_PHRASE,
        amounts: {},
      }),
    ).not.toContain('withdraw');
  });

  it('keeps the withdraw step at a $0 balance (shown as completed elsewhere)', () => {
    expect(
      ids({
        isReadOnlyWallet: false,
        hasCard: true,
        connectionType: ConnectionTypes.SEED_PHRASE,
        amounts: { cardBalanceNum: 0 },
      }),
    ).toContain('withdraw');
  });

  it('hides the backup step for read-only wallets', () => {
    expect(
      ids({
        isReadOnlyWallet: true,
        hasCard: true,
        connectionType: ConnectionTypes.SEED_PHRASE,
      }),
    ).not.toContain('backup');
  });

  it('hides the backup step for WalletConnect wallets', () => {
    expect(
      ids({
        isReadOnlyWallet: false,
        hasCard: true,
        connectionType: ConnectionTypes.WALLET_CONNECT,
      }),
    ).not.toContain('backup');
  });

  it('shows the backup step for private-key and social wallets', () => {
    [
      ConnectionTypes.PRIVATE_KEY,
      ConnectionTypes.SOCIAL_LOGIN_EVM,
      ConnectionTypes.SOCIAL_LOGIN_SOLANA,
    ].forEach(connectionType => {
      expect(
        ids({ isReadOnlyWallet: false, hasCard: true, connectionType }),
      ).toContain('backup');
    });
  });

  it('hides the withdraw step when the user has no card', () => {
    expect(
      ids({
        isReadOnlyWallet: false,
        hasCard: false,
        connectionType: ConnectionTypes.SEED_PHRASE,
      }),
    ).not.toContain('withdraw');
  });

  it('keeps only the always-applicable steps for a read-only, card-less wallet', () => {
    expect(
      ids({
        isReadOnlyWallet: true,
        hasCard: false,
        connectionType: ConnectionTypes.SEED_PHRASE,
      }),
    ).toEqual(['claimRewards', 'claimIncentives']);
  });
});

describe('summarizeSteps', () => {
  it('counts completed against total applicable', () => {
    expect(
      summarizeSteps([
        WinddownStepStatus.COMPLETED,
        WinddownStepStatus.ACTIONABLE,
        WinddownStepStatus.COMPLETED,
      ]),
    ).toEqual({ completedCount: 2, totalCount: 3 });
  });

  it('handles an empty step list', () => {
    expect(summarizeSteps([])).toEqual({ completedCount: 0, totalCount: 0 });
  });

  it('does not count in-progress as completed', () => {
    expect(
      summarizeSteps([
        WinddownStepStatus.IN_PROGRESS,
        WinddownStepStatus.ACTIONABLE,
      ]),
    ).toEqual({ completedCount: 0, totalCount: 2 });
  });
});
