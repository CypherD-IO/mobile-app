import { ethers } from 'ethers';
import {
  CAN_ESTIMATE_L1_FEE_CHAINS,
  CHAIN_BSC,
  CHAIN_ETH,
  CHAIN_OPTIMISM,
  Chain,
  ChainBackendNames,
  GASLESS_CHAINS,
  OP_ETH_ADDRESS,
  OP_STACK_ENUMS,
} from '../../constants/server';
import useAxios from '../../core/HttpRequest';
import Web3 from 'web3';
import { removeOutliers } from '../../misc/outliers';
import { GasPriceDetail } from '../../core/types';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { EvmGasInterface } from '../../models/evmGas.interface';
import { cosmosConfig } from '../../constants/cosmosConfig';
import buildUnserializedTransaction, {
  getTimeOutTime,
  logAnalytics,
  parseErrorMessage,
} from '../../core/util';
import useCosmosSigner from '../useCosmosSigner';
import {
  Coin,
  MsgSendEncodeObject,
  SigningStargateClient,
  defaultRegistryTypes,
  StargateClient,
} from '@cosmjs/stargate';
import { ceil, get, max } from 'lodash';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import Long from 'long';
import { InjectiveSigningStargateClient } from '@injectivelabs/sdk-ts/dist/cjs/exports';
import {
  DirectSecp256k1HdWallet,
  GeneratedType,
  OfflineDirectSigner,
  Registry,
} from '@cosmjs/proto-signing';
import { IReward } from '../../reducers/cosmosStakingReducer';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import useSolanaSigner from '../useSolana';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import usePortfolio from '../usePortfolio';
import { DecimalHelper } from '../../utils/decimalHelper';
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { AnalyticsType } from '../../constants/enum';
import { gasFeeReservation } from '../../constants/data';
import { decideGasLimitBasedOnTypeOfToAddress } from '../useWeb3/util';
import { addresses, abis } from '@eth-optimism/contracts-ts';
import { bytesToHex } from 'viem';
import { TokenMeta } from '../../models/tokenMetaData.model';

export interface GasServiceResult {
  gasFeeInCrypto: string;
  gasLimit: string;
  gasPrice: number;
  fee: {
    gas: string;
    amount: Array<{
      denom: string;
      amount: string;
    }>;
  };
}

const wasmTypes: Array<[string, GeneratedType]> = [
  ['/cosmwasm.wasm.v1.MsgExecuteContract', MsgExecuteContract],
];

const registry = new Registry([...defaultRegistryTypes, ...wasmTypes]);

interface EvmContractData {
  chain_id: string;
  data: string;
  required_erc20_approvals: Array<{
    amount: string;
    spender: string;
    token_contract: string;
  }>;
  signer_address: string;
  to: string;
  value: string;
}

export default function useGasService() {
  const { getWithoutAuth } = useAxios();
  const minimumGasFee = '20';
  const { getCosmosRpc } = useCosmosSigner();
  const { getSolanaRpc } = useSolanaSigner();
  const { getNativeToken } = usePortfolio();

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
      return await SigningStargateClient.connectWithSigner(rpc, signer);
    }
  }

  async function getGasPriceLocallyUsingGasHistory(
    chain: ChainBackendNames,
    web3RPCEndpoint: Web3,
  ): Promise<GasPriceDetail> {
    const lastNBlocks = 5;
    try {
      const response = await getWithoutAuth(`/v1/prices/native/${chain}`);
      if (!response.isError) {
        const tokenPrice = response.data;
        const gasHistory = await web3RPCEndpoint.eth.getFeeHistory(
          lastNBlocks,
          'latest',
          [70, 75, 80, 85, 90, 95, 98],
        );
        // get the above percentiles and remove the outliers and take the max value.
        const { reward } = gasHistory;
        const percentileArr: number[] = [];
        reward.forEach(element => {
          percentileArr.push(
            ...element.map(percentile =>
              Number.parseFloat(
                Web3.utils.fromWei(percentile, 'gwei') || minimumGasFee,
              ),
            ),
          );
        });
        const afterRemovingOutliers = removeOutliers(percentileArr); // will return the sorted array
        void analytics().logEvent('gas_optimisation', {
          after: afterRemovingOutliers,
          b4: percentileArr,
          chain,
        });
        let percentileGasFee = afterRemovingOutliers.at(
          afterRemovingOutliers.length - 1,
        ); // since its sorted, take the last element.

        // since the gas fee is 0 in evmos, setting it to minimum of 20
        percentileGasFee = percentileGasFee === 0 ? 20 : percentileGasFee;

        if (percentileGasFee) {
          const gasDetail = {
            gasPrice: percentileGasFee,
            tokenPrice: tokenPrice.data.usd,
            chainId: chain,
          };
          return gasDetail;
        }
        throw new Error(`Gas fee local calculation failed for ${chain}`);
      } else {
        throw response.error;
      }
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  async function getGasPrice(chain: ChainBackendNames, web3RPCEndpoint: Web3) {
    const response = await getWithoutAuth(`/v1/prices/gas/${chain}`);
    if (!response.isError) {
      return response.data;
    } else {
      if (
        ![
          CHAIN_ETH.backendName,
          CHAIN_OPTIMISM.backendName,
          CHAIN_BSC.backendName,
        ].includes(chain)
      ) {
        try {
          const gasPrice = await getGasPriceLocallyUsingGasHistory(
            chain,
            web3RPCEndpoint,
          );
          return gasPrice;
        } catch (e) {
          Sentry.captureException(e);
        }
      }
    }
    return { chainId: chain, gasPrice: 0, tokenPrice: 0 };
  }

  const estimateGasForEvm = async ({
    web3,
    chain,
    fromAddress,
    toAddress,
    amountToSend,
    contractAddress,
    contractDecimals,
    contractData: contractDataUser,
  }: EvmGasInterface) => {
    // How many tokens? -- Use BigNumber everywhere
    const numberOfTokens = ethers.parseUnits(amountToSend, contractDecimals);
    // Form the contract and contract data
    const contract = new web3.eth.Contract(
      [
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
      ],
      contractAddress,
    );
    const contractData = contract.methods
      .transfer(toAddress, numberOfTokens)
      .encodeABI();
    try {
      const gasPriceDetail = await getGasPrice(chain, web3);
      let gasLimit: bigint | number = await web3.eth.estimateGas({
        from: fromAddress,
        // For Optimism the ETH token has different contract address
        to:
          contractAddress?.toLowerCase() === OP_ETH_ADDRESS
            ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            : contractAddress,
        value: '0x0',
        data: contractDataUser ?? contractData,
      });
      const code = await web3.eth.getCode(contractAddress);

      gasLimit = decideGasLimitBasedOnTypeOfToAddress(
        code,
        Number(gasLimit),
        chain,
        contractAddress,
      );

      if (gasLimit) {
        // Determine final gas price based on EIP-1559 support
        const finalGasPrice = gasPriceDetail.isEIP1599Supported
          ? gasPriceDetail.maxFee // Use maxFee for EIP-1559
          : gasPriceDetail.gasPrice; // Use regular gasPrice for legacy

        let gasFeeInCrypto = '0';

        if (finalGasPrice) {
          gasFeeInCrypto = web3.utils.fromWei(
            web3.utils.toWei(
              DecimalHelper.toString(
                DecimalHelper.multiply(finalGasPrice, gasLimit),
                9,
              ),
              'gwei',
            ),
            'ether',
          );

          const hexGasPrice = web3.utils.toHex(
            web3.utils.toBigInt(
              web3.utils.toWei(
                DecimalHelper.toString(finalGasPrice, 9),
                'gwei',
              ),
            ),
          );

          return {
            gasFeeInCrypto,
            gasLimit,
            gasPrice: hexGasPrice,
            isEIP1599Supported: get(
              gasPriceDetail,
              'isEIP1599Supported',
              false,
            ),
            priorityFee: get(gasPriceDetail, 'priorityFee', 0),
            baseFee: get(gasPriceDetail, 'baseFee', 0),
            maxFee: get(gasPriceDetail, 'maxFee', 0),
          };
        }
      }
    } catch (error) {
      Sentry.captureException(error);
    }
    return { gasFeeInCrypto: 0, gasLimit: 0, gasPrice: 0 }; // fallback
  };

  const estimateGasForCosmosCustomContract = async (
    chain: Chain,
    signer: OfflineDirectSigner,
    cosmosData: {
      chain_id: string;
      msgs: Array<{
        msg: string;
        msg_type_url: string;
      }>;
      path: string[];
      signer_address: string;
    },
    signerAddress: string,
  ) => {
    const { chainName, backendName } = chain;
    if (signer) {
      const rpc = getCosmosRpc(backendName as ChainBackendNames);

      // Create signing client with the custom registry
      const signingClient = await SigningStargateClient.connectWithSigner(
        rpc,
        signer,
        { registry },
      );

      // Parse the message string into an object
      const messages = cosmosData.msgs.map(msgData => {
        const parsedMsg = JSON.parse(msgData.msg);
        return {
          typeUrl: msgData.msg_type_url,
          value: {
            sender: parsedMsg.sender,
            contract: parsedMsg.contract,
            msg: Buffer.from(JSON.stringify(parsedMsg.msg)).toString('base64'),
            funds: parsedMsg.funds,
          },
        };
      });

      const simulation = await signingClient.simulate(
        signerAddress,
        messages,
        '',
      );

      const nativeToken = await getNativeToken(
        backendName as ChainBackendNames,
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = DecimalHelper.multiply(simulation, [1.8, gasPrice]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, nativeToken.contractDecimals),
        6,
      );
      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom: nativeToken?.denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : gasFee.floor().toString(),
          },
        ],
      };
      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
  };

  const estimateGasForCosmosRest = async ({
    chain,
    denom,
    amount,
    fromAddress,
    toAddress,
  }: {
    chain: Chain;
    denom: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
  }): Promise<GasServiceResult | undefined> => {
    const { chainName, backendName } = chain;
    const restEndpoint = cosmosConfig[chainName].rest;
    const contractDecimal = get(cosmosConfig, chainName).contractDecimal;
    const nativeToken = await getNativeToken(backendName as ChainBackendNames);
    try {
      // First, fetch the account sequence
      const accountResponse = await fetch(
        `${restEndpoint}/cosmos/auth/v1beta1/accounts/${fromAddress}`,
      );
      const accountData = await accountResponse.json();
      const sequence = accountData.account?.sequence || '0';

      const amountToSend = ethers
        .parseUnits(amount, contractDecimal)
        .toString();

      const response = await fetch(
        `${restEndpoint}/cosmos/tx/v1beta1/simulate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tx: {
              body: {
                messages: [
                  {
                    '@type': '/cosmos.bank.v1beta1.MsgSend',
                    from_address: fromAddress,
                    to_address: toAddress,
                    amount: [
                      {
                        denom,
                        amount: amountToSend,
                      },
                    ],
                  },
                ],
                memo: '',
                timeout_height: '0',
                extension_options: [],
                non_critical_extension_options: [],
              },
              auth_info: {
                signer_infos: [
                  {
                    public_key: {
                      '@type': '/cosmos.crypto.secp256k1.PubKey',
                      key: 'A' + '0'.repeat(43),
                    },
                    mode_info: {
                      single: {
                        mode: 'SIGN_MODE_DIRECT',
                      },
                    },
                    sequence, // Use the fetched sequence
                  },
                ],
                fee: {
                  amount: [],
                  gas_limit: '200000',
                },
              },
              signatures: ['A' + '0'.repeat(127)],
            },
          }),
        },
      );

      const result = await response.json();

      // Extract gas used from either successful response or error message

      // if (result.code) {
      //   // Try to extract gas used from error message
      //   const gasMatch = result.message.match(/gas used: '(\d+)'/);
      //   if (gasMatch && gasMatch[1]) {
      //     gasEstimate = parseInt(gasMatch[1]);
      //   } else {
      //     throw new Error('Could not extract gas estimate from response');
      //   }
      // } else {
      //   if (!result.gas_info?.gas_used) {
      //     throw new Error('No gas estimate in response');
      //   }
      //   gasEstimate = parseInt(result.gas_info.gas_used);
      // }

      if (!result.gas_info?.gas_used) {
        throw new Error('No gas estimate in response');
      }
      const gasEstimate = result.gas_info.gas_used;

      // const gasEstimate = parseInt(result.gas_info.gas_used);

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = DecimalHelper.multiply(gasEstimate, [1.8, gasPrice]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, nativeToken.contractDecimals),
        6,
      );

      const fee = {
        gas: Math.floor(gasEstimate * 1.8).toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : gasFee.floor().toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    } catch (error) {
      console.error('Gas estimation error:', error);
      logAnalytics({
        type: AnalyticsType.ERROR,
        chain: backendName,
        message:
          parseErrorMessage(error) +
          `.Error in Gas fee estimation using REST endpoint ${restEndpoint}. Falling back to use costant gas fee estimate`,
        screen: 'estimateGasForCosmosRest',
        other: {
          token: denom,
          amount: amount,
          fromAddress: fromAddress,
          toAddress: toAddress,
          nativeTokenBalance: nativeToken.balanceDecimal,
          nativeTokenSymbol: nativeToken.symbol,
        },
      });

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = '200000';
      const gasFeeInCrypto = gasFeeReservation[backendName].toString();

      const fee = {
        gas: gasFee.toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : gasFee.toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
  };

  const estimateGasForCosmos = async ({
    chain,
    denom,
    amount,
    fromAddress,
    toAddress,
    signer,
  }: {
    chain: Chain;
    denom: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
    signer: OfflineDirectSigner;
  }): Promise<GasServiceResult | undefined> => {
    const { chainName, backendName, symbol } = chain;
    if (signer) {
      const rpc = getCosmosRpc(backendName as ChainBackendNames);
      const signingClient = await getCosmosSigningClient(chain, rpc, signer);
      const contractDecimal = get(cosmosConfig, chainName).contractDecimal;
      const amountToSend = ethers
        .parseUnits(amount, contractDecimal)
        .toString();

      // transaction gas fee calculation
      const sendMsg: MsgSendEncodeObject = {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress,
          toAddress,
          amount: [
            {
              denom,
              amount: amountToSend,
            },
          ],
        },
      };
      const simulation = await signingClient.simulate(
        fromAddress,
        [sendMsg],
        '',
      );
      const nativeToken = await getNativeToken(
        backendName as ChainBackendNames,
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = DecimalHelper.multiply(simulation, [1.8, gasPrice]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, nativeToken.contractDecimals),
        6,
      );
      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : gasFee.floor().toString(),
          },
        ],
      };
      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
  };

  const estimateGasForCosmosIBC = async ({
    fromChain,
    toChain,
    denom,
    amount,
    fromAddress,
    toAddress,
    signer,
  }: {
    fromChain: Chain;
    toChain: Chain;
    denom: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
    signer: OfflineDirectSigner;
  }): Promise<GasServiceResult | undefined> => {
    const { chainName, backendName, symbol } = fromChain;
    const rpc = getCosmosRpc(backendName as ChainBackendNames);
    if (signer) {
      const signingClient = await getCosmosSigningClient(
        fromChain,
        rpc,
        signer,
      );

      const contractDecimal = get(cosmosConfig, chainName).contractDecimal;
      const amountToSend = ethers
        .parseUnits(amount, contractDecimal)
        .toString();
      const transferAmount: Coin = {
        denom,
        amount: amountToSend.toString(),
      };

      const sourceChannel =
        cosmosConfig[chainName].channel[toChain.chainName.toLowerCase()];

      const timeOut: any = getTimeOutTime();

      // transaction gas fee calculation
      const transferMsg: MsgTransferEncodeObject = {
        typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
        value: MsgTransfer.fromPartial({
          sourcePort: 'transfer',
          sourceChannel,
          sender: fromAddress,
          receiver: toAddress,
          token: transferAmount,
          timeoutHeight: {
            revisionHeight: Long.fromNumber(123),
            revisionNumber: Long.fromNumber(456),
          },
          timeoutTimestamp: timeOut,
        }),
      };
      const simulation = await signingClient.simulate(
        fromAddress,
        [transferMsg],
        '',
      );

      const nativeToken = await getNativeToken(
        backendName as ChainBackendNames,
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;

      const gasFee = DecimalHelper.multiply(simulation, [gasPrice, 1.8]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, nativeToken.contractDecimals),
        6,
      );

      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : Math.floor(gasFee).toString(),
          },
        ],
      };
      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
  };

  const estimateGasForCosmosIBCRest = async ({
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
  }): Promise<GasServiceResult | undefined> => {
    const { chainName, backendName } = fromChain;

    const restEndpoint = cosmosConfig[chainName].rest;
    const contractDecimal = get(cosmosConfig, chainName).contractDecimal;

    const nativeToken = await getNativeToken(backendName as ChainBackendNames);
    try {
      // Get account details for sequence
      const accountResponse = await fetch(
        `${restEndpoint}/cosmos/auth/v1beta1/accounts/${fromAddress}`,
      );
      const accountData = await accountResponse.json();
      const sequence = accountData.account?.sequence || '0';

      const amountToSend = ethers
        .parseUnits(amount, contractDecimal)
        .toString();

      const sourceChannel =
        cosmosConfig[chainName].channel[toChain.chainName.toLowerCase()];
      const timeOut = getTimeOutTime().toString();

      const transferMsg = {
        '@type': '/ibc.applications.transfer.v1.MsgTransfer',
        source_port: 'transfer',
        source_channel: sourceChannel,
        token: {
          denom,
          amount: amountToSend,
        },
        sender: fromAddress,
        receiver: toAddress,
        timeout_height: {
          revision_number: '123',
          revision_height: '456',
        },
        timeout_timestamp: timeOut,
      };

      const response = await fetch(
        `${restEndpoint}/cosmos/tx/v1beta1/simulate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tx: {
              body: {
                messages: [transferMsg],
                memo: '',
                timeout_height: '0',
                extension_options: [],
                non_critical_extension_options: [],
              },
              auth_info: {
                signer_infos: [
                  {
                    public_key: {
                      '@type': '/cosmos.crypto.secp256k1.PubKey',
                      key: 'A' + '0'.repeat(43),
                    },
                    mode_info: {
                      single: {
                        mode: 'SIGN_MODE_DIRECT',
                      },
                    },
                    sequence,
                  },
                ],
                fee: {
                  amount: [],
                  gas_limit: '200000',
                },
              },
              signatures: ['A' + '0'.repeat(127)],
            },
          }),
        },
      );

      const result = await response.json();

      if (result.code) {
        throw new Error(result.message || 'Simulation failed');
      }

      const gasEstimate = result.gas_info?.gas_used;
      if (!gasEstimate) {
        throw new Error('No gas estimate in response');
      }

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = DecimalHelper.multiply(gasEstimate, [1.8, gasPrice]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, nativeToken.contractDecimals),
        6,
      );

      const fee = {
        gas: gasFee.floor().toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : gasFee.floor().toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    } catch (error) {
      console.error('Gas estimation error in cosmosIBCRest:', error);
      console.error('Gas estimation error:', error);
      logAnalytics({
        type: AnalyticsType.ERROR,
        chain: backendName,
        message:
          parseErrorMessage(error) +
          `.Error in Gas fee estimation using REST endpoint ${restEndpoint}. Falling back to use costant gas fee estimate`,
        screen: 'estimateGasForCosmosIBCRest',
        other: {
          token: denom,
          amount: amount,
          fromAddress: fromAddress,
          toAddress: toAddress,
          nativeTokenBalance: nativeToken.balanceDecimal,
          nativeTokenSymbol: nativeToken.symbol,
        },
      });

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = '200000';
      const gasFeeInCrypto = gasFeeReservation[backendName].toString();

      const fee = {
        gas: gasFee.toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : gasFee.toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
  };

  const estimateGasForClaimRewards = async ({
    chain,
    userAddress,
    denom,
    signer,
    rewardList,
  }: {
    chain: Chain;
    userAddress: string;
    denom: string;
    signer: OfflineDirectSigner;
    rewardList: IReward[];
  }): Promise<GasServiceResult | undefined> => {
    const { chainName, backendName } = chain;
    if (signer) {
      const rpc = getCosmosRpc(backendName as ChainBackendNames);
      const contractDecimal = get(cosmosConfig, chainName).contractDecimal;

      const msgList: Array<{
        typeUrl: string;
        value: { delegatorAddress: string; validatorAddress: string };
      }> = [];
      rewardList.forEach(item => {
        const msg = {
          typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
          value: {
            delegatorAddress: userAddress,
            validatorAddress: item.validatorAddress,
          },
        };
        msgList.push(msg);
      });

      const signingClient = await getCosmosSigningClient(chain, rpc, signer);

      const simulation = await signingClient.simulate(
        userAddress,
        msgList,
        'Cypher claim rewards',
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;

      const gasFee = DecimalHelper.multiply(simulation, [gasPrice, 1.8]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, contractDecimal),
        6,
      );

      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom,
            amount: Math.floor(gasFee).toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
    return undefined;
  };

  const estiamteGasForDelgate = async ({
    chain,
    amountToDelegate,
    userAddress,
    validatorAddress,
    denom,
    signer,
  }: {
    chain: Chain;
    amountToDelegate: string;
    userAddress: string;
    validatorAddress: string;
    denom: string;
    signer: OfflineDirectSigner;
  }): Promise<GasServiceResult | undefined> => {
    const { chainName, backendName } = chain;
    if (signer) {
      const contractDecimal = get(cosmosConfig, chainName).contractDecimal;
      const parsedAmount = ethers
        .parseUnits(amountToDelegate, contractDecimal)
        .toString();

      const rpc = getCosmosRpc(backendName as ChainBackendNames);
      const signingClient = await getCosmosSigningClient(chain, rpc, signer);

      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: {
          delegatorAddress: userAddress,
          validatorAddress,
          amount: {
            denom,
            amount: parsedAmount,
          },
        },
      };

      const simulation = await signingClient.simulate(
        userAddress,
        [msg],
        'Cypher delegation',
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;

      const gasFee = DecimalHelper.multiply(simulation, [gasPrice, 1.8]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, contractDecimal),
        6,
      );

      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom,
            amount: Math.floor(gasFee).toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }

    return undefined;
  };

  const estimateGasForUndelegate = async ({
    chain,
    amountToUndelegate,
    userAddress,
    validatorAddress,
    denom,
    signer,
  }: {
    chain: Chain;
    amountToUndelegate: string;
    userAddress: string;
    validatorAddress: string;
    denom: string;
    signer: OfflineDirectSigner;
  }): Promise<GasServiceResult | undefined> => {
    const { chainName, backendName } = chain;
    if (signer) {
      const contractDecimal = get(cosmosConfig, chainName).contractDecimal;
      const parsedAmount = ethers
        .parseUnits(amountToUndelegate, contractDecimal)
        .toString();

      const rpc = getCosmosRpc(backendName as ChainBackendNames);
      const signingClient = await getCosmosSigningClient(chain, rpc, signer);

      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
        value: {
          delegatorAddress: userAddress,
          validatorAddress,
          amount: {
            denom,
            amount: parsedAmount,
          },
        },
      };

      const simulation = await signingClient.simulate(
        userAddress,
        [msg],
        'Cypher Undelegate',
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;

      const gasFee = DecimalHelper.multiply(simulation, [gasPrice, 1.8]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, contractDecimal),
        6,
      );

      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom,
            amount: Math.floor(gasFee).toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
    return undefined;
  };

  const estimateGasForRedelgate = async ({
    chain,
    amountToRedelegate,
    userAddress,
    validatorSrcAddress,
    validatorDstAddress,
    denom,
    signer,
  }: {
    chain: Chain;
    amountToRedelegate: string;
    userAddress: string;
    validatorSrcAddress: string;
    validatorDstAddress: string;
    denom: string;
    signer: OfflineDirectSigner;
  }) => {
    const { chainName, backendName } = chain;
    if (signer) {
      const contractDecimal = get(cosmosConfig, chainName).contractDecimal;
      const parsedAmount = ethers
        .parseUnits(amountToRedelegate, contractDecimal)
        .toString();

      const rpc = getCosmosRpc(backendName as ChainBackendNames);
      const signingClient = await getCosmosSigningClient(chain, rpc, signer);

      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
        value: {
          delegatorAddress: userAddress,
          validatorSrcAddress,
          validatorDstAddress,
          amount: {
            denom,
            amount: parsedAmount,
          },
        },
      };

      const simulation = await signingClient.simulate(
        userAddress,
        [msg],
        'Cypher delegation',
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;

      const gasFee = DecimalHelper.multiply(simulation, [gasPrice, 1.8]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, contractDecimal),
        6,
      );

      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom,
            amount: Math.floor(gasFee).toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }

    return undefined;
  };

  const estimateGasForSolana = async ({
    amountToSend,
    fromAddress,
    toAddress,
    contractAddress,
    contractDecimals = 9,
  }: {
    amountToSend: string;
    fromAddress: string;
    toAddress: string;
    contractAddress: string;
    contractDecimals: number;
  }) => {
    let transferInstruction;
    const solanRpc = getSolanaRpc();
    const senderPublicKey = new PublicKey(fromAddress);
    const recipientPublicKey = new PublicKey(toAddress);
    const amountInLamports = ethers.parseUnits(amountToSend, contractDecimals);
    const connection = new Connection(solanRpc, 'confirmed');
    const { blockhash } = await connection.getLatestBlockhash();

    if (contractAddress === 'solana-native') {
      transferInstruction = SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: recipientPublicKey,
        lamports: amountInLamports,
      });
    } else {
      const mintPublicKey = new PublicKey(contractAddress);
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        senderPublicKey,
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        recipientPublicKey,
      );

      transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        senderPublicKey,
        amountInLamports,
        [],
        TOKEN_PROGRAM_ID,
      );
    }

    const message = new TransactionMessage({
      payerKey: senderPublicKey,
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();
    const feeCalculator = await connection.getFeeForMessage(message);
    const fee = feeCalculator.value ?? 5000;
    const feeInLamports = DecimalHelper.removeDecimals(fee, 9).toNumber();
    // const transaction = new VersionedTransaction(message);
    // const simulation = await connection.simulateTransaction(transaction, {
    //   replaceRecentBlockhash: true,
    //   commitment: 'finalized',
    // });
    // const unitsConsumed = simulation?.value?.unitsConsumed ?? 0;
    // const lamportsPerSignature = 5000;
    // const numSignatures = transaction.signatures.length;
    // const estimatedFee =
    //   (lamportsPerSignature * numSignatures) / LAMPORTS_PER_SOL;

    return {
      gasFeeInCrypto: feeInLamports,
      // gasLimit: unitsConsumed * 1.8,
      gasPrice: 0.000005,
    };
  };

  const estimateGasForCosmosCustomContractRest = async (
    chain: Chain,
    cosmosData: {
      chain_id: string;
      msgs: Array<{
        msg: string;
        msg_type_url: string;
      }>;
      path: string[];
      signer_address: string;
    },
  ): Promise<GasServiceResult | undefined> => {
    const { chainName, backendName } = chain;
    const restEndpoint = cosmosConfig[chainName].rest;

    const nativeToken = await getNativeToken(backendName as ChainBackendNames);

    try {
      // First, fetch the account sequence
      const accountResponse = await fetch(
        `${restEndpoint}/cosmos/auth/v1beta1/accounts/${cosmosData.signer_address}`,
      );
      const accountData = await accountResponse.json();
      const sequence = accountData.account?.sequence || '0';

      // Convert messages to the required format without double encoding
      const messages = cosmosData.msgs.map(msgData => {
        const parsedMsg = JSON.parse(msgData.msg);
        return {
          '@type': msgData.msg_type_url,
          ...parsedMsg, // Spread the parsed message directly instead of re-encoding
        };
      });

      const response = await fetch(
        `${restEndpoint}/cosmos/tx/v1beta1/simulate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tx: {
              body: {
                messages,
                memo: '',
                timeout_height: '0',
                extension_options: [],
                non_critical_extension_options: [],
              },
              auth_info: {
                signer_infos: [
                  {
                    public_key: {
                      '@type': '/cosmos.crypto.secp256k1.PubKey',
                      key: 'A' + '0'.repeat(43),
                    },
                    mode_info: {
                      single: {
                        mode: 'SIGN_MODE_DIRECT',
                      },
                    },
                    sequence,
                  },
                ],
                fee: {
                  amount: [],
                  gas_limit: '200000',
                },
              },
              signatures: ['A' + '0'.repeat(127)],
            },
          }),
        },
      );

      const result = await response.json();

      if (result.code) {
        throw new Error(result.message || 'Simulation failed');
      }

      if (!result.gas_info?.gas_used) {
        throw new Error('No gas estimate in response');
      }

      const gasEstimate = parseInt(result.gas_info.gas_used);

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = DecimalHelper.multiply(gasEstimate, [1.8, gasPrice]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.removeDecimals(gasFee, nativeToken.contractDecimals),
        6,
      );

      const fee = {
        gas: Math.floor(gasEstimate * 1.8).toString(),
        amount: [
          {
            denom: nativeToken?.denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : gasFee.floor().toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    } catch (error) {
      console.error('Gas estimation error:', error);
      logAnalytics({
        type: AnalyticsType.ERROR,
        chain: backendName,
        message:
          parseErrorMessage(error) +
          `.Error in Gas fee estimation using REST endpoint ${restEndpoint}. Falling back to use costant gas fee estimate`,
        screen: 'estimateGasForCosmosCustomContractRest',
        other: {
          chain: backendName,
          restEndpoint,
          nativeTokenBalance: nativeToken.balanceDecimal,
          nativeTokenSymbol: nativeToken.symbol,
        },
      });

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = '200000';
      const gasFeeInCrypto = gasFeeReservation[backendName].toString();

      const fee = {
        gas: gasFee.toString(),
        amount: [
          {
            denom: nativeToken?.denom,
            amount: GASLESS_CHAINS.includes(backendName as ChainBackendNames)
              ? '0'
              : gasFee.toString(),
          },
        ],
      };

      return {
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
  };

  const estimateGasForEvmCustomContract = async (
    chain: Chain,
    contractData: EvmContractData,
    web3: Web3,
  ) => {
    try {
      const { data, signer_address, to } = contractData;

      // Format data with 0x prefix
      const formattedData = data.startsWith('0x') ? data : `0x${data}`;

      // Estimate gas using eth_createAccessList which doesn't require actual allowance
      let gasLimit = await web3.eth.estimateGas(
        {
          from: signer_address,
          to,
          value: '0x0',
          data: formattedData,
          // Add state override to simulate having enough allowance
          // accessList: [],
        },
        // blockNumber,
      );

      const code = formattedData;

      gasLimit = decideGasLimitBasedOnTypeOfToAddress(
        code,
        Number(gasLimit),
        chain.backendName,
        to,
      );

      const gasPriceDetail = await getGasPrice(chain.backendName, web3);

      const finalGasPrice = gasPriceDetail.isEIP1599Supported
        ? gasPriceDetail.maxFee // Use maxFee for EIP-1559
        : gasPriceDetail.gasPrice; // Use regular gasPrice for legacy

      const gasPriceWei = web3.utils.toWei(finalGasPrice.toString(), 'gwei');

      const totalWei = DecimalHelper.multiply(gasLimit, gasPriceWei);

      const gasFeeInCrypto = web3.utils.fromWei(totalWei.toString(), 'ether');

      return {
        gasFeeInCrypto,
        gasLimit,
        gasPrice: web3.utils.toHex(
          web3.utils.toWei(finalGasPrice.toString(), 'gwei'),
        ),
        fee: {
          gas: gasLimit,
          amount: [
            {
              denom: 'wei',
              amount: totalWei.toString(),
            },
          ],
        },
      };
    } catch (error) {
      console.error('Gas estimation error:', error);
      logAnalytics({
        type: AnalyticsType.ERROR,
        chain: chain.backendName,
        message:
          parseErrorMessage(error) +
          `.Error in Gas fee estimation for custom contract`,
        screen: 'estimateGasForEvmCustomContract',
        other: {
          contractData,
          chain,
        },
      });
      throw error;
    }
  };

  const opStackL1FeeEstimate = async (txParams: any, web3Endpoint: string) => {
    // fetching the contract address of gaspriceestimator on l1
    const address = addresses.GasPriceOracle[420];
    const abi = abis.GasPriceOracle;
    const serializedTransaction =
      buildUnserializedTransaction(txParams).serialize();
    const provider = new ethers.JsonRpcProvider(web3Endpoint);
    // Create contract instance
    const gasPriceOracle = new ethers.Contract(address, abi, provider);
    // Call getL1Fee directly on the contract
    const l1Fee = await gasPriceOracle.getL1Fee.staticCall(
      bytesToHex(serializedTransaction),
    );

    return `0x${l1Fee.toString(16)}`;
  };

  const fetchEstimatedL1Fee = async (
    txParams,
    chain: Chain,
    web3Endpoint: string,
  ) => {
    try {
      if (OP_STACK_ENUMS.includes(chain.backendName)) {
        return await opStackL1FeeEstimate(txParams, web3Endpoint);
      } else {
        return DecimalHelper.multiply(txParams.gas, txParams.gasPrice);
      }
    } catch (error) {
      console.error('L1 fee estimation error:', error);
      throw error;
    }
  };

  const estimateReserveFee = async ({
    tokenData,
    fromAddress,
    sendAddress,
    web3,
    web3Endpoint,
  }: {
    tokenData: TokenMeta;
    fromAddress: string;
    sendAddress: string;
    web3: Web3;
    web3Endpoint: string;
  }) => {
    try {
      if (
        CAN_ESTIMATE_L1_FEE_CHAINS.includes(tokenData.chainDetails.backendName)
      ) {
        const gasDetails = await estimateGasForEvm({
          web3,
          chain: tokenData.chainDetails.backendName as ChainBackendNames,
          fromAddress,
          toAddress: sendAddress,
          amountToSend: tokenData.balanceDecimal,
          contractAddress: tokenData.contractAddress,
          contractDecimals: tokenData.contractDecimals,
        });

        const l1GasFee = await fetchEstimatedL1Fee(
          {
            chainId: tokenData.chainDetails.chain_id,
            from: fromAddress,
            to: sendAddress,
            value: web3.utils.toHex(
              DecimalHelper.applyDecimals(tokenData.balanceDecimal, 18),
            ),
            gas: web3.utils.toHex(Number(gasDetails?.gasLimit)),
            gasPrice: DecimalHelper.applyDecimals(
              gasDetails?.maxFee,
              9,
            ).toHex(),
            data: '0x',
          },
          tokenData.chainDetails,
          web3Endpoint,
        );

        const gasTokenAmountRequiredForL1Fee = DecimalHelper.multiply(
          DecimalHelper.divide(l1GasFee, 1e18),
          1.1,
        );

        const gasTokenAmount = DecimalHelper.add(
          gasTokenAmountRequiredForL1Fee,
          gasDetails.gasFeeInCrypto,
        );

        return gasTokenAmount;
      } else {
        return gasFeeReservation[tokenData.chainDetails.backendName];
      }
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          context: 'estimateReserveFee',
          chainDetails: {
            backendName: tokenData.chainDetails.backendName,
            chainId: tokenData.chainDetails.chain_id,
            name: tokenData.chainDetails.name,
          },
          token: {
            symbol: tokenData.symbol,
            balance: tokenData.balanceDecimal,
          },
          walletAddress: fromAddress,
          sendAddress,
        },
      });
      return gasFeeReservation[tokenData.chainDetails.backendName];
    }
  };

  const estimateReserveFeeForCustomContract = async ({
    tokenData,
    fromAddress,
    sendAddress,
    web3,
    web3Endpoint,
    gas,
    gasPrice,
    gasFeeInCrypto,
  }: {
    tokenData: TokenMeta;
    fromAddress: string;
    sendAddress: string;
    web3: Web3;
    web3Endpoint: string;
    gas: string;
    gasPrice: string;
    gasFeeInCrypto: string;
  }) => {
    try {
      if (
        CAN_ESTIMATE_L1_FEE_CHAINS.includes(tokenData.chainDetails.backendName)
      ) {
        const l1GasFee = await fetchEstimatedL1Fee(
          {
            chainId: tokenData.chainDetails.chain_id,
            from: fromAddress,
            to: sendAddress,
            value: web3.utils.toHex(
              DecimalHelper.applyDecimals(tokenData.balanceDecimal, 18),
            ),
            gas: web3.utils.toHex(Number(gas)),
            gasPrice: DecimalHelper.applyDecimals(gasPrice, 9).toHex(),
            data: '0x',
          },
          tokenData.chainDetails,
          web3Endpoint,
        );

        const gasTokenAmountRequiredForL1Fee = DecimalHelper.multiply(
          DecimalHelper.divide(l1GasFee, 1e18),
          1.1,
        );

        const gasTokenAmount = DecimalHelper.add(
          gasTokenAmountRequiredForL1Fee,
          gasFeeInCrypto,
        );

        return gasTokenAmount;
      } else {
        return gasFeeReservation[tokenData.chainDetails.backendName];
      }
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          context: 'estimateReserveFee',
          chainDetails: {
            backendName: tokenData.chainDetails.backendName,
            chainId: tokenData.chainDetails.chain_id,
            name: tokenData.chainDetails.name,
          },
          token: {
            symbol: tokenData.symbol,
            balance: tokenData.balanceDecimal,
          },
          walletAddress: fromAddress,
          sendAddress,
        },
      });
      return gasFeeReservation[tokenData.chainDetails.backendName];
    }
  };

  return {
    estimateGasForEvm,
    estimateGasForCosmos,
    estimateGasForCosmosIBC,
    estimateGasForClaimRewards,
    estiamteGasForDelgate,
    estimateGasForUndelegate,
    estimateGasForRedelgate,
    estimateGasForSolana,
    estimateGasForCosmosCustomContract,
    estimateGasForCosmosRest,
    estimateGasForCosmosCustomContractRest,
    estimateGasForEvmCustomContract,
    estimateGasForCosmosIBCRest,
    getGasPrice,
    fetchEstimatedL1Fee,
    estimateReserveFee,
    estimateReserveFeeForCustomContract,
  };
}
