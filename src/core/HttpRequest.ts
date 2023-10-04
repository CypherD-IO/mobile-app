import { hostWorker } from '../global';
import axios, { DEFAULT_AXIOS_TIMEOUT } from './Http';
import { useContext } from 'react';
import { GlobalContext, signIn, isTokenValid } from '../core/globalContext';
import * as Sentry from '@sentry/react-native';
import { HdWalletContext } from './util';
import {
  GlobalContextType,
  SignMessageValidationType,
} from '../constants/enum';
import { has } from 'lodash';
import { t } from 'i18next';
type RequestMethod = 'GET' | 'GET_WITHOUT_AUTH' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface IHttpResponse {
  isError: boolean;
  data?: any;
  status?: number;
  error?: any;
}
export default function useAxios() {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
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
          const signInResponse = await signIn(ethereum);
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
    }
  );

  async function request(
    method: RequestMethod,
    endpoint = '',
    timeout:number,
    body = {},
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
        }else if (method === 'GET_WITHOUT_AUTH') {
          const { data, status } = await axios.get(url, { params: body,timeout });
          response.data = data;
          response.status = status;
        } else if (method === 'DELETE') {
          const { data, status } = await axiosInstance.delete(url);
          response.data = data;
          response.status = status;
        } else if (method === 'POST') {
          const { data, status } = await axiosInstance.post(url, reqBody);
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
        }
        return response;
      } catch (error: any) {
        if (error?.response?.status === 401) {
          try {
            const signInResponse = await signIn(ethereum);
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
        } else {
          shouldRetry = 2;
          Sentry.captureException(error);
          return {
            isError: true,
            error: error?.response?.data.errors[0] ?? null,
            status: error?.response?.status,
          };
        }
      }
    } while (shouldRetry < 2);

    return { isError: true };
  }

  async function getWithAuth(url: string,timeout=DEFAULT_AXIOS_TIMEOUT) {
    return await request('GET', url,timeout);
  }
  async function getWithoutAuth(url: string, data?: any,timeout=DEFAULT_AXIOS_TIMEOUT) {
    return await request('GET_WITHOUT_AUTH', url,timeout, data);
  }
  async function postWithAuth(url: string, data: any,timeout=DEFAULT_AXIOS_TIMEOUT) {
    return await request('POST', url,timeout, data);
  }
  const putWithAuth = async (url: string, data: any,timeout=DEFAULT_AXIOS_TIMEOUT) => {
    return await request('PUT', url,timeout, data);
  };
  const patchWithAuth = async (url: string, data: any,timeout=DEFAULT_AXIOS_TIMEOUT) => {
    return await request('PATCH', url,timeout, data);
  };
  const deleteWithAuth = async (url: string,timeout=DEFAULT_AXIOS_TIMEOUT) => {
    return await request('DELETE', url,timeout);
  };

  return {
    getWithAuth,
    postWithAuth,
    putWithAuth,
    patchWithAuth,
    deleteWithAuth,
    getWithoutAuth
  };
}
