/* eslint-disable import/first */
const mockCreateChannel = jest.fn(async () => 'default-channel');
const mockDisplayNotification = jest.fn(async () => undefined);
const mockCancelNotification = jest.fn(async () => undefined);
const mockRequestPermission = jest.fn(async () => undefined);
const mockSetNotificationCategories = jest.fn(async () => undefined);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: mockCreateChannel,
    displayNotification: mockDisplayNotification,
    cancelNotification: mockCancelNotification,
    requestPermission: mockRequestPermission,
    setNotificationCategories: mockSetNotificationCategories,
  },
  AndroidImportance: { HIGH: 'HIGH' },
  AndroidStyle: { BIGTEXT: 'BIGTEXT' },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'fcm-token'),
  requestPermission: jest.fn(async () => 1),
}));

jest.mock('../../global', () => ({
  hostWorker: { getHost: jest.fn(() => 'https://api.example') },
}));

jest.mock('../../core/Http', () => ({
  put: jest.fn(async () => ({})),
}));

jest.mock('../../core/util', () => ({
  isAddressSet: jest.fn(() => true),
}));

jest.mock('../../core/asyncStorage', () => ({
  getConnectionType: jest.fn(async () => 'EVM'),
}));

jest.mock('../../notification/notificationInbox', () => ({
  saveNotificationInboxItem: jest.fn(async () => undefined),
  sanitizeNotificationInboxData: jest.fn(data => ({ sanitized: true, ...data })),
}));

import notifee from '@notifee/react-native';
import { screenTitle } from '../../constants';
import { GlobalModalType, NOTIFE_ACTIONS } from '../../constants/enum';
import {
  routeNotificationInboxAction,
  showNotification,
} from '../pushNotification';
import {
  saveNotificationInboxItem,
  sanitizeNotificationInboxData,
} from '../notificationInbox';

describe('pushNotification inbox wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes raw notification data to the inbox save path before displaying through Notifee', async () => {
    await showNotification(
      { title: 'Title', body: 'Body' },
      { notificationId: 'n-1', secret: 'raw' },
    );

    expect(sanitizeNotificationInboxData).not.toHaveBeenCalled();
    expect(saveNotificationInboxItem).toHaveBeenCalledWith(
      {
        notification: { title: 'Title', body: 'Body' },
        data: { notificationId: 'n-1', secret: 'raw' },
      },
      { source: 'notifee-display' },
    );
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    expect(
      (saveNotificationInboxItem as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(mockDisplayNotification.mock.invocationCallOrder[0]);
  });

  it('preserves remote message ids and wallet scope when archiving displayed notifications', async () => {
    await showNotification(
      { title: 'Title', body: 'Body' },
      { notificationId: 'n-1' },
      { messageId: 'remote-message-1', scopeId: '0xabc' },
    );

    expect(sanitizeNotificationInboxData).not.toHaveBeenCalled();
    expect(saveNotificationInboxItem).toHaveBeenCalledWith(
      {
        messageId: 'remote-message-1',
        notification: { title: 'Title', body: 'Body' },
        data: {
          notificationId: 'n-1',
          messageId: 'remote-message-1',
        },
      },
      { source: 'notifee-display', scopeId: '0xabc' },
    );
  });

  it('does not display or archive when the existing display path has no body', async () => {
    await showNotification({ title: 'Title' }, { notificationId: 'n-1' });

    expect(saveNotificationInboxItem).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('routes inbox navigate actions without invoking Notifee cancellation', async () => {
    const navigation = { navigate: jest.fn() } as any;

    await routeNotificationInboxAction({
      item: {
        id: 'inbox-id',
        dedupeKey: 'dedupe',
        title: 'Open',
        body: 'Details',
        category: 'general',
        status: 'read',
        receivedAt: 1,
        lastUpdatedAt: 1,
        source: 'seeded-test',
        scopeId: 'device',
        action: {
          type: 'navigate',
          tab: screenTitle.OPTIONS,
          screen: screenTitle.BROWSER,
          params: { url: 'https://example.com' },
        },
      },
      navigation,
      showModal: jest.fn(),
      hideModal: jest.fn(),
    });

    expect(navigation.navigate).toHaveBeenCalledWith(screenTitle.OPTIONS, {
      screen: screenTitle.BROWSER,
      params: { url: 'https://example.com' },
    });
    expect(notifee.cancelNotification).not.toHaveBeenCalled();
  });

  it('runs quick actions without passing synthetic inbox ids to Notifee cancellation', async () => {
    const showModal = jest.fn();

    await routeNotificationInboxAction({
      item: {
        id: 'synthetic-inbox-id',
        dedupeKey: 'dedupe',
        title: 'Action',
        body: 'Add country',
        category: 'quickAction',
        status: 'read',
        receivedAt: 1,
        lastUpdatedAt: 1,
        source: 'seeded-test',
        scopeId: 'device',
        action: {
          type: 'quickAction',
          actionId: NOTIFE_ACTIONS.ADD_COUNTRY,
          params: { cardId: 'card-1', provider: 'rain' },
        },
      },
      navigation: { navigate: jest.fn() } as any,
      showModal,
      hideModal: jest.fn(),
    });

    expect(showModal).toHaveBeenCalledWith(
      GlobalModalType.CARD_ACTIONS_FROM_NOTIFICATION,
      expect.objectContaining({
        data: expect.objectContaining({ cardId: 'card-1', provider: 'rain' }),
      }),
    );
    expect(notifee.cancelNotification).not.toHaveBeenCalled();
  });

  it('keeps informational inbox actions read-only', async () => {
    const navigation = { navigate: jest.fn() } as any;
    const showModal = jest.fn();

    await routeNotificationInboxAction({
      item: {
        id: 'three-ds-info',
        dedupeKey: 'dedupe',
        title: '3DS',
        body: 'Review only',
        category: 'security',
        status: 'read',
        receivedAt: 1,
        lastUpdatedAt: 1,
        source: 'seeded-test',
        scopeId: 'device',
        action: { type: 'none' },
      },
      navigation,
      showModal,
      hideModal: jest.fn(),
    });

    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(showModal).not.toHaveBeenCalled();
    expect(notifee.cancelNotification).not.toHaveBeenCalled();
  });
});
