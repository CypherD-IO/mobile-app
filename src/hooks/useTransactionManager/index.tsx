import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import {
  Coin,
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { InjectiveStargate } from '@injectivelabs/sdk-ts';
import * as Sentry from '@sentry/react-native';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import { ceil, get, map, set } from 'lodash';
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
import { decideGasLimitBasedOnTypeOfToAddress } from '../../core/NativeTransactionHandler';
import { GlobalContext } from '../../core/globalContext';
import {
  HdWalletContext,
  getTimeOutTime,
  getWeb3Endpoint,
  limitDecimalPlaces,
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
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import useSolanaSigner from '../useSolana';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from '@solana/spl-token';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';

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
  const hdWallet = useContext<any>(HdWalletContext);

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
      const code = await web3.eth.getCode(toAddress);
      let { gasLimit, gasPrice, priorityFee, isEIP1599Supported } =
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
      if (!isEIP1599Supported) {
        set(tx, 'gasPrice', gasPrice);
      } else {
        set(
          tx,
          'maxPriorityFeePerGas',
          web3.utils.toWei(priorityFee.toFixed(9), 'gwei'),
        );
      }
      console.log('tx : ', tx);
      const hash = await signEthTransaction({
        web3,
        sendChain: chain,
        transactionToBeSigned: tx,
      });
      console.log('hash : ', hash);
      return hash;
    } catch (err: any) {
      console.log('inside catch Error in sendNativeToken : ', err);
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

      const code = await web3.eth.getCode(toAddress);

      let { gasLimit, gasPrice, priorityFee, isEIP1599Supported } =
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

      gasLimit = decideGasLimitBasedOnTypeOfToAddress(
        code,
        gasLimit,
        chain,
        contractAddress,
      );

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
          web3.utils.toWei(priorityFee.toFixed(9), 'gwei'),
        );
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
        console.log('Error in sendNativeToken : ', error);
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

        const rpc = getCosmosRpc(backendName);

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
          let gasPrice = gasFeeResponse.gasPrice;
          if (gasPrice > 1) {
            gasPrice = Math.floor(gasPrice);
          }
          const tx = {
            from: ethereum.address,
            to: fromTokenContractAddress,
            gasPrice: web3.utils.toWei(String(gasPrice.toFixed(9)), 'gwei'),
            value: '0x0',
            gas: web3.utils.toHex(String(gasLimit)),
            data: contractData,
            contractParams,
          };

          const hash = await signApprovalEthereum({
            web3,
            sendChain: chainDetails?.backendName,
            dataToSign: tx,
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
          const tokenAmount = String(Number(ceil(amount)));
          const allowance = response;
          if (
            overrideAllowanceCheck ||
            Number(tokenAmount) > Number(allowance)
          ) {
            const tokens = Number(ceil(amount)).toString();
            const resp = contract.methods
              .approve(routerAddress, tokens)
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
              gasLimit,
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
        const grantMsg = {
          typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
          value: {
            granter,
            grantee,
            grant: {
              authorization: {
                typeUrl: '/cosmos.bank.v1beta1.SendAuthorization',
                value: SendAuthorization.encode(
                  SendAuthorization.fromPartial({
                    spendLimit: [
                      {
                        denom,
                        amount: ethers
                          .parseUnits(
                            limitDecimalPlaces(amount, contractDecimal),
                            contractDecimal,
                          )
                          .toString(),
                      },
                    ],
                    allowList,
                  }),
                ).finish(),
              },
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
          const gasFee = simulation * 2.5 * gasPrice;
          const fee = {
            gas: Math.floor(simulation * 2.5).toString(),
            amount: [
              {
                denom,
                amount: Math.floor(gasFee).toString(),
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
        const revokeMsg = {
          typeUrl: '/cosmos.authz.v1beta1.MsgRevoke',
          value: MsgRevoke.fromPartial({
            granter,
            grantee,
            msgTypeUrl: '/cosmos.bank.v1beta1.MsgSend',
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
          const gasFee = simulation * 2.5 * gasPrice;
          const fee = {
            gas: Math.floor(simulation * 2.5).toString(),
            amount: [
              {
                denom,
                amount: Math.floor(gasFee).toString(),
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
            chainId: fromToken?.chainId,
            value: isNative ? contractData?.value : '0x0',
            to: routerAddress,
            data: contractData.data,
            gas: web3.utils.toHex(2 * Number(gasLimit)),
            gasPrice: web3.utils.toWei(
              String(gasFeeResponse.gasPrice.toFixed(9)),
              'gwei',
            ),
          };
          const hash = await signEthTransaction({
            web3,
            sendChain: chainDetails,
            transactionToBeSigned: tx,
          });
          resolve({ isError: false, receipt: hash });
        } catch (e: any) {
          reject(e);
        }
      })();
    });
  };

  const simulateSolanaTxn = async ({
    connection,
    fromPublickey,
    toPublicKey,
    amountToSend,
  }: {
    connection: Connection;
    fromPublickey: PublicKey;
    toPublicKey: PublicKey;
    amountToSend: number;
  }) => {
    const { blockhash } = await connection.getLatestBlockhash();
    const transactionMessage = new TransactionMessage({
      payerKey: fromPublickey,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: fromPublickey,
          toPubkey: toPublicKey,
          lamports: amountToSend,
        }),
      ],
      recentBlockhash: blockhash,
    }).compileToV0Message();

    const transferTransaction = new VersionedTransaction(transactionMessage);

    const { value: simulationResult } = await connection.simulateTransaction(
      transferTransaction,
      {
        replaceRecentBlockhash: true,
      },
    );
    if (simulationResult.err) {
      throw new Error(String(simulationResult.err));
    } else {
      return simulationResult.unitsConsumed;
    }
  };

  const sendSOLTokens = async ({
    amountToSend,
    toAddress,
  }: {
    amountToSend: string;
    toAddress: string;
  }) => {
    const solanRpc = getSolanaRpc();
    const fromKeypair = await getSolanWallet();
    const toPublicKey = new PublicKey(toAddress);
    if (fromKeypair) {
      const connection = new Connection(solanRpc, 'confirmed');

      const lamportsToSend = parseFloat(amountToSend) * LAMPORTS_PER_SOL;

      const fees = await connection.getRecentPrioritizationFees();

      // 1 prioritizationFee = 0.000001 lamport, add 100000000 = 0.00001sol in case wanted
      const totalFees = fees.reduce(
        (sum, fee) => sum + fee.prioritizationFee,
        0,
      );
      const avgPriorityFee = ceil(totalFees / fees.length);

      // const simulation = await simulateSolanaTxn({
      //   connection,
      //   fromPublickey: fromKeypair.publicKey,
      //   toPublicKey,
      //   amountToSend: lamportsToSend,
      // });

      const transaction = new Transaction();

      // transaction.add(
      //   ComputeBudgetProgram.setComputeUnitLimit({
      //     units: simulation ?? 0,
      //   }),
      // );

      // transaction.add(
      //   ComputeBudgetProgram.setComputeUnitPrice({
      //     microLamports: avgPriorityFee,
      //   }),
      // );

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: lamportsToSend,
        }),
      );

      const resp = await sendAndConfirmTransaction(connection, transaction, [
        fromKeypair,
      ]);

      return { hash: String(resp), isError: false };
    } else {
      // throw new Error('Unable to create user wallet');
      return {
        isError: true,
        error: 'Unable to create user wallet',
        hash: '',
      };
    }
  };

  const sendSPLTokens = async ({
    amountToSend,
    toAddress,
    mintAddress,
    contractDecimals = 9,
  }: {
    amountToSend: string;
    toAddress: string;
    mintAddress: string;
    contractDecimals: number;
  }) => {
    const solanRpc = getSolanaRpc();
    const fromKeypair = await getSolanWallet();
    const toPublicKey = new PublicKey(toAddress);
    const mintPublicKey = new PublicKey(mintAddress);
    if (fromKeypair) {
      const connection = new Connection(solanRpc, 'confirmed');

      const lamportsToSend = ethers
        .parseUnits(amountToSend, contractDecimals)
        .toString();

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

      const fees = await connection.getRecentPrioritizationFees();

      const totalFees =
        fees.reduce((sum, fee) => sum + fee.prioritizationFee, 0) + 100000000; // 1 prioritizationFee = 0.000001 lamport, add 100000000 = 0.00001sol in case wanted
      const avgPriorityFee = totalFees / fees.length;

      // const simulation = await simulateSolanaTxn({
      //   connection,
      //   fromPublickey: fromKeypair.publicKey,
      //   toPublicKey,
      //   amountToSend: parseInt(lamportsToSend, 10),
      // });

      const transaction = new Transaction();

      // transaction.add(
      //   ComputeBudgetProgram.setComputeUnitPrice({
      //     microLamports: avgPriorityFee,
      //   }),
      // );

      // transaction.add(
      //   ComputeBudgetProgram.setComputeUnitLimit({
      //     units: simulation ?? 0 + 10000,
      //   }),
      // );

      transaction.add(
        createTransferInstruction(
          fromTokenAccount.address,
          toTokenAccount.address,
          fromKeypair.publicKey,
          parseInt(lamportsToSend, 10),
        ),
      );

      const resp = await sendAndConfirmTransaction(connection, transaction, [
        fromKeypair,
      ]);
      return {
        isError: false,
        hash: resp,
      };
    } else {
      return {
        isError: true,
        error: 'Unable to create user wallet',
        hash: '',
      };
    }
  };

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
      if (contractAddress === 'solana-native') {
        return await sendSOLTokens({ amountToSend, toAddress });
      } else {
        return await sendSPLTokens({
          amountToSend,
          toAddress,
          mintAddress: contractAddress,
          contractDecimals,
        });
      }
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
