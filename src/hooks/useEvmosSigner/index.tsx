import { signatureToPubkey } from '@hanchon/signature-to-pubkey';
import {
  SignTypedDataVersion,
  personalSign,
  signTypedData,
} from '@metamask/eth-sig-util';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import {
  createMessageSend,
  createTxRawEIP712,
  signatureToWeb3Extension,
} from '@tharsis/transactions';
import { useContext } from 'react';
import { HdWalletContext } from '../../core/util';

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
  }: any) => {
    if (!sender.pubkey) {
      sender.pubkey = getPublicKey();
    }
    const msg = createMessageSend(chain, sender, fee, memo, params);

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

  return { getSignedEvmosTransaction };
}
