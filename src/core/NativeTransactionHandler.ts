/**
 *  IMPORTANT NOTE:
 *  Please read the below article, before using ether.js
 *  https://docs.ethers.io/v5/cookbook/react-native/#cookbook-reactnative
**/

// Import the crypto getRandomValues shim (**BEFORE** the shims)
import 'react-native-get-random-values';
// Import the the ethers shims (**BEFORE** ethers)
import '@ethersproject/shims';
// Import the ethers library
import { ethers } from 'ethers';
import Toast from 'react-native-toast-message';
import analytics from '@react-native-firebase/analytics';
import { TARGET_CARD_EVM_WALLET_ADDRESS, TARGET_BRIDGE_EVM_WALLET_ADDRESS, getWeb3Endpoint } from './util';
import { Chain, CHAIN_OPTIMISM } from '../constants/server';
import * as Sentry from '@sentry/react-native';
import { GasPriceDetail } from './types';
import Web3 from 'web3';
import { microAtomToAtom, microAtomToUsd, isCosmosAddress } from '../containers/utilities/cosmosSendUtility';
import { OfflineDirectSigner } from '@cosmjs-rn/proto-signing';
import { getSignerClient } from './Keychain';
import { MsgSendEncodeObject, SigningStargateClient } from '@cosmjs-rn/stargate';
import { cosmosConfig } from '../constants/cosmosConfig';
import { t } from 'i18next';
import { useGlobalModalContext } from '../components/v2/GlobalModal';
import { initialHdWalletState } from '../reducers';

// const {showModal, hideModal} = useGlobalModalContext()
// ETH in Optimims chain's contract address
const OP_ETH_ADDRESS = '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000';
export interface Coin {
  denom: string
  amount: string
}

export function isNativeCurrency (fromChain: Chain, contractAddress: string): boolean {
  const isNative = [fromChain.native_token_address, fromChain.secondaryAddress].includes(contractAddress);
  return isNative;
}

export function sendNativeCoinOrToken (hdWalletContext: any, portfolioState: any, fromChain: Chain, send_token_amount: string, contractAddress: string, numberOfDecimals: number, currentQuoteUUID: string, handleTransactionResult: any, is_bridge: boolean = false, finalGasPrice: any, gasLimit: any, globalContext) {
  const web3 = new Web3(getWeb3Endpoint(fromChain, globalContext));
  if ((contractAddress.toLowerCase() === OP_ETH_ADDRESS && fromChain === CHAIN_OPTIMISM) || isNativeCurrency(fromChain, contractAddress)) {
    sendNativeCoin(hdWalletContext, portfolioState, web3, send_token_amount, currentQuoteUUID, handleTransactionResult, is_bridge, finalGasPrice, gasLimit);
  } else {
    sendToken(hdWalletContext, portfolioState, web3, contractAddress, send_token_amount, numberOfDecimals, currentQuoteUUID, handleTransactionResult, is_bridge, finalGasPrice, gasLimit);
  }
}

export function sendNativeCoinOrTokenToAnyAddress (hdWalletContext: any, portfolioState: any, fromChain: any, send_token_amount: string, contractAddress: string, numberOfDecimals: number, currentQuoteUUID: string, handleTransactionResult: any, to_address: string, finalGasPrice: any, gasLimit: any, globalContext) {
  const web3 = new Web3(getWeb3Endpoint(fromChain, globalContext));

  if ((contractAddress.toLowerCase() === OP_ETH_ADDRESS && fromChain === CHAIN_OPTIMISM) || isNativeCurrency(fromChain, contractAddress)) {
    _sendNativeCoin(hdWalletContext, portfolioState, web3, send_token_amount, currentQuoteUUID, handleTransactionResult, to_address, finalGasPrice, gasLimit);
  } else {
    _sendToken(hdWalletContext, portfolioState, web3, contractAddress, send_token_amount, numberOfDecimals, currentQuoteUUID, handleTransactionResult, to_address, finalGasPrice, gasLimit);
  }
}

export function sendNativeCoin (hdWalletContext: any, portfolioState: any, web3: any, send_token_amount: string, currentQuoteUUID: string, handleTransactionResult: any, is_bridge: boolean, finalGasPrice: any, gasLimit: any) {
  const to_address = is_bridge ? TARGET_BRIDGE_EVM_WALLET_ADDRESS : TARGET_CARD_EVM_WALLET_ADDRESS;
  _sendNativeCoin(hdWalletContext, portfolioState, web3, send_token_amount, currentQuoteUUID, handleTransactionResult, to_address, finalGasPrice, gasLimit);
}

function _sendNativeCoin (hdWalletContext: any, portfolioState: any, web3: any, send_token_amount: string, currentQuoteUUID: string, handleTransactionResult: any, to_address: string, finalGasPrice: any, gasLimit: any) {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  gasLimit = (gasLimit > 21000) ? gasLimit : 21000;
  try {
    const tx = {
      from: ethereum.address,
      to: to_address,
      gasPrice: finalGasPrice,
      value: web3.utils.toWei(send_token_amount, 'ether'),
      gas: web3.utils.toHex(gasLimit)
    };
    let txHash: string;
    const signPromise = web3.eth.accounts.signTransaction(
      tx,
      ethereum.privateKey
    );
    signPromise.then(signedTx => {
      web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        .once('transactionHash', async function (hash: string) {
          txHash = hash;
          // showModal('state', {type: 'info', title: 'Transaction Hash', description: hash, onSuccess: hideModal, onFailure: hideModal});
          Toast.show({ type: 'info', text1: 'Transaction Hash', text2: hash, position: 'bottom' });
          const logEventName = currentQuoteUUID === '' ? 'send_transaction' : 'bridge_transaction_submit';
          await analytics().logEvent(logEventName, {
            from: ethereum.address,
            to: to_address,
            gasPrice: finalGasPrice,
            data: '',
            value: send_token_amount,
            gas: gasLimit,
            hash,
            chain: portfolioState.statePortfolio.selectedChain.name
          });
        })
        .once('receipt', function (receipt: string) {
        })
        .on('confirmation', function (confNumber: string) {
        })
        .on('error', async function (error: { message: string }) {
          if (!txHash) {
            await analytics().logEvent('bridge_transaction_receipt_failed', {
              from: ethereum.address,
              to: to_address,
              value: send_token_amount,
              message: 'Insufficient funds for gas'
            });
            handleTransactionResult(error.message, currentQuoteUUID, ethereum.address, true, true);
          } else {
            setTimeout(async () => {
              const receipt = await web3.eth.getTransactionReceipt(txHash);
              if (receipt?.status) {
                // showModal('state', {type: 'success', title: 'Transaction', description: 'Transaction Receipt Received', onSuccess: hideModal, onFailure: hideModal});
                Toast.show({
                  type: 'success',
                  text1: 'Transaction',
                  text2: 'Transaction Receipt Received',
                  position: 'bottom'
                });
                handleTransactionResult(receipt.txHash, currentQuoteUUID, ethereum.address, false);
              } else {
                await analytics().logEvent('bridge_transaction_receipt_failed', {
                  from: ethereum.address,
                  to: to_address,
                  value: send_token_amount,
                  hash: receipt.transactionHash,
                  message: JSON.stringify(receipt)
                });
                Sentry.captureException(error);
                // showModal('state', {type: 'error', title: 'Transaction Error', description: error.message, onSuccess: hideModal, onFailure: hideModal});
                Toast.show({
                  type: 'error',
                  text1: 'Transaction Error',
                  text2: error.message,
                  position: 'bottom'
                });
                handleTransactionResult(error.message, currentQuoteUUID, ethereum.address, true);
              }
            }, 5000);
          }
        })
        .then(async function (receipt: { transactionHash: string }) {
          // showModal('state', {type: 'success', title: 'Transaction', description: 'Transaction Receipt Received', onSuccess: hideModal, onFailure: hideModal});
          Toast.show({ type: 'success', text1: 'Transaction', text2: 'Transaction Receipt Received', position: 'bottom' });
          handleTransactionResult(receipt.transactionHash, currentQuoteUUID, ethereum.address, false);
          await analytics().logEvent('bridge_transaction_receipt', {
            from: ethereum.address,
            to: to_address,
            gasPrice: finalGasPrice,
            data: '',
            value: send_token_amount,
            gas: gasLimit,
            hash: receipt.transactionHash,
            chain: portfolioState.statePortfolio.selectedChain.name
          });
        });
    }, (err: { message: string }) => {
      handleTransactionResult(err.message, currentQuoteUUID, ethereum.address, true, true);
      Sentry.captureException(err);
    });
  } catch (err) {
    handleTransactionResult(err.message, currentQuoteUUID, ethereum.address, true);
    // TODO (user feedback): Give feedback to user.
    Sentry.captureException(err);
  }
}

function sendToken (hdWalletContext: any, portfolioState: any, web3: any, contractAddress: string, send_token_amount: string, numberOfDecimals: number, currentQuoteUUID: string, handleTransactionResult: any, is_bridge: boolean, finalGasPrice: any, gasLimit: any) {
  const to_address = is_bridge ? TARGET_BRIDGE_EVM_WALLET_ADDRESS : TARGET_CARD_EVM_WALLET_ADDRESS;
  _sendToken(hdWalletContext, portfolioState, web3, contractAddress, send_token_amount, numberOfDecimals, currentQuoteUUID, handleTransactionResult, to_address, finalGasPrice, gasLimit);
}

function _sendToken (hdWalletContext: any, portfolioState: any, web3: any, contractAddress: string, send_token_amount: string, numberOfDecimals: number, currentQuoteUUID: string, handleTransactionResult: any, to_address: string, finalGasPrice: any, gasLimit: any) {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  try {
    const contractAbiFragment = [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          {
            name: '_to',
            type: 'address'
          },
          {
            type: 'uint256',
            name: '_tokens'
          }
        ],
        constant: false,
        outputs: [],
        payable: false
      }
    ];

    // How many tokens? -- Use BigNumber everywhere
    const numberOfTokens = ethers.utils.parseUnits(send_token_amount, numberOfDecimals);
    // Form the contract and contract data
    const contract = new web3.eth.Contract(contractAbiFragment, contractAddress);
    const contract_data = contract.methods.transfer(to_address, numberOfTokens).encodeABI();

    const tx = {
      from: ethereum.address,
      to: contractAddress,
      gasPrice: finalGasPrice,
      value: '0x0',
      gas: web3.utils.toHex(gasLimit),
      data: contract_data
    };

    const signPromise = web3.eth.accounts.signTransaction(
      tx,
      ethereum.privateKey
    );
    signPromise.then(signedTx => {
      web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        .once('transactionHash', function (hash) {
          // showModal('state', {type: 'info', title: 'Transaction Hash', description: hash, onSuccess: hideModal, onFailure: hideModal});
          Toast.show({ type: 'info', text1: 'Transaction Hash', text2: hash, position: 'bottom' });
          const logEventName = currentQuoteUUID === '' ? 'send_transaction' : 'bridge_transaction_submit';
          analytics().logEvent(logEventName, {
            from: ethereum.address,
            to: to_address,
            gasPrice: finalGasPrice,
            data: `Contract: ${contractAddress}`,
            value: send_token_amount,
            gas: gasLimit,
            hash,
            chain: portfolioState.statePortfolio.selectedChain.name
          }).catch(Sentry.captureException);
        })
        .once('receipt', function (receipt) {
        })
        .on('confirmation', function (confNumber) {
        })
        .on('error', function (error) {
          // showModal('state', {type: 'error', title: 'Transaction Error', description: error.message, onSuccess: hideModal, onFailure: hideModal});
          Toast.show({ type: 'error', text1: 'Transaction Error', text2: error.message, position: 'bottom' });
          handleTransactionResult(error.message, currentQuoteUUID, ethereum.address, true);
        })
        .then(function (receipt) {
          handleTransactionResult(receipt.transactionHash, currentQuoteUUID, ethereum.address, false);
          analytics().logEvent('bridge_transaction_receipt', {
            from: ethereum.address,
            to: to_address,
            gasPrice: finalGasPrice,
            data: `Contract: ${contractAddress}`,
            value: send_token_amount,
            gas: gasLimit,
            hash: receipt.transactionHash,
            chain: portfolioState.statePortfolio.selectedChain.name
          }).catch(Sentry.captureException);
        });
    }, (err) => {
      handleTransactionResult(err.message, currentQuoteUUID, ethereum.address, true, true);
      Sentry.captureException(err);
    });
  } catch (err) {
    handleTransactionResult(err.message, currentQuoteUUID, ethereum.address, true);
    // TODO (user feedback): Give feedback to user.
    Sentry.captureException(err);
  }
}

export function estimateGasForNativeTransaction (hdWalletContext: any, fromChain: any, fromTokenItem: any, send_token_amount: string, is_bridge: boolean, gasPrice: GasPriceDetail, sendTransaction: any, globalContext, tragetWalletAddress = '') {
  let to_address = is_bridge ? TARGET_BRIDGE_EVM_WALLET_ADDRESS : TARGET_CARD_EVM_WALLET_ADDRESS;
  if (tragetWalletAddress !== '') {
    to_address = tragetWalletAddress;
  }
  _estimateGasForNativeTransaction(hdWalletContext, fromChain, fromTokenItem, send_token_amount, to_address, gasPrice, sendTransaction, globalContext);
}

export function _estimateGasForNativeTransaction (hdWalletContext: any, fromChain: any, fromTokenItem: any, send_token_amount: string, to_address: string, gasPriceDetail: GasPriceDetail, sendTransaction: any, globalContext) {
  const web3 = new Web3(getWeb3Endpoint(fromChain, globalContext));
  const contractAddress = fromTokenItem.contractAddress;
  const numberOfDecimals = fromTokenItem.contractDecimals;
  const send_token_price_usd = fromTokenItem.price;
  const send_token_symbol = fromTokenItem.symbol;
  const send_token_usd_value = parseFloat(send_token_amount) * send_token_price_usd;
  const ethereum = hdWalletContext.state.wallet.ethereum;
  // How many tokens? -- Use BigNumber everywhere
  const numberOfTokens = ethers.utils.parseUnits(send_token_amount, numberOfDecimals);
  // Form the contract and contract data
  const contract = new web3.eth.Contract([
    {
      name: 'transfer',
      type: 'function',
      inputs: [
        {
          name: '_to',
          type: 'address'
        },
        {
          type: 'uint256',
          name: '_tokens'
        }
      ],
      constant: false,
      outputs: [],
      payable: false
    }
  ], contractAddress);
  const contract_data = contract.methods.transfer(to_address, numberOfTokens).encodeABI();
  web3.eth.estimateGas({
    from: ethereum.address,
    // For Optimism the ETH token has different contract address
    to: contractAddress.toLowerCase() === OP_ETH_ADDRESS ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : contractAddress,
    value: '0x0',
    data: contract_data
  })
    .then((gasLimit) => {
      let finalGasPrice;
      if (gasPriceDetail.gasPrice > 0) {
        finalGasPrice = gasPriceDetail.gasPrice;
      }

      let gasFeeETH = '';
      if (finalGasPrice) {
        gasFeeETH = web3.utils.fromWei(
          web3.utils.toWei((parseInt(finalGasPrice) * gasLimit).toFixed(9), 'gwei')
        );
        finalGasPrice = web3.utils.toHex(web3.utils.toWei(finalGasPrice.toFixed(9), 'gwei'));
      }

      let gasFeeDollar = '';
      const totalDollar = '';
      let totalValueDollar = '';
      let totalValueTransfer = 0;
      if (gasPriceDetail.tokenPrice > 0) {
        const ethPrice = gasPriceDetail.tokenPrice;
        gasFeeDollar = (parseFloat(gasFeeETH) * ethPrice).toFixed(2);

        if (isNativeCurrency(fromChain, contractAddress)) {
          totalValueDollar = ((parseFloat(send_token_amount) + parseFloat(gasFeeETH)) * ethPrice).toFixed(2);
          totalValueTransfer = parseFloat(send_token_amount) + parseFloat(parseFloat(gasFeeETH).toFixed(6));
        } else {
          totalValueDollar = (send_token_usd_value + (parseFloat(gasFeeETH) * ethPrice)).toFixed(2);
          totalValueTransfer = parseFloat(send_token_amount) + parseFloat(parseFloat(gasFeeETH).toFixed(6));
        }
      }
      const _data = {
        gasFeeDollar,
        gasFeeETH: parseFloat(gasFeeETH).toFixed(6),
        networkName: fromChain.name,
        networkCurrency: fromChain.symbol,
        totalDollar,
        appImage: fromChain.logo_url,
        tokenImage: fromTokenItem.logoUrl,
        finalGasPrice,
        gasLimit,
        gasPrice: gasPriceDetail,
        tokenSymbol: send_token_symbol,
        tokenAmount: send_token_amount,
        tokenValueDollar: send_token_usd_value.toFixed(2),
        totalValueTransfer,
        totalValueDollar
      };
      sendTransaction(_data);
    })
    .catch((error) => {
      // TODO (user feedback): Give feedback to user.
      Toast.show({
        type: 'error',
        text1: 'Transaction Error',
        text2: error.message,
        position: 'bottom'
      });
      Sentry.captureException(error);
    });
}

export async function getCosmosSignerClient (chainSelected: any, hdWalletContext: any = initialHdWalletState) {
  const wallets: Map<string, OfflineDirectSigner> = await getSignerClient(hdWalletContext);
  return wallets.get(cosmosConfig[chainSelected.chainName].prefix);
}

// Gas fee simulation for cosmos based chains
export async function estimateGasForCosmosTransaction (chainSelected: any, signer: any, amount: string, senderAddress: string, address: string, tokenData: any, rpc: string, handleTransactionResult: any, valueForUsd: string) {
  if (signer) {
    const signingClient = await SigningStargateClient.connectWithSigner(rpc, signer);

    // transaction gas fee calculation
    const sendMsg: MsgSendEncodeObject = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: senderAddress,
        toAddress: address,
        amount: [{
          denom: cosmosConfig[chainSelected.chainName].denom,
          amount
        }]
      }
    };

    const simulation = await signingClient.simulate(
      senderAddress,
      [sendMsg],
      ''
    );

    const gasPrice = cosmosConfig[chainSelected.chainName].gasPrice;
    const gasFee = simulation * gasPrice;
    const fee = {
      gas: Math.floor(simulation * 1.3).toString(),
      amount: [
        {
          denom: cosmosConfig[chainSelected.chainName].denom,
          amount: parseInt(gasFee.toFixed(6).split('.')[1]).toString()
        }
      ]
    };

    const _data = {
      chain: (chainSelected.chainName).toUpperCase(),
      appImage: chainSelected.logo_url,
      tokenImage: tokenData.logoUrl,
      sentTokenAmount: valueForUsd,
      sentTokenSymbol: tokenData.symbol,
      sentValueUSD: ((parseFloat(valueForUsd) * parseFloat(tokenData.price))).toFixed(6),
      to_address: address,
      fromNativeTokenSymbol: tokenData.symbol,
      gasFeeNative: microAtomToAtom(fee.amount[0].amount),
      gasFeeDollar: microAtomToUsd(fee.amount[0].amount, tokenData.price),
      finalGasPrice: microAtomToUsd(fee.amount[0].amount, tokenData.price),
      gasLimit: fee.gas,
      signingClient,
      fee,
      chainInfo: tokenData.chainDetails,
      gasPrice: fee.amount[0].amount
    };

    handleTransactionResult(_data);
  }
};

// Send tokens for cosmos based chains
export async function cosmosSendTokens (address: string, signingClient: any, fee: any, senderAddress: string, amount: string, memo: string, handleSuccessTransaction: any, handleFailedTransaction: any, chain: string, uuid: string) {
  try {
    const denom = cosmosConfig[chain].denom;
    const result = await signingClient.sendTokens(
      senderAddress,
      address,
      [{ denom, amount }],
      {
        amount: fee.amount,
        gas: fee.gas
      },
      (memo === '') ? t('SEND_TOKENS_MEMO') : memo
    );

    if (result) {
      const analyticsData = {
        from: senderAddress,
        to: address,
        gasPrice: fee.gas,
        value: fee.amount[0].amount,
        gas: fee.gas,
        hash: result.transactionHash,
        chain,
        uuid
      };
      Toast.show({
        type: 'success',
        text1: 'Transaction hash',
        text2: result.transactionHash,
        position: 'bottom'
      });

      handleSuccessTransaction(result, analyticsData);
    } else {
      handleFailedTransaction(null, uuid);
    }
  } catch (err) {
    Sentry.captureException(err);
    handleFailedTransaction(err, uuid);
  }
}
