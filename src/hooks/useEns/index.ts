import axios from 'axios';
import Web3 from 'web3';
import { AbiItem }from 'web3-utils';
import { namehash } from 'ethers/lib/utils';
import { useContext } from 'react';
import { ensAbi } from '../../constants/data';
import { CHAIN_ETH, EnsCoinTypes } from '../../constants/server';
import { GlobalContext } from '../../core/globalContext';
import { getWeb3Endpoint } from '../../core/util';

const ENS_RESOLVER_CONTRACT_ADDRESS = '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41';
const ENS_GRAPHQL_API = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';

export default function useEns () {
  const globalContext = useContext(GlobalContext);
  const ethRpcUrl = getWeb3Endpoint(CHAIN_ETH, globalContext);
  const web3 = new Web3(ethRpcUrl);
  const ensContract = new web3.eth.Contract(ensAbi as AbiItem[], ENS_RESOLVER_CONTRACT_ADDRESS);

  const resolveAddress = async (domain: string, backendName: string): Promise<string | null> => {
    if (!EnsCoinTypes[backendName]) {
      return null;
    }

    const node = namehash(domain);
    const address = await ensContract.methods['addr(bytes32,uint256)'](node, EnsCoinTypes[backendName]).call();
    return address && address.length > 2 ? address : null;
  };

  const resolveDomain = async (address: string): Promise<string | null> => {
    const domains = await axios.post(ENS_GRAPHQL_API, {
      operationName: 'getNamesFromSubgraph',
      query: 'query getNamesFromSubgraph($address: String!) {\n  domains(first: 1000, where: {resolvedAddress: $address}) {\n    name\n    __typename\n    id\n  }\n}\n',
      variables: {
        address
      }
    });
    return domains.data?.data?.domains?.[0]?.name ?? null;
  };

  return [resolveAddress, resolveDomain];
}
