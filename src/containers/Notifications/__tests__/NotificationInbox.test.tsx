/* eslint-disable import/first, import/no-duplicates, @typescript-eslint/no-var-requires */
jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => false),
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../../components/v2/GlobalModal', () => ({
  useGlobalModalContext: () => ({ showModal: jest.fn(), hideModal: jest.fn() }),
}));

jest.mock('../../../core/util', () => {
  const React = require('react');
  return {
    HdWalletContext: React.createContext({ state: {} }),
  };
});

jest.mock('../../../styles/tailwindComponents', () => {
  const { ScrollView, Text, TouchableOpacity, View } = require('react-native');
  return {
    CyDMaterialDesignIcons: View,
    CyDScrollView: ScrollView,
    CyDText: Text,
    CyDTouchView: TouchableOpacity,
    CyDView: View,
  };
});

jest.mock('../../../notification/notificationInbox', () => ({
  deleteNotificationInboxItem: jest.fn(),
  getNotificationInboxItems: jest.fn(async () => []),
  getNotificationInboxScope: jest.fn(() => 'wallet-scope'),
  markAllNotificationInboxItemsRead: jest.fn(async () => []),
  markNotificationInboxItemRead: jest.fn(),
  NOTIFICATION_INBOX_DEVICE_SCOPE: 'device',
}));

jest.mock('../../../notification/pushNotification', () => ({
  routeNotificationInboxAction: jest.fn(async () => undefined),
}));

import {
  deleteNotificationInboxItem,
  getNotificationInboxItems,
  markAllNotificationInboxItemsRead,
  markNotificationInboxItemRead,
} from '../../../notification/notificationInbox';
import { routeNotificationInboxAction } from '../../../notification/pushNotification';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NotificationInbox from '../NotificationInbox';
import {
  deleteVisibleNotificationInboxItem,
  markVisibleNotificationInboxItemRead,
  markVisibleNotificationInboxItemsRead,
  pressNotificationInboxItem,
} from '../NotificationInbox';

const navigationMock = { navigate: jest.fn() };

const mockDeleteItem = deleteNotificationInboxItem as jest.Mock;
const mockGetItems = getNotificationInboxItems as jest.Mock;
const mockMarkAll = markAllNotificationInboxItemsRead as jest.Mock;
const mockMarkItemRead = markNotificationInboxItemRead as jest.Mock;
const mockRouteInboxAction = routeNotificationInboxAction as jest.Mock;
const mockUseIsFocused = require('@react-navigation/native').useIsFocused as jest.Mock;
const mockUseNavigation = require('@react-navigation/native').useNavigation as jest.Mock;

describe('NotificationInbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItems.mockResolvedValue([]);
    mockUseIsFocused.mockReturnValue(false);
    mockUseNavigation.mockReturnValue(navigationMock);
  });

  it('marks both wallet-scoped and device fallback items read when a wallet scope is visible', async () => {
    await markVisibleNotificationInboxItemsRead('wallet-scope');

    expect(mockMarkAll).toHaveBeenCalledTimes(2);
    expect(mockMarkAll).toHaveBeenNthCalledWith(1, { scopeId: 'wallet-scope' });
    expect(mockMarkAll).toHaveBeenNthCalledWith(2, { scopeId: 'device' });
  });

  it('marks device fallback items once when no wallet scope is available', async () => {
    await markVisibleNotificationInboxItemsRead(undefined);

    expect(mockMarkAll).toHaveBeenCalledTimes(1);
    expect(mockMarkAll).toHaveBeenCalledWith({ scopeId: 'device' });
  });

  it('uses each item scope for per-item mark-read and delete operations', async () => {
    const item = {
      id: 'item-1',
      scopeId: 'wallet-scope',
    } as any;

    await markVisibleNotificationInboxItemRead(item);
    await deleteVisibleNotificationInboxItem(item);

    expect(mockMarkItemRead).toHaveBeenCalledWith('item-1', {
      scopeId: 'wallet-scope',
    });
    expect(mockDeleteItem).toHaveBeenCalledWith('item-1', {
      scopeId: 'wallet-scope',
    });
  });

  it('marks tapped items read and routes them through the safe inbox action helper', async () => {
    const item = {
      id: 'quick-action-item',
      scopeId: 'wallet-scope',
      action: { type: 'quickAction', actionId: 'ADD_COUNTRY' },
    } as any;
    const navigation = { navigate: jest.fn() } as any;
    const showModal = jest.fn();
    const hideModal = jest.fn();

    await pressNotificationInboxItem({
      item,
      navigation,
      showModal,
      hideModal,
    });

    expect(mockMarkItemRead).toHaveBeenCalledWith('quick-action-item', {
      scopeId: 'wallet-scope',
    });
    expect(mockRouteInboxAction).toHaveBeenCalledWith({
      item,
      navigation,
      showModal,
      hideModal,
    });
  });

  it('renders the empty state when focused with no inbox items', async () => {
    mockUseIsFocused.mockReturnValue(true);
    mockGetItems.mockResolvedValue([]);

    render(<NotificationInbox />);

    expect(await screen.findByText('NOTIFICATION_INBOX_EMPTY_TITLE')).toBeTruthy();
    expect(screen.getByText('NOTIFICATION_INBOX_EMPTY_SUBTITLE')).toBeTruthy();
  });

  it('renders unread actions and supports mark-all-read, delete, and tap interactions', async () => {
    mockUseIsFocused.mockReturnValue(true);
    const item = {
      id: 'item-1',
      scopeId: 'wallet-scope',
      title: 'Card declined',
      body: 'Review this card transaction',
      category: 'card',
      status: 'unread',
      receivedAt: Date.now(),
      action: { type: 'navigate', tab: 'CARD', screen: 'DEBIT_CARD_SCREEN' },
    } as any;
    mockGetItems.mockResolvedValue([item]);

    render(<NotificationInbox />);

    expect(await screen.findByText('Card declined')).toBeTruthy();
    expect(screen.getByText('NOTIFICATION_INBOX_MARK_ALL_READ')).toBeTruthy();

    fireEvent.press(screen.getByText('NOTIFICATION_INBOX_MARK_ALL_READ'));
    await waitFor(() => expect(mockMarkAll).toHaveBeenCalledWith({ scopeId: 'wallet-scope' }));

    fireEvent(screen.getByLabelText('DELETE'), 'press', {
      stopPropagation: jest.fn(),
    });
    await waitFor(() => expect(mockDeleteItem).toHaveBeenCalledWith('item-1', { scopeId: 'wallet-scope' }));

    mockGetItems.mockResolvedValue([item]);
    fireEvent.press(screen.getByText('Card declined'));
    await waitFor(() => expect(mockMarkItemRead).toHaveBeenCalledWith('item-1', { scopeId: 'wallet-scope' }));
    expect(mockRouteInboxAction).toHaveBeenCalledWith(
      expect.objectContaining({ item }),
    );
  });
});
