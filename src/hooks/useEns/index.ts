import * as Sentry from '@sentry/react-native';
import { useContext } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { CHAIN_ETH, EnsCoinTypes } from '../../constants/server';
import { GlobalContext } from '../../core/globalContext';
import { getWeb3Endpoint } from '../../core/util';

export default function useEns() {
  const globalContext = useContext(GlobalContext);
  const ethRpcUrl = getWeb3Endpoint(CHAIN_ETH, globalContext);

  const resolveAddress = async (
    domain: string,
    backendName: string,
  ): Promise<string | null> => {
    if (!EnsCoinTypes[backendName]) {
      return null;
    }

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(ethRpcUrl),
    });

    const resolverAddress = await publicClient.getEnsAddress({
      name: normalize(domain),
    });

    return resolverAddress;
  };

  const resolveDomain = async (
    address: `0x${string}`,
  ): Promise<string | null> => {
    try {
      // ens for eth address
      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http(ethRpcUrl),
      });
      const ensName = await publicClient.getEnsName({
        address,
      });
      return ensName;
    } catch (error) {
      Sentry.captureException(error);
      return null;
    }
  };

  return [resolveAddress, resolveDomain];
}
