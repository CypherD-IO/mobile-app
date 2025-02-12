import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { toUtf8 } from '@cosmjs/encoding';
import {
  GeneratedType,
  OfflineDirectSigner,
  Registry,
} from '@cosmjs/proto-signing';
import { defaultRegistryTypes as defaultStargateTypes } from '@cosmjs/stargate';
import { InjectiveSigningStargateClient } from '@injectivelabs/sdk-ts/dist/cjs/exports';
import { Transaction } from '@solana/web3.js';
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { camelCase, get, isArray, isObject, reduce, set } from 'lodash';
import { Dispatch, SetStateAction } from 'react';
import { parseUnits, PublicClient } from 'viem';
import { cosmosConfig } from '../constants/cosmosConfig';
import { ChainBackendNameMapping, ChainIdNameMapping } from '../constants/data';
import { ALL_CHAINS, ChainBackendNames } from '../constants/server';
import { SwapBridgeTokenData } from '../containers/Bridge';
import useCosmosSigner from '../hooks/useCosmosSigner';
import useGasService from '../hooks/useGasService';
import useSolanaSigner from '../hooks/useSolana';
import useTransactionManager from '../hooks/useTransactionManager';
import {
  SkipApiCosmosTxn,
  SkipAPiEvmTx,
  SkipApiSolanaTxn,
} from '../models/skipApiSingMsg.interface';
import {
  MsgDepositForBurn,
  MsgDepositForBurnWithCaller,
} from '../proto-generated/cctp';
import { DecimalHelper } from '../utils/decimalHelper';

// Contract ABI for allowance and approval
const contractABI = [
  {
    constant: true,
    inputs: [
      {
        name: '',
        type: 'address',
      },
      {
        name: '',
        type: 'address',
      },
    ],
    name: 'allowance',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'guy',
        type: 'address',
      },
      {
        name: 'wad',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export type hashETHType = `0x${string}`;
export type chainIdETHType =
  | 1
  | 137
  | 10
  | 42161
  | 43114
  | 250
  | 56
  | 9001
  | 324
  | 8453
  | 1101
  | 1313161554
  | 1284
  | 1285
  | undefined;

async function getCosmosSigningClient(
  chain: ChainBackendNames,
  rpc: string,
  signer: OfflineDirectSigner,
  options?: any,
) {
  if (chain === ChainBackendNames.INJECTIVE) {
    return await InjectiveSigningStargateClient.connectWithSigner(rpc, signer, {
      ...options,
    });
  } else {
    return await SigningCosmWasmClient.connectWithSigner(rpc, signer, {
      ...options,
    });
  }
}

export default function useSkipApiBridge() {
  const { getCosmosSignerClient, getCosmosRpc } = useCosmosSigner();
  const { executeTransferContract } = useTransactionManager();
  const { getCosmosGasPrice } = useGasService();
  const { getSolanWallet } = useSolanaSigner();

  const skipApiApproveAndSignEvm = async ({
    publicClient,
    evmTx,
    selectedFromToken,
    showModalAndGetResponse,
    setEvmModalVisible,
    walletAddress,
  }: {
    publicClient: PublicClient;
    evmTx: SkipAPiEvmTx;
    selectedFromToken: SwapBridgeTokenData;
    setApproveModalVisible: Dispatch<SetStateAction<boolean>>;
    showModalAndGetResponse: (setter: any) => Promise<boolean | null>;
    setApproveParams: Dispatch<
      SetStateAction<{
        tokens: string;
        contractAddress: string;
      } | null>
    >;
    setEvmModalVisible: Dispatch<SetStateAction<boolean>>;
    walletAddress: `0x${string}`;
  }): Promise<
    | {
        isError: boolean;
        hash?: string;
        error?: any;
        chainId?: string;
      }
    | undefined
  > => {
    const currentChain = ALL_CHAINS.find(
      chain => chain.chainIdNumber === Number(selectedFromToken.chainId),
    );
    if (currentChain) {
      // const requiredErc20Approvals = get(evmTx, 'required_erc20_approvals', []);
      // for (const approval of requiredErc20Approvals) {
      //   const allowanceResp = await checkIfAllowanceIsEnough({
      //     publicClient,
      //     tokenContractAddress:
      //       selectedFromToken.tokenContract as `0x${string}`,
      //     routerAddress: get(approval, 'spender', '') as `0x${string}`,
      //     amount: get(approval, 'amount', ''),
      //   });

      //   if (!allowanceResp.isError) {
      //     if (!allowanceResp.hasEnoughAllowance) {
      //       const contractData = encodeFunctionData({
      //         abi: allowanceApprovalContractABI,
      //         functionName: 'approve',
      //         args: [
      //           get(approval, 'spender', '') as `0x${string}`,
      //           allowanceResp.tokens,
      //         ],
      //       });

      //       // const gasFeeResponse = await getGasPrice(
      //       //   currentChain?.backendName,
      //       //   publicClient,
      //       // );

      //       // const gasLimit = await publicClient.estimateGas({
      //       //   account: walletAddress,
      //       //   to: selectedFromToken.tokenContract as `0x${string}`,
      //       //   value: parseEther('0'),
      //       //   data: contractData,
      //       // });

      //       setApproveParams({
      //         tokens: allowanceResp.tokens.toString(),
      //         // gasLimit: Number(gasLimit),
      //         // gasFeeResponse,
      //         contractAddress: get(approval, 'spender', ''),
      //       });

      //       const approveGranted = await showModalAndGetResponse(
      //         setApproveModalVisible,
      //       );

      //       if (approveGranted) {
      //         const approvalResp = await executeApprovalRevokeContract({
      //           publicClient,
      //           tokenContractAddress: get(
      //             approval,
      //             'token_contract',
      //             '',
      //           ) as `0x${string}`,
      //           contractData,
      //           chainDetails: currentChain,
      //           tokens: allowanceResp.tokens,
      //           walletAddress: get(approval, 'spender', '') as `0x${string}`,
      //         });

      //         if (approvalResp.isError) {
      //           return { isError: true, error: 'Error approving allowance' };
      //         }
      //       } else {
      //         return {
      //           isError: true,
      //           error: 'Token approvel rejected by user',
      //         };
      //       }
      //     }
      //   } else {
      //     return { isError: true, error: allowanceResp.error };
      //   }
      // }

      const sendGranted = await showModalAndGetResponse(setEvmModalVisible);
      if (sendGranted) {
        const hash = await executeTransferContract({
          publicClient,
          chain: currentChain,
          amountToSend: parseUnits(
            get(evmTx, 'value', 0).toString(),
            selectedFromToken.decimals,
          ).toString(),
          toAddress: get(evmTx, 'to', '') as `0x${string}`,
          contractAddress: get(evmTx, 'to', '') as `0x${string}`,
          contractDecimals: selectedFromToken.decimals,
          contractData: ('0x' + get(evmTx, 'data', '')) as `0x${string}`,
        });
        if (hash.isError) {
          return { isError: true, error: hash.error };
        } else {
          return { isError: false, hash: hash.hash, chainId: evmTx.chain_id };
        }
      } else {
        return { isError: true, error: 'Send tokens rejected by user' };
      }
    } else {
      return { isError: true, error: 'Chain details not found' };
    }
  };

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
      [
        '/circle.cctp.v1.MsgDepositForBurnWithCaller',
        MsgDepositForBurnWithCaller,
      ],
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

  // async function getGasPrice(chain: string) {
  //   try {
  //     const defaultGasPrice = get(cosmosConfig, [
  //       chain.toLowerCase(),
  //       'gasPrice',
  //     ]);
  //     const { isError, data: gasPriceInfo } = await getWithoutAuth(
  //       `/v1/prices/gas/cosmos/${chain}`,
  //     );

  //     if (isError) throw new Error('Error fetching gasPrice');
  //     return {
  //       gasPrice: get<number>(gasPriceInfo, 'gasPrice', defaultGasPrice),

  //       gasLimitMultiplier: get<number>(
  //         gasPriceInfo,
  //         'gasLimitMultiplier',
  //         1.5,
  //       ),
  //     };
  //   } catch (e) {
  //     const gasPrice = get(cosmosConfig, [chain, 'gasPrice']);
  //     return { gasPrice, gasLimitMultiplier: 1.5 };
  //   }
  // }

  const skipApiSignAndBroadcast = async ({
    cosmosTx,
    chain,
    showModalAndGetResponse,
    setCosmosModalVisible,
  }: {
    cosmosTx: SkipApiCosmosTxn;
    chain: string;
    showModalAndGetResponse: (setter: any) => Promise<boolean | null>;
    setCosmosModalVisible: Dispatch<SetStateAction<boolean>>;
  }) => {
    const approveSend = await showModalAndGetResponse(setCosmosModalVisible);
    if (approveSend) {
      const chainName = get(ChainIdNameMapping, chain, '');
      const chainBackendName = get(ChainBackendNameMapping, [chainName, 0], '');

      const signer = await getCosmosSignerClient(chainName);
      if (signer) {
        const rpc = getCosmosRpc(chainBackendName as ChainBackendNames);

        const signingClient = await getCosmosSigningClient(
          chainBackendName as ChainBackendNames,
          rpc,
          signer,
          {
            registry: createDefaultRegistry(),
          },
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
          'cypher skip transfer',
        );
        const { gasPrice, gasLimitMultiplier } =
          await getCosmosGasPrice(chainBackendName);
        const gasFee = DecimalHelper.multiply(simulation, [3, gasPrice]);
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
          'cypher skip transfer',
        );
        return {
          isError: false,
          hash: response.transactionHash,
          chainId: cosmosTx.chain_id,
        };
      } else {
        return { isError: true, error: 'Unable to fetch the signer' };
      }
    } else {
      return { isError: true, error: 'User rejected token transfer' };
    }
  };

  const skipApiSignAndApproveSolana = async ({
    svmTx,
    showModalAndGetResponse,
    setSolanaModalVisible,
    setSolanaTxnParams,
  }: {
    svmTx: SkipApiSolanaTxn;
    showModalAndGetResponse: (setter: any) => Promise<boolean | null>;
    setSolanaModalVisible: Dispatch<SetStateAction<boolean>>;
    setSolanaTxnParams: Dispatch<SetStateAction<Transaction | null>>;
  }): Promise<{
    isError: boolean;
    txn?: string;
    error?: any;
    chainId?: string;
  }> => {
    const fromKeypair = await getSolanWallet();
    if (fromKeypair) {
      const payload = svmTx.tx;
      const decodedTxn = Buffer.from(payload, 'base64');
      const transactionDeserialized = Transaction.from(decodedTxn);

      setSolanaTxnParams(transactionDeserialized);
      const approveSend = await showModalAndGetResponse(setSolanaModalVisible);
      if (approveSend) {
        transactionDeserialized.partialSign(fromKeypair);
        const updatedSerializedTransaction =
          transactionDeserialized.serialize();
        const updatedBase64Transaction = Buffer.from(
          updatedSerializedTransaction,
        ).toString('base64');
        return {
          isError: false,
          txn: updatedBase64Transaction,
          chainId: svmTx.chain_id,
        };
      } else {
        return { isError: true, error: 'User rejected token transfer' };
      }
    } else {
      return { isError: true, error: 'Unable to generate user solana wallet' };
    }
  };

  return {
    skipApiApproveAndSignEvm,
    skipApiSignAndBroadcast,
    skipApiSignAndApproveSolana,
  };
}
