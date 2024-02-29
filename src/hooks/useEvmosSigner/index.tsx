import { signatureToPubkey } from '@hanchon/signature-to-pubkey';
import {
  SignTypedDataVersion,
  personalSign,
  signTypedData,
} from '@metamask/eth-sig-util';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import {
  createMessageSend,
  createTxIBCMsgTransfer,
  createTxRawEIP712,
  signatureToWeb3Extension,
} from '@tharsis/transactions';
import { useContext } from 'react';
import {
  HdWalletContext,
  convertAmountOfContractDecimal,
} from '../../core/util';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { ethers } from 'ethers';
import Long from 'long';
import { Chain } from '../../constants/server';

export default function useEvmosSigner() {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const getPublicKey = () => {
    const privateKeyBuffer = Buffer.from(
      ethereum.privateKey.substring(2),
      'hex',
    );

    const sig = personalSign({
      privateKey: privateKeyBuffer,
      data: 'generate_pubkey',
    });

    const publicKey = signatureToPubkey(
      sig,
      Buffer.from([
        50, 215, 18, 245, 169, 63, 252, 16, 225, 169, 71, 95, 254, 165, 146,
        216, 40, 162, 115, 78, 147, 125, 80, 182, 25, 69, 136, 250, 65, 200, 94,
        178,
      ]),
    );

    return publicKey;
  };
  const getSignedEvmosTransaction = ({
    chain,
    sender,
    fee,
    memo,
    params,
    isIBC = false,
  }: any) => {
    if (!sender.pubkey) {
      sender.pubkey = getPublicKey();
    }
    let msg;
    if (isIBC) {
      msg = createTxIBCMsgTransfer(chain, sender, fee, memo, params);
    } else {
      msg = createMessageSend(chain, sender, fee, memo, params);
    }

    const privateKeyBuffer = Buffer.from(
      ethereum.privateKey.substring(2),
      'hex',
    );

    const signature = signTypedData({
      privateKey: privateKeyBuffer,
      data: msg.eipToSign,
      version: SignTypedDataVersion.V4,
    });

    const extension = signatureToWeb3Extension(chain, sender, signature);

    const rawTx = createTxRawEIP712(
      msg.legacyAmino.body,
      msg.legacyAmino.authInfo,
      extension,
    );

    const body = generatePostBodyBroadcast(rawTx);
    return body;
  };

  const simulateEvmosIBCTransaction = ({
    toAddress,
    toChain,
    amount,
    denom,
    contractDecimals,
    userAccountData,
    gasFee = '14000000000000000',
    gasWanted = '450000',
  }: {
    toAddress: string;
    toChain: Chain;
    amount: string;
    denom: string;
    contractDecimals: number;
    userAccountData: any;
    gasFee?: string;
    gasWanted?: string;
  }) => {
    const { evmos } = hdWalletContext.state.wallet;
    const fromAddress: string = evmos.address;
    const chainData = {
      chainId: 9001,
      cosmosChainId: 'evmos_9001-2',
    };

    const accountData = userAccountData.data.account.base_account;
    const sender = {
      accountAddress: fromAddress,
      sequence: accountData.sequence,
      accountNumber: accountData.account_number,
      pubkey: accountData.pub_key.key,
    };

    const fee = {
      amount: gasFee,
      denom: cosmosConfig.evmos.denom,
      gas: gasWanted,
    };

    const params = {
      receiver: toAddress,
      denom: denom,
      amount: ethers.utils
        .parseUnits(
          convertAmountOfContractDecimal(amount, contractDecimals),
          contractDecimals,
        )
        .toString(),
      sourcePort: 'transfer',
      sourceChannel:
        cosmosConfig.evmos.channel[toChain.chainName.toLowerCase()],
      revisionNumber: Long.fromNumber(456),
      revisionHeight: Long.fromNumber(123),
      timeoutTimestamp: (
        1e9 *
        (Math.floor(Date.now() / 1e3) + 1200)
      ).toString(),
    };

    const memo = 'Cypher Wallet';

    return getSignedEvmosTransaction({
      chain: chainData,
      sender,
      fee,
      memo,
      params,
      isIBC: true,
    });
  };

  return { getSignedEvmosTransaction, simulateEvmosIBCTransaction };
}
