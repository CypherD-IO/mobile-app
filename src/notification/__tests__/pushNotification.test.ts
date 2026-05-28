import { requestUserPermission } from '../pushNotification';

const mockRequestMessagingPermission = jest.fn();
const mockGetMessaging = jest.fn().mockReturnValue('messaging-instance');

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    DENIED: 0,
    NOT_DETERMINED: -1,
  },
  requestPermission: (...args: unknown[]) =>
    mockRequestMessagingPermission(...args),
  getMessaging: () => mockGetMessaging(),
}));

const mockNotifeeRequestPermission = jest.fn().mockResolvedValue(undefined);
const mockSetNotificationCategories = jest.fn().mockResolvedValue(undefined);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: (...args: unknown[]) =>
      mockNotifeeRequestPermission(...args),
    setNotificationCategories: (...args: unknown[]) =>
      mockSetNotificationCategories(...args),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidStyle: { BIGTEXT: 1 },
}));

const mockShowPromptForPushNotifications = jest
  .fn()
  .mockResolvedValue(undefined);

jest.mock('customerio-reactnative', () => ({
  CustomerIO: {
    showPromptForPushNotifications: (...args: unknown[]) =>
      mockShowPromptForPushNotifications(...args),
  },
}));

const mockCaptureException = jest.fn();
jest.mock('@sentry/react-native', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

jest.mock('../../global', () => ({
  hostWorker: { getHost: jest.fn().mockReturnValue('https://mock-host') },
}));

jest.mock('../../core/Http', () => ({
  __esModule: true,
  default: { put: jest.fn() },
}));

jest.mock('../../core/util', () => ({
  isAddressSet: jest.fn().mockReturnValue(true),
}));

jest.mock('../../core/asyncStorage', () => ({
  getConnectionType: jest.fn().mockResolvedValue(null),
}));

function givenPermission(status: number): void {
  mockRequestMessagingPermission.mockResolvedValue(status);
}

describe('requestUserPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests notifee permission and sets categories when AUTHORIZED', async () => {
    givenPermission(1);

    await requestUserPermission();

    expect(mockRequestMessagingPermission).toHaveBeenCalledWith(
      'messaging-instance',
    );
    expect(mockNotifeeRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockSetNotificationCategories).toHaveBeenCalledTimes(1);
  });

  it('requests notifee permission when PROVISIONAL', async () => {
    givenPermission(2);

    await requestUserPermission();

    expect(mockNotifeeRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockSetNotificationCategories).toHaveBeenCalledTimes(1);
  });

  it('skips notifee permission and categories when DENIED', async () => {
    givenPermission(0);

    await requestUserPermission();

    expect(mockNotifeeRequestPermission).not.toHaveBeenCalled();
    expect(mockSetNotificationCategories).not.toHaveBeenCalled();
  });

  it('skips notifee permission and categories when NOT_DETERMINED', async () => {
    givenPermission(-1);

    await requestUserPermission();

    expect(mockNotifeeRequestPermission).not.toHaveBeenCalled();
    expect(mockSetNotificationCategories).not.toHaveBeenCalled();
  });

  it('calls CustomerIO.showPromptForPushNotifications with correct options', async () => {
    givenPermission(1);

    await requestUserPermission();

    expect(mockShowPromptForPushNotifications).toHaveBeenCalledTimes(1);
    expect(mockShowPromptForPushNotifications).toHaveBeenCalledWith({
      ios: { sound: true, badge: true },
    });
  });

  it('calls CustomerIO.showPromptForPushNotifications even when permission is denied', async () => {
    givenPermission(0);

    await requestUserPermission();

    expect(mockShowPromptForPushNotifications).toHaveBeenCalledTimes(1);
    expect(mockShowPromptForPushNotifications).toHaveBeenCalledWith({
      ios: { sound: true, badge: true },
    });
  });

  it('catches CIO errors and reports to Sentry without rethrowing', async () => {
    givenPermission(1);
    const cioError = new Error('CIO push prompt failed');
    mockShowPromptForPushNotifications.mockRejectedValueOnce(cioError);

    await expect(requestUserPermission()).resolves.toBeUndefined();

    expect(mockCaptureException).toHaveBeenCalledWith(cioError);
  });

  it('does not report to Sentry when CIO call succeeds', async () => {
    givenPermission(1);

    await requestUserPermission();

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('calls CIO prompt after notifee setup when permission is granted', async () => {
    givenPermission(1);

    const callOrder: string[] = [];
    mockNotifeeRequestPermission.mockImplementation(async () => {
      callOrder.push('notifee.requestPermission');
    });
    mockSetNotificationCategories.mockImplementation(async () => {
      callOrder.push('notifee.setNotificationCategories');
    });
    mockShowPromptForPushNotifications.mockImplementation(async () => {
      callOrder.push('CIO.showPromptForPushNotifications');
    });

    await requestUserPermission();

    expect(callOrder).toEqual([
      'notifee.requestPermission',
      'notifee.setNotificationCategories',
      'CIO.showPromptForPushNotifications',
    ]);
  });
});
