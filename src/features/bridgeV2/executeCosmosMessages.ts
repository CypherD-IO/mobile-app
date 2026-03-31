import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { toUtf8 } from '@cosmjs/encoding';
import {
  GeneratedType,
  OfflineDirectSigner,
  Registry,
} from '@cosmjs/proto-signing';
import { defaultRegistryTypes as defaultStargateTypes } from '@cosmjs/stargate';
import { InjectiveSigningStargateClient } from '@injectivelabs/sdk-ts/exports';
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { camelCase, get, isArray, isObject, reduce, set } from 'lodash';
import { cosmosConfig } from '../../constants/cosmosConfig';
import {
  ChainBackendNameMapping,
  ChainIdNameMapping,
} from '../../constants/data';
import { ChainBackendNames } from '../../constants/server';
import useCosmosSigner from '../../hooks/useCosmosSigner';
import useGasService from '../../hooks/useGasService';
import {
  MsgDepositForBurn,
  MsgDepositForBurnWithCaller,
} from '../../proto-generated/cctp';
import { DecimalHelper } from '../../utils/decimalHelper';
import { BridgeV2ExecutionResult } from './types';

function createDefaultRegistry(): Registry {
  const cosmwasmTypes: ReadonlyArray<[string, GeneratedType]> = [
    ['/cosmwasm.wasm.v1.MsgClearAdmin', MsgClearAdmin],
    ['/cosmwasm.wasm.v1.MsgExecuteContract', MsgExecuteContract],
    ['/cosmwasm.wasm.v1.MsgInstantiateContract', MsgInstantiateContract],
    ['/cosmwasm.wasm.v1.MsgMigrateContract', MsgMigrateContract],
    ['/cosmwasm.wasm.v1.MsgStoreCode', MsgStoreCode],
    ['/cosmwasm.wasm.v1.MsgUpdateAdmin', MsgUpdateAdmin],
  ];

  const allTypes: ReadonlyArray<[string, GeneratedType]> = [
    ...cosmwasmTypes,
    ...defaultStargateTypes,
    ['/circle.cctp.v1.MsgDepositForBurn', MsgDepositForBurn],
    ['/circle.cctp.v1.MsgDepositForBurnWithCaller', MsgDepositForBurnWithCaller],
  ];
  return new Registry(allTypes);
}

function convertKeysToCamelCase(obj: object | null | undefined): any {
  if (isArray(obj)) {
    return obj.map(element => convertKeysToCamelCase(element));
  } else if (isObject(obj)) {
    return reduce(
      obj,
      (acc, value, key) => {
        set(acc, camelCase(key), convertKeysToCamelCase(value));
        return acc;
      },
      {},
    );
  }
  return obj;
}

async function getCosmosSigningClient(
  chain: ChainBackendNames,
  rpc: string,
  signer: OfflineDirectSigner,
  options?: any,
) {
  if (chain === ChainBackendNames.INJECTIVE) {
    return InjectiveSigningStargateClient.connectWithSigner(rpc, signer, {
      ...options,
    });
  }
  return SigningCosmWasmClient.connectWithSigner(rpc, signer, { ...options });
}

export type CosmosMessagePayload = {
  msgs: Array<{
    msg: string;
    msg_type_url: string;
  }>;
  signer_address: string;
  chain_id: string;
};

export default function useCosmosExecution() {
  const { getCosmosSignerClient, getCosmosRpc } = useCosmosSigner();
  const { getCosmosGasPrice } = useGasService();

  async function executeCosmosMessages(
    cosmosTx: CosmosMessagePayload,
  ): Promise<BridgeV2ExecutionResult> {
    const chainName = get(ChainIdNameMapping, cosmosTx.chain_id, '');
    const chainBackendName = get(
      ChainBackendNameMapping,
      [chainName, 0],
      '',
    ) as ChainBackendNames;

    if (!chainName || !chainBackendName) {
      return { isError: true, error: `Unsupported Cosmos chain_id: ${cosmosTx.chain_id}` };
    }

    const signer = await getCosmosSignerClient(chainName);
    if (!signer) {
      return { isError: true, error: 'Unable to fetch Cosmos signer' };
    }

    const rpc = getCosmosRpc(chainBackendName);
    const signingClient = await getCosmosSigningClient(
      chainBackendName,
      rpc,
      signer,
      { registry: createDefaultRegistry() },
    );

    const transferMsg = cosmosTx.msgs.map(msg => {
      const tempMsg = JSON.parse(msg.msg);
      return {
        typeUrl: msg.msg_type_url,
        value: msg.msg_type_url.includes('cosmwasm')
          ? { ...tempMsg, msg: toUtf8(JSON.stringify(tempMsg.msg)) }
          : convertKeysToCamelCase(tempMsg),
      };
    });

    const simulation = await signingClient.simulate(
      cosmosTx.signer_address,
      transferMsg,
      'cypher bridge v2',
    );

    const { gasPrice, gasLimitMultiplier } =
      await getCosmosGasPrice(chainBackendName);
    const gasFee = DecimalHelper.multiply(simulation, [gasLimitMultiplier, gasPrice]);
    const fee = {
      gas: DecimalHelper.multiply(simulation, gasLimitMultiplier)
        .floor()
        .toString(),
      amount: [
        {
          denom: get(cosmosConfig, chainName).denom,
          amount: gasFee.floor().toString(),
        },
      ],
    };

    const response = await signingClient.signAndBroadcast(
      cosmosTx.signer_address,
      transferMsg,
      fee,
      'cypher bridge v2',
    );

    if (response.code !== 0) {
      return {
        isError: true,
        error: `Cosmos tx failed (code ${response.code}): ${response.rawLog ?? 'unknown error'}`,
      };
    }

    return {
      isError: false,
      hash: response.transactionHash,
      chainId: cosmosTx.chain_id,
    };
  }

  return { executeCosmosMessages };
}
