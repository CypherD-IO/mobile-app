import axios from 'axios';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { namehash } from 'ethers';
import { useContext } from 'react';
import { ensAbi } from '../../constants/data';
import {
  CHAIN_ETH,
  ChainConfigMapping,
  ChainNameMapping,
  EnsCoinTypes,
} from '../../constants/server';
import { GlobalContext } from '../../core/globalContext';
import { getWeb3Endpoint } from '../../core/util';
import { createEnsPublicClient } from '@ensdomains/ensjs';
import { get } from 'lodash';
import { mainnet } from 'viem/chains';
import { http } from 'viem';
import * as Sentry from '@sentry/react-native';

const ENS_RESOLVER_CONTRACT_ADDRESS =
  '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41';

export default function useEns() {
  const globalContext = useContext(GlobalContext);
  const ethRpcUrl = getWeb3Endpoint(CHAIN_ETH, globalContext);
  const web3 = new Web3(ethRpcUrl);
  const ensContract = new web3.eth.Contract(
    ensAbi as AbiItem[],
    ENS_RESOLVER_CONTRACT_ADDRESS,
  );

  const resolveAddress = async (
    domain: string,
    backendName: string,
  ): Promise<string | null> => {
    if (!EnsCoinTypes[backendName]) {
      return null;
    }

    const node = namehash(domain);
    const address = await ensContract.methods['addr(bytes32,uint256)'](
      node,
      EnsCoinTypes[backendName],
    ).call();
    return address && address.length > 2 ? address : null;
  };

  const resolveDomain = async (address: string): Promise<string | null> => {
    try {
      // ens for eth address
      const client = createEnsPublicClient({
        chain: mainnet,
        transport: http(),
      });

      // Get the ENS name for the address
      const ensName = await client.getName({ address });
      return ensName?.name ?? null;
    } catch (error) {
      Sentry.captureException(error);
      return null;
    }
  };

  return [resolveAddress, resolveDomain];
}
