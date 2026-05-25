/* eslint-disable import/first */
jest.mock('../../constants/server', () => ({
  CHAIN_NAMES: ['ethereum', 'cosmos', 'osmosis', 'noble', 'solana'],
  NotificationEvents: {
    ACTIVITY_UPDATE: 'ACTIVITY_UPDATE',
    ADDRESS_ACTIVITY_WEBHOOK: 'ADDRESS_ACTIVITY_WEBHOOK',
    CARD_APPLICATION_UPDATE: 'CARD_APPLICATION_UPDATE',
    CARD_TXN_UPDATE: 'CARD_TXN_UPDATE',
    DAPP_BROWSER_OPEN: 'DAPP_BROWSER_OPEN',
    THREE_DS_APPROVE: 'THREE_DS_APPROVE',
  },
}));

jest.mock('../../constants/data', () => ({
  QUICK_ACTION_NOTIFICATION_CATEGORY_IDS: ['I4G', 'R4'],
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { screenTitle } from '../../constants';
import { NOTIFE_ACTIONS, ON_OPEN_NAVIGATE } from '../../constants/enum';
import {
  clearAllNotificationInboxScopes,
  clearNotificationInbox,
  deleteNotificationInboxItem,
  getNotificationInboxItems,
  getNotificationInboxScope,
  markAllNotificationInboxItemsRead,
  markNotificationInboxItemRead,
  MAX_NOTIFICATION_INBOX_ITEMS,
  normalizeNotificationInboxItem,
  routeNotificationInboxItem,
  sanitizeNotificationInboxData,
  saveNotificationInboxItem,
} from '../notificationInbox';

const storage = new Map<string, string>();

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('notificationInbox', () => {
  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();

    mockAsyncStorage.getItem.mockImplementation(async key => storage.get(key) ?? null);
    mockAsyncStorage.setItem.mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
    mockAsyncStorage.removeItem.mockImplementation(async key => {
      storage.delete(key);
    });
    mockAsyncStorage.getAllKeys.mockImplementation(async () => Array.from(storage.keys()));
  });

  it('sanitizes allow-listed payload fields and excludes sensitive/raw fields', () => {
    const sanitized = sanitizeNotificationInboxData({
      notificationId: 'n-1',
      messageId: 'm-1',
      approveUrl: 'https://approve.example',
      declineUrl: 'https://decline.example',
      last4: '1234',
      transactionAmount: '$10',
      cardId: 'card-1',
      provider: 'rain',
      deliveryId: 'cio-1',
    });

    expect(sanitized).toEqual({
      notificationId: 'n-1',
      messageId: 'm-1',
      cardId: 'card-1',
      provider: 'rain',
      deliveryId: 'cio-1',
    });
  });

  it('normalizes Firebase-shaped payloads with title/body fallback and derives safe actions', () => {
    const item = normalizeNotificationInboxItem(
      {
        messageId: 'remote-1',
        data: {
          notificationTitle: 'Open dapp',
          notificationBody: 'Tap to continue',
          actionKey: 'DAPP_BROWSER_OPEN',
          url: 'https://example.com',
          approveUrl: 'https://sensitive.example',
        },
      },
      { source: 'firebase-foreground', scopeId: '0xABC', receivedAt: 10 },
    );

    expect(item).toMatchObject({
      title: 'Open dapp',
      body: 'Tap to continue',
      status: 'unread',
      source: 'firebase-foreground',
      scopeId: '0xabc',
      action: {
        type: 'navigate',
        tab: screenTitle.OPTIONS,
        screen: screenTitle.BROWSER,
        params: { url: 'https://example.com' },
      },
    });
    expect(item?.dedupeKey).toBe('notification:remote-1');
  });

  it('treats 3DS approval inbox records as security information only', () => {
    const item = normalizeNotificationInboxItem(
      {
        notification: { title: '3D Secure', body: 'Approve payment' },
        data: {
          actionKey: 'THREE_DS_APPROVE',
          approveUrl: 'https://approve.example',
          declineUrl: 'https://decline.example',
        },
      },
      { source: 'notifee-open', receivedAt: 20 },
    );

    expect(item?.category).toBe('security');
    expect(item?.action).toEqual({ type: 'none' });
  });

  it('routes INT_COUNTRY declines to card controls country selection', () => {
    const item = normalizeNotificationInboxItem(
      {
        notification: { title: 'Declined', body: 'Add country to continue' },
        data: {
          actionKey: 'CARD_TXN_UPDATE',
          declineCode: 'I4G',
          categoryId: 'I4G',
          cardId: 'card-1',
          provider: 'rain',
        },
      },
      { source: 'notifee-display', receivedAt: 30 },
    );

    expect(item?.category).toBe('quickAction');
    expect(item?.action).toEqual({
      type: 'navigate',
      tab: screenTitle.CARD,
      screen: screenTitle.CARD_CONTROLS,
      params: {
        cardId: 'card-1',
        currentCardProvider: 'rain',
        onOpenNavigate: ON_OPEN_NAVIGATE.SELECT_COUNTRY,
      },
    });
  });

  it('prefers card transaction URLs for non-decline updates even when card identifiers exist', () => {
    const item = normalizeNotificationInboxItem(
      {
        notification: { title: 'Card transaction', body: 'View details' },
        data: {
          actionKey: 'CARD_TXN_UPDATE',
          cardId: 'card-1',
          provider: 'rain',
          url: 'https://card.example/txn',
        },
      },
      { source: 'notifee-display', receivedAt: 31 },
    );

    expect(item?.action).toEqual({
      type: 'navigate',
      tab: screenTitle.CARD,
      screen: screenTitle.DEBIT_CARD_SCREEN,
      params: { url: 'https://card.example/txn' },
    });
  });

  it('keeps other card decline quick actions on the existing Notifee action path', () => {
    const item = normalizeNotificationInboxItem(
      {
        notification: { title: 'Declined', body: 'Activate card' },
        data: {
          actionKey: 'CARD_TXN_UPDATE',
          declineCode: 'R4',
          categoryId: 'R4',
          cardId: 'card-1',
          provider: 'rain',
        },
      },
      { source: 'notifee-display', receivedAt: 32 },
    );

    expect(item?.action).toEqual({
      type: 'quickAction',
      actionId: NOTIFE_ACTIONS.ACTIVATE_CARD,
      params: {
        cardId: 'card-1',
        provider: 'rain',
        categoryId: 'R4',
      },
    });
  });

  it('derives actions from legacy data.title event keys', () => {
    const item = normalizeNotificationInboxItem(
      {
        notification: { title: 'Activity update', body: 'Review activity' },
        data: {
          title: 'ACTIVITY_UPDATE',
        },
      },
      { source: 'firebase-background', receivedAt: 35 },
    );

    expect(item?.action).toEqual({
      type: 'navigate',
      tab: screenTitle.OPTIONS,
      screen: screenTitle.ACTIVITIES,
    });
  });

  it('selects a canonical wallet scope independent of selected chain', () => {
    const walletState = {
      wallet: {
        solana: { currentIndex: 0, wallets: [{ address: 'SoL', publicKey: 'pk' }] },
        ethereum: { currentIndex: 0, wallets: [{ address: '0xABC', publicKey: 'pk' }] },
      },
      selectedChain: { chainName: 'solana' },
    // Scope helper only reads wallet chain addresses; the remaining HDWallet fields are irrelevant here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const scope = getNotificationInboxScope(walletState);

    expect(scope).toBe('0xabc');
  });

  it('serializes concurrent saves, dedupes by stable ids, and preserves read status', async () => {
    const first = await saveNotificationInboxItem(
      { messageId: 'same', notification: { title: 'First', body: 'Body' } },
      { source: 'seeded-test', scopeId: '0xabc', receivedAt: 1 },
    );
    await markNotificationInboxItemRead(first?.id ?? '', { scopeId: '0xabc' });

    await Promise.all([
      saveNotificationInboxItem(
        { messageId: 'same', notification: { title: 'Updated', body: 'Body' } },
        { source: 'seeded-test', scopeId: '0xabc', receivedAt: 2 },
      ),
      saveNotificationInboxItem(
        { messageId: 'other', notification: { title: 'Other', body: 'Body' } },
        { source: 'seeded-test', scopeId: '0xabc', receivedAt: 3 },
      ),
    ]);

    const items = await getNotificationInboxItems({ scopeId: '0xabc' });
    expect(items).toHaveLength(2);
    expect(items.find(item => item.dedupeKey === 'notification:same')).toMatchObject({
      title: 'Updated',
      status: 'read',
      receivedAt: 1,
    });
  });

  it('dedupes foreground capture and displayed Notifee archive by remote message id in the same scope', async () => {
    await saveNotificationInboxItem(
      {
        messageId: 'remote-foreground-1',
        notification: { title: 'Foreground', body: 'Body' },
      },
      { source: 'firebase-foreground', scopeId: '0xabc', receivedAt: 1 },
    );

    await saveNotificationInboxItem(
      {
        messageId: 'remote-foreground-1',
        notification: { title: 'Displayed', body: 'Body' },
        data: { messageId: 'remote-foreground-1' },
      },
      { source: 'notifee-display', scopeId: '0xabc', receivedAt: 2 },
    );

    const items = await getNotificationInboxItems({ scopeId: '0xabc' });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      dedupeKey: 'notification:remote-foreground-1',
      title: 'Displayed',
      receivedAt: 1,
    });
  });

  it('caps storage, supports read/delete/clear helpers, and routes navigate actions', async () => {
    await Promise.all(
      Array.from({ length: MAX_NOTIFICATION_INBOX_ITEMS + 1 }, async (_, index) =>
        await saveNotificationInboxItem(
          {
            messageId: `msg-${index}`,
            notification: { title: `Title ${index}`, body: 'Body' },
            data: { screenToNavigate: screenTitle.ENTER_AMOUNT, chain: 'ETH' },
          },
          { source: 'seeded-test', scopeId: '0xabc', receivedAt: index + 1 },
        ),
      ),
    );

    let items = await getNotificationInboxItems({ scopeId: '0xabc' });
    expect(items).toHaveLength(MAX_NOTIFICATION_INBOX_ITEMS);
    expect(items[0].title).toBe(`Title ${MAX_NOTIFICATION_INBOX_ITEMS}`);

    await markAllNotificationInboxItemsRead({ scopeId: '0xabc' });
    items = await getNotificationInboxItems({ scopeId: '0xabc' });
    expect(items.every(item => item.status === 'read')).toBe(true);

    const navigate = jest.fn();
    routeNotificationInboxItem(items[0], navigate);
    expect(navigate).toHaveBeenCalledWith(screenTitle.PORTFOLIO, {
      screen: screenTitle.ENTER_AMOUNT,
      params: { chain: 'ETH' },
    });

    await deleteNotificationInboxItem(items[0].id, { scopeId: '0xabc' });
    expect(await getNotificationInboxItems({ scopeId: '0xabc' })).toHaveLength(99);

    await clearNotificationInbox({ scopeId: '0xabc' });
    expect(await getNotificationInboxItems({ scopeId: '0xabc' })).toEqual([]);
  });

  it('normalizes Notifee-shaped payload ids and derives reward/security/bridge categories', () => {
    const notifeeItem = normalizeNotificationInboxItem(
      {
        id: 'notifee-1',
        notification: { title: 'Merchant reward', body: 'You earned rewards' },
        data: { screenToNavigate: screenTitle.MERCHANT_REWARD_LIST },
      },
      { source: 'notifee-open', receivedAt: 40 },
    );
    const securityItem = normalizeNotificationInboxItem(
      {
        notification: { title: 'Security alert', body: 'MFA required' },
      },
      { source: 'firebase-background', receivedAt: 41 },
    );
    const bridgeItem = normalizeNotificationInboxItem(
      {
        notification: { title: 'Swap complete', body: 'Bridge transaction completed' },
        data: { screenToNavigate: screenTitle.BRIDGE_STATUS },
      },
      { source: 'notifee-display', receivedAt: 42 },
    );

    expect(notifeeItem).toMatchObject({
      dedupeKey: 'notification:notifee-1',
      category: 'rewards',
    });
    expect(securityItem?.category).toBe('security');
    expect(bridgeItem?.category).toBe('bridgeSwap');
  });

  it('uses device scope fallback when no wallet scope is available and clears all inbox scopes', async () => {
    await saveNotificationInboxItem(
      { messageId: 'device-msg', notification: { title: 'Device', body: 'Body' } },
      { source: 'seeded-test', receivedAt: 1 },
    );
    await saveNotificationInboxItem(
      { messageId: 'wallet-msg', notification: { title: 'Wallet', body: 'Body' } },
      { source: 'seeded-test', scopeId: '0xabc', receivedAt: 2 },
    );

    expect(await getNotificationInboxItems()).toMatchObject([
      { title: 'Device', scopeId: 'device' },
    ]);
    expect(
      await getNotificationInboxItems({ scopeId: '0xabc', includeDeviceScope: true }),
    ).toHaveLength(2);

    await clearAllNotificationInboxScopes();

    expect(storage.has('notificationInbox.v1:device')).toBe(false);
    expect(storage.has('notificationInbox.v1:0xabc')).toBe(false);
  });

  it('falls back to an empty list and reports malformed storage', async () => {
    storage.set('notificationInbox.v1:0xabc', '{bad json');

    await expect(getNotificationInboxItems({ scopeId: '0xabc' })).resolves.toEqual([]);
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});
