import { StdSignDoc } from '@cosmjs-rn/amino';
import { AuthInfo, SignDoc } from '@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx';
import { ProtoSignDocDecoder } from './cosmos/decoder';
import { getChainInfo } from './util';

const defaultGasPriceStep = {
  low: 0.01,
  average: 0.025,
  high: 0.04
};

export const calculateFeeSignAmino = (chainId: string, signDoc: StdSignDoc) => {
  const chainInfo = getChainInfo(chainId);
  const modifiedFeeSignDoc: any = signDoc;
  for (let i = 0; i < signDoc.fee.amount.length; i++) {
    const feeCurrencyIndex = chainInfo.feeCurrencies.findIndex((fee: any) => [fee.coinDenom, fee.coinMinimalDenom].includes(signDoc.fee.amount[i].denom));

    if (feeCurrencyIndex < 0) {
      throw new Error('FeeCurrency denom given is not a feeCurrency denom for this chain');
    } else {
      const averageProp = chainInfo?.feeCurrencies?.[feeCurrencyIndex]?.gasPriceStep?.high;
      const fee = (averageProp ?? defaultGasPriceStep.high) * parseInt(signDoc.fee.gas);
      modifiedFeeSignDoc.fee.amount[i].denom = chainInfo?.feeCurrencies?.[feeCurrencyIndex]?.coinMinimalDenom;
      modifiedFeeSignDoc.fee.amount[i].amount = parseInt(fee.toString()).toString();
    }
  }

  if (signDoc.fee.amount.length === 0) {
    const averageProp = chainInfo?.feeCurrencies?.[0]?.gasPriceStep?.high;
    const fee = (averageProp ?? defaultGasPriceStep.high) * parseInt(signDoc.fee.gas);
    modifiedFeeSignDoc.fee.amount.push({
      denom: chainInfo?.feeCurrencies?.[0]?.coinMinimalDenom,
      amount: parseInt(fee.toString()).toString()
    });
  }

  return modifiedFeeSignDoc as StdSignDoc;
};

export const calculateFeeSignDirect = (chainId: string, signDoc: SignDoc) => {
  const chainInfo = getChainInfo(chainId);
  const authInfo: any = AuthInfo.decode(signDoc.authInfoBytes);

  const decoder = new ProtoSignDocDecoder(signDoc);
  const decoded = decoder.toJSON();

  const nMessages = decoded.txBody.messages.length;

  for (let i = 0; i < authInfo.fee.amount.length; i++) {
    const feeCurrencyIndex = chainInfo.feeCurrencies.findIndex((fee: any) => [fee.coinDenom, fee.coinMinimalDenom].includes(authInfo.fee.amount[i].denom));

    if (feeCurrencyIndex < 0) {
      throw new Error('FeeCurrency denom given is not a feeCurrency denom for this chain');
    } else {
      const limit = authInfo.fee.gasLimit * nMessages;
      authInfo.fee.gasLimit = limit.toString();
      const averageProp = chainInfo?.feeCurrencies?.[feeCurrencyIndex]?.gasPriceStep?.high;
      const fee = (averageProp ?? defaultGasPriceStep.high) * parseInt(authInfo.fee.gasLimit || authInfo.fee.gas);
      authInfo.fee.amount[i].denom = chainInfo?.feeCurrencies?.[feeCurrencyIndex]?.coinMinimalDenom;
      authInfo.fee.amount[i].amount = parseInt(fee.toString()).toString();
    }
  }

  return authInfo as AuthInfo;
};
