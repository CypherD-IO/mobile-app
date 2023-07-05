import { hostWorker } from '../global';
import axios from './Http';
import { useContext } from 'react';
import { GlobalContext, signIn } from '../core/globalContext';
import * as Sentry from '@sentry/react-native';
import { HdWalletContext } from './util';
import { GlobalContextType, SignMessageValidationType } from '../constants/enum';
import { has } from 'lodash';
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface IHttpResponse {
  isError: boolean
  data?: any
  status?: number
  error?: any
}
export default function useAxios () {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  let token = globalContext.globalState.token;

  const response: IHttpResponse = { isError: false };

  async function request (method: RequestMethod, endpoint: string = '', body = {}): Promise<IHttpResponse> {
    let shouldRetry = 0;
    const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');

    do {
      const baseUrl: string = ARCH_HOST;

      const config = {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${String(token)}`
        }
      };

      const url = `${baseUrl}${endpoint}`;

      try {
        const reqBody = method !== 'GET' && JSON.stringify(body);
        if (method === 'GET') {
          const { data, status } = await axios.get(url, config);
          response.data = data;
          response.status = status;
        } else if (method === 'DELETE') {
          const { data, status } = await axios.delete(url, config);
          response.data = data;
          response.status = status;
        } else if (method === 'POST') {
          const { data, status } = await axios.post(url, reqBody, config);
          response.data = data;
          response.status = status;
        } else if (method === 'PUT') {
          const { data, status } = await axios.put(url, reqBody, config);
          response.data = data;
          response.status = status;
        } else if (method === 'PATCH') {
          const { data, status } = await axios.patch(url, reqBody, config);
          response.data = data;
          response.status = status;
        }
        return response;
      } catch (error: any) {
        if (error?.response?.status === 401) {
          try {
            const signInResponse = await signIn(ethereum);
            if (signInResponse?.message === SignMessageValidationType.VALID && has(signInResponse, 'token')) {
              token = signInResponse?.token;
              globalContext.globalDispatch({ type: GlobalContextType.SIGN_IN, sessionToken: token });
            }
          } catch (e: any) {
            Sentry.captureException(e.message);
          }
          shouldRetry += 1;
        } else {
          shouldRetry = 2;
          Sentry.captureException(error);
          return { isError: true, error };
        }
      }
    } while (shouldRetry < 2);

    return { isError: true };
  }

  async function getWithAuth (url: string) {
    return await request('GET', url);
  }
  async function postWithAuth (url: string, data: any) {
    return await request('POST', url, data);
  }
  const putWithAuth = async (url: string, data: any) => {
    return await request('PUT', url, data);
  };
  const patchWithAuth = async (url: string, data: any) => {
    return await request('PATCH', url, data);
  };
  const deleteWithAuth = async (url: string) => {
    return await request('DELETE', url);
  };

  return { getWithAuth, postWithAuth, putWithAuth, patchWithAuth, deleteWithAuth };
}
