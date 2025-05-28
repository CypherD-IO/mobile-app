/**
 * @format
 * @flow
 */
import { GasPriceDetail } from '../../core/types';
import axios from '../../core/Http';
import {
  Chain,
  CHAIN_ETH,
  CHAIN_BSC,
  CHAIN_OPTIMISM,
} from '../../constants/server';
import { removeOutliers } from '../../misc/outliers';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../../global';
import { DecimalHelper } from '../../utils/decimalHelper';
import { limitDecimalPlaces } from '../../core/util';
import {
  formatGwei,
  PublicClient,
  parseGwei,
  formatEther,
  hexToBigInt,
  toHex,
} from 'viem';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

const minimumGasFee = '20';

async function getGasPriceFromBackend({
  backendName,
}: Chain): Promise<GasPriceDetail> {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const result = await axios.get<GasPriceDetail>(
    `${ARCH_HOST}/v1/prices/gas/${backendName}`,
  );
  return result.data;
}

async function getGasPriceLocallyUsingGasHistory(
  { backendName }: Chain,
  publicClient: PublicClient,
): Promise<GasPriceDetail> {
  const lastNBlocks = 5;
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  try {
    const tokenPrice = await axios.get(
      `${ARCH_HOST}/v1/prices/native/${backendName}`,
    );
    const gasHistory = await publicClient.getFeeHistory({
      blockCount: lastNBlocks,
      blockTag: 'latest',
      rewardPercentiles: [70, 75, 80, 85, 90, 95, 98],
    });
    // get the above percentiles and remove the outliers and take the max value.
    const { reward } = gasHistory;
    const percentileArr: number[] = [];
    reward?.forEach(element => {
      percentileArr.push(
        ...element.map(percentile =>
          Number.parseFloat(formatGwei(percentile) || minimumGasFee),
        ),
      );
    });
    const afterRemovingOutliers = removeOutliers(percentileArr); // will return the sorted array
    void logAnalyticsToFirebase(AnalyticEvent.GAS_OPTIMISATION, {
      after: afterRemovingOutliers,
      b4: percentileArr,
      chain: backendName,
    });
    let percentileGasFee = afterRemovingOutliers.at(
      afterRemovingOutliers.length - 1,
    ); // since its sorted, take the last element.

    // since the gas fee is 0 in evmos, setting it to minimum of 20
    percentileGasFee = percentileGasFee === 0 ? 20 : percentileGasFee;

    if (percentileGasFee) {
      const gasDetail = {
        gasPrice: percentileGasFee,
        tokenPrice: tokenPrice.data.usd,
        chainId: backendName,
      };
      return gasDetail;
    }
    throw new Error(`Gas fee local calculation failed for ${backendName}`);
  } catch (err) {
    Sentry.captureException(err);
    throw err;
  }
}

export async function getGasPriceFor(
  chain: Chain,
  publicClient: PublicClient,
): Promise<GasPriceDetail> {
  let gasPrice: GasPriceDetail;
  try {
    gasPrice = await getGasPriceFromBackend(chain);
    return gasPrice;
  } catch (e) {
    Sentry.captureException(e);
  }

  if (![CHAIN_ETH, CHAIN_OPTIMISM, CHAIN_BSC].includes(chain)) {
    try {
      gasPrice = await getGasPriceLocallyUsingGasHistory(chain, publicClient);
      return gasPrice;
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  return { chainId: chain.backendName, gasPrice: 0, tokenPrice: 0 }; // final fallback case
}

export async function getPayloadParams(
  payload: any,
  gasDetail: GasPriceDetail,
  chain: Chain,
  gasLimit: bigint,
): Promise<any> {
  const {
    params: [{ value }],
  } = payload;

  const totalGasFeeInCrypto = formatEther(
    parseGwei(
      DecimalHelper.toString(
        DecimalHelper.multiply(gasDetail.gasPrice, Number(gasLimit)),
        9,
      ),
    ),
  );

  const finalGasPriceInHex = toHex(parseGwei(gasDetail.gasPrice.toFixed(9)));

  const valueETH = value ? formatEther(hexToBigInt(value)) : '0';

  let gasFeeDollar;
  let valueDollar = '0';
  let totalDollar = '0';
  let totalEth = '0';
  if (gasDetail.tokenPrice > 0) {
    const nativeTokenPrice = gasDetail.tokenPrice;
    gasFeeDollar = DecimalHelper.toString(
      DecimalHelper.multiply(totalGasFeeInCrypto, nativeTokenPrice),
      2,
    );
    valueDollar = DecimalHelper.toString(
      DecimalHelper.multiply(valueETH, nativeTokenPrice),
      2,
    );
    totalEth = DecimalHelper.add(valueETH, totalGasFeeInCrypto).toString();
    totalDollar = DecimalHelper.toString(
      DecimalHelper.multiply(totalEth, nativeTokenPrice),
      2,
    );
  }
  const paymodalParams = {
    chainIdNumber: chain.chainIdNumber,
    gasFeeDollar,
    gasFeeETH: DecimalHelper.toString(
      DecimalHelper.fromString(totalGasFeeInCrypto),
      6,
    ),
    networkName: chain.name,
    networkCurrency: chain.symbol,
    valueETH: limitDecimalPlaces(valueETH, 6),
    valueDollar,
    totalDollar,
    totalETH: limitDecimalPlaces(totalEth, 6),
    appImage: chain.logo_url,
    finalGasPrice: finalGasPriceInHex,
    gasLimit,
    gasPrice: gasDetail,
    payload,
  };

  return paymodalParams;
}

export async function estimateGas(
  payload: any,
  publicClient: PublicClient,
  address: string,
  selectedChain: Chain,
  gasDetail: GasPriceDetail,
  payModal: (params: any, to: string) => void,
) {
  let strPaymentPrompt = `Chain: ${selectedChain.name}`;

  const {
    params: [{ value, to, data, gasPrice }],
  } = payload;
  if (value) {
    const valueFormatted = formatEther(hexToBigInt(value));
    strPaymentPrompt = `${strPaymentPrompt}\nValue: ${valueFormatted} ${
      selectedChain.symbol ?? 'ETH'
    }`;
  }

  try {
    const gasLimit = await publicClient.estimateGas({
      to: to as `0x${string}`,
      data: data as `0x${string}`,
      value: value ? hexToBigInt(value) : undefined,
      account: address as `0x${string}`,
    });

    let finalGasPrice;
    if (gasPrice) {
      if (gasPrice.startsWith('0x')) {
        finalGasPrice = formatGwei(hexToBigInt(gasPrice));
      } else {
        finalGasPrice = formatGwei(BigInt(gasPrice));
      }
    } else if (gasDetail.gasPrice > 0) {
      finalGasPrice = gasDetail.gasPrice;
    }

    let totalGasFeeInCrypto = '0'; // gas limit * gas price in Gwei
    let finalGasPriceInHex;
    if (finalGasPrice) {
      totalGasFeeInCrypto = formatEther(
        parseGwei(
          DecimalHelper.toString(
            DecimalHelper.multiply(finalGasPrice, Number(gasLimit)),
            9,
          ),
        ),
      );
      finalGasPriceInHex = toHex(
        parseGwei(limitDecimalPlaces(finalGasPrice, 9)),
      );
    }

    let valueETH = '0';
    if (value !== undefined) {
      valueETH = formatEther(hexToBigInt(value));
    }

    let gasFeeDollar;
    let valueDollar = '0';
    let totalDollar = '0';
    let totalEth = '0';
    if (gasDetail.tokenPrice > 0) {
      const nativeTokenPrice = gasDetail.tokenPrice;
      gasFeeDollar = DecimalHelper.toString(
        DecimalHelper.multiply(totalGasFeeInCrypto, nativeTokenPrice),
        2,
      );
      valueDollar = DecimalHelper.toString(
        DecimalHelper.multiply(valueETH, nativeTokenPrice),
        2,
      );
      totalEth = DecimalHelper.add(valueETH, totalGasFeeInCrypto).toString();
      totalDollar = DecimalHelper.toString(
        DecimalHelper.multiply(totalEth, nativeTokenPrice),
        2,
      );
    }
    const paymodalParams = {
      chainIdNumber: selectedChain.chainIdNumber,
      gasFeeDollar,
      gasFeeETH: DecimalHelper.toString(
        DecimalHelper.fromString(totalGasFeeInCrypto),
        6,
      ),
      networkName: selectedChain.name,
      networkCurrency: selectedChain.symbol,
      valueETH: limitDecimalPlaces(valueETH, 6),
      valueDollar,
      totalDollar,
      totalETH: limitDecimalPlaces(totalEth, 6),
      appImage: selectedChain.logo_url,
      finalGasPrice: finalGasPriceInHex,
      gasLimit,
      gasPrice: gasDetail,
      payload,
    };

    payModal(paymodalParams, to);
  } catch (error) {
    // TODO (user feedback): Give feedback to user.
    Sentry.captureException(error);
  }
}
