/* eslint-disable @typescript-eslint/no-misused-promises */
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
import {
  TARGET_CARD_EVM_WALLET_ADDRESS,
  TARGET_BRIDGE_EVM_WALLET_ADDRESS,
  getWeb3Endpoint,
  convertAmountOfContractDecimal,
  formatAmount
} from './util';
import { Chain, CHAIN_OPTIMISM, CHAIN_SHARDEUM, CHAIN_SHARDEUM_SPHINX } from '../constants/server';
import * as Sentry from '@sentry/react-native';
import { GasPriceDetail } from './types';
import Web3 from 'web3';
import { microAtomToAtom, microAtomToUsd } from '../containers/utilities/cosmosSendUtility';
import { OfflineDirectSigner } from '@cosmjs-rn/proto-signing';
import { getSignerClient } from './Keychain';
import { MsgSendEncodeObject, SigningStargateClient } from '@cosmjs-rn/stargate';
import { cosmosConfig } from '../constants/cosmosConfig';
import { t } from 'i18next';
import { initialHdWalletState } from '../reducers';
import { createMessageSend, createTxRawEIP712, signatureToWeb3Extension } from '@tharsis/transactions';
import { personalSign, signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import axios from './Http';
import { createAlchemyWeb3 } from '@alch/alchemy-web3';
import { signatureToPubkey } from '@hanchon/signature-to-pubkey';

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

export function sendNativeCoinOrToken (hdWalletContext: any, portfolioState: any, fromChain: Chain, send_token_amount: string, contractAddress: string, numberOfDecimals: number, toAddress: string, currentQuoteUUID: string, handleTransactionResult: any, is_bridge: boolean = false, finalGasPrice: any, gasLimit: any, globalContext) {
  const web3 = new Web3(getWeb3Endpoint(fromChain, globalContext));
  if ((contractAddress.toLowerCase() === OP_ETH_ADDRESS && fromChain === CHAIN_OPTIMISM) || isNativeCurrency(fromChain, contractAddress)) {
    void _sendNativeCoin(hdWalletContext, portfolioState, web3, send_token_amount, currentQuoteUUID, handleTransactionResult, toAddress, finalGasPrice, gasLimit, fromChain);
  } else {
    _sendToken(hdWalletContext, portfolioState, web3, contractAddress, send_token_amount, numberOfDecimals, currentQuoteUUID, handleTransactionResult, toAddress, finalGasPrice, gasLimit);
  }
}

export function sendNativeCoinOrTokenToAnyAddress (hdWalletContext: any, portfolioState: any, fromChain: any, send_token_amount: string, contractAddress: string, numberOfDecimals: number, currentQuoteUUID: string, handleTransactionResult: any, to_address: string, finalGasPrice: any, gasLimit: any, globalContext, tokenSymbol?: string) {
  const web3 = new Web3(getWeb3Endpoint(fromChain, globalContext));
  if ((contractAddress.toLowerCase() === OP_ETH_ADDRESS && fromChain === CHAIN_OPTIMISM) || ((fromChain === CHAIN_SHARDEUM || fromChain === CHAIN_SHARDEUM_SPHINX) && tokenSymbol === 'SHM') || isNativeCurrency(fromChain, contractAddress)) {
    void _sendNativeCoin(hdWalletContext, portfolioState, web3, send_token_amount, currentQuoteUUID, handleTransactionResult, to_address, finalGasPrice, gasLimit, fromChain);
  } else {
    _sendToken(hdWalletContext, portfolioState, web3, contractAddress, send_token_amount, numberOfDecimals, currentQuoteUUID, handleTransactionResult, to_address, finalGasPrice, gasLimit);
  }
}

export function sendNativeCoin (hdWalletContext: any, portfolioState: any, web3: any, send_token_amount: string, currentQuoteUUID: string, handleTransactionResult: any, is_bridge: boolean, finalGasPrice: any, gasLimit: any, fromChain: Chain) {
  const to_address = is_bridge ? TARGET_BRIDGE_EVM_WALLET_ADDRESS : TARGET_CARD_EVM_WALLET_ADDRESS;
  void _sendNativeCoin(hdWalletContext, portfolioState, web3, send_token_amount, currentQuoteUUID, handleTransactionResult, to_address, finalGasPrice, gasLimit, fromChain);
}

const decideGasLimitBasedOnTypeOfToAddress = (code: string, gasLimit: number): number => {
  if (gasLimit > 21000) {
    if (code !== '0x') {
      return 2 * gasLimit;
    }
    return gasLimit;
  } else {
    return 21000;
  }
};

async function _sendNativeCoin (hdWalletContext: any, portfolioState: any, web3: any, send_token_amount: string, currentQuoteUUID: string, handleTransactionResult: any, to_address: string, finalGasPrice: any, gasLimit: any, fromChain: Chain) {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  try {
    const code = await web3.eth.getCode(to_address);
    gasLimit = decideGasLimitBasedOnTypeOfToAddress(code, gasLimit);
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
    }, (err: any) => {
      handleTransactionResult(err.message, currentQuoteUUID, ethereum.address, true, true);
      Sentry.captureException(err);
    });
  } catch (err: any) {
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
  void _estimateGasForNativeTransaction(hdWalletContext, fromChain, fromTokenItem, send_token_amount, to_address, gasPrice, sendTransaction, globalContext);
}

export async function _estimateGasForNativeTransaction (hdWalletContext: any, fromChain: any, fromTokenItem: any, send_token_amount: string, to_address: string, gasPriceDetail: GasPriceDetail, sendTransaction: any, globalContext) {
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
  try {
    const gasLimit = await web3.eth.estimateGas({
      from: ethereum.address,
      // For Optimism the ETH token has different contract address
      to: contractAddress.toLowerCase() === OP_ETH_ADDRESS ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : contractAddress,
      value: '0x0',
      data: contract_data
    });
    if (gasLimit) {
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
        gasFeeDollar = formatAmount(parseFloat(gasFeeETH) * ethPrice);

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
        totalValueDollar,
        hasSufficientBalance: true
      };
      sendTransaction(_data);
    }
  } catch (error) {
    // TODO (user feedback): Give feedback to user.
    Toast.show({
      type: 'error',
      text1: 'Transaction Error',
      text2: error.message,
      position: 'bottom'
    });
    Sentry.captureException(error);
  }
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
          denom: tokenData.denom,
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
      gas: Math.floor(simulation * 1.8).toString(),
      amount: [
        {
          denom: tokenData.denom,
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
export async function cosmosSendTokens (address: string, signingClient: any, fee: any, senderAddress: string, amount: string, memo: string, handleSuccessTransaction: any, handleFailedTransaction: any, chain: string, uuid: string, denom?: string) {
  try {
    const tokenDenom = denom ?? cosmosConfig[chain].denom;
    const result = await signingClient.sendTokens(
      senderAddress,
      address,
      [{ denom: tokenDenom, amount }],
      {
        amount: fee.amount,
        gas: fee.gas
      },
      (memo === '') ? t('SEND_TOKENS_MEMO') : memo
    );

    if (result.code === 0) {
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

const ACCOUNT_DETAILS_INFO = 'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/auth/v1beta1/accounts';
const SIMULATION_ENDPOINT = 'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/tx/v1beta1/simulate';
const TRANSACTION_ENDPOINT = 'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/tx/v1beta1/txs';

const evmosSendBody = async (
  senderAddress: string,
  destinationAddress: string,
  ethereum: any,
  transferAmount: string,
  gasAmount: string = '14000000000000000',
  gas: string = '450000') => {
  const userAccountData = await axios.get(`${ACCOUNT_DETAILS_INFO}/${senderAddress}`);
  const accountData = userAccountData?.data?.account.base_account;

  const chain = {
    chainId: 9001,
    cosmosChainId: 'evmos_9001-2'
  };

  const getPublicKey = () => {
    const privateKeyBuffer = Buffer.from(
      ethereum.privateKey.substring(2),
      'hex'
    );

    const sig = personalSign({
      privateKey: privateKeyBuffer,
      data: 'generate_pubkey'
    });

    const publicKey = signatureToPubkey(
      sig,
      Buffer.from([
        50, 215, 18, 245, 169, 63, 252, 16, 225, 169, 71, 95, 254, 165, 146, 216,
        40, 162, 115, 78, 147, 125, 80, 182, 25, 69, 136, 250, 65, 200, 94, 178
      ]));

    return publicKey;
  };

  const sender = {
    accountAddress: senderAddress,
    sequence: accountData.sequence,
    accountNumber: accountData.account_number,
    pubkey: accountData.pub_key?.key ?? getPublicKey()
  };

  const fee = {
    amount: gasAmount,
    denom: cosmosConfig.evmos.denom,
    gas
  };

  const memo = '';

  const params = {
    destinationAddress,
    amount: ethers.utils.parseUnits(convertAmountOfContractDecimal(transferAmount, 18), 18).toString(),
    denom: cosmosConfig.evmos.denom
  };

  const msg = createMessageSend(chain, sender, fee, memo, params);

  const privateKeyBuffer = Buffer.from(ethereum.privateKey.substring(2), 'hex');

  const signature = signTypedData({
    privateKey: privateKeyBuffer,
    data: msg.eipToSign,
    version: SignTypedDataVersion.V4
  });

  const extension = signatureToWeb3Extension(chain, sender, signature);

  const rawTx = createTxRawEIP712(
    msg.legacyAmino.body,
    msg.legacyAmino.authInfo,
    extension
  );

  const body = generatePostBodyBroadcast(rawTx);
  return body;
};
export async function evmosSendSimulation (
  senderAddress: string,
  destinationAddress: string,
  ethereum: any,
  transferAmount: string
) {
  const body = await evmosSendBody(senderAddress, destinationAddress, ethereum, transferAmount);
  const response = await axios.post(
    SIMULATION_ENDPOINT,
    body
  );
  const simulatedGasInfo = response.data.gas_info ? response.data.gas_info : 0;
  const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;

  return gasWanted;
}

export const evmosSendTxn = async (senderAddress: string,
  destinationAddress: string,
  ethereum: any,
  transferAmount: string,
  gasWanted: number,
  handleSuccessTransaction: any,
  handleFailedTransaction: any,
  uuid: string
) => {
  const body = await evmosSendBody(
    senderAddress,
    destinationAddress,
    ethereum,
    transferAmount,
    ethers.utils.parseUnits(convertAmountOfContractDecimal((cosmosConfig.evmos.gasPrice * gasWanted).toString(), 18), 18).toString(),
    Math.floor(gasWanted * 1.3).toString());

  const response = await axios.post(
    TRANSACTION_ENDPOINT,
    body
  );

  if (response.data.tx_response.code === 0) {
    const analyticsData = {
      from: senderAddress,
      to: senderAddress,
      gasPrice: cosmosConfig.evmos.gasPrice,
      value: transferAmount,
      gasWanted,
      hash: response.data.tx_response.txhash,
      chain: cosmosConfig.prefix,
      uuid
    };
    Toast.show({
      type: 'success',
      text1: 'Transaction hash',
      text2: response.data.tx_response.txhash,
      position: 'bottom'
    });

    handleSuccessTransaction({ transactionHash: response.data.tx_response.txhash }, analyticsData);
  } else {
    handleFailedTransaction(null, uuid);
  }
};
