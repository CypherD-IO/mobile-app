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
import { has } from 'lodash';
import { t } from 'i18next';
import { signIn } from './Keychain';
import { useGlobalModalContext } from '../components/v2/GlobalModal';
import { AxiosRequestConfig } from 'axios';
import RNExitApp from 'react-native-exit-app';
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
export default function useAxios() {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const ethereum = hdWalletContext.state.wallet.ethereum;
  let token = globalContext.globalState.token;

  const response: IHttpResponse = { isError: false };

  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const baseURL: string = ARCH_HOST;
  const axiosInstance = axios.create({
    baseURL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${String(token)}`,
    },
  });

  axiosInstance.interceptors.request.use(
    async (req: any) => {
      if (!isTokenValid(token)) {
        try {
          const signInResponse = await signIn(ethereum, hdWalletContext);
          if (
            signInResponse?.message === SignMessageValidationType.VALID &&
            has(signInResponse, 'token')
          ) {
            token = signInResponse?.token;
            globalContext.globalDispatch({
              type: GlobalContextType.SIGN_IN,
              sessionToken: token,
            });
            req.headers.Authorization = `Bearer ${String(token)}`;
            return req;
          }
        } catch (e: any) {
          Sentry.captureException(e.message);
        }
      } else {
        req.headers.Authorization = `Bearer ${String(token)}`;
        return req;
      }
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
    let shouldRetry = 0;

    do {
      const url = `${baseURL}${endpoint}`;

      try {
        const reqBody = method !== 'GET' && JSON.stringify(body);
        if (method === 'GET') {
          const { data, status } = await axiosInstance.get(url);
          response.data = data;
          response.status = status;
        } else if (method === 'GET_WITHOUT_AUTH') {
          const resp = await axios.get(url, {
            params: body,
            timeout,
          });
          response.data = resp.data;
          response.status = resp.status;
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
          const _config = {
            ...config,
            headers: {
              accept: 'application/json',
            },
          };

          const { data } = await axios.get(endpoint, _config);
          response.data = data;
        } else if (method === 'POST_TO_OTHER_SOURCE') {
          const _config = {
            ...config,
            headers: {
              accept: 'application/json',
            },
          };

          const { data } = await axios.post(endpoint, body, _config);
          response.data = data;
        }
        return response;
      } catch (error: any) {
        const errorCode = error?.response?.status;
        if (errorCode === 401) {
          try {
            const signInResponse = await signIn(ethereum, hdWalletContext);
            if (
              signInResponse?.message === SignMessageValidationType.VALID &&
              has(signInResponse, 'token')
            ) {
              token = signInResponse?.token;
              globalContext.globalDispatch({
                type: GlobalContextType.SIGN_IN,
                sessionToken: token,
              });
            }
          } catch (e: any) {
            Sentry.captureException(e.message);
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
    config?: AxiosRequestConfig<object> | undefined,
    timeout = DEFAULT_AXIOS_TIMEOUT,
  ) {
    return await request('GET', url, timeout, undefined, config);
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
  ) => {
    return await request('DELETE', url, timeout, undefined, config);
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
  };
}
