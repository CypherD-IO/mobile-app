import Web3 from 'web3';
import {
  SendInEvmInterface,
  SendNativeToken,
} from '../../models/sendInEvm.interface';
import {
  HdWalletContext,
  PortfolioContext,
  getNativeToken,
  getTimeOutTime,
  getWeb3Endpoint,
} from '../../core/util';
import { useContext } from 'react';
import { GlobalContext } from '../../core/globalContext';
import {
  CHAIN_OPTIMISM,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  Chain,
  ChainConfigMapping,
  ChainNameMapping,
  GASLESS_CHAINS,
  NativeTokenMapping,
  TRANSACTION_ENDPOINT,
} from '../../constants/server';
import * as Sentry from '@sentry/react-native';
import useGasService from '../useGasService';
import Toast from 'react-native-toast-message';
import { get } from 'lodash';
import useEthSigner from '../useEthSigner';
import { ethers } from 'ethers';
import axios from '../../core/Http';
import {
  Coin,
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs/stargate';
import useCosmosSigner from '../useCosmosSigner';
import { cosmosConfig } from '../../constants/cosmosConfig';
import Long from 'long';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import useEvmosSigner from '../useEvmosSigner';

export default function useTransactionManager() {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
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
  } = useGasService();
  const { signEthTransaction } = useEthSigner();
  const { simulateEvmosIBCTransaction } = useEvmosSigner();
  const { getCosmosSignerClient, getCosmosRpc } = useCosmosSigner();

  const EVMOS_TXN_ENDPOINT = evmosUrls.transact;

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

  const decideGasLimitBasedOnTypeOfToAddress = (
    code: string,
    gasLimit: number,
  ): number => {
    if (gasLimit > 21000) {
      if (code !== '0x') {
        return 2 * gasLimit;
      }
      return gasLimit;
    } else {
      return 21000;
    }
  };

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
      let { gasLimit, gasPrice } = await estimateGasForEvm({
        web3,
        chain,
        fromAddress,
        toAddress,
        amountToSend,
        contractAddress,
        contractDecimals,
      });
      gasLimit = decideGasLimitBasedOnTypeOfToAddress(code, gasLimit);
      const tx = {
        from: ethereum.address,
        to: toAddress,
        gasPrice,
        value: web3.utils.toWei(amountToSend, 'ether').toString(),
        gas: web3.utils.toHex(gasLimit),
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
      const numberOfTokens = ethers.parseUnits(amountToSend, contractDecimals);
      // Form the contract and contract data
      const contract = new web3.eth.Contract(
        contractAbiFragment,
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
      gasLimit = decideGasLimitBasedOnTypeOfToAddress(code, gasLimit);

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
    return { hash: '', isError: false }; // fallback
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
    return { hash: '', isError: false };
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
  }> => {
    try {
      const { chainName, backendName, symbol } = fromChain;
      const gasDetails = await estimateGasForCosmos({
        chain: fromChain,
        denom,
        amount,
        fromAddress,
        toAddress,
      });
      const signer = await getCosmosSignerClient(chainName);
      const rpc = getCosmosRpc(backendName);

      const signingClient = await SigningStargateClient.connectWithSigner(
        rpc,
        signer,
      );

      const tokenDenom = denom ?? cosmosConfig[backendName].denom;
      const nativeToken = getNativeToken(
        get(NativeTokenMapping, symbol) || symbol,
        get(
          portfolioState.statePortfolio.tokenPortfolio,
          ChainNameMapping[backendName],
        ).holdings,
      );
      const fee = {
        gas: gasDetails.gasLimit,
        amount: [
          {
            denom: nativeToken?.denom ?? denom,
            amount: parseInt(
              Number(gasDetails.gasFeeInCrypto).toFixed(6).split('.')[1],
              10,
            ).toString(),
          },
        ],
      };
      const contractDecimals = get(cosmosConfig, chainName).contractDecimal;
      const amountToSend = String(
        parseFloat(amount) * Math.pow(10, contractDecimals),
      );
      if (
        GASLESS_CHAINS.includes(get(ChainConfigMapping, chainName).backendName)
      ) {
        fee.amount[0].amount = '0';
      }
      const result = await signingClient.sendTokens(
        fromAddress,
        toAddress,
        [{ denom: tokenDenom, amount: amountToSend }],
        fee,
        'Cypher Wallet',
      );

      if (result.code === 0) {
        return { isError: false, hash: result.transactionHash };
      } else {
        return { isError: true, hash: '', error: result?.error ?? '' };
      }
    } catch (e) {
      return { isError: true, hash: '', error: e };
    }
  };

  const interCosmosIBC = async ({
    fromChain,
    toChain,
    denom,
    contractDecimals,
    amount,
    fromAddress,
    toAddress,
  }: {
    fromChain: Chain;
    toChain: Chain;
    denom: string;
    contractDecimals: number;
    amount: string;
    fromAddress: string;
    toAddress: string;
  }): Promise<{
    isError: boolean;
    hash: string;
    error?: any;
  }> => {
    try {
      const gasFeeDetails = await estimateGasForCosmosIBC({
        fromChain,
        toChain,
        denom,
        amount,
        fromAddress,
        toAddress,
      });
      const { chainName, backendName, symbol } = fromChain;
      const signer = await getCosmosSignerClient(chainName);
      const rpc = getCosmosRpc(backendName);

      const signingClient = await SigningStargateClient.connectWithSigner(
        rpc,
        signer,
      );
      const nativeToken = getNativeToken(
        get(NativeTokenMapping, symbol) || symbol,
        get(
          portfolioState.statePortfolio.tokenPortfolio,
          ChainNameMapping[backendName],
        ).holdings,
      );

      const amountToSend = parseFloat(amount) * Math.pow(10, contractDecimals);
      const transferAmount: Coin = {
        denom,
        amount: amountToSend.toString(),
      };

      const sourcePort = 'transfer';
      const sourceChannel: string = get(cosmosConfig, chainName).channel[
        toChain.chainName.toLowerCase()
      ];
      const timeOut: any = getTimeOutTime();
      const memo = 'Cypher Wallet';
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
        }),
      };

      const ibcResponse = await signingClient.signAndBroadcast(
        fromAddress,
        [transferMsg],
        gasFeeDetails.fee,
        memo,
      );
      const hash = ibcResponse?.transactionHash;
      return { hash, isError: false };
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
      const { evmos } = hdWalletContext.state.wallet;
      const fromAddress: string = evmos.address;
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

  return {
    sendEvmToken,
    sendEvmosToken,
    sendCosmosToken,
    interCosmosIBC,
    evmosIBC,
  };
}
