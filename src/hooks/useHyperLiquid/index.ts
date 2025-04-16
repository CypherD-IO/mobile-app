import { parseSignature } from 'viem';
import useTransactionManager from '../useTransactionManager';
import useAxios from '../../core/HttpRequest';
import { useContext } from 'react';
import { HdWalletContext, sleepFor } from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import {
  ChainBackendNames,
  ChainConfigMapping,
  ChainNameMapping,
} from '../../constants/server';
import { get } from 'lodash';
import { IHyperLiquidTransfer } from '../../models/hyperliquid.interface';
import { HyperLiquidAccount, HyperLiquidTransfers } from '../../constants/enum';

export default function useHyperLiquid() {
  const { signTypedData } = useTransactionManager();
  const { postToOtherSource } = useAxios();
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const ethereum = hdWallet.state.wallet.ethereum;

  async function spotTransfer({
    chainId,
    amountToSend,
    toAddress,
    timeStampInMs,
    contractAddress,
    symbol,
  }: {
    chainId: number;
    amountToSend: string;
    toAddress: string;
    timeStampInMs: number;
    contractAddress: string;
    symbol: string;
  }) {
    const dataToBeSigned = {
      types: {
        'HyperliquidTransaction:SpotSend': [
          {
            name: 'hyperliquidChain',
            type: 'string',
          },
          {
            name: 'destination',
            type: 'string',
          },
          {
            name: 'token',
            type: 'string',
          },
          {
            name: 'amount',
            type: 'string',
          },
          {
            name: 'time',
            type: 'uint64',
          },
        ],
      },
      primaryType: 'HyperliquidTransaction:SpotSend',
      domain: {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId,
        verifyingContract:
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
      },
      message: {
        destination: toAddress as `0x${string}`,
        token: `${symbol}:${contractAddress}` as `0x${string}`,
        amount: amountToSend,
        time: timeStampInMs,
        hyperliquidChain: 'Mainnet',
      },
    };
    const response = await signTypedData({
      dataToBeSigned,
    });
    if (!response.isError) {
      console.log('signature', response.signature);
      console.log(
        'parseSignature',
        parseSignature(response.signature as `0x${string}`),
      );
      const { r, s, v } = parseSignature(response.signature as `0x${string}`);
      const signature = {
        r,
        s,
        v: Number(v),
      };
      return signature;
    } else {
      throw new Error(response.error);
    }
  }

  async function perpTransfer({
    chainId,
    amountToSend,
    toAddress,
    timeStampInMs,
    symbol,
  }: {
    chainId: number;
    amountToSend: string;
    toAddress: string;
    timeStampInMs: number;
    symbol: string;
  }) {
    const dataToBeSigned = {
      types: {
        'HyperliquidTransaction:UsdSend': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'destination', type: 'string' },
          { name: 'amount', type: 'string' },
          { name: 'time', type: 'uint64' },
        ],
      },
      primaryType: 'HyperliquidTransaction:UsdSend',
      domain: {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId,
        verifyingContract:
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
      },
      message: {
        destination: toAddress as `0x${string}`,
        amount: amountToSend,
        time: timeStampInMs,
        hyperliquidChain: 'Mainnet',
      },
    };
    const response = await signTypedData({
      dataToBeSigned,
    });
    if (!response.isError) {
      console.log('signature', response.signature);
      console.log(
        'parseSignature',
        parseSignature(response.signature as `0x${string}`),
      );
      const { r, s, v } = parseSignature(response.signature as `0x${string}`);
      const signature = {
        r,
        s,
        v: Number(v),
      };
      return signature;
    } else {
      throw new Error(response.error);
    }
  }

  async function transferOnHyperLiquid({
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
    accountType,
    symbol,
  }: {
    chain: ChainBackendNames;
    amountToSend: string;
    toAddress: string;
    contractAddress: string;
    contractDecimals: number;
    accountType: HyperLiquidAccount;
    symbol: string;
  }) {
    let payload;
    const chainConfig = get(
      ChainConfigMapping,
      String(get(ChainNameMapping, chain)),
    );
    const timeStampInMs = Date.now();
    if (accountType === HyperLiquidAccount.SPOT) {
      const signature = await spotTransfer({
        chainId: chainConfig.chainIdNumber,
        amountToSend,
        toAddress,
        contractAddress,
        timeStampInMs,
        symbol,
      });
      console.log('signature', signature);
      payload = {
        action: {
          type: 'spotSend',
          destination: toAddress as `0x${string}`,
          token: `${symbol}:${contractAddress}` as `0x${string}`,
          amount: amountToSend,
          signatureChainId: chainConfig.chain_id,
          time: timeStampInMs,
          hyperliquidChain: 'Mainnet',
        },
        nonce: timeStampInMs,
        signature,
      };
      console.log('payload', payload);
    } else if (accountType === HyperLiquidAccount.PERPETUAL) {
      console.log('perpTransfer');
      const signature = await perpTransfer({
        chainId: chainConfig.chainIdNumber,
        amountToSend,
        toAddress,
        timeStampInMs,
        symbol,
      });
      console.log('signature', signature);
      payload = {
        action: {
          type: 'usdSend',
          destination: toAddress as `0x${string}`,
          amount: amountToSend,
          signatureChainId: chainConfig.chain_id,
          time: timeStampInMs,
          hyperliquidChain: 'Mainnet',
        },
        nonce: timeStampInMs,
        signature,
      };
      console.log('payload', payload);
    }
    const result = await postToOtherSource(
      'https://api.hyperliquid.xyz/exchange',
      payload,
    );
    if (!result.isError) {
      await sleepFor(5000);
      const userTransfers = await postToOtherSource(
        'https://api.hyperliquid.xyz/info',
        {
          type: 'userNonFundingLedgerUpdates',
          user: ethereum.address,
        },
      );
      console.log('userTransfers', userTransfers.data);
      if (!userTransfers.isError) {
        let reqTransfer;
        if (accountType === HyperLiquidAccount.SPOT) {
          reqTransfer = userTransfers.data.filter(
            (transfer: IHyperLiquidTransfer) =>
              transfer.delta.type === HyperLiquidTransfers.SPOT_TRANSFER &&
              transfer.delta.token === symbol &&
              Number(transfer.delta.amount) === Number(amountToSend) &&
              transfer.delta?.destination?.toLowerCase() ===
                toAddress.toLowerCase(),
          );
        } else if (accountType === HyperLiquidAccount.PERPETUAL) {
          reqTransfer = userTransfers.data.filter(
            (transfer: IHyperLiquidTransfer) =>
              transfer.delta.type === HyperLiquidTransfers.PERPETUAL_TRANSFER &&
              Number(transfer.delta.usdc) === Number(amountToSend) &&
              transfer.delta?.destination?.toLowerCase() ===
                toAddress.toLowerCase(),
          );
        }

        const latestTransfer = reqTransfer.sort((a, b) => b.time - a.time)[0];
        console.log('latestTransfer', latestTransfer);
        if (latestTransfer) {
          return { isError: false, hash: latestTransfer.hash };
        }
      } else {
        console.log('userTransfers', userTransfers);
      }
    } else {
      console.log('result', result);
    }
  }

  return {
    transferOnHyperLiquid,
  };
}
