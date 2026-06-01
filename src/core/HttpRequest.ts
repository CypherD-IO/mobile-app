import { hostWorker } from '../global';
import axios, { DEFAULT_AXIOS_TIMEOUT } from './Http';
import { useContext } from 'react';
import { GlobalContext, isTokenValid } from '../core/globalContext';
import * as Sentry from '@sentry/react-native';
import { HdWalletContext } from './util';
import {
  GlobalContextType,
  SignMessageValidationType,
} from '../constants/enum';
import { get, has } from 'lodash';
import { t } from 'i18next';
import { signIn } from './Keychain';
import { useGlobalModalContext } from '../components/v2/GlobalModal';
import { AxiosRequestConfig } from 'axios';
import RNExitApp from 'react-native-exit-app';
import {
  getIntegrityToken,
  handleBackendIntegrityRejection,
} from '../hooks/useIntegrityService';
import {
  clearAuthTokens,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
} from './asyncStorage';
type RequestMethod =
  | 'GET'
  | 'GET_WITHOUT_AUTH'
  | 'POST'
  | 'POST_WITHOUT_AUTH'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'DELETE_WITHOUT_AUTH'
  | 'GET_FROM_OTHER_SOURCE'
  | 'POST_TO_OTHER_SOURCE';

interface IHttpResponse {
  isError: boolean;
  data?: any;
  status?: number;
  error?: any;
}

// Module-level single-flight guard for acquireValidToken. Multiple authed
// requests racing 401s would otherwise each fire their own /refresh +
// getIntegrityToken + signIn, hammering the backend and burning App Attest
// attestation quota. All concurrent callers await the same in-flight promise.
let pendingTokenAcquire: Promise<string | null> | null = null;

// TODO(CYP-3000): confirm backend refresh endpoint contract — current assumption
// is POST /v1/authentication/refresh with { refreshToken } body returning
// { token, refreshToken }. If backend expects the refresh token via header/cookie
// or a different response shape, adjust here.
async function refreshSession(): Promise<{
  token: string;
  refreshToken: string;
} | null> {
  const stored = await getRefreshToken();
  if (!stored) return null;
  try {
    const refreshToken = JSON.parse(String(stored));
    const host = hostWorker.getHost('ARCH_HOST');
    const { data } = await axios.post(`${host}/v1/authentication/refresh`, {
      refreshToken,
    });
    if (data?.token) {
      await setAuthToken(data.token);
      if (data.refreshToken) {
        await setRefreshToken(data.refreshToken);
      }
      return data;
    }
    return null;
  } catch (e) {
    // Refresh token dead or endpoint returned 401 — clear tokens so caller falls
    // through to the full login flow (Case 5).
    await clearAuthTokens();
    return null;
  }
}

export default function useAxios() {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { showModal, hideModal } = useGlobalModalContext();

  let token = globalContext.globalState.token;

  // Refresh-first, then re-login with integrity (Cases 4 & 5 in the auth flow).
  // Returns a new access token string on success, or null if both paths failed.
  // Single-flighted via pendingTokenAcquire (module-level) so concurrent 401s
  // share one in-flight refresh/login instead of each running their own.
  const acquireValidToken = async (): Promise<string | null> => {
    if (pendingTokenAcquire) return pendingTokenAcquire;
    pendingTokenAcquire = (async () => {
      const refreshed = await refreshSession();
      if (refreshed?.token) {
        globalContext.globalDispatch({
          type: GlobalContextType.SIGN_IN,
          sessionToken: refreshed.token,
        });
        return refreshed.token;
      }
      let integrityUsed: { isAssertion?: boolean } | null = null;
      // Track whether signIn threw vs. returned a structured non-VALID response.
      // Only the "threw" path indicates a possible backend integrity rejection
      // (e.g., backend lost the attestation record). A structured INVALID /
      // NEEDS_UPDATE means integrity verification passed and the signature
      // check downstream of it failed — wiping the keyId in that case would
      // force a fresh attestation, which Apple rate-limits.
      let signInThrew = false;
      try {
        const integrity = await getIntegrityToken();
        integrityUsed = integrity;
        const signInResponse = await signIn(hdWalletContext, integrity);
        if (
          signInResponse?.message === SignMessageValidationType.VALID &&
          has(signInResponse, 'token')
        ) {
          globalContext.globalDispatch({
            type: GlobalContextType.SIGN_IN,
            sessionToken: signInResponse.token,
          });
          return signInResponse.token;
        }
        // signIn() swallows axios errors and returns undefined. Treat undefined
        // as "threw" so an integrity rejection (401) still clears the keyId.
        if (!signInResponse) {
          signInThrew = true;
        }
      } catch (e: any) {
        signInThrew = true;
        Sentry.captureException(e?.message ?? e);
      }
      // Only clear the stored keyId if both:
      //   - we sent an assertion (there was a stored keyId to begin with), and
      //   - signIn actually threw (a structured non-VALID does not imply
      //     the backend rejected integrity)
      if (integrityUsed?.isAssertion && signInThrew) {
        await handleBackendIntegrityRejection();
      }
      return null;
    })();
    try {
      return await pendingTokenAcquire;
    } finally {
      pendingTokenAcquire = null;
    }
  };

  // Create a fresh response object per request to avoid cross-call mutations

  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const baseURL: string = ARCH_HOST;
  const axiosInstance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${String(token)}`,
    },
  });

  // Create a separate instance for multipart form data
  const axiosFormInstance = axios.create({
    baseURL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${String(token)}`,
    },
  });

  axiosInstance.interceptors.request.use(
    async (req: any) => {
      if (!isTokenValid(token)) {
        const newToken = await acquireValidToken();
        if (newToken) {
          token = newToken;
          req.headers.Authorization = `Bearer ${String(token)}`;
          return req;
        }
        // Refresh + re-login both failed. Reject so axios surfaces the failure
        // to the caller instead of dispatching the request with a stale/empty
        // bearer (which would 401 again and loop).
        return await Promise.reject(
          new Error('Unable to acquire auth token'),
        );
      }
      req.headers.Authorization = `Bearer ${String(token)}`;
      return req;
    },
    async function (error) {
      return await Promise.reject(error);
    },
  );

  // Add the same interceptor to the form instance
  axiosFormInstance.interceptors.request.use(
    async (req: any) => {
      if (!isTokenValid(token)) {
        const newToken = await acquireValidToken();
        if (newToken) {
          token = newToken;
          req.headers.Authorization = `Bearer ${String(token)}`;
          return req;
        }
        return await Promise.reject(
          new Error('Unable to acquire auth token'),
        );
      }
      req.headers.Authorization = `Bearer ${String(token)}`;
      return req;
    },
    async function (error) {
      return await Promise.reject(error);
    },
  );

  async function request(
    method: RequestMethod,
    endpoint = '',
    timeout: number,
    body = {},
    config?: AxiosRequestConfig,
  ): Promise<IHttpResponse> {
    // IMPORTANT: Do NOT reuse the same response object across multiple requests.
    // Creating a new object here ensures callers don't see stale/overwritten data
    // when multiple sequential requests are made and their references are held.
    const response: IHttpResponse = { isError: false };
    let shouldRetry = 0;

    do {
      const url = `${baseURL}${endpoint}`;

      try {
        const reqBody = method !== 'GET' && JSON.stringify(body);
        if (method === 'GET') {
          const { data, status } = await axiosInstance.get(url, {
            params: body,
            timeout,
          });
          response.data = data;
          response.status = status;
        } else if (method === 'GET_WITHOUT_AUTH') {
          const { data, status } = await axios.get(url, {
            params: body,
            timeout,
          });
          response.data = data;
          response.status = status;
        } else if (method === 'DELETE') {
          const { data, status } = await axiosInstance.delete(url, body);
          response.data = data;
          response.status = status;
        } else if (method === 'DELETE_WITHOUT_AUTH') {
          const { data, status } = await axios.delete(url, body);
          response.data = data;
          response.status = status;
        } else if (method === 'POST') {
          const { data, status } = await axiosInstance.post(url, reqBody, {
            ...config,
          });
          response.data = data;
          response.status = status;
        } else if (method === 'POST_WITHOUT_AUTH') {
          const { data, status } = await axios.post(url, body);
          response.data = data;
          response.status = status;
        } else if (method === 'PUT') {
          const { data, status } = await axiosInstance.put(url, reqBody);
          response.data = data;
          response.status = status;
        } else if (method === 'PATCH') {
          const { data, status } = await axiosInstance.patch(url, reqBody);
          response.data = data;
          response.status = status;
        } else if (method === 'GET_FROM_OTHER_SOURCE') {
          const _config = { ...config };
          if (!_config.headers) {
            _config.headers = {
              accept: 'application/json',
              'Content-Type': 'application/json',
            };
          }
          const { data } = await axios.get(endpoint, _config);
          response.data = data;
        } else if (method === 'POST_TO_OTHER_SOURCE') {
          const _config = { ...config };
          if (!_config.headers) {
            _config.headers = {
              accept: 'application/json',
              'Content-Type': 'application/json',
            };
          }

          const { data } = await axios.post(endpoint, body, _config);
          response.data = data;
        }
        return response;
      } catch (error: any) {
        const errorCode = error?.response?.status;
        if (errorCode === 401) {
          const newToken = await acquireValidToken();
          if (newToken) {
            token = newToken;
          }
          shouldRetry += 1;
        } else if (errorCode === 444 || errorCode === 403) {
          shouldRetry = 2;
          showModal('state', {
            type: 'error',
            title: '',
            description:
              'Unable to access cypher services. Contact support at support@cypherhq.io',
            onSuccess: () => {
              hideModal();
              RNExitApp.exitApp();
            },
            onFailure: () => {
              hideModal();
              RNExitApp.exitApp();
            },
          });
        } else {
          shouldRetry = 2;
          Sentry.captureException(error);
          return {
            isError: true,
            error:
              error?.response?.data?.errors?.[0] ??
              error?.response?.data?.message ??
              null,
            status: error?.response?.status,
          };
        }
      }
    } while (shouldRetry < 2);

    return { isError: true };
  }

  async function getWithAuth(
    url: string,
    data?: any,
    config?: AxiosRequestConfig<object> | undefined,
    timeout = DEFAULT_AXIOS_TIMEOUT,
  ) {
    return await request('GET', url, timeout, data, config);
  }
  async function getWithoutAuth(
    url: string,
    data?: any,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
  ) {
    return await request('GET_WITHOUT_AUTH', url, timeout, data, config);
  }
  async function postWithAuth(
    url: string,
    data: any,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig,
  ) {
    return await request('POST', url, timeout, data, config);
  }
  async function postWithoutAuth(
    url: string,
    data: any,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
  ) {
    return await request('POST_WITHOUT_AUTH', url, timeout, data, config);
  }
  const putWithAuth = async (
    url: string,
    data: any,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
  ) => {
    return await request('PUT', url, timeout, data, config);
  };
  const patchWithAuth = async (
    url: string,
    data: any,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
  ) => {
    return await request('PATCH', url, timeout, data, config);
  };
  const deleteWithAuth = async (
    url: string,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
    body?: any,
  ) => {
    return await request(
      'DELETE',
      url,
      timeout,
      body ? { data: body } : undefined,
      config,
    );
  };
  const deleteWithoutAuth = async (
    url: string,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
  ) => {
    return await request(
      'DELETE_WITHOUT_AUTH',
      url,
      timeout,
      undefined,
      config,
    );
  };
  const getFromOtherSource = async (
    url: string,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
  ) => {
    return await request(
      'GET_FROM_OTHER_SOURCE',
      url,
      timeout,
      undefined,
      config,
    );
  };
  const postToOtherSource = async (
    url: string,
    data: any,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
  ) => {
    return await request('POST_TO_OTHER_SOURCE', url, timeout, data, config);
  };

  const postFormWithAuth = async (
    url: string,
    formData: FormData,
    timeout = DEFAULT_AXIOS_TIMEOUT,
    config?: AxiosRequestConfig<object> | undefined,
  ) => {
    try {
      const { data, status } = await axiosFormInstance.post(url, formData, {
        ...config,
        timeout,
      });
      return { isError: false, data, status };
    } catch (error: any) {
      return {
        isError: true,
        error:
          error?.response?.data?.errors?.[0] ??
          error?.response?.data?.message ??
          null,
        status: error?.response?.status,
      };
    }
  };

  return {
    getWithAuth,
    postWithAuth,
    putWithAuth,
    patchWithAuth,
    deleteWithAuth,
    deleteWithoutAuth,
    getWithoutAuth,
    postWithoutAuth,
    getFromOtherSource,
    postToOtherSource,
    postFormWithAuth,
  };
}
