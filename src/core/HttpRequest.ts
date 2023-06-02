import { hostWorker } from '../global';
import axios from './Http';
import { useContext } from 'react';
import { GlobalContext } from '../core/globalContext';
import * as Sentry from '@sentry/react-native';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export default function useAxios () {
  const globalContext = useContext<any>(GlobalContext);
  const token = globalContext.globalState.token;

  async function request (method: RequestMethod, endpoint: string = '', body = {}) {
    const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');

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
        const { data } = await axios.get(url, config);
        return data;
      } else if (method === 'DELETE') {
        const { data } = await axios.delete(url, config);
        return data;
      } else if (method === 'POST') {
        const { data } = await axios.post(url, reqBody, config);
        return data;
      } else if (method === 'PUT') {
        const { data } = await axios.put(url, reqBody, config);
        return data;
      } else if (method === 'PATCH') {
        const { data } = await axios.patch(url, reqBody, config);
        return data;
      }
    } catch (error: any) {
      Sentry.captureException(error);
      return error;
    }
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
