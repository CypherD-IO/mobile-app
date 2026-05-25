/* eslint-disable import/first */
jest.mock('../../containers/Options/advancedSettings', () => ({
  advancedSettingsInitialState: {},
}));

jest.mock('../util', () => ({
  CYPHERD_ROOT_DATA: 'CYPHERD_ROOT_DATA',
}));

jest.mock('../portfolio', () => ({}));

jest.mock('../../constants/data', () => ({
  ASYNC_STORAGE_KEYS_TO_PRESERVE: ['ARCH_HOST'],
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllData } from '../asyncStorage';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & {
  multiRemove: jest.Mock;
};

describe('clearAllData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.multiRemove = jest.fn(async () => undefined);
  });

  it('removes notification inbox keys because they are not preserved', async () => {
    mockAsyncStorage.getAllKeys.mockResolvedValue([
      'ARCH_HOST',
      'CONTACT_BOOK',
      'CONTACT_BOOK:0xabc',
      'notificationInbox.v1:0xabc',
      'notificationInbox.v1:device',
      'wallet-data',
    ] as never);

    await clearAllData();

    expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
      'notificationInbox.v1:0xabc',
      'notificationInbox.v1:device',
      'wallet-data',
    ]);
  });
});
