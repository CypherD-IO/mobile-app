import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import { Coin, MsgTransferEncodeObject } from '@cosmjs/stargate';
import { InjectiveSigningStargateClient } from '@injectivelabs/sdk-ts/dist/cjs/exports';
import * as Sentry from '@sentry/react-native';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import { ceil, get, isNil, map, round, set } from 'lodash';
import Long from 'long';
import { useContext } from 'react';
import Web3 from 'web3';
import { cosmosConfig } from '../../constants/cosmosConfig';
import {
  CHAIN_OPTIMISM,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  COSMOS_CHAINS_LIST,
  Chain,
  ChainBackendNames,
  ChainConfigMapping,
  ChainNameMapping,
  EVM_CHAINS,
} from '../../constants/server';
import { GlobalContext } from '../../core/globalContext';
import {
  HdWalletContext,
  getTimeOutTime,
  getWeb3Endpoint,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
} from '../../core/util';
import {
  SendInEvmInterface,
  SendNativeToken,
} from '../../models/sendInEvm.interface';
import useCosmosSigner from '../useCosmosSigner';
import useEthSigner from '../useEthSigner';
import useGasService from '../useGasService';
import { IReward } from '../../reducers/cosmosStakingReducer';
import { ethers } from 'ethers';
import { SendAuthorization } from 'cosmjs-types/cosmos/bank/v1beta1/authz';
import { IAutoLoadResponse } from '../../models/autoLoadResponse.interface';
import { MsgRevoke } from 'cosmjs-types/cosmos/authz/v1beta1/tx';
import { allowanceApprovalContractABI } from '../../core/swap';
import { Holding } from '../../core/portfolio';
import { getGasPriceFor } from '../../containers/Browser/gasHelper';
import { SwapMetaData } from '../../models/swapMetaData';
import {
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  Keypair,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import useSolanaSigner from '../useSolana';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { TransferAuthorization } from 'cosmjs-types/ibc/applications/transfer/v1/authz';
import { DecimalHelper } from '../../utils/decimalHelper';
import { AnalyticsType } from '../../constants/enum';

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

  const sendNativeToken = async ({
    web3,
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
  }: SendNativeToken) => {
    const ethereum = hdWalletContext.state.wallet.ethereum;
    const fromAddress = ethereum.address;
    try {
      const { gasLimit, gasPrice, priorityFee, isEIP1599Supported, maxFee } =
        await estimateGasForEvm({
          web3,
          chain,
          fromAddress,
          toAddress,
          amountToSend,
          contractAddress,
          contractDecimals,
        });

      const tx = {
        from: ethereum.address,
        to: toAddress,
        value: web3.utils.toWei(amountToSend, 'ether').toString(),
        gas: web3.utils.toHex(gasLimit),
      };
      if (!isEIP1599Supported) {
        set(tx, 'gasPrice', gasPrice);
      } else {
        set(
          tx,
          'maxPriorityFeePerGas',
          priorityFee ? web3.utils.toWei(priorityFee.toFixed(9), 'gwei') : '0',
        );
        set(tx, 'maxFeePerGas', web3.utils.toWei(maxFee.toFixed(9), 'gwei'));
        set(tx, 'gasPrice', undefined);
      }

      const hash = await signEthTransaction({
        web3,
        sendChain: chain,
        transactionToBeSigned: tx,
      });
      return hash;
    } catch (err: any) {
      throw new Error(err);
    }
  };

  const sendERC20Token = async ({
    web3,
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
    contractData: contractDataUser,
  }: SendNativeToken) => {
    try {
      const ethereum = hdWalletContext.state.wallet.ethereum;
      const fromAddress = ethereum.address;
      const contractAbiFragment = [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            {
              name: '_to',
              type: 'address',
            },
            {
              type: 'uint256',
              name: '_tokens',
            },
          ],
          constant: false,
          outputs: [],
          payable: false,
        },
      ];

      // How many tokens? -- Use BigNumber everywhere
      const numberOfTokens = ethers
        .parseUnits(amountToSend, contractDecimals)
        .toString();
      // Form the contract and contract data
      const contract = new web3.eth.Contract(
        contractAbiFragment as any,
        contractAddress,
      );
      const contractData = contract.methods
        .transfer(toAddress, numberOfTokens)
        .encodeABI();

      const { gasLimit, gasPrice, priorityFee, isEIP1599Supported, maxFee } =
        await estimateGasForEvm({
          web3,
          chain,
          fromAddress,
          toAddress,
          amountToSend,
          contractAddress,
          contractDecimals,
          contractData: contractDataUser,
        });

      const tx = {
        from: ethereum.address,
        to: contractAddress,
        value: '0x0',
        gas: web3.utils.toHex(gasLimit),
        data: contractDataUser ?? contractData,
        contractParams: { toAddress, numberOfTokens },
      };

      if (!isEIP1599Supported) {
        set(tx, 'gasPrice', gasPrice);
      } else {
        set(
          tx,
          'maxPriorityFeePerGas',
          priorityFee ? web3.utils.toWei(priorityFee.toFixed(9), 'gwei') : '0',
        );
        set(tx, 'maxFeePerGas', web3.utils.toWei(maxFee.toFixed(9), 'gwei'));
      }

      const hash = await signEthTransaction({
        web3,
        sendChain: chain,
        transactionToBeSigned: tx,
      });
      return { hash, contractData: contractDataUser ?? contractData };
    } catch (err: any) {
      // TODO (user feedback): Give feedback to user.
      throw new Error(err.message ?? err);
    }
  };

  const sendEvmToken = async ({
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
    symbol,
    contractData: contractDataUser,
  }: SendInEvmInterface): Promise<{
    isError: boolean;
    hash: string;
    contractData?: string;
    error?: any;
  }> => {
    const chainConfig = get(
      ChainConfigMapping,
      String(get(ChainNameMapping, chain)),
    );

    const web3 = new Web3(getWeb3Endpoint(chainConfig, globalContext));
    if (
      (contractAddress.toLowerCase() === OP_ETH_ADDRESS &&
        chain === CHAIN_OPTIMISM.backendName) ||
      ((chain === CHAIN_SHARDEUM.backendName ||
        chain === CHAIN_SHARDEUM_SPHINX.backendName) &&
        symbol === 'SHM') ||
      isNativeCurrency(chainConfig, contractAddress)
    ) {
      try {
        const hash = await sendNativeToken({
          web3,
          chain,
          amountToSend,
          toAddress,
          contractAddress,
          contractDecimals,
        });
        return { hash: String(hash), isError: false };
      } catch (error) {
        Sentry.captureException(error);
        return { hash: '', isError: true, error: parseErrorMessage(error) };
      }
    } else {
      try {
        const { hash, contractData } = await sendERC20Token({
          web3,
          chain,
          amountToSend,
          toAddress,
          contractAddress,
          contractDecimals,
          contractData: contractDataUser,
        });
        return { hash: String(hash), contractData, isError: false };
      } catch (error: any) {
        Sentry.captureException(error);
        return { hash: '', isError: true, error: parseErrorMessage(error) };
      }
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
  }): Promise<{
    isError: boolean;
    hash: string;
    error?: any;
    gasFeeInCrypto?: string | undefined;
  }> => {
    try {
      const { chainName, backendName } = fromChain;
      const signer = await getCosmosSignerClient(chainName);
      if (signer) {
        const gasDetails = (await estimateGasForCosmos({
          chain: fromChain,
          denom,
          amount,
          fromAddress,
          toAddress,
          signer,
        })) as any;

        const rpc = getCosmosRpc(backendName as ChainBackendNames);

        const signingClient = await getCosmosSigningClient(
          fromChain,
          rpc,
          signer,
        );

        const tokenDenom = denom ?? cosmosConfig[backendName].denom;

        const amountToSend = ethers
          .parseUnits(amount, contractDecimals)
          .toString();

        const result = await signingClient.sendTokens(
          fromAddress,
          toAddress,
          [{ denom: tokenDenom, amount: amountToSend }],
          {
            gas: gasDetails?.fee.gas,
            amount: gasDetails?.fee.amount,
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
            hash: '',
            error: result?.events ?? '',
            gasFeeInCrypto: undefined,
          };
        }
      } else {
        return {
          isError: true,
          hash: '',
          error: 'signer not found',
          gasFeeInCrypto: undefined,
        };
      }
    } catch (e) {
      return { isError: true, hash: '', error: e };
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
  }): Promise<{
    isError: boolean;
    hash: string;
    error?: any;
  }> => {
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

        const amountToSend = ethers
          .parseUnits(amount, contractDecimals)
          .toString();
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
          value: MsgTransfer.fromPartial({
            sourcePort,
            sourceChannel,
            sender: fromAddress,
            receiver: toAddress,
            token: transferAmount,
            timeoutHeight,
            timeoutTimestamp: timeOut,
          }) as any,
        };
        const ibcResponse = await signingClient.signAndBroadcast(
          fromAddress,
          [transferMsg],
          {
            gas: gasFeeDetails?.fee.gas,
            amount: gasFeeDetails?.fee.amount,
          } as any,
          'Cypher Wallet',
        );
        const hash = ibcResponse?.transactionHash;
        return { hash, isError: false };
      } else {
        return { hash: '', isError: true, error: 'Unable to create a singer' };
      }
    } catch (e) {
      return { hash: '', isError: true, error: e };
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

            const amountToSend = ethers
              .parseUnits(amount, contractDecimals)
              .toString();

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

            const amountToSend = ethers
              .parseUnits(amount, contractDecimals)
              .toString();

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

            const amountToRedelegate = ethers
              .parseUnits(amount, contractDecimals)
              .toString();

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

  const getApproval = async ({
    web3,
    fromTokenContractAddress,
    hdWallet,
    gasLimit,
    gasFeeResponse,
    contractData,
    chainDetails,
    contractParams,
  }): Promise<{
    isError: boolean;
    error?: any;
    hash?: string;
  }> => {
    const { ethereum } = hdWallet.state.wallet;

    return await new Promise((resolve, reject) => {
      void (async () => {
        try {
          let { priorityFee, isEIP1599Supported, maxFee, gasPrice } =
            gasFeeResponse;

          if (gasPrice > 1) {
            gasPrice = DecimalHelper.toNumber(
              DecimalHelper.fromString(gasPrice).floor(),
            );
          } else {
            gasPrice = web3.utils.toWei(
              limitDecimalPlaces(gasPrice, 9),
              'gwei',
            );
          }
          const tx = {
            from: ethereum.address,
            to: fromTokenContractAddress,
            value: '0x0',
            gas: web3.utils.toHex(gasLimit),
            data: contractData,
            contractParams,
          };

          if (!isEIP1599Supported) {
            set(tx, 'gasPrice', gasPrice);
          } else {
            set(
              tx,
              'maxPriorityFeePerGas',
              web3.utils.toWei(priorityFee.toFixed(9), 'gwei'),
            );
            set(
              tx,
              'maxFeePerGas',
              web3.utils.toWei(maxFee.toFixed(9), 'gwei'),
            );
          }

          const hash = await signApprovalEthereum({
            web3,
            sendChain: chainDetails?.backendName,
            transactionToBeSigned: tx,
          });

          if (hash) {
            resolve({ isError: false, hash });
          }
        } catch (e: any) {
          resolve({ isError: true, error: e });
        }
      })();
    });
  };

  const checkGrantAllowance = async ({
    web3,
    fromTokenContractAddress,
    routerAddress,
    amount,
    overrideAllowanceCheck = false,
    chainDetails,
  }) => {
    const { ethereum } = hdWallet?.state.wallet;
    return await new Promise((resolve, reject) => {
      void (async () => {
        try {
          const contract = new web3.eth.Contract(
            allowanceApprovalContractABI as any,
            fromTokenContractAddress,
          );
          const response = await contract.methods
            .allowance(ethereum.address, routerAddress)
            .call();
          const tokenAmount = DecimalHelper.fromString(amount).ceil();
          const allowance = response;

          if (
            overrideAllowanceCheck ||
            DecimalHelper.isGreaterThan(tokenAmount, allowance)
          ) {
            const tokens = Number(ceil(amount));
            const resp = contract.methods
              .approve(routerAddress, BigInt(tokens))
              .encodeABI();
            const gasLimit = await web3?.eth.estimateGas({
              from: ethereum.address,
              // For Optimism the ETH token has different contract address
              to: fromTokenContractAddress,
              value: '0x0',
              data: resp,
            });
            const gasFeeResponse = await getGasPriceFor(chainDetails, web3);
            resolve({
              isAllowance: false,
              contract,
              contractData: resp,
              tokens,
              gasLimit: Number(gasLimit),
              gasFeeResponse,
            });
          } else {
            resolve({ isAllowance: true });
          }
        } catch (e) {
          resolve(false);
        }
      })();
    });
  };

  function getMsgValueForIbcTransfer({
    chain,
    allowList,
    denom,
    amount,
    contractDecimals = 6,
  }: {
    chain: Chain;
    allowList: string[];
    denom: string;
    amount: string;
    contractDecimals: number;
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
                  amount: ethers
                    .parseUnits(amount, contractDecimals)
                    .toString(),
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
    contractDecimals = 6,
  }: {
    allowList: string[];
    denom: string;
    amount: string;
    contractDecimals: number;
  }) {
    return {
      typeUrl: '/cosmos.bank.v1beta1.SendAuthorization',
      value: SendAuthorization.encode(
        SendAuthorization.fromPartial({
          spendLimit: [
            {
              denom,
              amount: ethers.parseUnits(amount, contractDecimals).toString(),
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
    expiry,
    selectedToken,
  }: {
    chain: Chain;
    granter: string;
    grantee: string;
    allowList: string[];
    amount: string;
    denom: string;
    expiry: string;
    selectedToken: Holding;
  }): Promise<IAutoLoadResponse> {
    try {
      const { chainName, backendName } = chain;
      if (map(EVM_CHAINS, 'backendName').includes(backendName)) {
        const web3 = new Web3(getWeb3Endpoint(chain, globalContext));
        const allowanceResp = await checkGrantAllowance({
          web3,
          fromTokenContractAddress: selectedToken.contractAddress,
          routerAddress: grantee,
          amount,
          chainDetails: selectedToken.chainDetails,
        });

        if (allowanceResp?.isAllowance) {
          return { isError: false, hash: '' };
        }

        if (!allowanceResp) {
          return { isError: true, error: 'Error in check for grant allowance' };
        }

        const approvalResp = await getApproval({
          web3,
          fromTokenContractAddress: selectedToken.contractAddress,
          hdWallet,
          gasLimit: allowanceResp?.gasLimit,
          gasFeeResponse: {
            ...allowanceResp?.gasFeeResponse,
            gasPrice: get(allowanceResp, ['gasFeeResponse', 'gasPrice']) * 1.5,
          },
          contractData: allowanceResp?.contractData,
          chainDetails: selectedToken.chainDetails,
          contractParams: {
            toAddress: selectedToken.contractAddress,
            numberOfTokens: allowanceResp?.tokens,
          },
        });

        if (approvalResp?.isError) {
          return { isError: true, error: 'Error approving allowance' };
        } else {
          return { isError: false, hash: approvalResp?.transactionHash };
        }
      } else if (map(COSMOS_CHAINS_LIST, 'backendName').includes(backendName)) {
        const { gasPrice, contractDecimal } = get(cosmosConfig, chainName);
        const isIbcAuthz = backendName !== ChainBackendNames.OSMOSIS;
        const authorizationMsg = isIbcAuthz
          ? getMsgValueForIbcTransfer({
              chain,
              allowList,
              denom,
              amount,
              contractDecimals: contractDecimal,
            })
          : getAuthorizationMsgForSend({
              allowList,
              denom,
              amount,
              contractDecimals: contractDecimal,
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
    granter: string;
    grantee: string;
    contractAddress: string;
    chainDetails: Chain;
  }): Promise<IAutoLoadResponse> {
    try {
      const { chainName, backendName } = chain;
      if (map(EVM_CHAINS, 'backendName').includes(backendName)) {
        const web3 = new Web3(getWeb3Endpoint(chain, globalContext));
        const allowanceResp = await checkGrantAllowance({
          web3,
          fromTokenContractAddress: contractAddress,
          routerAddress: grantee,
          amount: 0,
          overrideAllowanceCheck: true,
          chainDetails,
        });

        const approvalResp = await getApproval({
          web3,
          fromTokenContractAddress: contractAddress,
          hdWallet,
          gasLimit: ceil(allowanceResp?.gasLimit),
          gasFeeResponse: {
            ...allowanceResp?.gasFeeResponse,
            gasPrice: get(allowanceResp, ['gasFeeResponse', 'gasPrice']) * 1.5,
          },
          contractData: allowanceResp?.contractData,
          chainDetails,
          contractParams: {
            toAddress: contractAddress,
            numberOfTokens: '0',
          },
        });

        if (approvalResp?.isError) {
          return { isError: true, error: 'Error in revoking allowance' };
        } else {
          return { isError: false, hash: approvalResp?.transactionHash };
        }
      } else if (map(COSMOS_CHAINS_LIST, 'backendName').includes(backendName)) {
        const { gasPrice, denom } = get(cosmosConfig, chainName);

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
    web3,
    fromToken,
    routerAddress,
    contractData,
    gasLimit,
    gasFeeResponse,
    chainDetails,
  }: SwapMetaData) => {
    return await new Promise((resolve, reject) => {
      void (async () => {
        try {
          const isNative = fromToken?.isNative;

          const tx = {
            from: hdWallet.state.wallet.ethereum.address,
            chainId: fromToken?.chainId,
            value: isNative ? contractData?.value : '0x0',
            to: routerAddress,
            data: contractData.data,
            gas: gasLimit,
            gasPrice: web3.utils.toWei(
              String(gasFeeResponse.gasPrice.toFixed(9)),
              'gwei',
            ),
          };

          try {
            await web3.eth.call(tx);
          } catch (simulationError: any) {
            throw new Error(
              `Transaction would fail: ${simulationError.message}`,
            );
          }

          const hash = await signEthTransaction({
            web3,
            sendChain: chainDetails.backendName,
            transactionToBeSigned: tx,
          });
          resolve({ isError: false, receipt: hash });
        } catch (e: any) {
          reject(e);
        }
      })();
    });
  };

  const checkBalance = async (
    connection: Connection,
    publicKey: PublicKey,
    requiredLamports: number,
  ) => {
    const balance = await connection.getBalance(publicKey);
    const readableRequiredLamports: number = DecimalHelper.removeDecimals(
      requiredLamports,
      9,
    ).toNumber();

    const readableBalance: number = DecimalHelper.removeDecimals(
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
          `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
        );
      }

      const baseUnits = simulation.value.unitsConsumed ?? 200000;
      return Math.ceil(baseUnits * 1.2); // Add 20% buffer
    } catch (e: unknown) {
      throw new Error(`Simulation failed: ${JSON.stringify(e)}`);
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
    const lamportsToSend = ethers.parseUnits(amountToSend, 9);

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

    const lamportsToSend = ethers.parseUnits(amountToSend, contractDecimals);

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
  }) => {
    try {
      let signature;
      const solanRpc = getSolanaRpc();
      const fromKeypair = await getSolanWallet();
      if (!fromKeypair) {
        return {
          isError: true,
          error: 'Unable to create user wallet',
          hash: '',
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
        screen: location.pathname,
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
        hash: '',
      };
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
    getApproval,
    swapTokens,
    sendSolanaTokens,
  };
}
