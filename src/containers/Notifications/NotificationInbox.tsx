import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import moment from 'moment';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GestureResponderEvent, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { GlobalModalType } from '../../constants/enum';
import { HdWalletContext } from '../../core/util';
import {
  deleteNotificationInboxItem,
  getNotificationInboxItems,
  getNotificationInboxScope,
  markAllNotificationInboxItemsRead,
  markNotificationInboxItemRead,
  NOTIFICATION_INBOX_DEVICE_SCOPE,
} from '../../notification/notificationInbox';
import { routeNotificationInboxAction } from '../../notification/pushNotification';
import type {
  NotificationInboxCategory,
  NotificationInboxItem,
} from '../../notification/notificationInbox';
import type { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import {
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

type FilterKey = 'all' | 'unread' | NotificationInboxCategory;

interface FilterOption {
  key: FilterKey;
  labelKey: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', labelKey: 'NOTIFICATION_INBOX_ALL' },
  { key: 'unread', labelKey: 'NOTIFICATION_INBOX_UNREAD' },
  { key: 'card', labelKey: 'NOTIFICATION_INBOX_CATEGORY_CARD' },
  { key: 'security', labelKey: 'NOTIFICATION_INBOX_CATEGORY_SECURITY' },
  { key: 'rewards', labelKey: 'NOTIFICATION_INBOX_CATEGORY_REWARDS' },
  { key: 'bridgeSwap', labelKey: 'NOTIFICATION_INBOX_CATEGORY_BRIDGE_SWAP' },
  { key: 'quickAction', labelKey: 'NOTIFICATION_INBOX_CATEGORY_QUICK_ACTION' },
];

const CATEGORY_LABEL_KEYS: Record<NotificationInboxCategory, string> = {
  card: 'NOTIFICATION_INBOX_CATEGORY_CARD',
  security: 'NOTIFICATION_INBOX_CATEGORY_SECURITY',
  rewards: 'NOTIFICATION_INBOX_CATEGORY_REWARDS',
  bridgeSwap: 'NOTIFICATION_INBOX_CATEGORY_BRIDGE_SWAP',
  quickAction: 'NOTIFICATION_INBOX_CATEGORY_QUICK_ACTION',
  general: 'NOTIFICATION_INBOX_CATEGORY_GENERAL',
};

const getActionHintKey = (item: NotificationInboxItem) => {
  if (item.action.type === 'quickAction') {
    return 'NOTIFICATION_INBOX_TAKE_ACTION';
  }

  if (item.category === 'security') {
    return 'NOTIFICATION_INBOX_REVIEW';
  }

  if (item.action.type === 'navigate') {
    return 'NOTIFICATION_INBOX_OPEN';
  }

  return 'NOTIFICATION_INBOX_VIEW_DETAILS';
};

const formatNotificationTimestamp = (timestamp: number) => {
  const receivedAt = moment(timestamp);
  if (moment().diff(receivedAt, 'days') < 7) {
    return receivedAt.fromNow();
  }
  return receivedAt.format('MMM D, YYYY');
};

const styles = StyleSheet.create({
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
});

const getVisibleMarkAllScopes = (scopeId?: string) => {
  const scopes = [scopeId, NOTIFICATION_INBOX_DEVICE_SCOPE].filter(
    (scope): scope is string => !!scope,
  );
  return Array.from(new Set(scopes));
};

interface NotificationInboxFiltersProps {
  selectedFilter: FilterKey;
  onSelectFilter: (filter: FilterKey) => void;
  t: (key: string) => string;
}

function NotificationInboxFiltersComponent({
  selectedFilter,
  onSelectFilter,
  t,
}: NotificationInboxFiltersProps) {
  return (
    <CyDScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className='max-h-[44px]'
      contentContainerStyle={styles.filterContent}>
      {FILTER_OPTIONS.map(filter => {
        const isSelected = filter.key === selectedFilter;
        return (
          <CyDTouchView
            key={filter.key}
            onPress={() => onSelectFilter(filter.key)}
            className={`px-[14px] py-[8px] rounded-full border ${
              isSelected ? 'bg-base400 border-base400' : 'bg-n0 border-n40'
            }`}>
            <CyDText
              className={`text-[13px] font-semibold ${
                isSelected ? 'text-n0' : 'text-base400'
              }`}>
              {t(filter.labelKey)}
            </CyDText>
          </CyDTouchView>
        );
      })}
    </CyDScrollView>
  );
}

const NotificationInboxFilters = React.memo(NotificationInboxFiltersComponent);

function NotificationInboxEmptyStateComponent({ t }: { t: (key: string) => string }) {
  return <CyDView className='flex-1 items-center justify-center px-[28px] py-[72px]'>
    <CyDView className='h-[64px] w-[64px] rounded-full bg-n20 items-center justify-center mb-[18px]'>
      <CyDMaterialDesignIcons
        name='bell-outline'
        size={32}
        className='text-base400'
      />
    </CyDView>
    <CyDText className='text-[18px] font-bold text-center text-base400 mb-[8px]'>
      {t('NOTIFICATION_INBOX_EMPTY_TITLE')}
    </CyDText>
    <CyDText className='text-[14px] font-medium text-center text-n200 leading-[22px]'>
      {t('NOTIFICATION_INBOX_EMPTY_SUBTITLE')}
    </CyDText>
  </CyDView>;
}

const NotificationInboxEmptyState = React.memo(NotificationInboxEmptyStateComponent);

interface NotificationInboxCardProps {
  item: NotificationInboxItem;
  onPress: (item: NotificationInboxItem) => void;
  onDelete: (event: GestureResponderEvent, item: NotificationInboxItem) => void;
  t: (key: string) => string;
}

function NotificationInboxCardComponent({
  item,
  onPress,
  onDelete,
  t,
}: NotificationInboxCardProps) {
    const isUnread = item.status === 'unread';
    return (
      <CyDTouchView
        activeOpacity={0.8}
        onPress={() => onPress(item)}
        className={`mx-[16px] mb-[12px] rounded-[18px] border p-[16px] ${
          isUnread ? 'bg-n0 border-base400' : 'bg-n0 border-n40'
        }`}>
        <CyDView className='flex-row items-start justify-between gap-[12px]'>
          <CyDView className='flex-1'>
            <CyDView className='flex-row items-center mb-[8px]'>
              {isUnread && (
                <CyDView className='h-[8px] w-[8px] rounded-full bg-base400 mr-[8px]' />
              )}
              <CyDText className='text-[12px] font-bold uppercase text-base400'>
                {t(CATEGORY_LABEL_KEYS[item.category])}
              </CyDText>
              <CyDText className='text-[12px] font-medium text-n100 ml-[8px]'>
                {formatNotificationTimestamp(item.receivedAt)}
              </CyDText>
            </CyDView>
            <CyDText className='text-[16px] font-bold text-base400 mb-[6px]'>
              {item.title}
            </CyDText>
            {!!item.body && (
              <CyDText
                className='text-[14px] font-medium text-n200 leading-[20px] mb-[12px]'
                numberOfLines={3}>
                {item.body}
              </CyDText>
            )}
            <CyDText className='text-[13px] font-bold text-base400'>
              {t(getActionHintKey(item))}
            </CyDText>
          </CyDView>
          <CyDTouchView
            accessibilityLabel={t('DELETE') ?? 'Delete'}
            onPress={event => onDelete(event, item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className='h-[32px] w-[32px] rounded-full bg-n20 items-center justify-center'>
            <CyDMaterialDesignIcons
              name='trash-can-outline'
              size={20}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
      </CyDTouchView>
    );
}

const NotificationInboxCard = React.memo(NotificationInboxCardComponent);

export const markVisibleNotificationInboxItemsRead = async (scopeId?: string) => {
  await Promise.all(
    getVisibleMarkAllScopes(scopeId).map(async visibleScopeId =>
      await markAllNotificationInboxItemsRead({ scopeId: visibleScopeId }),
    ),
  );
};

export const markVisibleNotificationInboxItemRead = async (
  item: NotificationInboxItem,
) => await markNotificationInboxItemRead(item.id, { scopeId: item.scopeId });

export const deleteVisibleNotificationInboxItem = async (
  item: NotificationInboxItem,
) => await deleteNotificationInboxItem(item.id, { scopeId: item.scopeId });

export const pressNotificationInboxItem = async ({
  item,
  navigation,
  showModal,
  hideModal,
}: {
  item: NotificationInboxItem;
  navigation: NavigationProp<ParamListBase>;
  showModal: (type: GlobalModalType, data: unknown) => void;
  hideModal: () => void;
}) => {
  await markVisibleNotificationInboxItemRead(item);
  await routeNotificationInboxAction({
    item,
    navigation,
    showModal,
    hideModal,
  });
};

export default function NotificationInbox() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { showModal, hideModal } = useGlobalModalContext();
  const isFocused = useIsFocused();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const scopeId = useMemo(
    () => getNotificationInboxScope(hdWalletContext?.state),
    [hdWalletContext?.state],
  );
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(false);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const inboxItems = await getNotificationInboxItems({
        scopeId,
        includeDeviceScope: true,
      });
      setItems(inboxItems);
    } finally {
      setIsLoading(false);
    }
  }, [scopeId]);

  useEffect(() => {
    if (isFocused) {
      loadItems().catch(() => undefined);
    }
  }, [isFocused, loadItems]);

  const filteredItems = useMemo(() => {
    switch (selectedFilter) {
      case 'all':
        return items;
      case 'unread':
        return items.filter(item => item.status === 'unread');
      default:
        return items.filter(item => item.category === selectedFilter);
    }
  }, [items, selectedFilter]);

  const hasUnreadItems = useMemo(
    () => items.some(item => item.status === 'unread'),
    [items],
  );

  const handleMarkAllRead = useCallback(async () => {
    await markVisibleNotificationInboxItemsRead(scopeId);
    await loadItems();
  }, [loadItems, scopeId]);

  const handlePressItem = useCallback(
    async (item: NotificationInboxItem) => {
      await pressNotificationInboxItem({
        item,
        navigation,
        showModal,
        hideModal,
      });
      await loadItems();
    },
    [hideModal, loadItems, navigation, showModal],
  );

  const handleDeleteItem = useCallback(
    async (event: GestureResponderEvent, item: NotificationInboxItem) => {
      event.stopPropagation?.();
      await deleteVisibleNotificationInboxItem(item);
      await loadItems();
    },
    [loadItems],
  );

  const handleSelectFilter = useCallback((filter: FilterKey) => {
    setSelectedFilter(filter);
  }, []);

  const handlePressCard = useCallback(
    (item: NotificationInboxItem) => {
      handlePressItem(item).catch(() => undefined);
    },
    [handlePressItem],
  );

  const handleDeleteCard = useCallback(
    (event: GestureResponderEvent, item: NotificationInboxItem) => {
      handleDeleteItem(event, item).catch(() => undefined);
    },
    [handleDeleteItem],
  );

  return (
    <CyDView className='flex-1 bg-n20'>
      <CyDView className='py-[12px]'>
        <NotificationInboxFilters
          selectedFilter={selectedFilter}
          onSelectFilter={handleSelectFilter}
          t={t}
        />
      </CyDView>
      {hasUnreadItems && (
        <CyDView className='px-[16px] pb-[12px] items-end'>
          <CyDTouchView
            onPress={() => {
              handleMarkAllRead().catch(() => undefined);
            }}>
            <CyDText className='text-[14px] font-bold text-base400'>
              {t('NOTIFICATION_INBOX_MARK_ALL_READ')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      )}
      <CyDScrollView
        className='flex-1'
        contentContainerStyle={styles.listContent}>
        {filteredItems.length === 0 && !isLoading ? (
          <NotificationInboxEmptyState t={t} />
        ) : (
          filteredItems.map(item => (
            <NotificationInboxCard
              key={item.id}
              item={item}
              onPress={handlePressCard}
              onDelete={handleDeleteCard}
              t={t}
            />
          ))
        )}
      </CyDScrollView>
    </CyDView>
  );
}
