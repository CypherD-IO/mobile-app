/**
 * Unit tests for the sunset store's wind-down config fetch.
 */
/* eslint-disable import/first */
jest.mock('../../core/asyncStorage', () => ({
  getSunsetConfigCache: jest.fn(),
  setSunsetConfigCache: jest.fn(),
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('../../containers/utilities/toastUtility', () => ({
  showToast: jest.fn(),
}));
jest.mock('../../global', () => ({
  hostWorker: { getHost: jest.fn(() => 'https://arch.example') },
}));
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    isAxiosError: (e: { response?: unknown }) => Boolean(e?.response),
  },
}));

import axios from 'axios';
import { fetchWindDownConfig } from '../sunsetStore';

const mockedGet = axios.get as jest.Mock;

describe('fetchWindDownConfig', () => {
  beforeEach(() => mockedGet.mockReset());

  it('GETs /v1/wind-down and returns the config with enabled', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        enabled: true,
        windDownStartDate: '2026-07-08',
        shutdownDate: '2026-10-06',
      },
    });

    const config = await fetchWindDownConfig();

    expect(mockedGet).toHaveBeenCalledWith(
      'https://arch.example/v1/wind-down',
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    expect(config.enabled).toBe(true);
    expect(config.shutdownDate).toBe('2026-10-06');
  });

  it('coerces a missing/falsey enabled to boolean false', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { windDownStartDate: '2026-07-08' },
    });

    const config = await fetchWindDownConfig();

    expect(config.enabled).toBe(false);
  });

  it('treats a 404 (endpoint not deployed) as disabled', async () => {
    mockedGet.mockRejectedValueOnce({ response: { status: 404 } });

    const config = await fetchWindDownConfig();

    expect(config.enabled).toBe(false);
  });

  it('re-throws non-404 errors so the caller keeps the cached value', async () => {
    // No `response` = network/timeout error.
    mockedGet.mockRejectedValueOnce(new Error('Network Error'));

    await expect(fetchWindDownConfig()).rejects.toThrow('Network Error');
  });
});
