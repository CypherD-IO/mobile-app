import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import {
  Coin,
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { InjectiveStargate } from '@injectivelabs/sdk-ts';
import * as Sentry from '@sentry/react-native';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import { get, set } from 'lodash';
import Long from 'long';
import { useContext } from 'react';
import Toast from 'react-native-toast-message';
import Web3 from 'web3';
import { cosmosConfig } from '../../constants/cosmosConfig';
import {
  ACCOUNT_DETAILS_INFO,
  CHAIN_OPTIMISM,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  Chain,
  ChainBackendNames,
  ChainConfigMapping,
  ChainNameMapping,
  TRANSACTION_ENDPOINT,
} from '../../constants/server';
import axios from '../../core/Http';
import { decideGasLimitBasedOnTypeOfToAddress } from '../../core/NativeTransactionHandler';
import { GlobalContext } from '../../core/globalContext';
import {
  HdWalletContext,
  getTimeOutTime,
  getWeb3Endpoint,
} from '../../core/util';
import {
  SendInEvmInterface,
  SendNativeToken,
} from '../../models/sendInEvm.interface';
import useCosmosSigner from '../useCosmosSigner';
import useEthSigner from '../useEthSigner';
import useEvmosSigner from '../useEvmosSigner';
import useGasService from '../useGasService';
import { IReward } from '../../reducers/cosmosStakingReducer';
import { ethers } from 'ethers';

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
  const evmosUrls = globalContext.globalState.rpcEndpoints.EVMOS.otherUrls;
  const { evmos } = hdWalletContext.state.wallet;
  const ACCOUNT_DETAILS = evmosUrls.accountDetails.replace(
    'address',
    evmos.wallets[evmos.currentIndex].address,
  );
  const {
    estimateGasForEvm,
    estimateGasForEvmos,
    estimateGasForCosmos,
    estimateGasForCosmosIBC,
    estimateGasForEvmosIBC,
    estimateGasForClaimRewards,
    estiamteGasForDelgate,
    estimateGasForUndelegate,
    estimateGasForRedelgate,
    estimateGasForEvmosClaimReward,
    estimateGasForEvmosDelegate,
    estimateGasForEvmosUnDelegate,
    estimateGasForEvmosReDelegate,
  } = useGasService();
  const { signEthTransaction } = useEthSigner();
  const {
    simulateEvmosIBCTransaction,
    getPrivateKeyBuffer,
    simulateEvmosClaimReward,
    simulateEvmosDelegate,
    simulateEvmosReDelegate,
    simulateEvmosUnDelegate,
  } = useEvmosSigner();
  const { getCosmosSignerClient, getCosmosRpc } = useCosmosSigner();

  const EVMOS_TXN_ENDPOINT = evmosUrls.transact;

  async function getCosmosSigningClient(
    chain: Chain,
    rpc: string,
    signer: OfflineDirectSigner,
  ) {
    if (chain.backendName === ChainBackendNames.INJECTIVE) {
      return await InjectiveStargate.InjectiveSigningStargateClient.connectWithSigner(
        rpc,
        signer,
      );
    } else {
      return await SigningStargateClient.connectWithSigner(rpc, signer);
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
      const code = await web3.eth.getCode(toAddress);
      let { gasLimit, gasPrice, priorityFee, baseFee } =
        await estimateGasForEvm({
          web3,
          chain,
          fromAddress,
          toAddress,
          amountToSend,
          contractAddress,
          contractDecimals,
        });

      gasLimit = decideGasLimitBasedOnTypeOfToAddress(
        code,
        gasLimit,
        chain,
        contractAddress,
      );
      const tx = {
        from: ethereum.address,
        to: toAddress,
        value: web3.utils.toWei(amountToSend, 'ether').toString(),
        gas: web3.utils.toHex(gasLimit),
      };
      if (!baseFee) {
        set(tx, 'gasPrice', gasPrice);
      } else {
        set(
          tx,
          'maxPriorityFeePerGas',
          web3.utils.toWei(priorityFee.toFixed(9), 'gwei'),
        );
      }

      const hash = await signEthTransaction({
        web3,
        chain,
        transactionToBeSigned: tx,
      });
      return hash;
    } catch (err: any) {
      // TODO (user feedback): Give feedback to user.
      throw new Error(err);
    }
    // }
  };

  const sendERC20Token = async ({
    web3,
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
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

      const code = await web3.eth.getCode(toAddress);
      let { gasLimit, gasPrice } = await estimateGasForEvm({
        web3,
        chain,
        fromAddress,
        toAddress,
        amountToSend,
        contractAddress,
        contractDecimals,
      });
      gasLimit = decideGasLimitBasedOnTypeOfToAddress(
        code,
        gasLimit,
        chain,
        contractAddress,
      );

      const tx = {
        from: ethereum.address,
        to: contractAddress,
        gasPrice,
        value: '0x0',
        gas: web3.utils.toHex(gasLimit),
        data: contractData,
      };
      const hash = await signEthTransaction({
        web3,
        chain,
        transactionToBeSigned: tx,
      });
      return hash;
    } catch (err: any) {
      // TODO (user feedback): Give feedback to user.
      throw new Error(err);
    }
  };

  const sendEvmToken = async ({
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
    symbol,
  }: SendInEvmInterface): Promise<{
    isError: boolean;
    hash: string;
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
        return { hash: '', isError: true, error: error?.message ?? error };
      }
    } else {
      try {
        const hash = await sendERC20Token({
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
        return { hash: '', isError: true, error: error?.message ?? error };
      }
    }
  };

  const sendEvmosToken = async ({
    toAddress,
    amountToSend,
  }: {
    toAddress: string;
    amountToSend: string;
  }): Promise<{
    isError: boolean;
    hash: string;
    error?: any;
  }> => {
    const gasDetails = await estimateGasForEvmos({ toAddress, amountToSend });
    const simulatedTxnRequest = gasDetails.simulatedTxnRequest;
    const response = await axios.post(
      TRANSACTION_ENDPOINT,
      simulatedTxnRequest,
    );

    if (response.data.tx_response.code === 0) {
      Toast.show({
        type: 'success',
        text1: 'Transaction hash',
        text2: response.data.tx_response.txhash,
        position: 'bottom',
      });
      return { hash: response.data.tx_response.txhash, isError: false };
    } else {
      return {
        hash: '',
        isError: true,
        error: response?.data?.error?.message ?? '',
      };
    }
  };

  const sendCosmosToken = async ({
    fromChain,
    denom,
    amount,
    fromAddress,
    toAddress,
  }: {
    fromChain: Chain;
    denom: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
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

        const rpc = getCosmosRpc(backendName, true);

        const signingClient = await getCosmosSigningClient(
          fromChain,
          rpc,
          signer,
        );

        const tokenDenom = denom ?? cosmosConfig[backendName].denom;

        const contractDecimals = get(cosmosConfig, chainName).contractDecimal;
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
  }: {
    fromChain: Chain;
    toChain: Chain;
    denom: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
  }): Promise<{
    isError: boolean;
    hash: string;
    error?: any;
  }> => {
    try {
      const { chainName, backendName } = fromChain;
      const signer = await getCosmosSignerClient(chainName);

      if (signer) {
        const rpc = getCosmosRpc(backendName, true);
        const signingClient = await getCosmosSigningClient(
          fromChain,
          rpc,
          signer,
        );
        const contractDecimals = get(cosmosConfig, chainName).contractDecimal;

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

  const evmosIBC = async ({
    toAddress,
    toChain,
    amount,
    denom,
    contractDecimals,
  }: {
    toAddress: string;
    toChain: Chain;
    amount: string;
    denom: string;
    contractDecimals: number;
  }): Promise<{
    isError: boolean;
    hash: string;
    error?: any;
  }> => {
    try {
      const gasDetails = await estimateGasForEvmosIBC({
        toAddress,
        toChain,
        amount,
        denom,
        contractDecimals,
      });
      // const userAccountData = await axios.get(
      //   `${ACCOUNT_DETAILS_INFO}/${fromAddress}`,
      // );
      const userAccountData = await axios.get(ACCOUNT_DETAILS, {
        timeout: 2000,
      });

      const simulatedIBCTransferBody = simulateEvmosIBCTransaction({
        toAddress,
        toChain,
        amount,
        denom,
        contractDecimals,
        userAccountData,
        gasFee: ethers
          .parseUnits(gasDetails.gasFeeInCrypto.toString(), '18')
          .toString(), // limitDecimalPlaces(gasDetails.gasFeeInCrypto, contractDecimals),
        gasWanted: String(gasDetails.gasLimit),
      });
      const resp: any = await axios.post(
        EVMOS_TXN_ENDPOINT,
        simulatedIBCTransferBody,
      );
      if (resp.data.tx_response.code === 0) {
        return { hash: resp.data.tx_response.txhash, isError: false };
      } else if (resp.data.tx_response.code === 5) {
        return {
          hash: '',
          isError: true,
          error: resp.data.tx_response.raw_log,
        };
      }
      return {
        hash: '',
        isError: true,
        error: resp.data,
      };
    } catch (e) {
      return { hash: '', isError: true, error: e };
    }
  };

  const delegateCosmosToken = async ({
    chain,
    amount,
    validatorAddress,
  }: {
    chain: Chain;
    amount: string;
    validatorAddress: string;
  }) => {
    try {
      const { chainName, backendName } = chain;
      const signer = await getCosmosSignerClient(chainName);
      if (signer) {
        const accounts = await signer?.getAccounts();

        if (accounts) {
          const userAddress = accounts[0].address;
          const contractDecimals = get(cosmosConfig, chainName).contractDecimal;
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
            const rpc = getCosmosRpc(backendName, true);

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
  }: {
    chain: Chain;
    amount: string;
    validatorAddress: string;
  }) => {
    try {
      const { chainName, backendName } = chain;
      const signer = await getCosmosSignerClient(chainName);
      if (signer) {
        const accounts = await signer?.getAccounts();
        if (accounts) {
          const userAddress = accounts[0].address;
          const contractDecimals = get(cosmosConfig, chainName).contractDecimal;
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
            const rpc = getCosmosRpc(backendName, true);

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
            const rpc = getCosmosRpc(backendName, true);
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
  }: {
    chain: Chain;
    amount: string;
    validatorSrcAddress: string;
    validatorDstAddress: string;
  }) => {
    try {
      const { chainName, backendName } = chain;
      const signer = await getCosmosSignerClient(chainName);

      const accounts = await signer?.getAccounts();

      if (accounts) {
        const userAddress = accounts[0].address;
        if (signer) {
          const contractDecimals = get(cosmosConfig, chainName).contractDecimal;
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
            const rpc = getCosmosRpc(backendName, true);

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

  const claimEvmosRewards = async ({
    validatorAddresses,
  }: {
    validatorAddresses: string[];
  }): Promise<TransactionServiceResult | undefined> => {
    try {
      const fromAddress: string = evmos.address ?? '';
      const userAccountData = await axios.get(
        `${ACCOUNT_DETAILS_INFO}/${fromAddress}`,
      );
      const accountData = userAccountData?.data?.account.base_account;

      const privateKeyBuffer = await getPrivateKeyBuffer();

      if (privateKeyBuffer) {
        const gasFeeDetails = await estimateGasForEvmosClaimReward({
          validatorAddresses,
          privateKeyBuffer,
          accountData: {
            sequence: accountData.sequence,
            account_number: accountData.account_number,
            pub_key: {
              key: accountData.pub_key?.key,
            },
          },
        });

        if (gasFeeDetails) {
          const body = await simulateEvmosClaimReward({
            fromAddress,
            validatorAddresses,
            privateKeyBuffer,
            accountData,
            gasAmount: gasFeeDetails.gasFeeInCrypto.toString(),
            gas: String(gasFeeDetails.gasLimit),
          });

          const resp: any = await axios.post(EVMOS_TXN_ENDPOINT, body);
          if (resp.data.tx_response.code === 0) {
            return { hash: resp.data.tx_response.txhash, isError: false };
          } else if (resp.data.tx_response.code === 5) {
            return {
              isError: true,
              error: resp.data.tx_response.raw_log,
            };
          }
          return {
            isError: true,
            error: resp.data,
          };
        } else {
          return {
            isError: true,
            error: 'Unable to calculate gas',
          };
        }
      } else {
        return {
          isError: true,
          error: 'Unable to fetch private key',
        };
      }
    } catch (e) {
      return {
        isError: true,
        error: e,
      };
    }
  };

  const delegateEvmosToken = async ({
    validatorAddress,
    amountToDelegate,
  }: {
    validatorAddress: string;
    amountToDelegate: string;
  }): Promise<TransactionServiceResult | undefined> => {
    try {
      const fromAddress: string = evmos.address ?? '';
      const userAccountData = await axios.get(
        `${ACCOUNT_DETAILS_INFO}/${fromAddress}`,
      );
      const accountData = userAccountData?.data?.account.base_account;

      const privateKeyBuffer = await getPrivateKeyBuffer();

      if (privateKeyBuffer) {
        const gasFeeDetails = await estimateGasForEvmosDelegate({
          validatorAddress,
          privateKeyBuffer,
          amountToDelegate,
          accountData: {
            sequence: accountData.sequence,
            account_number: accountData.account_number,
            pub_key: {
              key: accountData.pub_key?.key,
            },
          },
        });

        const parsedAmount = ethers.parseUnits(amountToDelegate, 18).toString();

        if (gasFeeDetails) {
          const body = await simulateEvmosDelegate({
            fromAddress,
            validatorAddress,
            amountToDelegate: parsedAmount,
            privateKeyBuffer,
            accountData,
            gasAmount: gasFeeDetails.gasFeeInCrypto.toString(),
            gas: String(gasFeeDetails.gasLimit),
          });

          const resp: any = await axios.post(EVMOS_TXN_ENDPOINT, body);
          if (resp.data.tx_response.code === 0) {
            return { hash: resp.data.tx_response.txhash, isError: false };
          } else if (resp.data.tx_response.code === 5) {
            return {
              isError: true,
              error: resp.data.tx_response.raw_log,
            };
          }
          return {
            isError: true,
            error: resp.data,
          };
        } else {
          return {
            isError: true,
            error: 'Unable to calculate gas',
          };
        }
      } else {
        return {
          isError: true,
          error: 'Unable to fetch private key',
        };
      }
    } catch (e) {
      return {
        isError: true,
        error: e,
      };
    }
  };

  const reDelegateEvmosToken = async ({
    validatorSrcAddress,
    validatorDstAddress,
    amountToReDelegate,
  }: {
    validatorSrcAddress: string;
    validatorDstAddress: string;
    amountToReDelegate: string;
  }): Promise<TransactionServiceResult | undefined> => {
    try {
      const fromAddress: string = evmos.address ?? '';
      const userAccountData = await axios.get(
        `${ACCOUNT_DETAILS_INFO}/${fromAddress}`,
      );
      const accountData = userAccountData?.data?.account.base_account;

      const privateKeyBuffer = await getPrivateKeyBuffer();

      const parsedAmount = ethers.parseUnits(amountToReDelegate, 18).toString();

      if (privateKeyBuffer) {
        const gasFeeDetails = await estimateGasForEvmosReDelegate({
          validatorSrcAddress,
          validatorDstAddress,
          amountToReDelegate,
          privateKeyBuffer,
          accountData: {
            sequence: accountData.sequence,
            account_number: accountData.account_number,
            pub_key: {
              key: accountData.pub_key?.key,
            },
          },
        });

        if (gasFeeDetails) {
          const body = await simulateEvmosReDelegate({
            fromAddress,
            validatorSrcAddress,
            validatorDstAddress,
            amountToReDelegate: parsedAmount,
            privateKeyBuffer,
            accountData,
            gasAmount: gasFeeDetails.gasFeeInCrypto.toString(),
            gas: String(gasFeeDetails.gasLimit),
          });

          const resp: any = await axios.post(EVMOS_TXN_ENDPOINT, body);
          if (resp.data.tx_response.code === 0) {
            return { hash: resp.data.tx_response.txhash, isError: false };
          } else if (resp.data.tx_response.code === 5) {
            return {
              isError: true,
              error: resp.data.tx_response.raw_log,
            };
          }
          return {
            isError: true,
            error: resp.data,
          };
        } else {
          return {
            isError: true,
            error: 'Unable to calculate gas',
          };
        }
      } else {
        return {
          isError: true,
          error: 'Unable to fetch private key',
        };
      }
    } catch (e) {
      return {
        isError: true,
        error: e,
      };
    }
  };

  const unDelegateEvmosToken = async ({
    validatorAddress,
    amountToUnDelegate,
  }: {
    validatorAddress: string;
    amountToUnDelegate: string;
  }): Promise<TransactionServiceResult | undefined> => {
    try {
      const fromAddress: string = evmos.address ?? '';
      const userAccountData = await axios.get(
        `${ACCOUNT_DETAILS_INFO}/${fromAddress}`,
      );
      const accountData = userAccountData?.data?.account.base_account;

      const privateKeyBuffer = await getPrivateKeyBuffer();

      const parsedAmount = ethers.parseUnits(amountToUnDelegate, 18).toString();

      if (privateKeyBuffer) {
        const gasFeeDetails = await estimateGasForEvmosUnDelegate({
          validatorAddress,
          privateKeyBuffer,
          amountToUnDelegate,
          accountData: {
            sequence: accountData.sequence,
            account_number: accountData.account_number,
            pub_key: {
              key: accountData.pub_key?.key,
            },
          },
        });

        if (gasFeeDetails) {
          const body = await simulateEvmosUnDelegate({
            fromAddress,
            validatorAddress,
            amountToUnDelegate: parsedAmount,
            privateKeyBuffer,
            accountData,
            gasAmount: gasFeeDetails.gasFeeInCrypto.toString(),
            gas: String(gasFeeDetails.gasLimit),
          });

          const resp: any = await axios.post(EVMOS_TXN_ENDPOINT, body);
          if (resp.data.tx_response.code === 0) {
            return { hash: resp.data.tx_response.txhash, isError: false };
          } else if (resp.data.tx_response.code === 5) {
            return {
              isError: true,
              error: resp.data.tx_response.raw_log,
            };
          }
          return {
            isError: true,
            error: resp.data,
          };
        } else {
          return {
            isError: true,
            error: 'Unable to calculate gas',
          };
        }
      } else {
        return {
          isError: true,
          error: 'Unable to fetch private key',
        };
      }
    } catch (e) {
      return {
        isError: true,
        error: e,
      };
    }
  };

  return {
    sendEvmToken,
    sendEvmosToken,
    sendCosmosToken,
    interCosmosIBC,
    evmosIBC,
    delegateCosmosToken,
    unDelegateCosmosToken,
    claimCosmosReward,
    reDelegateCosmosToken,
    claimEvmosRewards,
    delegateEvmosToken,
    reDelegateEvmosToken,
    unDelegateEvmosToken,
  };
}
