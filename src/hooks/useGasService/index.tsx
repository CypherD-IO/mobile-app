import { ethers } from 'ethers';
import {
  ACCOUNT_DETAILS_INFO,
  CHAIN_BSC,
  CHAIN_ETH,
  CHAIN_OPTIMISM,
  Chain,
  ChainBackendNames,
  ChainNameMapping,
  GASLESS_CHAINS,
  NativeTokenMapping,
  OP_ETH_ADDRESS,
  SIMULATION_ENDPOINT,
} from '../../constants/server';
import useAxios from '../../core/HttpRequest';
import Web3 from 'web3';
import { removeOutliers } from '../../misc/outliers';
import { GasPriceDetail } from '../../core/types';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { EvmGasInterface } from '../../models/evmGas.interface';
import axios from '../../core/Http';
import { cosmosConfig } from '../../constants/cosmosConfig';
import useEvmosSigner from '../useEvmosSigner';
import { useContext } from 'react';
import {
  HdWalletContext,
  PortfolioContext,
  getNativeToken,
  getTimeOutTime,
  limitDecimalPlaces,
} from '../../core/util';
import useCosmosSigner from '../useCosmosSigner';
import {
  Coin,
  MsgSendEncodeObject,
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { ceil, get } from 'lodash';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import Long from 'long';
import { InjectiveStargate } from '@injectivelabs/sdk-ts';
import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import { IReward } from '../../reducers/cosmosStakingReducer';

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

export default function useGasService() {
  const { getWithoutAuth } = useAxios();
  const minimumGasFee = '20';
  const {
    getSignedEvmosTransaction,
    simulateEvmosIBCTransaction,
    simulateEvmosClaimReward,
    simulateEvmosDelegate,
    simulateEvmosReDelegate,
    simulateEvmosUnDelegate,
  } = useEvmosSigner();
  const { getCosmosRpc } = useCosmosSigner();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const portfolioState = useContext<any>(PortfolioContext);

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
      let gasLimit = await web3.eth.estimateGas({
        from: fromAddress,
        // For Optimism the ETH token has different contract address
        to:
          contractAddress?.toLowerCase() === OP_ETH_ADDRESS
            ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            : contractAddress,
        value: '0x0',
        data: contractDataUser ?? contractData,
      });
      gasLimit = ceil(gasLimit * 1.3);
      if (gasLimit) {
        let finalGasPrice;
        if (gasPriceDetail.gasPrice > 0) {
          finalGasPrice = gasPriceDetail.gasPrice;
        }

        let gasFeeInCrypto = '0';
        if (finalGasPrice) {
          gasFeeInCrypto = web3.utils.fromWei(
            web3.utils.toWei((finalGasPrice * gasLimit).toFixed(9), 'gwei'),
          );
          finalGasPrice = web3.utils.toHex(
            web3.utils.toWei(finalGasPrice.toFixed(9), 'gwei'),
          );
        }
        return {
          gasFeeInCrypto,
          gasLimit,
          gasPrice: finalGasPrice,
          isEIP1599Supported: get(gasPriceDetail, 'isEIP1599Supported', false),
          priorityFee: get(gasPriceDetail, 'priorityFee', 0),
          baseFee: get(gasPriceDetail, 'baseFee', 0),
          maxFee: get(gasPriceDetail, 'maxFee', 0),
        };
      }
    } catch (error) {
      Sentry.captureException(error);
    }
    return { gasFeeInCrypto: 0, gasLimit: 0, gasPrice: 0 }; // fallback
  };

  const simulateEvmosTransaction = async ({
    toAddress,
    amountToSend,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    toAddress: string;
    amountToSend: string;
    gasAmount?: string;
    gas?: string;
  }) => {
    const { evmos } = hdWalletContext.state.wallet;
    const fromAddress: string = evmos.address ?? '';
    const userAccountData = await axios.get(
      `${ACCOUNT_DETAILS_INFO}/${fromAddress}`,
    );
    const accountData = userAccountData?.data?.account.base_account;

    const chain = {
      chainId: 9001,
      cosmosChainId: 'evmos_9001-2',
    };

    const sender = {
      accountAddress: fromAddress,
      sequence: accountData.sequence,
      accountNumber: accountData.account_number,
      pubkey: accountData.pub_key?.key,
    };

    const fee = {
      amount: gasAmount,
      denom: cosmosConfig.evmos.denom,
      gas,
    };

    const memo = '';

    const params = {
      destinationAddress: toAddress,
      amount: ethers
        .parseUnits(limitDecimalPlaces(amountToSend, 18), 18)
        .toString(),
      denom: cosmosConfig.evmos.denom,
    };

    const body = await getSignedEvmosTransaction({
      chain,
      sender,
      fee,
      memo,
      params,
    });
    return body;
  };

  const estimateGasForEvmos = async ({
    toAddress,
    amountToSend,
  }: {
    toAddress: string;
    amountToSend: string;
  }) => {
    const txnRequest = await simulateEvmosTransaction({
      toAddress,
      amountToSend,
    });
    const response = await axios.post(SIMULATION_ENDPOINT, txnRequest);
    const simulatedGasInfo = response.data.gas_info
      ? response.data.gas_info
      : 0;
    const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;
    const gasFeeInCrypto = cosmosConfig.evmos.gasPrice * gasWanted * 10 ** -18;
    return {
      simulatedTxnRequest: txnRequest,
      gasFeeInCrypto,
      gasLimit: gasWanted,
      gasPrice: cosmosConfig.evmos.gasPrice,
    };
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
      const rpc = getCosmosRpc(backendName);
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

      const nativeToken = getNativeToken(
        get(NativeTokenMapping, symbol) || symbol,
        get(
          portfolioState.statePortfolio.tokenPortfolio,
          ChainNameMapping[backendName],
        ).holdings,
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;
      const gasFee = simulation * 1.8 * gasPrice;
      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName)
              ? '0'
              : Math.floor(gasFee).toString(),
          },
        ],
      };
      return {
        gasFeeInCrypto: parseFloat(
          String(gasFee * 10 ** -nativeToken.contractDecimals),
        ).toFixed(6),
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
    const rpc = getCosmosRpc(backendName);
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

      const nativeToken = getNativeToken(
        get(NativeTokenMapping, symbol) || symbol,
        get(
          portfolioState.statePortfolio.tokenPortfolio,
          ChainNameMapping[backendName],
        ).holdings,
      );

      const gasPrice = cosmosConfig[chainName].gasPrice;

      const gasFee = simulation * Number(gasPrice) * 1.8;

      const fee = {
        gas: Math.floor(simulation * 1.8).toString(),
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: GASLESS_CHAINS.includes(backendName)
              ? '0'
              : Math.floor(gasFee).toString(),
          },
        ],
      };
      return {
        gasFeeInCrypto: parseFloat(
          String(gasFee * 10 ** -nativeToken.contractDecimals),
        ).toFixed(6),
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }
  };

  const estimateGasForEvmosIBC = async ({
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
  }) => {
    const { evmos } = hdWalletContext.state.wallet;
    const fromAddress: string = evmos.address;
    const userAccountData = await axios.get(
      `${ACCOUNT_DETAILS_INFO}/${fromAddress}`,
    );

    const simulatedIBCTransferBody = simulateEvmosIBCTransaction({
      toAddress,
      toChain,
      amount,
      denom,
      contractDecimals,
      userAccountData,
    });
    const response = await axios.post(
      SIMULATION_ENDPOINT,
      simulatedIBCTransferBody,
    );
    const simulatedGasInfo = response.data.gas_info
      ? response.data.gas_info
      : 0;
    const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;
    const gasFee = parseFloat(gasWanted) * cosmosConfig.evmos.gasPrice * 1.3;
    return {
      gasFeeInCrypto: gasFee,
      gasLimit: gasWanted * 1.3,
      gasPrice: cosmosConfig.evmos.gasPrice,
    };
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
      const rpc = getCosmosRpc(backendName);
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

      const gasFee = simulation * Number(gasPrice) * 1.8;

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
        gasFeeInCrypto: parseFloat(
          String(gasFee * 10 ** -contractDecimal),
        ).toFixed(6),
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

      const rpc = getCosmosRpc(backendName);
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

      const gasFee = simulation * Number(gasPrice) * 1.8;

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
        gasFeeInCrypto: parseFloat(
          String(gasFee * 10 ** -contractDecimal),
        ).toFixed(6),
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

      const rpc = getCosmosRpc(backendName);
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

      const gasFee = simulation * Number(gasPrice) * 1.8;

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
        gasFeeInCrypto: parseFloat(
          String(gasFee * 10 ** -contractDecimal),
        ).toFixed(6),
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

      const rpc = getCosmosRpc(backendName);
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

      const gasFee = simulation * Number(gasPrice) * 1.8;

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
        gasFeeInCrypto: parseFloat(
          String(gasFee * 10 ** -contractDecimal),
        ).toFixed(6),
        gasLimit: fee.gas,
        gasPrice,
        fee,
      };
    }

    return undefined;
  };

  const estimateGasForEvmosClaimReward = async ({
    privateKeyBuffer,
    validatorAddresses,
    accountData,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    privateKeyBuffer: Buffer;
    validatorAddresses: string[];
    accountData: {
      sequence: number;
      account_number: number;
      pub_key: {
        key: string;
      };
    };
    gasAmount?: string;
    gas?: string;
  }) => {
    const { evmos } = hdWalletContext.state.wallet;
    const fromAddress: string = evmos.address ?? '';

    const body = await simulateEvmosClaimReward({
      fromAddress,
      validatorAddresses,
      privateKeyBuffer,
      accountData,
      gasAmount,
      gas,
    });

    const response = await axios.post(SIMULATION_ENDPOINT, body);

    const simulatedGasInfo = response.data.gas_info
      ? response.data.gas_info
      : 0;
    const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;
    const gasFee = parseFloat(gasWanted) * cosmosConfig.evmos.gasPrice * 1.3;
    return {
      gasFeeInCrypto: gasFee,
      gasLimit: Math.floor(gasWanted * 1.3),
      gasPrice: cosmosConfig.evmos.gasPrice,
    };
  };

  const estimateGasForEvmosDelegate = async ({
    privateKeyBuffer,
    validatorAddress,
    amountToDelegate,
    accountData,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    privateKeyBuffer: Buffer;
    validatorAddress: string;
    amountToDelegate: string;
    accountData: {
      sequence: number;
      account_number: number;
      pub_key: {
        key: string;
      };
    };
    gasAmount?: string;
    gas?: string;
  }) => {
    const { evmos } = hdWalletContext.state.wallet;
    const fromAddress: string = evmos.address ?? '';

    const parsedAmount = ethers.parseUnits(amountToDelegate, 18).toString();

    const body = await simulateEvmosDelegate({
      fromAddress,
      validatorAddress,
      privateKeyBuffer,
      amountToDelegate: parsedAmount,
      accountData,
      gasAmount,
      gas,
    });

    const response = await axios.post(SIMULATION_ENDPOINT, body);

    const simulatedGasInfo = response.data.gas_info
      ? response.data.gas_info
      : 0;
    const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;
    const gasFee = parseFloat(gasWanted) * cosmosConfig.evmos.gasPrice * 1.3;
    return {
      gasFeeInCrypto: gasFee,
      gasLimit: Math.floor(gasWanted * 1.3),
      gasPrice: cosmosConfig.evmos.gasPrice,
    };
  };

  const estimateGasForEvmosUnDelegate = async ({
    privateKeyBuffer,
    validatorAddress,
    amountToUnDelegate,
    accountData,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    privateKeyBuffer: Buffer;
    validatorAddress: string;
    amountToUnDelegate: string;
    accountData: {
      sequence: number;
      account_number: number;
      pub_key: {
        key: string;
      };
    };
    gasAmount?: string;
    gas?: string;
  }) => {
    const { evmos } = hdWalletContext.state.wallet;
    const fromAddress: string = evmos.address ?? '';

    const parsedAmount = ethers.parseUnits(amountToUnDelegate, 18).toString();

    const body = await simulateEvmosUnDelegate({
      fromAddress,
      validatorAddress,
      privateKeyBuffer,
      amountToUnDelegate: parsedAmount,
      accountData,
      gasAmount,
      gas,
    });

    const response = await axios.post(SIMULATION_ENDPOINT, body);

    const simulatedGasInfo = response.data.gas_info
      ? response.data.gas_info
      : 0;
    const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;
    const gasFee = parseFloat(gasWanted) * cosmosConfig.evmos.gasPrice * 1.3;
    return {
      gasFeeInCrypto: gasFee,
      gasLimit: Math.floor(gasWanted * 1.3),
      gasPrice: cosmosConfig.evmos.gasPrice,
    };
  };

  const estimateGasForEvmosReDelegate = async ({
    privateKeyBuffer,
    validatorSrcAddress,
    validatorDstAddress,
    amountToReDelegate,
    accountData,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    privateKeyBuffer: Buffer;
    validatorSrcAddress: string;
    validatorDstAddress: string;
    amountToReDelegate: string;
    accountData: {
      sequence: number;
      account_number: number;
      pub_key: {
        key: string;
      };
    };
    gasAmount?: string;
    gas?: string;
  }) => {
    const { evmos } = hdWalletContext.state.wallet;
    const fromAddress: string = evmos.address ?? '';

    const parsedAmount = ethers.parseUnits(amountToReDelegate, 18).toString();

    const body = await simulateEvmosReDelegate({
      fromAddress,
      validatorSrcAddress,
      validatorDstAddress,
      privateKeyBuffer,
      amountToReDelegate: parsedAmount,
      accountData,
      gasAmount,
      gas,
    });

    const response = await axios.post(SIMULATION_ENDPOINT, body);

    const simulatedGasInfo = response.data.gas_info
      ? response.data.gas_info
      : 0;
    const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;
    const gasFee = parseFloat(gasWanted) * cosmosConfig.evmos.gasPrice * 1.3;
    return {
      gasFeeInCrypto: gasFee,
      gasLimit: Math.floor(gasWanted * 1.3),
      gasPrice: cosmosConfig.evmos.gasPrice,
    };
  };
  return {
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
  };
}
