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
  createTxMsgBeginRedelegate,
  createTxMsgDelegate,
  createTxMsgMultipleWithdrawDelegatorReward,
  createTxMsgUndelegate,
  createTxRawEIP712,
  signatureToWeb3Extension,
} from '@tharsis/transactions';
import { useContext } from 'react';
import {
  HdWalletContext,
  convertAmountOfContractDecimal,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { ethers } from 'ethers';
import Long from 'long';
import { Chain } from '../../constants/server';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';

export default function useEvmosSigner() {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const getPublicKey = async () => {
    const privateKeyBuffer = await getPrivateKeyBuffer();
    if (privateKeyBuffer) {
      const sig = personalSign({
        privateKey: privateKeyBuffer,
        data: 'generate_pubkey',
      });

      const publicKey = signatureToPubkey(
        sig,
        Buffer.from([
          50, 215, 18, 245, 169, 63, 252, 16, 225, 169, 71, 95, 254, 165, 146,
          216, 40, 162, 115, 78, 147, 125, 80, 182, 25, 69, 136, 250, 65, 200,
          94, 178,
        ]),
      );

      return publicKey;
    }
  };

  const getPrivateKey = async () => {
    return await loadPrivateKeyFromKeyChain(
      false,
      hdWalletContext.state.pinValue,
    );
  };

  const getPrivateKeyBuffer = async () => {
    const privateKey = await getPrivateKey();
    if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_)
      return Buffer.from(privateKey.substring(2), 'hex');
    return undefined;
  };
  const getSignedEvmosTransaction = async ({
    chain,
    sender,
    fee,
    memo,
    params,
    isIBC = false,
  }: any) => {
    if (!sender.pubkey) {
      sender.pubkey = await getPublicKey();
    }
    let msg;
    if (isIBC) {
      msg = createTxIBCMsgTransfer(chain, sender, fee, memo, params);
    } else {
      msg = createMessageSend(chain, sender, fee, memo, params);
    }

    const privateKey = await loadPrivateKeyFromKeyChain(
      false,
      hdWalletContext.state.pinValue,
    );
    if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
      const privateKeyBuffer = Buffer.from(privateKey.substring(2), 'hex');

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
    }
  };

  const simulateEvmosIBCTransaction = async ({
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
      denom,
      amount: ethers
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

    return await getSignedEvmosTransaction({
      chain: chainData,
      sender,
      fee,
      memo,
      params,
      isIBC: true,
    });
  };

  const simulateEvmosClaimReward = async ({
    fromAddress,
    validatorAddresses,
    privateKeyBuffer,
    accountData,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    fromAddress: string;
    validatorAddresses: string[];
    privateKeyBuffer: Buffer;
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

    const memo = 'Cypher Wallet evmos staking';

    const params = { validatorAddresses };

    const msg: any = createTxMsgMultipleWithdrawDelegatorReward(
      chain,
      sender,
      fee,
      memo,
      params,
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

    return generatePostBodyBroadcast(rawTx);
  };

  const simulateEvmosDelegate = async ({
    fromAddress,
    validatorAddress,
    amountToDelegate,
    privateKeyBuffer,
    accountData,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    fromAddress: string;
    validatorAddress: string;
    amountToDelegate: string;
    privateKeyBuffer: Buffer;
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

    const memo = 'Cypher Wallet evmos staking';

    const params = {
      validatorAddress,
      amount: amountToDelegate,
      denom: cosmosConfig.evmos.denom,
    };

    const msg: any = createTxMsgDelegate(chain, sender, fee, memo, params);

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

    return generatePostBodyBroadcast(rawTx);
  };

  const simulateEvmosReDelegate = async ({
    fromAddress,
    validatorSrcAddress,
    validatorDstAddress,
    amountToReDelegate,
    privateKeyBuffer,
    accountData,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    fromAddress: string;
    validatorSrcAddress: string;
    validatorDstAddress: string;
    amountToReDelegate: string;
    privateKeyBuffer: Buffer;
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

    const memo = 'Cypher Wallet evmos staking';

    const params = {
      validatorSrcAddress,
      validatorDstAddress,
      amount: amountToReDelegate,
      denom: cosmosConfig.evmos.denom,
    };

    const msg: any = createTxMsgBeginRedelegate(
      chain,
      sender,
      fee,
      memo,
      params,
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

    return generatePostBodyBroadcast(rawTx);
  };

  const simulateEvmosUnDelegate = async ({
    fromAddress,
    validatorAddress,
    amountToUnDelegate,
    privateKeyBuffer,
    accountData,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    fromAddress: string;
    validatorAddress: string;
    amountToUnDelegate: string;
    privateKeyBuffer: Buffer;
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

    const memo = 'Cypher Wallet evmos staking';

    const params = {
      validatorAddress,
      amount: amountToUnDelegate,
      denom: cosmosConfig.evmos.denom,
    };

    const msg: any = createTxMsgUndelegate(chain, sender, fee, memo, params);

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

    return generatePostBodyBroadcast(rawTx);
  };

  return {
    getPrivateKeyBuffer,
    getSignedEvmosTransaction,
    simulateEvmosIBCTransaction,
    simulateEvmosClaimReward,
    simulateEvmosDelegate,
    simulateEvmosReDelegate,
    simulateEvmosUnDelegate,
  };
}
