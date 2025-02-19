import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { coins, OfflineDirectSigner } from '@cosmjs/proto-signing';
import { Coin, MsgTransferEncodeObject } from '@cosmjs/stargate';
import { InjectiveSigningStargateClient } from '@injectivelabs/sdk-ts/dist/cjs/exports';
import * as Sentry from '@sentry/react-native';
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js';
import { MsgRevoke } from 'cosmjs-types/cosmos/authz/v1beta1/tx';
import { SendAuthorization } from 'cosmjs-types/cosmos/bank/v1beta1/authz';
import { TransferAuthorization } from 'cosmjs-types/ibc/applications/transfer/v1/authz';
import { get, isNil, map } from 'lodash';
import Long from 'long';
import { useContext } from 'react';
import {
  Address,
  encodeFunctionData,
  getContract,
  parseEther,
  parseGwei,
  parseUnits,
  PublicClient,
} from 'viem';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { AnalyticsType } from '../../constants/enum';
import {
  Chain,
  CHAIN_OPTIMISM,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  ChainBackendNames,
  ChainConfigMapping,
  ChainNameMapping,
  COSMOS_CHAINS_LIST,
  EVM_CHAINS,
} from '../../constants/server';
import {
  CheckAllowanceResponse,
  TransactionResponse,
} from '../../constants/type';
import { GlobalContext } from '../../core/globalContext';
import { Holding } from '../../core/portfolio';
import { allowanceApprovalContractABI } from '../../core/swap';
import {
  getTimeOutTime,
  getViemPublicClient,
  getWeb3Endpoint,
  HdWalletContext,
  isNativeToken,
  logAnalytics,
  parseErrorMessage,
} from '../../core/util';
import { IAutoLoadResponse } from '../../models/autoLoadResponse.interface';
import {
  SendInEvmInterface,
  SendNativeToken,
} from '../../models/sendInEvm.interface';
import { SwapMetaData } from '../../models/swapMetaData';
import { IReward } from '../../reducers/cosmosStakingReducer';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { DecimalHelper } from '../../utils/decimalHelper';
import useCosmosSigner from '../useCosmosSigner';
import useEthSigner from '../useEthSigner';
import useGasService from '../useGasService';
import useSolanaSigner from '../useSolana';

export interface TransactionServiceResult {
  isError: boolean;
  hash?: string;
  error?: any;
  gasFeeInCrypto?: string;
}

export default function useTransactionManager() {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const OP_ETH_ADDRESS = '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000';

  const {
    estimateGasForEvm,
    estimateGasForCosmos,
    estimateGasForCosmosIBC,
    estimateGasForClaimRewards,
    estiamteGasForDelgate,
    estimateGasForUndelegate,
    estimateGasForRedelgate,
    getCosmosGasPrice,
  } = useGasService();
  const { signEthTransaction, signApprovalEthereum } = useEthSigner();
  const { getCosmosSignerClient, getCosmosRpc } = useCosmosSigner();
  const { getSolanWallet, getSolanaRpc } = useSolanaSigner();
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;

  async function getCosmosSigningClient(
    chain: Chain,
    rpc: string,
    signer: OfflineDirectSigner,
  ) {
    if (chain.backendName === ChainBackendNames.INJECTIVE) {
      return await InjectiveSigningStargateClient.connectWithSigner(
        rpc,
        signer,
      );
    } else {
      return await SigningCosmWasmClient.connectWithSigner(rpc, signer);
    }
  }

  function isNativeCurrency(
    fromChain: Chain,
    contractAddress: string,
  ): boolean {
    const isNative = [
      fromChain.native_token_address,
      fromChain.secondaryAddress,
    ].includes(contractAddress);
    return isNative;
  }

  const executeTransferContract = async ({
    publicClient,
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
    contractData,
    isErc20 = true,
  }: {
    publicClient: PublicClient;
    chain: Chain;
    amountToSend: string;
    toAddress: `0x${string}`;
    contractAddress: `0x${string}`;
    contractDecimals: number;
    contractData?: `0x${string}`;
    isErc20?: boolean;
  }): Promise<TransactionResponse> => {
    try {
      const ethereum = hdWalletContext.state.wallet.ethereum;
      const fromAddress = ethereum.address;

      const gasEstimateResponse = await estimateGasForEvm({
        publicClient,
        chain: chain.backendName,
        fromAddress,
        toAddress,
        amountToSend,
        contractAddress,
        contractDecimals,
        contractData,
        isErc20,
      });

      if (gasEstimateResponse?.isError) {
        return { isError: true, error: gasEstimateResponse.error };
      }

      const txnPayload = {
        from: ethereum.address,
        to: isErc20 ? contractAddress : toAddress,
        gas: BigInt(gasEstimateResponse.gasLimit),
        value: isErc20
          ? parseEther('0')
          : parseUnits(amountToSend, contractDecimals),
        ...(contractData && { data: contractData }),
        ...(gasEstimateResponse.isEIP1599Supported
          ? {
              maxPriorityFeePerGas: parseGwei(
                String(gasEstimateResponse.priorityFee),
              ),
              maxFeePerGas: parseGwei(String(gasEstimateResponse.maxFee)),
            }
          : {
              gasPrice: parseGwei(String(gasEstimateResponse.gasPrice)),
            }),
      };

      const hash = await signEthTransaction({
        rpc: getWeb3Endpoint(chain, globalContext),
        sendChain: chain.backendName,
        transactionToBeSigned: txnPayload,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        hash: receipt.transactionHash,
        isError: false,
        gasFeeInCrypto: gasEstimateResponse.gasFeeInCrypto,
      };
    } catch (e) {
      return { isError: true, error: e };
    }
  };

  const sendNativeToken = async ({
    publicClient,
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
  }: SendNativeToken): Promise<string> => {
    const chainConfig = get(
      ChainConfigMapping,
      String(get(ChainNameMapping, chain)),
    );
    const resp = await executeTransferContract({
      publicClient,
      chain: chainConfig,
      amountToSend,
      toAddress,
      contractAddress,
      contractDecimals,
      isErc20: false,
    });

    if (!resp.isError) {
      return resp.hash;
    }
    throw resp.error;
  };

  const sendERC20Token = async ({
    publicClient,
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
  }: {
    publicClient: PublicClient;
    chain: ChainBackendNames;
    amountToSend: string;
    toAddress: `0x${string}`;
    contractAddress: `0x${string}`;
    contractDecimals: number;
  }): Promise<string> => {
    const erc20Abi = [
      {
        inputs: [
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];

    const numberOfTokens = parseUnits(amountToSend, contractDecimals);

    const contractData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [toAddress, numberOfTokens],
    });

    const chainConfig = get(
      ChainConfigMapping,
      String(get(ChainNameMapping, chain)),
    );

    const resp = await executeTransferContract({
      publicClient,
      chain: chainConfig,
      amountToSend: '0',
      toAddress,
      contractAddress,
      contractDecimals,
      contractData,
    });

    if (!resp.isError) {
      return resp.hash;
    }
    throw resp.error;
  };

  const sendEvmToken = async ({
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
    symbol,
    // contractData: contractDataUser,
  }: SendInEvmInterface): Promise<TransactionResponse> => {
    try {
      const chainConfig = get(
        ChainConfigMapping,
        String(get(ChainNameMapping, chain)),
      );

      const publicClient = getViemPublicClient(
        getWeb3Endpoint(chainConfig, globalContext),
      );

      if (
        (contractAddress.toLowerCase() === OP_ETH_ADDRESS &&
          chain === CHAIN_OPTIMISM.backendName) ||
        ((chain === CHAIN_SHARDEUM.backendName ||
          chain === CHAIN_SHARDEUM_SPHINX.backendName) &&
          symbol === 'SHM') ||
        isNativeCurrency(chainConfig, contractAddress)
      ) {
        const hash = await sendNativeToken({
          publicClient,
          chain,
          amountToSend,
          toAddress,
          contractAddress,
          contractDecimals,
        });
        return { hash: String(hash), isError: false };
      } else {
        const hash = await sendERC20Token({
          publicClient,
          chain,
          amountToSend,
          toAddress,
          contractAddress,
          contractDecimals,
        });

        return { hash: String(hash), isError: false };
      }
    } catch (error: unknown) {
      Sentry.captureException(error);
      return { isError: true, error };
    }
  };

  const sendCosmosToken = async ({
    fromChain,
    denom,
    amount,
    fromAddress,
    toAddress,
    contractDecimals,
  }: {
    fromChain: Chain;
    denom: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
    contractDecimals: number;
  }): Promise<TransactionResponse> => {
    try {
      const { chainName, backendName } = fromChain;
      const signer = await getCosmosSignerClient(chainName);
      if (signer) {
        const gasDetails = await estimateGasForCosmos({
          chain: fromChain,
          denom,
          amount,
          fromAddress,
          toAddress,
          signer,
        });

        if (gasDetails.isError) {
          throw gasDetails.error;
        }

        const rpc = getCosmosRpc(backendName);

        const signingClient = await getCosmosSigningClient(
          fromChain,
          rpc,
          signer,
        );

        const tokenDenom = denom ?? '';

        const amountToSend = parseUnits(amount, contractDecimals).toString();

        const result = await signingClient.sendTokens(
          fromAddress,
          toAddress,
          coins(amountToSend, tokenDenom),
          {
            gas: gasDetails?.fee?.gas ?? '0',
            amount: coins(
              gasDetails?.fee?.amount?.[0]?.amount ?? '0',
              gasDetails?.fee?.amount?.[0]?.denom ?? '',
            ),
          },
          'Cypher Wallet',
        );

        if (result.code === 0) {
          return {
            isError: false,
            hash: result.transactionHash,
            gasFeeInCrypto: gasDetails?.gasFeeInCrypto,
          };
        } else {
          return {
            isError: true,

            error: result?.events ?? '',
          };
        }
      } else {
        return {
          isError: true,
          error: 'signer not found',
        };
      }
    } catch (e) {
      return { isError: true, error: e };
    }
  };

  const interCosmosIBC = async ({
    fromChain,
    toChain,
    denom,
    amount,
    fromAddress,
    toAddress,
    contractDecimals,
  }: {
    fromChain: Chain;
    toChain: Chain;
    denom: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
    contractDecimals: number;
  }): Promise<TransactionResponse> => {
    try {
      const { chainName, backendName } = fromChain;
      const signer = await getCosmosSignerClient(chainName);

      if (signer) {
        const rpc = getCosmosRpc(backendName);
        const signingClient = await getCosmosSigningClient(
          fromChain,
          rpc,
          signer,
        );

        const gasFeeDetails = await estimateGasForCosmosIBC({
          fromChain,
          toChain,
          denom,
          amount,
          fromAddress,
          toAddress,
          signer,
        });

        if (gasFeeDetails.isError) {
          throw gasFeeDetails.error;
        }

        const amountToSend = parseUnits(amount, contractDecimals).toString();
        const transferAmount: Coin = {
          denom,
          amount: amountToSend.toString(),
        };

        const sourcePort = 'transfer';
        const sourceChannel: string = get(cosmosConfig, chainName).channel[
          toChain.chainName.toLowerCase()
        ];
        const timeOut: any = getTimeOutTime();
        const timeoutHeight: any = {
          revisionHeight: Long.fromNumber(123),
          revisionNumber: Long.fromNumber(456),
        };
        const transferMsg: MsgTransferEncodeObject = {
          typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
          value: {
            sourcePort,
            sourceChannel,
            sender: fromAddress,
            receiver: toAddress,
            token: transferAmount,
            timeoutHeight,
            timeoutTimestamp: timeOut,
          },
        };
        const ibcResponse = await signingClient.signAndBroadcast(
          fromAddress,
          [transferMsg],
          {
            gas: gasFeeDetails?.fee?.gas ?? '0',
            amount: coins(
              gasFeeDetails?.fee?.amount?.[0]?.amount ?? '0',
              gasFeeDetails?.fee?.amount?.[0]?.denom ?? '',
            ),
          },
          'Cypher Wallet',
        );
        if (ibcResponse.code === 0) {
          return { hash: ibcResponse.transactionHash, isError: false };
        } else {
          return {
            isError: true,
            error: ibcResponse.events ?? 'IBC transfer failed',
          };
        }
      } else {
        return { isError: true, error: 'Unable to create a singer' };
      }
    } catch (e) {
      return { isError: true, error: e };
    }
  };

  const delegateCosmosToken = async ({
    chain,
    amount,
    validatorAddress,
    contractDecimals,
  }: {
    chain: Chain;
    amount: string;
    validatorAddress: string;
    contractDecimals: number;
  }) => {
    try {
      const { chainName, backendName } = chain;
      const signer = await getCosmosSignerClient(chainName);
      if (signer) {
        const accounts = await signer?.getAccounts();

        if (accounts) {
          const userAddress = accounts[0].address;
          const denom = get(cosmosConfig, chainName).denom;

          const gasDetails = await estiamteGasForDelgate({
            chain,
            denom,
            amountToDelegate: amount,
            userAddress,
            validatorAddress,
            signer,
          });

          if (gasDetails) {
            const rpc = getCosmosRpc(backendName);

            const signingClient = await getCosmosSigningClient(
              chain,
              rpc,
              signer,
            );

            const amountToSend = parseUnits(
              amount,
              contractDecimals,
            ).toString();

            const msg = {
              typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
              value: {
                delegatorAddress: userAddress,
                validatorAddress,
                amount: {
                  denom,
                  amount: amountToSend,
                },
              },
            };

            const result = await signingClient.signAndBroadcast(
              userAddress,
              [msg],
              gasDetails.fee,
              'Cypher Delegation',
            );

            if (result.code === 0) {
              return {
                isError: false,
                hash: result.transactionHash,
                gasFeeInCrypto: gasDetails?.gasFeeInCrypto,
              };
            } else {
              return {
                isError: true,
                hash: '',
                error: result?.events ?? 'Unable to delegate',
                gasFeeInCrypto: undefined,
              };
            }
          }
          return {
            isError: true,
            hash: '',
            error: 'Unable to create the signer',
          };
        }
      }
    } catch (e) {
      return {
        isError: true,
        hash: '',
        error: e,
      };
    }
  };

  const unDelegateCosmosToken = async ({
    chain,
    amount,
    validatorAddress,
    contractDecimals,
  }: {
    chain: Chain;
    amount: string;
    validatorAddress: string;
    contractDecimals: number;
  }) => {
    try {
      const { chainName, backendName } = chain;
      const signer = await getCosmosSignerClient(chainName);
      if (signer) {
        const accounts = await signer?.getAccounts();
        if (accounts) {
          const userAddress = accounts[0].address;
          const denom = get(cosmosConfig, chainName).denom;
          const gasDetails = await estimateGasForUndelegate({
            chain,
            denom,
            amountToUndelegate: amount,
            userAddress,
            validatorAddress,
            signer,
          });

          if (gasDetails) {
            const rpc = getCosmosRpc(backendName);

            const signingClient = await getCosmosSigningClient(
              chain,
              rpc,
              signer,
            );

            const amountToSend = parseUnits(
              amount,
              contractDecimals,
            ).toString();

            const msg = {
              typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
              value: {
                delegatorAddress: userAddress,
                validatorAddress,
                amount: {
                  denom,
                  amount: amountToSend,
                },
              },
            };
            const result = await signingClient.signAndBroadcast(
              userAddress,
              [msg],
              gasDetails.fee,
              'Cypher Delegation',
            );

            if (result.code === 0) {
              return {
                isError: false,
                hash: result.transactionHash,
                gasFeeInCrypto: gasDetails?.gasFeeInCrypto,
              };
            } else {
              return {
                isError: true,
                hash: '',
                error: result?.events ?? 'Unable to delegate',
                gasFeeInCrypto: undefined,
              };
            }
          }
          return {
            isError: true,
            hash: '',
            error: 'Unable to create the signer',
          };
        }
      }
    } catch (e) {
      return {
        isError: true,
        hash: '',
        error: e,
      };
    }
  };

  const claimCosmosReward = async ({
    chain,
    rewardList,
  }: {
    chain: Chain;
    rewardList: IReward[];
  }): Promise<TransactionServiceResult | undefined> => {
    try {
      const { chainName, backendName } = chain;
      const signer = await getCosmosSignerClient(chainName);
      const accounts = await signer?.getAccounts();

      if (accounts) {
        const userAddress = accounts[0].address;

        if (signer) {
          const denom = get(cosmosConfig, chainName).denom;
          const gasFeeDetails = await estimateGasForClaimRewards({
            chain,
            denom,
            signer,
            userAddress,
            rewardList,
          });

          if (gasFeeDetails) {
            const rpc = getCosmosRpc(backendName);
            const signingClient = await getCosmosSigningClient(
              chain,
              rpc,
              signer,
            );

            const msgList: Array<{
              typeUrl: string;
              value: { delegatorAddress: string; validatorAddress: string };
            }> = [];

            rewardList.forEach(item => {
              const msg = {
                typeUrl:
                  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
                value: {
                  delegatorAddress: userAddress,
                  validatorAddress: item.validatorAddress,
                },
              };
              msgList.push(msg);
            });

            const result = await signingClient.signAndBroadcast(
              userAddress,
              msgList,
              gasFeeDetails.fee,
              'Cypher Claim rewards',
            );

            if (result.code === 0) {
              return {
                isError: false,
                hash: result.transactionHash,
                gasFeeInCrypto: gasFeeDetails?.gasFeeInCrypto,
              };
            } else {
              return {
                isError: true,
                error: result?.events ?? 'Unable to claim the rewards',
              };
            }
          } else {
            return {
              isError: true,
              error: 'Unable to create the signer',
            };
          }
        }
      }
    } catch (e) {
      return {
        isError: true,
        error: e,
      };
    }
  };

  const reDelegateCosmosToken = async ({
    chain,
    amount,
    validatorSrcAddress,
    validatorDstAddress,
    contractDecimals,
  }: {
    chain: Chain;
    amount: string;
    validatorSrcAddress: string;
    validatorDstAddress: string;
    contractDecimals: number;
  }) => {
    try {
      const { chainName, backendName } = chain;
      const signer = await getCosmosSignerClient(chainName);

      const accounts = await signer?.getAccounts();

      if (accounts) {
        const userAddress = accounts[0].address;
        if (signer) {
          const denom = get(cosmosConfig, chainName).denom;
          const gasDetails = await estimateGasForRedelgate({
            chain,
            denom,
            amountToRedelegate: amount,
            userAddress,
            validatorSrcAddress,
            validatorDstAddress,
            signer,
          });

          if (gasDetails) {
            const rpc = getCosmosRpc(backendName);

            const signingClient = await getCosmosSigningClient(
              chain,
              rpc,
              signer,
            );

            const amountToRedelegate = parseUnits(
              amount,
              contractDecimals,
            ).toString();

            const msg = {
              typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
              value: {
                delegatorAddress: userAddress,
                validatorSrcAddress,
                validatorDstAddress,
                amount: {
                  denom,
                  amount: amountToRedelegate,
                },
              },
            };

            const result = await signingClient.signAndBroadcast(
              userAddress,
              [msg],
              gasDetails.fee,
              'Cypher Delegation',
            );

            if (result.code === 0) {
              return {
                isError: false,
                hash: result.transactionHash,
                gasFeeInCrypto: gasDetails?.gasFeeInCrypto,
              };
            } else {
              return {
                isError: true,
                hash: '',
                error: result?.events ?? 'Unable to re delegate',
                gasFeeInCrypto: undefined,
              };
            }
          }
          return {
            isError: true,
            hash: '',
            error: 'Unable to create the signer',
          };
        }
      }
    } catch (e) {
      return {
        isError: true,
        hash: '',
        error: e,
      };
    }
  };

  const executeApprovalRevokeContract = async ({
    publicClient,
    tokenContractAddress,
    walletAddress,
    contractData,
    chainDetails,
    tokens,
  }: {
    publicClient: PublicClient;
    tokenContractAddress: Address;
    walletAddress: Address;
    contractData?: `0x${string}`;
    chainDetails: Chain;
    tokens: bigint;
  }): Promise<TransactionResponse> => {
    try {
      const gasEstimateResponse = await estimateGasForEvm({
        publicClient,
        chain: chainDetails.backendName,
        fromAddress: walletAddress,
        toAddress: tokenContractAddress,
        amountToSend: '0',
        contractAddress: tokenContractAddress,
        contractDecimals: 18,
        contractData,
        isErc20: !isNativeToken(tokenContractAddress),
      });

      if (gasEstimateResponse.isError) {
        return { isError: true, error: gasEstimateResponse.error };
      }

      const transactionToBeSigned = {
        to: tokenContractAddress,
        gas: BigInt(gasEstimateResponse.gasLimit),
        value: parseEther('0'),
        ...(contractData && { data: contractData }),
        ...(gasEstimateResponse.isEIP1599Supported
          ? {
              maxPriorityFeePerGas: BigInt(
                DecimalHelper.toInteger(
                  gasEstimateResponse.priorityFee,
                  9,
                ).toString(),
              ),
              maxFeePerGas: BigInt(
                DecimalHelper.toInteger(
                  gasEstimateResponse.maxFee,
                  9,
                ).toString(),
              ),
            }
          : {
              gasPrice: BigInt(
                DecimalHelper.toInteger(
                  gasEstimateResponse.gasPrice,
                  9,
                ).toString(),
              ),
            }),
      };

      const hash = await signApprovalEthereum({
        rpc: getWeb3Endpoint(chainDetails, globalContext),
        sendChain: chainDetails?.backendName,
        transactionToBeSigned,
        tokens,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      if (receipt) {
        return { isError: false, hash: receipt.transactionHash };
      }
      return { isError: true, error: 'No hash returned' };
    } catch (e: unknown) {
      return { isError: true, error: e };
    }
  };

  function getMsgValueForIbcTransfer({
    chain,
    allowList,
    denom,
    amount,
  }: {
    chain: Chain;
    allowList: string[];
    denom: string;
    amount: string;
  }) {
    return {
      typeUrl: '/ibc.applications.transfer.v1.TransferAuthorization',
      value: TransferAuthorization.encode(
        TransferAuthorization.fromPartial({
          allocations: [
            {
              sourcePort: 'transfer',
              sourceChannel: get(cosmosConfig, [
                chain.chainName,
                'channel',
                'osmosis',
              ]),
              spendLimit: [
                {
                  denom,
                  amount: amount.toString(),
                },
              ],
              allowList,
            },
          ],
        }),
      ).finish(),
    };
  }

  function getAuthorizationMsgForSend({
    allowList,
    denom,
    amount,
  }: {
    allowList: string[];
    denom: string;
    amount: string;
  }) {
    return {
      typeUrl: '/cosmos.bank.v1beta1.SendAuthorization',
      value: SendAuthorization.encode(
        SendAuthorization.fromPartial({
          spendLimit: [
            {
              denom,
              amount: amount.toString(),
            },
          ],
          allowList,
        }),
      ).finish(),
    };
  }

  async function grantAutoLoad({
    chain,
    granter,
    grantee,
    allowList,
    amount,
    denom,
    selectedToken,
  }: {
    chain: Chain;
    granter: `0x${string}`;
    grantee: `0x${string}`;
    allowList: string[];
    amount: string;
    denom: string;
    selectedToken: Holding;
  }): Promise<IAutoLoadResponse> {
    try {
      const { chainName, backendName } = chain;
      if (map(EVM_CHAINS, 'backendName').includes(backendName)) {
        const publicClient = getViemPublicClient(
          getWeb3Endpoint(chain, globalContext),
        );
        const allowanceResp = await checkIfAllowanceIsEnough({
          publicClient,
          tokenContractAddress: selectedToken.contractAddress as Address,
          routerAddress: grantee,
          amount,
        });

        if (allowanceResp.isError) {
          return {
            isError: true,
            error: parseErrorMessage(allowanceResp.error),
          };
        }

        if (allowanceResp.hasEnoughAllowance) {
          return { isError: false, hash: '' };
        }

        const contractData = encodeFunctionData({
          abi: allowanceApprovalContractABI,
          functionName: 'approve',
          args: [grantee, allowanceResp.tokens],
        });

        const approvalResp = await executeApprovalRevokeContract({
          publicClient,
          tokenContractAddress: selectedToken.contractAddress as Address,
          walletAddress: hdWallet.state.wallet.ethereum.address as Address,
          contractData,
          chainDetails: selectedToken.chainDetails,
          tokens: allowanceResp.tokens ?? 0n,
        });

        if (approvalResp?.isError) {
          return {
            isError: true,
            error: parseErrorMessage(approvalResp.error),
          };
        } else {
          return { isError: false, hash: approvalResp?.hash };
        }
      } else if (map(COSMOS_CHAINS_LIST, 'backendName').includes(backendName)) {
        const { gasPrice } = await getCosmosGasPrice(backendName);
        const isIbcAuthz = backendName !== ChainBackendNames.OSMOSIS;
        const authorizationMsg = isIbcAuthz
          ? getMsgValueForIbcTransfer({
              chain,
              allowList,
              denom,
              amount,
            })
          : getAuthorizationMsgForSend({
              allowList,
              denom,
              amount,
            });
        const grantMsg = {
          typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
          value: {
            granter,
            grantee,
            grant: {
              authorization: authorizationMsg,
              expiration: null,
            },
          },
        };

        const signer = await getCosmosSignerClient(chainName);
        if (signer) {
          const rpc = getCosmosRpc(backendName);

          const signingClient = await getCosmosSigningClient(
            chain,
            rpc,
            signer,
          );

          const simulation = await signingClient.simulate(
            granter,
            [grantMsg],
            'Cypher',
          );
          const gasFee = DecimalHelper.multiply(simulation, [2.5, gasPrice]);
          const fee = {
            gas: Math.floor(simulation * 2.5).toString(),
            amount: [
              {
                denom,
                amount: gasFee.floor().toString(),
              },
            ],
          };
          const grantResult = await signingClient.signAndBroadcast(
            granter,
            [grantMsg],
            fee,
            'Cypher',
          );
          return { isError: false, hash: grantResult.transactionHash };
        }
        return { isError: true, error: 'Unable to fetch signer' };
      }
      return {
        isError: true,
        error: 'Auto load currently not supported for this chain',
      };
    } catch (e) {
      return { isError: true, error: e };
    }
  }

  async function revokeAutoLoad({
    chain,
    granter,
    grantee,
    contractAddress,
    chainDetails,
  }: {
    chain: Chain;
    granter: `0x${string}`;
    grantee: `0x${string}`;
    contractAddress: `0x${string}`;
    chainDetails: Chain;
  }): Promise<IAutoLoadResponse> {
    try {
      const { chainName, backendName } = chain;
      if (map(EVM_CHAINS, 'backendName').includes(backendName)) {
        const publicClient = getViemPublicClient(
          getWeb3Endpoint(chain, globalContext),
        );

        const contractData = encodeFunctionData({
          abi: allowanceApprovalContractABI,
          functionName: 'approve',
          args: [grantee, BigInt(0)],
        });

        const approvalResp = await executeApprovalRevokeContract({
          publicClient,
          tokenContractAddress: contractAddress,
          walletAddress: hdWallet.state.wallet.ethereum.address as Address,
          chainDetails,
          contractData,
          tokens: 0n,
        });

        if (approvalResp?.isError) {
          return { isError: true, error: 'Error in revoking allowance' };
        } else {
          return { isError: false, hash: approvalResp?.hash };
        }
      } else if (map(COSMOS_CHAINS_LIST, 'backendName').includes(backendName)) {
        const { denom } = get(cosmosConfig, chainName);
        const { gasPrice } = await getCosmosGasPrice(backendName);
        const isIbcAuthz = backendName !== ChainBackendNames.OSMOSIS;
        const msgTypeUrl = isIbcAuthz
          ? '/ibc.applications.transfer.v1.MsgTransfer'
          : '/cosmos.bank.v1beta1.MsgSend';
        const revokeMsg = {
          typeUrl: '/cosmos.authz.v1beta1.MsgRevoke',
          value: MsgRevoke.fromPartial({
            granter,
            grantee,
            msgTypeUrl,
          }),
        };
        const signer = await getCosmosSignerClient(chainName);
        if (signer) {
          const rpc = getCosmosRpc(backendName);

          const signingClient = await getCosmosSigningClient(
            chain,
            rpc,
            signer,
          );
          const simulation = await signingClient.simulate(
            granter,
            [revokeMsg],
            'Cypher',
          );
          const gasFee = DecimalHelper.multiply(simulation, [2.5, gasPrice]);
          const fee = {
            gas: Math.floor(simulation * 2.5).toString(),
            amount: [
              {
                denom,
                amount: gasFee.floor().toString(),
              },
            ],
          };
          const revokeResult = await signingClient.signAndBroadcast(
            granter,
            [revokeMsg],
            fee,
            'Cypher',
          );
          return { isError: false, hash: revokeResult.transactionHash };
        }
        return { isError: true, error: 'Unable to fetch signer' };
      }
      return {
        isError: true,
        error: 'Revoke Auto load currently not supported for this chain',
      };
    } catch (e) {
      return { isError: true, error: e };
    }
  }

  const swapTokens = async ({
    quoteData,
    chainDetails,
  }: SwapMetaData): Promise<TransactionResponse> => {
    try {
      const ethereum = hdWalletContext.state.wallet.ethereum;
      const fromAddress = ethereum.address;

      const txnPayload = {
        from: fromAddress,
        to: quoteData?.data?.to as `0x${string}`,
        gas: BigInt(quoteData?.data?.gas),
        value: BigInt(quoteData?.data?.value),
        data: quoteData?.data?.data,
        ...(quoteData?.gasInfo?.isEIP1599Supported
          ? {
              maxPriorityFeePerGas: parseGwei(
                String(quoteData?.gasInfo?.priorityFee),
              ),
              maxFeePerGas: parseGwei(String(quoteData?.gasInfo?.maxFee)),
            }
          : {
              gasPrice: BigInt(quoteData?.gasInfo?.gasPrice ?? 0),
            }),
      };

      const hash = await signEthTransaction({
        rpc: getWeb3Endpoint(chainDetails, globalContext),
        sendChain: chainDetails.backendName,
        transactionToBeSigned: txnPayload,
      });

      const publicClient = getViemPublicClient(
        getWeb3Endpoint(chainDetails, globalContext),
      );

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      return { isError: false, hash: receipt.transactionHash };
    } catch (e) {
      return { isError: true, error: e };
    }
  };

  const checkBalance = async (
    connection: Connection,
    publicKey: PublicKey,
    requiredLamports: number,
  ) => {
    const balance = await connection.getBalance(publicKey);
    const readableRequiredLamports: number = DecimalHelper.toDecimal(
      requiredLamports,
      9,
    ).toNumber();

    const readableBalance: number = DecimalHelper.toDecimal(
      balance,
      9,
    ).toNumber();

    if (balance < requiredLamports) {
      throw new Error(
        `Insufficient balance. Required: ${readableRequiredLamports} SOL, Available: ${readableBalance} SOL.`,
      );
    }
  };

  async function fetchPriorityFees(connection: Connection) {
    const fees = await connection.getRecentPrioritizationFees();
    if (fees.length === 0) {
      return 0;
    }

    // Sort fees in ascending order
    const sortedFees = fees
      .map(fee => fee.prioritizationFee)
      .sort((a, b) => a - b);

    // Calculate the index for 80th percentile
    const index = Math.ceil(sortedFees.length * 0.8) - 1;

    // Return the 80th percentile value using lodash get
    return get(sortedFees, index, 0);
  }

  const simulateSolanaTxn = async ({
    connection,
    fromKeypair,
    instructions = [],
  }: {
    connection: Connection;
    fromKeypair: Keypair;
    instructions?: TransactionInstruction[];
  }) => {
    try {
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      const messageV0 = new TransactionMessage({
        payerKey: fromKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      const simulation = await connection.simulateTransaction(transaction, {
        replaceRecentBlockhash: true,
        commitment: 'finalized',
      });

      if (simulation.value.err) {
        throw new Error(
          `Simulation failed from rpc after successfully simualting: ${parseErrorMessage(simulation.value.err)}`,
        );
      }

      const baseUnits = simulation.value.unitsConsumed ?? 200000;
      return Math.ceil(baseUnits * 1.2); // Add 20% buffer
    } catch (e: unknown) {
      throw new Error(
        `Simulation failed Unexpected error: ${parseErrorMessage(e)}`,
      );
    }
  };

  const sendTransactionWithPriorityFee = async (
    connection: Connection,
    transaction: Transaction,
    fromKeypair: Keypair,
    amountToSend?: bigint,
  ) => {
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;

    const priorityFee = await fetchPriorityFees(connection);

    const estimatedComputeUnits = await simulateSolanaTxn({
      connection,
      instructions: transaction.instructions,
      fromKeypair,
    });

    transaction.instructions.unshift(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
    );

    transaction.instructions.unshift(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: estimatedComputeUnits + 1000,
      }),
    );

    const feeCalculator = await connection.getFeeForMessage(
      transaction.compileMessage(),
    );

    const requiredFeeLamports = feeCalculator.value ?? 5000;

    await checkBalance(connection, fromKeypair.publicKey, requiredFeeLamports);

    transaction.sign(fromKeypair);

    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
    );

    return signature;
  };

  const sendSOLTokens = async ({
    amountToSend,
    toAddress,
    connection,
    fromKeypair,
  }: {
    amountToSend: string;
    toAddress: string;
    connection: Connection;
    fromKeypair: Keypair;
  }) => {
    const toPublicKey = new PublicKey(toAddress);

    const fromPublicKey = fromKeypair.publicKey;
    const lamportsToSend = parseUnits(amountToSend, 9);

    const transaction = new Transaction();

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: lamportsToSend,
      }),
    );

    const resp = await sendTransactionWithPriorityFee(
      connection,
      transaction,
      fromKeypair,
      lamportsToSend,
    );

    return resp;
  };

  const sendSPLTokens = async ({
    amountToSend,
    toAddress,
    mintAddress,
    contractDecimals = 9,
    connection,
    fromKeypair,
  }: {
    amountToSend: string;
    toAddress: string;
    mintAddress: string;
    contractDecimals: number;
    connection: Connection;
    fromKeypair: Keypair;
  }) => {
    const toPublicKey = new PublicKey(toAddress);
    const mintPublicKey = new PublicKey(mintAddress);

    const lamportsToSend = parseUnits(amountToSend, contractDecimals);

    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromKeypair,
      mintPublicKey,
      fromKeypair.publicKey,
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromKeypair,
      mintPublicKey,
      toPublicKey,
    );

    const transaction = new Transaction();

    transaction.add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromKeypair.publicKey,
        lamportsToSend,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    const resp = await sendTransactionWithPriorityFee(
      connection,
      transaction,
      fromKeypair,
      lamportsToSend,
    );

    return resp;
  };

  async function confirmTransactionWithRetry({
    connection,
    signature,
    maxRetries = 5,
    initialBackoff = 1000,
    backoffFactor = 1.5,
  }: {
    connection: Connection;
    signature: TransactionSignature;
    maxRetries?: number;
    initialBackoff?: number;
    backoffFactor?: number;
  }) {
    let currentBackoff = initialBackoff;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        const response = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          'finalized',
        );
        if (response.value.err) {
          throw new Error(
            'Transaction confirmation error: ' +
              JSON.stringify(response.value.err),
          );
        }
        return response;
      } catch (error: unknown) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, currentBackoff));
          currentBackoff *= backoffFactor;
        } else {
          throw error;
        }
      }
    }
  }

  const sendSolanaTokens = async ({
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
  }: {
    amountToSend: string;
    toAddress: string;
    contractAddress: string;
    contractDecimals: number;
  }): Promise<TransactionResponse> => {
    try {
      let signature;
      const solanRpc = getSolanaRpc();
      const fromKeypair = await getSolanWallet();
      if (!fromKeypair) {
        return {
          isError: true,
          error: 'Unable to create user wallet',
        };
      }

      const connection = new Connection(solanRpc, 'confirmed');

      if (contractAddress === 'solana-native') {
        signature = await sendSOLTokens({
          amountToSend,
          toAddress,
          connection,
          fromKeypair,
        });
      } else {
        signature = await sendSPLTokens({
          amountToSend,
          toAddress,
          mintAddress: contractAddress,
          contractDecimals,
          connection,
          fromKeypair,
        });
      }
      const response = await confirmTransactionWithRetry({
        connection,
        signature,
        maxRetries: 15,
      });

      const result = get(response, ['value', 'err']);
      if (isNil(result)) {
        logAnalytics({
          type: AnalyticsType.SUCCESS,
          txnHash: signature,
          chain: 'solana',
          address: fromKeypair.publicKey.toBase58(),
          message: 'Transaction sent successfully',
          other: {
            amount: amountToSend,
            toAddress,
            contractAddress,
            contractDecimals,
          },
        });
        return { isError: false, hash: signature };
      }
      logAnalytics({
        type: AnalyticsType.ERROR,
        chain: 'solana',
        message: JSON.stringify(result),
        screen: 'sendSolanaTokens',
        address: fromKeypair.publicKey.toBase58(),
        other: {
          amount: amountToSend,
          toAddress,
          contractAddress,
          contractDecimals,
        },
      });
      return { isError: true, error: result };
    } catch (e) {
      return {
        isError: true,
        error: e,
      };
    }
  };

  const checkIfAllowanceIsEnough = async ({
    publicClient,
    tokenContractAddress,
    routerAddress,
    amount,
  }: {
    publicClient: PublicClient;
    tokenContractAddress: Address;
    routerAddress: Address;
    amount: string;
  }): Promise<CheckAllowanceResponse> => {
    try {
      const { ethereum } = get(hdWallet, ['state', 'wallet']);

      if (!ethereum?.address) {
        throw new Error('Ethereum wallet not initialized');
      }

      const contract = getContract({
        address: tokenContractAddress,
        abi: allowanceApprovalContractABI,
        client: { public: publicClient },
      });

      if (!contract) {
        throw new Error('Failed to initialize contract');
      }

      const allowance = await contract.read.allowance([
        ethereum.address as Address,
        routerAddress,
      ]);

      const tokenAmount = DecimalHelper.fromString(amount).ceil();

      if (DecimalHelper.isGreaterThan(tokenAmount, allowance.toString())) {
        return {
          isError: false,
          hasEnoughAllowance: false,
          tokens: BigInt(tokenAmount.toFixed(0)),
        };
      } else {
        return { isError: false, hasEnoughAllowance: true };
      }
    } catch (e) {
      return { isError: true, error: e };
    }
  };

  return {
    sendEvmToken,
    sendCosmosToken,
    interCosmosIBC,
    delegateCosmosToken,
    unDelegateCosmosToken,
    claimCosmosReward,
    reDelegateCosmosToken,
    grantAutoLoad,
    revokeAutoLoad,
    checkIfAllowanceIsEnough,
    executeApprovalRevokeContract,
    swapTokens,
    sendSolanaTokens,
    executeTransferContract,
  };
}
