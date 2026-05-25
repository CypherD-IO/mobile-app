import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { screenTitle } from '../constants';
import { QUICK_ACTION_NOTIFICATION_CATEGORY_IDS } from '../constants/data';
import {
  CypherDeclineCodes,
  NOTIFE_ACTIONS,
  ON_OPEN_NAVIGATE,
  RPCODES,
} from '../constants/enum';
import { NotificationEvents } from '../constants/server';
import type { HDWallet } from '../reducers/hdwallet_reducer';

export type NotificationInboxCategory =
  | 'card'
  | 'security'
  | 'rewards'
  | 'bridgeSwap'
  | 'quickAction'
  | 'general';

export type NotificationInboxStatus = 'unread' | 'read';

export type NotificationInboxSource =
  | 'firebase-foreground'
  | 'firebase-background'
  | 'notifee-display'
  | 'notifee-open'
  | 'notifee-action'
  | 'notifee-dismiss'
  | 'customerio'
  | 'seeded-test';

export type NotificationInboxAction =
  | {
      type: 'navigate';
      tab: string;
      screen: string;
      params?: Record<string, string | number | boolean>;
    }
  | {
      type: 'quickAction';
      actionId: string;
      params?: Record<string, string | number | boolean>;
    }
  | { type: 'none' };

export interface NotificationInboxItem {
  id: string;
  dedupeKey: string;
  title: string;
  body: string;
  category: NotificationInboxCategory;
  status: NotificationInboxStatus;
  receivedAt: number;
  lastUpdatedAt: number;
  source: NotificationInboxSource;
  scopeId: string;
  action: NotificationInboxAction;
}

export interface NotificationInboxNormalizeOptions {
  source: NotificationInboxSource;
  scopeId?: string;
  receivedAt?: number;
  markRead?: boolean;
}

export interface NotificationInboxStorageOptions {
  scopeId?: string;
  includeDeviceScope?: boolean;
}

export type NotificationInboxRouteHandler = (
  tab: string,
  route: { screen: string; params?: Record<string, string | number | boolean> },
) => void;

export const MAX_NOTIFICATION_INBOX_ITEMS = 100;
export const NOTIFICATION_INBOX_STORAGE_PREFIX = 'notificationInbox.v1:';
export const NOTIFICATION_INBOX_DEVICE_SCOPE = 'device';

const PREFERRED_SCOPE_CHAINS = ['ethereum', 'solana', 'cosmos', 'osmosis'];

const ALLOWED_DATA_FIELDS = [
  'notificationId',
  'messageId',
  'title',
  'categoryId',
  'notificationType',
  'screenToNavigate',
  'url',
  'txnId',
  'cardId',
  'provider',
  'declineCode',
  'actionKey',
  'merchantName',
  'amount',
  'currency',
  'chain',
  'token',
  'deliveryId',
  'delivery_id',
  'cioDeliveryId',
  'cio_delivery_id',
  'messageDeliveryId',
  'deliveryToken',
  'CIO-Delivery-ID',
] as const;

const CUSTOMER_IO_DELIVERY_ID_FIELDS = [
  'deliveryId',
  'delivery_id',
  'cioDeliveryId',
  'cio_delivery_id',
  'messageDeliveryId',
  'deliveryToken',
  'CIO-Delivery-ID',
] as const;

const QUICK_ACTION_BY_CATEGORY_ID: Record<string, NOTIFE_ACTIONS> = {
  [CypherDeclineCodes.INT_COUNTRY]: NOTIFE_ACTIONS.ADD_COUNTRY,
  [CypherDeclineCodes.DAILY_LIMIT]: NOTIFE_ACTIONS.INCREASE_DAILY_LIMIT,
  [CypherDeclineCodes.MONTHLY_LIMIT]: NOTIFE_ACTIONS.INCREASE_MONTHLY_LIMIT,
  [RPCODES.CardIsNotActivated]: NOTIFE_ACTIONS.ACTIVATE_CARD,
  [RPCODES.CardIsBlocked]: NOTIFE_ACTIONS.UNBLOCK_CARD,
};

const SCREEN_TO_TAB: Record<string, string> = {
  [screenTitle.ENTER_REFERRAL_CODE]: screenTitle.CARD,
  [screenTitle.TELEGRAM_PIN_SETUP]: screenTitle.CARD,
  [screenTitle.TELEGRAM_SETUP]: screenTitle.CARD,
  [screenTitle.CARD_CONTROLS]: screenTitle.CARD,
  [screenTitle.DEBIT_CARD_SCREEN]: screenTitle.CARD,
  [screenTitle.MERCHANT_REWARD_LIST]: screenTitle.CARD,
  [screenTitle.PREMIUM_SCREEN]: screenTitle.CARD,
  [screenTitle.ENTER_AMOUNT]: screenTitle.PORTFOLIO,
  [screenTitle.NOTIFICATION_INBOX]: screenTitle.PORTFOLIO,
  [screenTitle.CYPHER_AGENT_SCREEN]: screenTitle.CYPHER_AGENT,
};

const storageQueues = new Map<string, Promise<unknown>>();

type SanitizedNotificationData = Partial<
  Record<(typeof ALLOWED_DATA_FIELDS)[number], string | number | boolean>
>;

export interface NotificationInboxInput {
  id?: string;
  data?: Record<string, unknown>;
  notification?: {
    title?: string;
    body?: string;
  };
  title?: string;
  body?: string;
  messageId?: string;
}

const normalizeScopeId = (scopeId?: string) => {
  const normalizedScopeId = scopeId?.trim()?.toLowerCase();
  if (normalizedScopeId) {
    return normalizedScopeId;
  }
  return NOTIFICATION_INBOX_DEVICE_SCOPE;
};

const storageKeyForScope = (scopeId?: string) =>
  `${NOTIFICATION_INBOX_STORAGE_PREFIX}${normalizeScopeId(scopeId)}`;

const captureInboxError = (error: unknown) => {
  Sentry.captureException(error);
};

const isPersistablePrimitive = (
  value: unknown,
): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const toStringValue = (value: unknown) =>
  isPersistablePrimitive(value) ? String(value) : undefined;

const sanitizeParams = (params: Record<string, unknown>) =>
  Object.entries(params).reduce<Record<string, string | number | boolean>>(
    (acc, [key, value]) => {
      if (isPersistablePrimitive(value) && value !== '') {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );

const stableHash = (input: string) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(31, hash) + input.charCodeAt(index)) % 2147483647;
  }
  return Math.abs(hash).toString(36);
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const objectValue = value as Record<string, unknown>;
  return `{${Object.keys(objectValue)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(',')}}`;
};

const isNotificationInboxItem = (item: unknown): item is NotificationInboxItem => {
  const candidate = item as NotificationInboxItem;
  return (
    !!candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.dedupeKey === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.body === 'string' &&
    typeof candidate.scopeId === 'string' &&
    typeof candidate.receivedAt === 'number' &&
    typeof candidate.lastUpdatedAt === 'number' &&
    (candidate.status === 'read' || candidate.status === 'unread') &&
    !!candidate.action
  );
};

const readItemsForKey = async (key: string): Promise<NotificationInboxItem[]> => {
  try {
    const rawItems = await AsyncStorage.getItem(key);
    if (!rawItems) {
      return [];
    }

    const parsedItems = JSON.parse(rawItems);
    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems.filter(isNotificationInboxItem);
  } catch (error) {
    captureInboxError(error);
    return [];
  }
};

const writeItemsForKey = async (key: string, items: NotificationInboxItem[]) => {
  await AsyncStorage.setItem(key, JSON.stringify(items));
};

const withStorageQueue = async <T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const previous = storageQueues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  const queued = current.catch(() => undefined);
  storageQueues.set(key, queued);

  try {
    return await current;
  } finally {
    if (storageQueues.get(key) === queued) {
      storageQueues.delete(key);
    }
  }
};

const getCurrentAddressForChain = (hdWalletState: HDWallet, chain: string) => {
  const chainWallet = hdWalletState.wallet?.[chain];
  const directAddress = chainWallet?.address;
  if (directAddress) {
    return directAddress;
  }

  const currentIndex = chainWallet?.currentIndex;
  if (
    typeof currentIndex === 'number' &&
    currentIndex >= 0 &&
    currentIndex < (chainWallet?.wallets?.length || 0)
  ) {
    return chainWallet?.wallets?.[currentIndex]?.address;
  }

  return undefined;
};

export const getNotificationInboxScope = (
  hdWalletState?: HDWallet,
): string | undefined => {
  if (!hdWalletState?.wallet) {
    return undefined;
  }

  const remainingChains = Object.keys(hdWalletState.wallet).filter(
    chain => !PREFERRED_SCOPE_CHAINS.includes(chain),
  );
  const orderedChains = [...PREFERRED_SCOPE_CHAINS, ...remainingChains];

  for (const chain of orderedChains) {
    const address = getCurrentAddressForChain(hdWalletState, chain);
    if (address?.trim()) {
      return address.trim().toLowerCase();
    }
  }

  return undefined;
};

export const sanitizeNotificationInboxData = (
  data?: Record<string, unknown> | null,
): SanitizedNotificationData => {
  if (!data) {
    return {};
  }

  return ALLOWED_DATA_FIELDS.reduce<SanitizedNotificationData>((acc, key) => {
    const value = data[key];
    if (isPersistablePrimitive(value)) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const getEventKey = (data: SanitizedNotificationData) =>
  toStringValue(data.actionKey) ??
  toStringValue(data.notificationType) ??
  toStringValue(data.title);

const isQuickActionDecline = (data: SanitizedNotificationData) => {
  const declineCode = toStringValue(data.declineCode);
  const categoryId = toStringValue(data.categoryId);

  return (
    (!!declineCode &&
      QUICK_ACTION_NOTIFICATION_CATEGORY_IDS.includes(
        declineCode as CypherDeclineCodes | RPCODES,
      )) ||
    (!!categoryId && !!QUICK_ACTION_BY_CATEGORY_ID[categoryId])
  );
};

const getQuickActionId = (data: SanitizedNotificationData) => {
  const categoryId = toStringValue(data.categoryId);
  const declineCode = toStringValue(data.declineCode);

  if (categoryId && QUICK_ACTION_BY_CATEGORY_ID[categoryId]) {
    return QUICK_ACTION_BY_CATEGORY_ID[categoryId];
  }

  if (declineCode && QUICK_ACTION_BY_CATEGORY_ID[declineCode]) {
    return QUICK_ACTION_BY_CATEGORY_ID[declineCode];
  }

  return undefined;
};

const textIncludesAny = (text: string, keywords: string[]) =>
  keywords.some(keyword => text.includes(keyword));

const deriveNotificationInboxCategory = (
  data: SanitizedNotificationData,
  title: string,
  body: string,
): NotificationInboxCategory => {
  const eventKey = getEventKey(data);
  const categoryId = toStringValue(data.categoryId)?.toLowerCase() ?? '';
  const actionKey = toStringValue(data.actionKey)?.toLowerCase() ?? '';
  const notificationType =
    toStringValue(data.notificationType)?.toLowerCase() ?? '';
  const screenToNavigate = toStringValue(data.screenToNavigate);
  const searchableText = `${title} ${body} ${categoryId} ${actionKey} ${notificationType}`.toLowerCase();

  if (eventKey === NotificationEvents.THREE_DS_APPROVE) {
    return 'security';
  }

  if (eventKey === NotificationEvents.CARD_TXN_UPDATE && isQuickActionDecline(data)) {
    return 'quickAction';
  }

  if (
    eventKey === NotificationEvents.CARD_TXN_UPDATE ||
    [data.cardId, data.provider, data.declineCode, data.txnId].some(Boolean)
  ) {
    return 'card';
  }

  if (
    textIncludesAny(searchableText, [
      'lockdown',
      'mfa',
      'auth',
      'security',
      'secure',
      '3ds',
      '3d secure',
    ])
  ) {
    return 'security';
  }

  if (
    screenToNavigate === screenTitle.MERCHANT_REWARD_LIST ||
    screenToNavigate === screenTitle.REWARDS_SCREEN ||
    textIncludesAny(searchableText, ['reward', 'rewards', 'referral', 'merchant reward'])
  ) {
    return 'rewards';
  }

  if (
    screenToNavigate === screenTitle.BRIDGE_STATUS ||
    screenToNavigate === screenTitle.ENTER_AMOUNT ||
    textIncludesAny(searchableText, [
      'bridge',
      'swap',
      'load',
      'fund card',
      'fund-card',
      'completed',
      'complete',
    ])
  ) {
    return 'bridgeSwap';
  }

  return 'general';
};

const deriveNotificationInboxAction = (
  data: SanitizedNotificationData,
): NotificationInboxAction => {
  const eventKey = getEventKey(data);
  const url = toStringValue(data.url);
  const cardId = toStringValue(data.cardId);
  const provider = toStringValue(data.provider);
  const screenToNavigate = toStringValue(data.screenToNavigate);

  switch (eventKey) {
    case NotificationEvents.DAPP_BROWSER_OPEN:
      return url
        ? {
            type: 'navigate',
            tab: screenTitle.OPTIONS,
            screen: screenTitle.BROWSER,
            params: { url },
          }
        : { type: 'none' };
    case NotificationEvents.ACTIVITY_UPDATE:
      return {
        type: 'navigate',
        tab: screenTitle.OPTIONS,
        screen: screenTitle.ACTIVITIES,
      };
    case NotificationEvents.ADDRESS_ACTIVITY_WEBHOOK:
      return url
        ? {
            type: 'navigate',
            tab: screenTitle.PORTFOLIO,
            screen: screenTitle.TRANS_DETAIL,
            params: { url },
          }
        : { type: 'none' };
    case NotificationEvents.CARD_APPLICATION_UPDATE:
      return url
        ? {
            type: 'navigate',
            tab: screenTitle.CARD,
            screen: screenTitle.DEBIT_CARD_SCREEN,
            params: { url },
          }
        : { type: 'none' };
    case NotificationEvents.CARD_TXN_UPDATE: {
      const actionId = getQuickActionId(data);
      const categoryId = toStringValue(data.categoryId) ?? toStringValue(data.declineCode);
      const isDeclineFlow = !!toStringValue(data.declineCode) || isQuickActionDecline(data);

      if (actionId === NOTIFE_ACTIONS.ADD_COUNTRY && cardId && provider) {
        return {
          type: 'navigate',
          tab: screenTitle.CARD,
          screen: screenTitle.CARD_CONTROLS,
          params: {
            cardId,
            currentCardProvider: provider,
            onOpenNavigate: ON_OPEN_NAVIGATE.SELECT_COUNTRY,
          },
        };
      }

      if (actionId && cardId && provider) {
        return {
          type: 'quickAction',
          actionId,
          params: sanitizeParams({ cardId, provider, categoryId }),
        };
      }

      if (url && !isDeclineFlow) {
        return {
          type: 'navigate',
          tab: screenTitle.CARD,
          screen: screenTitle.DEBIT_CARD_SCREEN,
          params: { url },
        };
      }

      if (cardId && provider) {
        return {
          type: 'navigate',
          tab: screenTitle.CARD,
          screen: screenTitle.CARD_CONTROLS,
          params: { cardId, currentCardProvider: provider },
        };
      }

      return url
        ? {
            type: 'navigate',
            tab: screenTitle.CARD,
            screen: screenTitle.DEBIT_CARD_SCREEN,
            params: { url },
          }
        : { type: 'none' };
    }
    case NotificationEvents.THREE_DS_APPROVE:
      return { type: 'none' };
    default:
      break;
  }

  if (screenToNavigate && SCREEN_TO_TAB[screenToNavigate]) {
    return {
      type: 'navigate',
      tab: SCREEN_TO_TAB[screenToNavigate],
      screen: screenToNavigate,
      params: sanitizeParams({
        url,
        cardId,
        currentCardProvider: provider,
        chain: data.chain,
        token: data.token,
        txnId: data.txnId,
      }),
    };
  }

  return { type: 'none' };
};

const getCustomerIODeliveryId = (data: SanitizedNotificationData) => {
  for (const field of CUSTOMER_IO_DELIVERY_ID_FIELDS) {
    const deliveryId = toStringValue(data[field]);
    if (deliveryId) {
      return deliveryId;
    }
  }
  return undefined;
};

const getDedupeKey = ({
  input,
  data,
  title,
  body,
  category,
  action,
}: {
  input: NotificationInboxInput;
  data: SanitizedNotificationData;
  title: string;
  body: string;
  category: NotificationInboxCategory;
  action: NotificationInboxAction;
}) => {
  const stableValue = [
    toStringValue(data.messageId),
    toStringValue(input.messageId),
    toStringValue(input.id),
    toStringValue(data.notificationId),
    getCustomerIODeliveryId(data),
    toStringValue(data.txnId),
    toStringValue(data.url),
  ].find(Boolean);

  if (stableValue) {
    return `notification:${stableValue}`;
  }

  return `fallback:${stableHash(
    stableStringify({
      title,
      body,
      category,
      action,
      cardId: data.cardId,
      provider: data.provider,
      declineCode: data.declineCode,
      categoryId: data.categoryId,
    }),
  )}`;
};

export const normalizeNotificationInboxItem = (
  input: NotificationInboxInput | undefined | null,
  options: NotificationInboxNormalizeOptions,
): NotificationInboxItem | undefined => {
  if (!input) {
    return undefined;
  }

  const sanitizedData = sanitizeNotificationInboxData(input.data);
  const title =
    input.notification?.title ??
    input.title ??
    toStringValue(input.data?.notificationTitle) ??
    '';
  const body =
    input.notification?.body ??
    input.body ??
    toStringValue(input.data?.notificationBody) ??
    '';

  if (!title && !body) {
    return undefined;
  }

  const receivedAt = options.receivedAt ?? Date.now();
  const category = deriveNotificationInboxCategory(sanitizedData, title, body);
  const action = deriveNotificationInboxAction(sanitizedData);
  const scopeId = normalizeScopeId(options.scopeId);
  const dedupeKey = getDedupeKey({
    input,
    data: sanitizedData,
    title,
    body,
    category,
    action,
  });

  return {
    id: `${dedupeKey}:${receivedAt}`,
    dedupeKey,
    title,
    body,
    category,
    status: options.markRead ? 'read' : 'unread',
    receivedAt,
    lastUpdatedAt: receivedAt,
    source: options.source,
    scopeId,
    action,
  };
};

const sortNewestFirst = (items: NotificationInboxItem[]) =>
  [...items].sort((left, right) => right.receivedAt - left.receivedAt);

export const saveNotificationInboxItem = async (
  input: NotificationInboxInput | undefined | null,
  options: NotificationInboxNormalizeOptions,
): Promise<NotificationInboxItem | undefined> => {
  const normalizedItem = normalizeNotificationInboxItem(input, options);
  if (!normalizedItem) {
    return undefined;
  }

  const key = storageKeyForScope(normalizedItem.scopeId);

  try {
    return await withStorageQueue(key, async () => {
      const items = await readItemsForKey(key);
      const existingIndex = items.findIndex(
        item => item.dedupeKey === normalizedItem.dedupeKey,
      );

      const itemToSave =
        existingIndex >= 0
          ? {
              ...normalizedItem,
              id: items[existingIndex].id,
              receivedAt: items[existingIndex].receivedAt,
              status: options.markRead ? 'read' : items[existingIndex].status,
              lastUpdatedAt: normalizedItem.lastUpdatedAt,
            }
          : normalizedItem;

      const nextItems =
        existingIndex >= 0
          ? items.map((item, index) => (index === existingIndex ? itemToSave : item))
          : [itemToSave, ...items];

      const cappedItems = sortNewestFirst(nextItems).slice(
        0,
        MAX_NOTIFICATION_INBOX_ITEMS,
      );
      await writeItemsForKey(key, cappedItems);
      return itemToSave;
    });
  } catch (error) {
    captureInboxError(error);
    return undefined;
  }
};

export const getNotificationInboxItems = async ({
  scopeId,
  includeDeviceScope = false,
}: NotificationInboxStorageOptions = {}): Promise<NotificationInboxItem[]> => {
  const keys = [storageKeyForScope(scopeId)];
  if (includeDeviceScope && normalizeScopeId(scopeId) !== NOTIFICATION_INBOX_DEVICE_SCOPE) {
    keys.push(storageKeyForScope());
  }

  const itemGroups = await Promise.all(keys.map(readItemsForKey));
  const byDedupeKey = new Map<string, NotificationInboxItem>();

  for (const item of itemGroups.flat()) {
    const existingItem = byDedupeKey.get(item.dedupeKey);
    if (!existingItem || item.lastUpdatedAt > existingItem.lastUpdatedAt) {
      byDedupeKey.set(item.dedupeKey, item);
    }
  }

  return sortNewestFirst(Array.from(byDedupeKey.values()));
};

export const markNotificationInboxItemRead = async (
  id: string,
  { scopeId }: NotificationInboxStorageOptions = {},
): Promise<NotificationInboxItem | undefined> => {
  const key = storageKeyForScope(scopeId);

  try {
    return await withStorageQueue(key, async () => {
      const items = await readItemsForKey(key);
      let updatedItem: NotificationInboxItem | undefined;
      const nextItems = items.map(item => {
        if (item.id !== id) {
          return item;
        }
        updatedItem = {
          ...item,
          status: 'read',
          lastUpdatedAt: Date.now(),
        };
        return updatedItem;
      });

      if (updatedItem) {
        await writeItemsForKey(key, nextItems);
      }

      return updatedItem;
    });
  } catch (error) {
    captureInboxError(error);
    return undefined;
  }
};

export const markAllNotificationInboxItemsRead = async ({
  scopeId,
}: NotificationInboxStorageOptions = {}): Promise<NotificationInboxItem[]> => {
  const key = storageKeyForScope(scopeId);

  try {
    return await withStorageQueue(key, async () => {
      const now = Date.now();
      const items = await readItemsForKey(key);
      const nextItems = items.map(item => ({
        ...item,
        status: 'read' as NotificationInboxStatus,
        lastUpdatedAt: item.status === 'read' ? item.lastUpdatedAt : now,
      }));
      await writeItemsForKey(key, nextItems);
      return nextItems;
    });
  } catch (error) {
    captureInboxError(error);
    return [];
  }
};

export const deleteNotificationInboxItem = async (
  id: string,
  { scopeId }: NotificationInboxStorageOptions = {},
): Promise<boolean> => {
  const key = storageKeyForScope(scopeId);

  try {
    return await withStorageQueue(key, async () => {
      const items = await readItemsForKey(key);
      const nextItems = items.filter(item => item.id !== id);
      if (nextItems.length === items.length) {
        return false;
      }
      await writeItemsForKey(key, nextItems);
      return true;
    });
  } catch (error) {
    captureInboxError(error);
    return false;
  }
};

export const clearNotificationInbox = async ({
  scopeId,
}: NotificationInboxStorageOptions = {}): Promise<void> => {
  const key = storageKeyForScope(scopeId);

  try {
    await withStorageQueue(key, async () => {
      await AsyncStorage.removeItem(key);
    });
  } catch (error) {
    captureInboxError(error);
  }
};

export const clearAllNotificationInboxScopes = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const inboxKeys = keys.filter(key =>
      key.startsWith(NOTIFICATION_INBOX_STORAGE_PREFIX),
    );

    await Promise.all(
      inboxKeys.map(async key =>
        await withStorageQueue(key, async () => {
          await AsyncStorage.removeItem(key);
        }),
      ),
    );
  } catch (error) {
    captureInboxError(error);
  }
};

export const routeNotificationInboxItem = (
  item: NotificationInboxItem,
  navigate?: NotificationInboxRouteHandler,
): NotificationInboxAction => {
  if (item.action.type === 'navigate' && navigate) {
    navigate(item.action.tab, {
      screen: item.action.screen,
      params: item.action.params,
    });
  }

  return item.action;
};
