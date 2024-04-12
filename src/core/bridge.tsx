import { Coin } from '@cosmjs-rn/amino';
import { cosmosConfig } from '../constants/cosmosConfig';
import axios from './Http';
import { ethers } from 'ethers';
import {
  MsgSendEncodeObject,
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import Long from 'long';
import {
  createTxIBCMsgTransfer,
  createTxRawEIP712,
  signatureToWeb3Extension,
} from '@tharsis/transactions';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import * as Sentry from '@sentry/react-native';
import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  convertAmountOfContractDecimal,
} from './util';
import { Chain, ChainBackendNames, GASLESS_CHAINS } from '../constants/server';
import { loadPrivateKeyFromKeyChain } from './Keychain';
import { useContext } from 'react';

export enum TypeOfTransaction {
  SIMULATION = 'simulation',
  TRANSACTION = 'transaction',
}

const ACCOUNT_DETAILS_INFO =
  'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/auth/v1beta1/accounts/';
const SIMULATION_ENDPOINT =
  'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/tx/v1beta1/simulate';
const TRANSACTION_ENDPOINT =
  'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/tx/v1beta1/txs';
const getTimeOutTime = () => {
  return Long.fromNumber(Math.floor(Date.now() / 1000) + 60).multiply(
    1000000000,
  );
};

const evmosToCosmosSignatureContent = async (
  senderEvmosAddress: string,
  receiverAddress: string,
  inputAmount: string,
  userAccountData: any,
  hdWallet: any,
  amount = '14000000000000000',
  gas = '450000',
) => {
  const chainData = {
    chainId: 9001,
    cosmosChainId: 'evmos_9001-2',
  };
  const accountData = userAccountData.data.account.base_account;

  const sender = {
    accountAddress: senderEvmosAddress,
    sequence: accountData.sequence,
    accountNumber: accountData.account_number,
    pubkey: accountData.pub_key.key,
  };

  const fee = {
    amount,
    denom: cosmosConfig.evmos.denom,
    gas,
  };

  const params = {
    receiver: receiverAddress,
    denom: cosmosConfig.evmos.denom,
    amount: ethers
      .parseUnits(convertAmountOfContractDecimal(inputAmount, 18), 18)
      .toString(),
    sourcePort: 'transfer',
    sourceChannel: cosmosConfig.evmos.channel.osmosis,
    revisionNumber: Long.fromNumber(456),
    revisionHeight: Long.fromNumber(123),
    timeoutTimestamp: (1e9 * (Math.floor(Date.now() / 1e3) + 1200)).toString(),
  };

  const msg: any = createTxIBCMsgTransfer(chainData, sender, fee, '', params);

  const privateKey = await loadPrivateKeyFromKeyChain(
    false,
    hdWallet.state.pinValue,
  );
  if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
    const privateKeyBuffer = Buffer.from(privateKey.substring(2), 'hex');

    const signature = signTypedData({
      privateKey: privateKeyBuffer,
      data: msg.eipToSign,
      version: SignTypedDataVersion.V4,
    });

    const extension = signatureToWeb3Extension(chainData, sender, signature);

    const rawTx = createTxRawEIP712(
      msg.legacyAmino.body,
      msg.legacyAmino.authInfo,
      extension,
    );

    const body = generatePostBodyBroadcast(rawTx);
    return body;
  }
};

export const sendInCosmosChain = async (
  rpc: string,
  inputAmount: string,
  wallets: Map<string, OfflineDirectSigner>,
  chainName: string,
  handleBridgeTransactionResult: any,
  quoteData: any,
  denom: string,
): Promise<void> => {
  const signer = wallets.get(cosmosConfig[chainName].prefix);
  const [address]: any = await signer.getAccounts();
  const senderAddress = address.address;
  try {
    const signingClient = await SigningStargateClient.connectWithSigner(
      rpc,
      signer,
    );
    const amount = ethers
      .parseUnits(
        convertAmountOfContractDecimal(
          inputAmount,
          cosmosConfig[chainName].contractDecimal,
        ),
        cosmosConfig[chainName].contractDecimal,
      )
      .toString();

    // transaction gas fee calculation
    const sendMsg: MsgSendEncodeObject = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: senderAddress,
        toAddress: quoteData.step1TargetWallet, // chainAddress[chainName],
        amount: [
          {
            denom,
            amount,
          },
        ],
      },
    };
    const simulation = await signingClient.simulate(
      senderAddress,
      [sendMsg],
      '',
    );

    const gasFee = simulation * cosmosConfig[chainName].gasPrice;

    const fee = {
      gas: Math.floor(simulation * 1.5).toString(),
      amount: [
        {
          denom,
          amount: GASLESS_CHAINS.includes(
            cosmosConfig[chainName].backendName as ChainBackendNames,
          )
            ? '0'
            : parseInt(gasFee.toFixed(6).split('.')[1]).toString(),
        },
      ],
    };

    const result = await signingClient.sendTokens(
      senderAddress,
      quoteData.step1TargetWallet,
      [{ denom, amount }],
      fee,
      '',
    );
    handleBridgeTransactionResult(
      result.transactionHash,
      quoteData.quoteId,
      senderAddress,
      false,
    );
  } catch (e) {
    Sentry.captureException(e);
    handleBridgeTransactionResult(
      e.message,
      quoteData.quoteId,
      senderAddress,
      true,
    );
  }
};

export const interCosmosIbc = async (
  wallets: Map<string, OfflineDirectSigner>,
  fromChain: Chain,
  fromChainRpc: string,
  inputAmount: string,
  recipientAddress: string,
) => {
  try {
    const senderChainWallet: OfflineDirectSigner | undefined = wallets.get(
      cosmosConfig[fromChain.chainName].prefix,
    );
    if (senderChainWallet) {
      const senderChainClient = await SigningStargateClient.connectWithSigner(
        fromChainRpc,
        senderChainWallet,
      );

      let senderChainAddress: any = await senderChainWallet.getAccounts();
      senderChainAddress = senderChainAddress[0].address;

      const transferAmount: Coin = {
        denom: cosmosConfig[fromChain.chainName].denom,
        amount: ethers
          .parseUnits(convertAmountOfContractDecimal(inputAmount, 6), 6)
          .toString(),
      };

      const sourcePort: string = 'transfer';
      const sourceChannel: string =
        cosmosConfig[fromChain.chainName].channel.osmosis;
      const timeOut: Long = getTimeOutTime();
      const memo = '';
      const transferMsg: MsgTransferEncodeObject = {
        typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
        value: MsgTransfer.fromPartial({
          sourcePort,
          sourceChannel,
          sender: senderChainAddress,
          receiver: recipientAddress,
          token: transferAmount,
          timeoutHeight: {
            revisionHeight: Long.fromNumber(123),
            revisionNumber: Long.fromNumber(456),
          },
          timeoutTimestamp: timeOut,
        }),
      };

      const simulation = await senderChainClient.simulate(
        senderChainAddress,
        [transferMsg],
        memo,
      );

      const gasFee: number =
        simulation * cosmosConfig[fromChain.chainName].gasPrice;

      const fee = {
        gas: Math.floor(simulation * 1.3).toString(),
        amount: [
          {
            denom: cosmosConfig[fromChain.chainName].denom,
            amount: ethers
              .parseUnits(
                convertAmountOfContractDecimal(gasFee.toString(), 6),
                6,
              )
              .toString(),
          },
        ],
      };

      const ibcRepsonse = await senderChainClient.sendIbcTokens(
        senderChainAddress,
        recipientAddress,
        transferAmount,
        sourcePort,
        sourceChannel,
        {
          revisionHeight: Long.fromNumber(123),
          revisionNumber: Long.fromNumber(456),
        },
        timeOut,
        fee,
        memo,
      );

      return ibcRepsonse;
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};

export const evmosIbc = async (
  evmosAddress: string,
  hdWallet: any,
  receiverAddress: string,
  transferAmount: string,
) => {
  try {
    const accountInfoResponse = await axios.get(
      `${ACCOUNT_DETAILS_INFO}${evmosAddress}`,
      {
        timeout: 2000,
      },
    );

    let ibcTransferBody = await evmosToCosmosSignatureContent(
      evmosAddress,
      receiverAddress,
      transferAmount,
      accountInfoResponse,
      hdWallet,
    );

    const response = await axios.post(SIMULATION_ENDPOINT, ibcTransferBody);

    const simulatedGasInfo = response.data.gas_info
      ? response.data.gas_info
      : 0;
    const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;

    ibcTransferBody = await evmosToCosmosSignatureContent(
      evmosAddress,
      receiverAddress,
      transferAmount,
      accountInfoResponse,
      hdWallet,
      ethers
        .parseUnits((cosmosConfig.evmos.gasPrice * gasWanted).toString(), '18')
        .toString(),
      Math.floor(gasWanted * 1.3).toString(),
    );

    const resp: any = await axios.post(TRANSACTION_ENDPOINT, ibcTransferBody);
    return {
      transactionHash: resp.data.tx_response.txhash,
      gasFee: gasWanted,
    };
  } catch (e) {
    Sentry.captureException(e);
  }
};

export const sendCosmosTokens = async (
  rpc: string,
  inputAmount: string,
  wallets: Map<string, OfflineDirectSigner>,
  chainName: string,
  receiverAddress: string,
) => {
  try {
    const signer = wallets.get(cosmosConfig[chainName].prefix);
    if (signer) {
      const [address]: any = await signer.getAccounts();
      const senderAddress = address.address;

      const signingClient = await SigningStargateClient.connectWithSigner(
        rpc,
        signer,
      );
      const amount = ethers
        .parseUnits(
          convertAmountOfContractDecimal(
            inputAmount,
            cosmosConfig[chainName].contractDecimal,
          ),
          cosmosConfig[chainName].contractDecimal,
        )
        .toString();

      const sendMsg: MsgSendEncodeObject = {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: senderAddress,
          toAddress: receiverAddress,
          amount: [
            {
              denom: cosmosConfig[chainName].denom,
              amount,
            },
          ],
        },
      };

      const simulation = await signingClient.simulate(
        senderAddress,
        [sendMsg],
        '',
      );
      const gasFee = simulation * cosmosConfig[chainName].gasPrice;

      const fee = {
        gas: Math.floor(simulation * 1.5).toString(),
        amount: [
          {
            denom: cosmosConfig[chainName].denom,
            amount: parseInt(gasFee.toFixed(6).split('.')[1]).toString(),
          },
        ],
      };

      const result = await signingClient.sendTokens(
        senderAddress,
        receiverAddress,
        [
          {
            denom: cosmosConfig[chainName].denom,
            amount,
          },
        ],
        fee,
        '',
      );

      return result;
    }
  } catch (e) {}
};
