import Web3 from 'web3';
import {
  SendInEvmInterface,
  SendNativeToken,
} from '../../models/sendInEvm.interface';
import { HdWalletContext, getWeb3Endpoint } from '../../core/util';
import { useContext } from 'react';
import { GlobalContext } from '../../core/globalContext';
import {
  CHAIN_OPTIMISM,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  Chain,
  ChainConfigMapping,
  ChainNameMapping,
  TRANSACTION_ENDPOINT,
} from '../../constants/server';
import { getConnectionType } from '../../core/asyncStorage';
import { ConnectionTypes } from '../../constants/enum';
import * as Sentry from '@sentry/react-native';
import useGasService from '../useGasService';
import analytics from '@react-native-firebase/analytics';
import Toast from 'react-native-toast-message';
import { get } from 'lodash';
import useEthSigner from '../useEthSigner';
import { ethers } from 'ethers';
import axios from '../../core/Http';

export default function useTransactionManager() {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const OP_ETH_ADDRESS = '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000';
  const { estimateGasForEvm, estimateGasForEvmos } = useGasService();
  const { signEthTransaction } = useEthSigner();

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
    const connectionType = await getConnectionType();
    // if (!connectionType || connectionType === ConnectionTypes.SEED_PHRASE) {
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
      const numberOfTokens = ethers.utils.parseUnits(
        amountToSend,
        contractDecimals,
      );
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

  return { sendEvmToken, sendEvmosToken };
}
