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
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  convertAmountOfContractDecimal,
} from './util';
import { Chain, ChainBackendNames, GASLESS_CHAINS } from '../constants/server';
import { loadPrivateKeyFromKeyChain } from './Keychain';

export enum TypeOfTransaction {
  SIMULATION = 'simulation',
  TRANSACTION = 'transaction',
}

const getTimeOutTime = () => {
  return Long.fromNumber(Math.floor(Date.now() / 1000) + 60).multiply(
    1000000000,
  );
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

      const sourcePort = 'transfer';
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
