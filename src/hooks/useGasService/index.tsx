import {
  GeneratedType,
  OfflineDirectSigner,
  Registry,
} from '@cosmjs/proto-signing';
import {
  calculateFee,
  Coin,
  defaultRegistryTypes,
  GasPrice,
  MsgSendEncodeObject,
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { abis, addresses } from '@eth-optimism/contracts-ts';
import { InjectiveSigningStargateClient } from '@injectivelabs/sdk-ts/dist/cjs/exports';
import * as Sentry from '@sentry/react-native';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
} from '@solana/web3.js';
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { ceil, get } from 'lodash';
import {
  Address,
  bytesToHex,
  createPublicClient,
  encodeFunctionData,
  formatGwei,
  getContract,
  http,
  parseEther,
  parseGwei,
  parseUnits,
  PublicClient,
  toHex,
} from 'viem';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { gasFeeReservation } from '../../constants/data';
import { AnalyticsType } from '../../constants/enum';
import {
  CAN_ESTIMATE_L1_FEE_CHAINS,
  Chain,
  CHAIN_BSC,
  CHAIN_ETH,
  CHAIN_OPTIMISM,
  ChainBackendNames,
  EVM_CHAINS_BACKEND_NAMES,
  GASLESS_CHAINS,
  OP_ETH_ADDRESS,
  OP_STACK_ENUMS,
} from '../../constants/server';
import useAxios from '../../core/HttpRequest';
import { GasPriceDetail } from '../../core/types';
import buildUnserializedTransaction, {
  getTimeOutTime,
  logAnalytics,
  parseErrorMessage,
} from '../../core/util';
import { removeOutliers } from '../../misc/outliers';
import { EvmGasInterface } from '../../models/evmGas.interface';
import { TokenMeta } from '../../models/tokenMetaData.model';
import { DecimalHelper } from '../../utils/decimalHelper';
import useCosmosSigner from '../useCosmosSigner';
import usePortfolio from '../usePortfolio';
import useSolanaSigner from '../useSolana';
import { decideGasLimitBasedOnTypeOfToAddress } from '../useWeb3/util';
import {
  CosmosGasEstimation,
  CosmosGasPriceBackendResponse,
  EvmGasEstimation,
  SolanaGasEstimation,
} from '../../constants/type';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

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
  signer_address: Address;
  to: Address;
  value: string;
}

export default function useGasService() {
  const { getWithoutAuth } = useAxios();
  const { getCosmosRpc, getCosmosRest } = useCosmosSigner();
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
    publicClient: PublicClient,
  ): Promise<GasPriceDetail> {
    const lastNBlocks = 5;
    try {
      const response = await getWithoutAuth(`/v1/prices/native/${chain}`);
      if (!response.isError) {
        const tokenPrice = response.data;
        const gasHistory = await publicClient.getFeeHistory({
          blockCount: lastNBlocks,
          rewardPercentiles: [70, 75, 80, 85, 90, 95, 98],
        });
        // get the above percentiles and remove the outliers and take the max value.
        const { reward = [] } = gasHistory;
        const percentileArr: number[] = [];
        reward.forEach(element => {
          percentileArr.push(
            ...element.map(percentile =>
              DecimalHelper.multiply(
                percentile,
                DecimalHelper.pow(10, -9),
              ).toNumber(),
            ),
          );
        });
        const afterRemovingOutliers = removeOutliers(percentileArr); // will return the sorted array
        void logAnalyticsToFirebase(AnalyticEvent.GAS_OPTIMISATION, {
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

  async function getGasPrice(
    chain: ChainBackendNames,
    publicClient: PublicClient,
  ) {
    const response = await getWithoutAuth(`/v1/prices/gas/${chain}`);
    if (!response.isError) {
      return response.data;
    } else if (EVM_CHAINS_BACKEND_NAMES.includes(chain)) {
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
            publicClient,
          );
          return {
            chainId: chain,
            tokenPrice: gasPrice.tokenPrice,
            gasPrice: gasPrice.gasPrice,
          };
        } catch (e) {
          Sentry.captureException(e);
        }
      }
    }
    return { chainId: chain, gasPrice: 0, tokenPrice: 0 };
  }

  async function getCosmosGasPrice(
    chain: ChainBackendNames,
  ): Promise<CosmosGasPriceBackendResponse> {
    try {
      const response = await getWithoutAuth(`/v1/prices/gas/cosmos/${chain}`);
      if (!response.isError) {
        return response.data;
      }
      const gasPrice = get(cosmosConfig, [chain, 'gasPrice']);
      return { gasPrice, gasLimitMultiplier: 1.5, chainId: chain };
    } catch (error) {
      Sentry.captureException(error);
      const gasPrice = get(cosmosConfig, [chain, 'gasPrice']);
      return { gasPrice, gasLimitMultiplier: 1.5, chainId: chain };
    }
  }

  const estimateGasForEvm = async ({
    publicClient,
    chain,
    fromAddress,
    toAddress,
    amountToSend = '0',
    contractAddress,
    contractDecimals,
    contractData: contractDataUser,
    isErc20 = true,
  }: EvmGasInterface): Promise<EvmGasEstimation> => {
    try {
      const numberOfTokens = parseUnits(amountToSend, contractDecimals);
      let contractData;
      if (contractDataUser) {
        contractData = contractDataUser;
      } else if (isErc20) {
        const abi = [
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

        contractData = encodeFunctionData({
          abi,
          functionName: 'transfer',
          args: [toAddress, numberOfTokens],
        });
      }

      const gasPriceDetail = await getGasPrice(chain, publicClient);
      let gasLimit = Number(
        await publicClient.estimateGas({
          account: fromAddress,
          to: isErc20
            ? contractAddress?.toLowerCase() === OP_ETH_ADDRESS
              ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
              : contractAddress
            : toAddress,
          value: isErc20
            ? parseEther('0')
            : parseUnits(amountToSend, contractDecimals),
          ...(isErc20 && contractData && { data: contractData }),
        }),
      );
      const code = await publicClient.getCode({
        address: contractAddress,
      });

      gasLimit = decideGasLimitBasedOnTypeOfToAddress(
        code,
        Number(gasLimit),
        chain,
        contractAddress,
      );

      // Determine final gas price based on EIP-1559 support
      const finalGasPrice = gasPriceDetail.isEIP1599Supported
        ? gasPriceDetail.maxFee // Use maxFee for EIP-1559
        : gasPriceDetail.gasPrice; // Use regular gasPrice for legacy
      let gasFeeInCrypto = '0';

      const totalFeeInWei = DecimalHelper.multiply(finalGasPrice, gasLimit);
      const totalGasFeeInBigInt = BigInt(totalFeeInWei.toFixed(0));
      gasFeeInCrypto = formatGwei(totalGasFeeInBigInt);
      if (gasPriceDetail.isEIP1599Supported) {
        return {
          gasFeeInCrypto,
          gasLimit,
          isEIP1599Supported: true,
          priorityFee: DecimalHelper.scientificNotationToNumberString(
            get(gasPriceDetail, 'priorityFee', 0),
          ),
          baseFee: DecimalHelper.scientificNotationToNumberString(
            get(gasPriceDetail, 'baseFee', 0),
          ),
          maxFee: DecimalHelper.scientificNotationToNumberString(
            get(gasPriceDetail, 'maxFee', 0),
          ),
        };
      } else {
        return {
          gasFeeInCrypto,
          gasLimit,
          gasPrice:
            DecimalHelper.scientificNotationToNumberString(finalGasPrice),
          isEIP1599Supported: false,
        };
      }
    } catch (error) {
      Sentry.captureException(error);
      return {
        isError: true,
        error,
      };
    }
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
    const { backendName } = chain;
    if (signer) {
      const rpc = getCosmosRpc(backendName);

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

      const nativeToken = await getNativeToken(backendName);

      const { gasPrice } = await getCosmosGasPrice(backendName);
      const gasFee = DecimalHelper.multiply(simulation, [1.8, gasPrice]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.toDecimal(gasFee, nativeToken.contractDecimals),
        6,
      );
      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom: nativeToken?.denom,
            amount: GASLESS_CHAINS.includes(backendName)
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
  }): Promise<CosmosGasEstimation> => {
    try {
      const { chainName, backendName } = chain;
      const restEndpoint = getCosmosRest(backendName);
      const contractDecimal = get(
        cosmosConfig,
        [chainName, 'contractDecimal'],
        0,
      );
      const nativeToken = await getNativeToken(backendName);
      try {
        // First, fetch the account sequence
        const accountResponse = await fetch(
          `${restEndpoint}/cosmos/auth/v1beta1/accounts/${fromAddress}`,
        );
        const accountData = await accountResponse.json();
        const sequence = accountData.account?.sequence || '0';

        const amountToSend = parseUnits(amount, contractDecimal).toString();

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

        if (!result.gas_info?.gas_used) {
          throw new Error('No gas estimate in response');
        }
        const gasEstimate = result.gas_info.gas_used;

        const { gasPrice } = await getCosmosGasPrice(backendName);
        const gasFee = DecimalHelper.multiply(gasEstimate, [2, gasPrice]);
        const gasFeeInCrypto = DecimalHelper.toString(
          DecimalHelper.toDecimal(gasFee, nativeToken.contractDecimals),
          6,
        );

        const fee = {
          gas: Math.floor(gasEstimate * 2).toString(),
          amount: [
            {
              denom: nativeToken?.denom ?? denom,
              amount: GASLESS_CHAINS.includes(backendName)
                ? '0'
                : gasFee.floor().toString(),
            },
          ],
        };

        return {
          isError: false,
          gasFeeInCrypto,
          gasLimit: fee.gas,
          gasPrice,
          fee,
        };
      } catch (error) {
        logAnalytics({
          type: AnalyticsType.ERROR,
          chain: backendName,
          message:
            parseErrorMessage(error) +
            `.Error in Gas fee estimation using REST endpoint ${restEndpoint}. Falling back to use costant gas fee estimate`,
          screen: 'estimateGasForCosmosRest',
          other: {
            token: denom,
            amount,
            fromAddress,
            toAddress,
            nativeTokenBalance: nativeToken.balanceDecimal,
            nativeTokenSymbol: nativeToken.symbol,
          },
        });

        const { gasPrice } = await getCosmosGasPrice(backendName);
        const gasFee = '200000';
        const gasFeeInCrypto = gasFeeReservation[backendName].toString();

        const fee = {
          gas: gasFee.toString(),
          amount: [
            {
              denom: nativeToken?.denom ?? denom,
              amount: GASLESS_CHAINS.includes(backendName)
                ? '0'
                : gasFee.toString(),
            },
          ],
        };

        return {
          isError: false,
          gasFeeInCrypto,
          gasLimit: fee.gas,
          gasPrice,
          fee,
        };
      }
    } catch (error) {
      return {
        isError: true,
        error,
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
  }): Promise<CosmosGasEstimation> => {
    try {
      const { chainName, backendName } = chain;
      if (signer) {
        const rpc = getCosmosRpc(backendName);
        const signingClient = await getCosmosSigningClient(chain, rpc, signer);
        const contractDecimal = get(cosmosConfig, chainName).contractDecimal;
        const amountToSend = parseUnits(amount, contractDecimal).toString();
        const nativeToken = await getNativeToken(backendName);

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

        const { gasPrice, gasLimitMultiplier } =
          await getCosmosGasPrice(backendName);
        const gasFee = DecimalHelper.multiply(simulation, [
          gasLimitMultiplier,
          gasPrice,
        ]);
        const gasFeeInCrypto = DecimalHelper.toString(
          DecimalHelper.toDecimal(gasFee, nativeToken.contractDecimals),
          6,
        );

        const gasPriceWithDenom = GasPrice.fromString(
          `${gasPrice}${nativeToken?.denom}`,
        );

        const gasLimit = ceil(simulation * gasLimitMultiplier);
        const fee = calculateFee(gasLimit, gasPriceWithDenom);
        return {
          isError: false,
          gasFeeInCrypto,
          gasLimit: fee.gas,
          gasPrice: Number(gasPrice),
          fee,
        };
      }
      return {
        isError: true,
        error: 'No signer provided',
      };
    } catch (error) {
      return {
        isError: true,
        error,
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
  }): Promise<CosmosGasEstimation> => {
    try {
      const { chainName, backendName } = fromChain;
      const rpc = getCosmosRpc(backendName);
      if (signer) {
        const signingClient = await getCosmosSigningClient(
          fromChain,
          rpc,
          signer,
        );

        const nativeToken = await getNativeToken(backendName);
        const contractDecimal = get(cosmosConfig, chainName).contractDecimal;
        const amountToSend = parseUnits(amount, contractDecimal).toString();
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
          value: {
            sourcePort: 'transfer',
            sourceChannel,
            sender: fromAddress,
            receiver: toAddress,
            token: transferAmount,
            timeoutTimestamp: timeOut,
          },
        };
        const simulation = await signingClient.simulate(
          fromAddress,
          [transferMsg],
          '',
        );

        const { gasPrice, gasLimitMultiplier } =
          await getCosmosGasPrice(backendName);

        const gasFee = DecimalHelper.multiply(simulation, [
          gasLimitMultiplier,
          gasPrice,
        ]).toNumber();
        const gasFeeInCrypto = DecimalHelper.toString(
          DecimalHelper.toDecimal(gasFee, nativeToken.contractDecimals),
          6,
        );

        const gasLimit = ceil(simulation * gasLimitMultiplier);
        const gasPriceWithDenom = GasPrice.fromString(
          `${gasPrice}${nativeToken?.denom}`,
        );

        const fee = calculateFee(gasLimit, gasPriceWithDenom);
        return {
          isError: false,
          gasFeeInCrypto,
          gasLimit: fee.gas,
          gasPrice,
          fee,
        };
      }
      return {
        isError: true,
        error: 'No signer provided',
      };
    } catch (error) {
      return {
        isError: true,
        error,
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
  }): Promise<CosmosGasEstimation> => {
    const { chainName, backendName } = fromChain;

    // const restEndpoint = get(cosmosConfig, [chainName, 'rest'], '');
    const restEndpoint = getCosmosRest(backendName);
    const contractDecimal = get(
      cosmosConfig,
      [chainName, 'contractDecimal'],
      0,
    );

    const nativeToken = await getNativeToken(backendName);
    try {
      // Get account details for sequence
      const accountResponse = await fetch(
        `${restEndpoint}/cosmos/auth/v1beta1/accounts/${fromAddress}`,
      );
      const accountData = await accountResponse.json();
      const sequence = accountData.account?.sequence || '0';

      const amountToSend = parseUnits(amount, contractDecimal).toString();

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

      const { gasPrice } = await getCosmosGasPrice(backendName);
      const gasFee = DecimalHelper.multiply(gasEstimate, [2, gasPrice]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.toDecimal(gasFee, nativeToken.contractDecimals),
        6,
      );

      const fee = {
        gas: Math.floor(gasEstimate * 2).toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName)
              ? '0'
              : gasFee.floor().toString(),
          },
        ],
      };

      return {
        isError: false,
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    } catch (error) {
      logAnalytics({
        type: AnalyticsType.ERROR,
        chain: backendName,
        message:
          parseErrorMessage(error) +
          `.Error in Gas fee estimation using REST endpoint ${restEndpoint}. Falling back to use costant gas fee estimate`,
        screen: 'estimateGasForCosmosIBCRest',
        other: {
          token: denom,
          amount,
          fromAddress,
          toAddress,
          nativeTokenBalance: nativeToken.balanceDecimal,
          nativeTokenSymbol: nativeToken.symbol,
        },
      });

      const { gasPrice } = await getCosmosGasPrice(backendName);
      const gasFee = '200000';
      const gasFeeInCrypto = gasFeeReservation[backendName].toString();

      const fee = {
        gas: gasFee.toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName)
              ? '0'
              : gasFee.toString(),
          },
        ],
      };

      return {
        isError: false,
        gasFeeInCrypto,
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
  };

  const estimateGasForSolana = async ({
    amountToSend,
    fromAddress,
    toAddress,
    contractAddress,
    tokenContractDecimals = 9,
  }: {
    amountToSend: string;
    fromAddress: string;
    toAddress: string;
    contractAddress: string;
    tokenContractDecimals: number;
  }): Promise<SolanaGasEstimation> => {
    let transferInstruction;
    const solanRpc = getSolanaRpc();
    const senderPublicKey = new PublicKey(fromAddress);
    const recipientPublicKey = new PublicKey(toAddress);
    const amountInLamports = parseUnits(amountToSend, tokenContractDecimals);
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

    const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
    const feeCalculator = await connection.getFeeForMessage(message);
    const fee = feeCalculator.value ?? 5000;
    const totalAmountToBeReserved = DecimalHelper.add(fee, rentExempt);
    const feeInLamports = DecimalHelper.toDecimal(
      totalAmountToBeReserved,
      9,
    ).toString();
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
      isError: false,
      gasFeeInCrypto: feeInLamports,
      gasPrice: 0.000005,
    };
  };

  const estimateGasForSolanaCustomContract = async (
    solanaContractData: string,
  ) => {
    const decodedTxn = Buffer.from(solanaContractData, 'base64');
    const transactionDeserialized = Transaction.from(decodedTxn);
    const solanRpc = getSolanaRpc();
    const connection = new Connection(solanRpc, 'confirmed');
    const feeCalculator = await connection.getFeeForMessage(
      transactionDeserialized.compileMessage(),
    );
    const fee = feeCalculator.value ?? 5000;
    const feeInLamports = DecimalHelper.toDecimal(fee, 9).toString();

    return {
      isError: false,
      gasFeeInCrypto: feeInLamports,
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
    const restEndpoint = get(cosmosConfig, [chainName, 'rest'], '');

    const nativeToken = await getNativeToken(backendName);

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

      const gasEstimate = Number(result.gas_info.gas_used);

      // const gasPrice = cosmosConfig[chainName].gasPrice;
      const { gasPrice } = await getCosmosGasPrice(backendName);
      const gasFee = DecimalHelper.multiply(gasEstimate, [2, gasPrice]);
      const gasFeeInCrypto = DecimalHelper.toString(
        DecimalHelper.toDecimal(gasFee, nativeToken.contractDecimals),
        6,
      );

      const fee = {
        gas: Math.floor(gasEstimate * 2).toString(),
        amount: [
          {
            denom: nativeToken?.denom,
            amount: GASLESS_CHAINS.includes(backendName)
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

      // const gasPrice = cosmosConfig[chainName].gasPrice;
      const { gasPrice } = await getCosmosGasPrice(backendName);
      const gasFee = '200000';
      const gasFeeInCrypto = gasFeeReservation[backendName].toString();

      const fee = {
        gas: gasFee.toString(),
        amount: [
          {
            denom: nativeToken?.denom,
            amount: GASLESS_CHAINS.includes(backendName)
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
    publicClient: PublicClient,
  ) => {
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { data, signer_address, to } = contractData;

      // Format data with 0x prefix
      const formattedData = (
        data.startsWith('0x') ? data : `0x${data}`
      ) as `0x${string}`;

      // Estimate gas using eth_createAccessList which doesn't require actual allowance
      let gasLimit = Number(
        await publicClient.estimateGas({
          account: signer_address,
          to,
          value: parseEther('0'),
          data: formattedData,
          // Add state override to simulate having enough allowance
          // accessList: [],
        }),
      );

      const code = formattedData;

      gasLimit = decideGasLimitBasedOnTypeOfToAddress(
        code,
        Number(gasLimit),
        chain.backendName,
        to,
      );

      const gasPriceDetail = await getGasPrice(chain.backendName, publicClient);

      const gasPriceInGwei = gasPriceDetail.isEIP1599Supported
        ? gasPriceDetail.maxFee // Use maxFee for EIP-1559
        : gasPriceDetail.gasPrice; // Use regular gasPrice for legacy

      const gasPriceWei = parseGwei(gasPriceInGwei.toString());

      const totalWei = BigInt(
        DecimalHelper.multiply(gasLimit, gasPriceInGwei).toFixed(0),
      );

      const gasFeeInCrypto = formatGwei(totalWei);

      return {
        gasFeeInCrypto,
        gasLimit,
        gasPrice: toHex(gasPriceWei),
        // fee: {
        //   gas: gasLimit,
        //   amount: [
        //     {
        //       denom: 'wei',
        //       amount: totalWei.toString(),
        //     },
        //   ],
        // },
      };
    } catch (error) {
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

  const opStackL1FeeEstimate = async (txParams: any, rpc: string) => {
    // fetching the contract address of gaspriceestimator on l1
    const address = addresses.GasPriceOracle[420];
    const abi = abis.GasPriceOracle;
    const serializedTransaction =
      buildUnserializedTransaction(txParams).serialize();

    const publicClient = createPublicClient({
      transport: http(rpc),
    });

    // Create contract instance
    const contract = getContract({
      address,
      abi,
      client: publicClient,
    });

    const l1Fee1 =
      (await contract.read.getL1Fee([bytesToHex(serializedTransaction)])) ?? 0n;

    return l1Fee1;
  };

  const fetchEstimatedL1Fee = async (
    txParams: any,
    chain: Chain,
    rpc: string,
  ) => {
    if (OP_STACK_ENUMS.includes(chain.backendName)) {
      return await opStackL1FeeEstimate(txParams, rpc);
    } else {
      return DecimalHelper.multiply(txParams.gas, txParams.gasPrice);
    }
  };

  // estiamtes the gas Fee to reserve for L2 chains [OPT, ARBITRUM, BASE] use estimateGasForEVM for other EVM chains (becasue these L2 chains require a reserve of gasFee to commit the transaction to L!)
  const estimateReserveFee = async ({
    tokenData,
    fromAddress,
    toAddress,
    publicClient,
    rpc,
  }: {
    tokenData: TokenMeta;
    fromAddress: Address;
    toAddress: Address;
    publicClient: PublicClient;
    rpc: string;
  }) => {
    try {
      if (
        CAN_ESTIMATE_L1_FEE_CHAINS.includes(tokenData.chainDetails.backendName)
      ) {
        const gasDetails = await estimateGasForEvm({
          publicClient,
          chain: tokenData.chainDetails.backendName,
          fromAddress,
          toAddress,
          amountToSend: tokenData.balanceDecimal,
          contractAddress: tokenData.contractAddress as Address,
          contractDecimals: tokenData.contractDecimals,
        });

        if (gasDetails.isError) {
          throw gasDetails.error;
        }

        if (gasDetails?.isEIP1599Supported) {
          const l1GasFee = await fetchEstimatedL1Fee(
            {
              chainId: tokenData.chainDetails.chain_id,
              from: fromAddress,
              to: toAddress,
              value: toHex(
                DecimalHelper.toInteger(
                  tokenData.balanceDecimal,
                  18,
                ).toNumber(),
              ),
              gas: toHex(Number(gasDetails?.gasLimit)),
              gasPrice: DecimalHelper.toInteger(gasDetails?.maxFee, 9).toHex(),
              data: '0x',
            },
            tokenData.chainDetails,
            rpc,
          );

          const gasTokenAmountRequiredForL1Fee = DecimalHelper.multiply(
            DecimalHelper.toDecimal(l1GasFee.toString(), 18),
            1.1,
          );

          const gasTokenAmount = DecimalHelper.add(
            gasTokenAmountRequiredForL1Fee,
            gasDetails.gasFeeInCrypto,
          );

          return gasTokenAmount;
        }
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
          toAddress,
        },
      });
      return gasFeeReservation[tokenData.chainDetails.backendName];
    }
  };

  const estimateReserveFeeForCustomContract = async ({
    tokenData,
    fromAddress,
    toAddress,
    rpc,
    gas,
    gasPrice,
    gasFeeInCrypto,
  }: {
    tokenData: TokenMeta;
    fromAddress: string;
    toAddress: string;
    rpc: string;
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
            to: toAddress,
            value: toHex(
              DecimalHelper.toInteger(
                tokenData.balanceDecimal,
                tokenData.contractDecimals,
              ).toNumber(),
            ),
            gas: toHex(Number(gas)),
            gasPrice: toHex(DecimalHelper.toInteger(gasPrice, 18).toString()),
            data: '0x0',
          },
          tokenData.chainDetails,
          rpc,
        );

        const gasTokenAmountRequiredForL1Fee = DecimalHelper.multiply(
          DecimalHelper.toDecimal(l1GasFee.toString(), 18),
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
          toAddress,
        },
      });
      return gasFeeReservation[tokenData.chainDetails.backendName];
    }
  };

  return {
    estimateGasForEvm,
    estimateGasForCosmos,
    estimateGasForCosmosIBC,
    estimateGasForSolana,
    estimateGasForCosmosCustomContract,
    estimateGasForCosmosRest,
    estimateGasForCosmosCustomContractRest,
    estimateGasForEvmCustomContract,
    estimateGasForCosmosIBCRest,
    getGasPrice,
    getCosmosGasPrice,
    fetchEstimatedL1Fee,
    estimateReserveFee,
    estimateReserveFeeForCustomContract,
    estimateGasForSolanaCustomContract,
  };
}
