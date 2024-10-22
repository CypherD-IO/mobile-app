import { camelCase, get, isArray, isObject, reduce, set } from 'lodash';
import {
  SkipAPiEvmTx,
  SkipApiCosmosTxn,
  SkipApiSolanaTxn,
} from '../models/skipApiSingMsg.interface';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import { ethers } from 'ethers';
import useTransactionManager from '../hooks/useTransactionManager';
import useCosmosSigner from '../hooks/useCosmosSigner';
import { defaultRegistryTypes as defaultStargateTypes } from '@cosmjs/stargate';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import {
  GeneratedType,
  OfflineDirectSigner,
  Registry,
} from '@cosmjs/proto-signing';
import {
  MsgDepositForBurn,
  MsgDepositForBurnWithCaller,
} from '../proto-generated/cctp';
import { cosmosConfig } from '../constants/cosmosConfig';
import useAxios from './HttpRequest';
import Web3 from 'web3';
import { getGasPriceFor } from '../containers/Browser/gasHelper';
import { ALL_CHAINS, ChainBackendNames } from '../constants/server';
import { ChainBackendNameMapping, ChainIdNameMapping } from '../constants/data';
import { InjectiveSigningStargateClient } from '@injectivelabs/sdk-ts/dist/esm/exports';
import { Dispatch, SetStateAction } from 'react';
import { GasPriceDetail } from './types';
import useSolanaSigner from '../hooks/useSolana';
import { Transaction } from '@solana/web3.js';
import { SwapBridgeTokenData } from '../containers/Bridge';
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { toUtf8 } from '@cosmjs/encoding';
import { parseErrorMessage } from './util';

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
  const { getWithoutAuth } = useAxios();
  const { getCosmosSignerClient, getCosmosRpc } = useCosmosSigner();
  const { sendEvmToken, getApproval } = useTransactionManager();
  const { getSolanWallet } = useSolanaSigner();

  const checkAllowance = async ({
    web3,
    fromToken,
    routerAddress,
    amount,
    hdWallet,
  }: {
    web3: Web3;
    fromToken: SwapBridgeTokenData;
    routerAddress: string;
    amount: string;
    hdWallet: HdWalletContextDef;
  }): Promise<{
    isError: boolean;
    error?: any;
    isAllowanceEnough?: boolean;
    contract?: any;
    contractData?: any;
    tokens?: any;
    gasLimit?: any;
    gasFeeResponse?: any;
  }> => {
    const { ethereum } = hdWallet?.state?.wallet ?? { ethereum: '' };
    return await new Promise((resolve, reject) => {
      void (async () => {
        try {
          const currentChain = ALL_CHAINS.find(
            chain => chain.chainIdNumber === Number(fromToken.chainId),
          );
          if (currentChain) {
            const contract = new web3.eth.Contract(
              contractABI as any,
              fromToken.tokenContract,
            );

            const response = await contract.methods
              .allowance(ethereum.address, routerAddress)
              .call();

            const allowance = response;
            if (Number(amount) > Number(allowance)) {
              const tokens = amount;
              const resp = contract.methods
                .approve(routerAddress, tokens)
                .encodeABI();
              const gasLimit = await web3?.eth.estimateGas({
                from: ethereum.address,
                // For Optimism the ETH token has different contract address
                to: fromToken.tokenContract,
                value: '0x0',
                data: resp,
              });
              const gasFeeResponse = await getGasPriceFor(currentChain, web3);
              resolve({
                isError: false,
                isAllowanceEnough: false,
                contract,
                contractData: resp,
                tokens,
                gasLimit,
                gasFeeResponse,
              });
            } else {
              resolve({ isError: false, isAllowanceEnough: true });
            }
          } else {
            reject(new Error('Chain details not found'));
          }
        } catch (e: unknown) {
          reject(new Error(parseErrorMessage(e)));
        }
      })();
    });
  };

  const skipApiApproveAndSignEvm = async ({
    web3,
    evmTx,
    selectedFromToken,
    hdWallet,
    setApproveModalVisible,
    showModalAndGetResponse,
    setApproveParams,
    setEvmModalVisible,
  }: {
    web3: Web3;
    evmTx: SkipAPiEvmTx;
    selectedFromToken: SwapBridgeTokenData;
    hdWallet: HdWalletContextDef;
    setApproveModalVisible: Dispatch<SetStateAction<boolean>>;
    showModalAndGetResponse: (setter: any) => Promise<boolean | null>;
    setApproveParams: Dispatch<
      SetStateAction<{
        tokens: string;
        gasFeeResponse: GasPriceDetail;
        gasLimit: number;
        contractAddress: string;
      } | null>
    >;
    setEvmModalVisible: Dispatch<SetStateAction<boolean>>;
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
      const requiredErc20Approvals = get(evmTx, 'required_erc20_approvals', []);
      for (const approval of requiredErc20Approvals) {
        const allowanceResp = await checkAllowance({
          web3,
          fromToken: selectedFromToken,
          routerAddress: get(approval, 'spender', ''),
          amount: get(approval, 'amount', ''),
          hdWallet,
        });

        if (!allowanceResp.isError) {
          if (!allowanceResp.isAllowanceEnough) {
            setApproveParams({
              tokens: allowanceResp.tokens,
              gasLimit: allowanceResp.gasLimit,
              gasFeeResponse: allowanceResp.gasFeeResponse,
              contractAddress: get(approval, 'spender', ''),
            });
            const approveGranted = await showModalAndGetResponse(
              setApproveModalVisible,
            );

            if (approveGranted) {
              const approvalResp = await getApproval({
                web3,
                fromTokenContractAddress: get(approval, 'token_contract', ''),
                hdWallet,
                gasLimit: allowanceResp.gasLimit,
                gasFeeResponse: allowanceResp.gasFeeResponse,
                contractData: allowanceResp.contractData,
                chainDetails: currentChain,
                contractParams: {
                  toAddress: get(approval, 'spender', ''),
                  numberOfTokens: String(
                    parseFloat(get(approval, 'amount', '')),
                  ),
                },
              });

              if (approvalResp.isError) {
                return { isError: true, error: 'Error approving allowance' };
              }
            } else {
              return {
                isError: true,
                error: 'Token approvel rejected by user',
              };
            }
          }
        } else {
          return { isError: true, error: 'Error calculating allowance' };
        }
      }

      const sendGranted = await showModalAndGetResponse(setEvmModalVisible);
      if (sendGranted) {
        const hash = await sendEvmToken({
          chain: currentChain.backendName as ChainBackendNames,
          toAddress: get(evmTx, 'to', ''),
          amountToSend: ethers
            .parseUnits(
              get(evmTx, 'value', 0).toString(),
              selectedFromToken.decimals,
            )
            .toString(),
          contractAddress: get(evmTx, 'to', ''),
          contractDecimals: selectedFromToken.decimals,
          symbol: selectedFromToken.symbol,
          contractData: '0x' + get(evmTx, 'data', ''),
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

  async function getGasPrice(chain: string) {
    try {
      const defaultGasPrice = get(cosmosConfig, [
        chain.toLowerCase(),
        'gasPrice',
      ]);
      const { isError, data: gasPriceInfo } = await getWithoutAuth(
        `/v1/prices/gas/cosmos/${chain}`,
      );

      if (isError) throw new Error('Error fetching gasPrice');
      return {
        gasPrice: get<number>(gasPriceInfo, 'gasPrice', defaultGasPrice),

        gasLimitMultiplier: get<number>(
          gasPriceInfo,
          'gasLimitMultiplier',
          1.5,
        ),
      };
    } catch (e) {
      const gasPrice = get(cosmosConfig, [chain, 'gasPrice']);
      return { gasPrice, gasLimitMultiplier: 1.5 };
    }
  }

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
          await getGasPrice(chainBackendName);
        const gasFee = simulation * 3 * gasPrice;
        const fee = {
          gas: Math.floor(simulation * gasLimitMultiplier).toString(),
          amount: [
            {
              denom: get(cosmosConfig, chainName).denom,
              amount: Math.floor(gasFee).toString(),
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
    checkAllowance,
  };
}
