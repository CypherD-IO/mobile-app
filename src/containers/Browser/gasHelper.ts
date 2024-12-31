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
import Web3 from 'web3';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { hostWorker } from '../../global';

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
  web3RPCEndpoint: Web3,
): Promise<GasPriceDetail> {
  const lastNBlocks = 5;
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  try {
    const tokenPrice = await axios.get(
      `${ARCH_HOST}/v1/prices/native/${backendName}`,
    );
    const gasHistory = await web3RPCEndpoint.eth.getFeeHistory(
      lastNBlocks,
      'latest',
      [70, 75, 80, 85, 90, 95, 98],
    );
    // get the above percentiles and remove the outliers and take the max value.
    const { reward } = gasHistory;
    const percentileArr: number[] = [];
    reward.forEach(element => {
      percentileArr.push(
        ...element.map(percentile =>
          Number.parseFloat(
            Web3.utils.fromWei(percentile, 'gwei') || minimumGasFee,
          ),
        ),
      );
    });
    const afterRemovingOutliers = removeOutliers(percentileArr); // will return the sorted array
    void analytics().logEvent('gas_optimisation', {
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
  web3RPCEndpoint: Web3,
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
      gasPrice = await getGasPriceLocallyUsingGasHistory(
        chain,
        web3RPCEndpoint,
      );
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
  gasLimit: any,
): Promise<any> {
  const {
    params: [{ value }],
  } = payload;

  const totalGasFeeInGwei = parseFloat(
    Web3.utils.fromWei(
      Web3.utils.toWei(
        (parseFloat(gasDetail.gasPrice.toString()) * gasLimit).toFixed(9),
        'gwei',
      ),
      'ether',
    ),
  );

  const finalGasPriceInHex = Web3.utils.toHex(
    Web3.utils.toWei(gasDetail.gasPrice.toFixed(9), 'Gwei'),
  );

  const valueETH = value
    ? parseFloat(
        Web3.utils.fromWei(Web3.utils.hexToNumberString(value), 'ether'),
      )
    : 0;

  let gasFeeDollar;
  let valueDollar = 0;
  let totalDollar = 0;
  let totalEth = 0;
  if (gasDetail.tokenPrice > 0) {
    const nativeTokenPrice = gasDetail.tokenPrice;
    gasFeeDollar = (totalGasFeeInGwei * nativeTokenPrice).toFixed(2);
    valueDollar = parseFloat((valueETH * nativeTokenPrice).toFixed(2));
    totalEth = valueETH + totalGasFeeInGwei;
    totalDollar = parseFloat((totalEth * nativeTokenPrice).toFixed(2));
  }
  const paymodalParams = {
    chainIdNumber: chain.chainIdNumber,
    gasFeeDollar,
    gasFeeETH: totalGasFeeInGwei.toFixed(6),
    networkName: chain.name,
    networkCurrency: chain.symbol,
    valueETH: valueETH.toFixed(6),
    valueDollar,
    totalDollar,
    totalETH: totalEth.toFixed(6),
    appImage: chain.logo_url,
    finalGasPrice: finalGasPriceInHex,
    gasLimit,
    gasPrice: gasDetail,
    payload,
  };

  return paymodalParams;
}

export function estimateGas(
  payload,
  webviewRef,
  hdWalletContext,
  selectedChain,
  gasDetail: GasPriceDetail,
  payModal,
  web3RPCEndpoint: Web3,
) {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  let strPaymentPrompt = 'Chain: ' + selectedChain;

  const {
    params: [{ value, to, data, gasPrice }],
  } = payload;
  if (value) {
    const valueFormatted = Web3.utils.fromWei(
      Web3.utils.hexToNumberString(value),
      'ether',
    );
    strPaymentPrompt = `${strPaymentPrompt}\nValue: ${valueFormatted} ${
      selectedChain.symbol ?? 'ETH'
    }`;
  }

  web3RPCEndpoint.eth
    .estimateGas({
      to,
      data,
      value,
      from: ethereum.address,
    })
    .then(gasLimit => {
      let finalGasPrice;
      if (gasPrice) {
        if (gasPrice.startsWith('0x')) {
          finalGasPrice = Web3.utils.fromWei(
            Web3.utils.hexToNumberString(gasPrice),
            'Gwei',
          );
        } else {
          // Finally this code path has a breaking test-case with KOGE when gasPrice is an integer
          finalGasPrice = Web3.utils.fromWei(gasPrice, 'Gwei');
        }
      } else if (gasDetail.gasPrice > 0) {
        finalGasPrice = gasDetail.gasPrice;
      }

      let totalGasFeeInGwei = 0; // gas limit * gas price in Gwei
      let finalGasPriceInHex;
      if (finalGasPrice) {
        totalGasFeeInGwei = parseFloat(
          Web3.utils.fromWei(
            Web3.utils.toWei(
              (parseFloat(String(finalGasPrice)) * Number(gasLimit)).toFixed(9),
              'gwei',
            ),
            'ether',
          ),
        );
        finalGasPriceInHex = Web3.utils.toHex(
          Web3.utils.toWei(
            parseFloat(String(finalGasPrice)).toFixed(9),
            'Gwei',
          ),
        );
      }

      let valueETH = 0;
      if (value !== undefined) {
        valueETH = parseFloat(
          Web3.utils.fromWei(Web3.utils.hexToNumberString(value), 'ether'),
        );
      }

      let gasFeeDollar;
      let valueDollar = 0;
      let totalDollar = 0;
      let totalEth = 0;
      if (gasDetail.tokenPrice > 0) {
        const nativeTokenPrice = gasDetail.tokenPrice;
        gasFeeDollar = (totalGasFeeInGwei * nativeTokenPrice).toFixed(2);
        valueDollar = parseFloat((valueETH * nativeTokenPrice).toFixed(2));
        totalEth = valueETH + totalGasFeeInGwei;
        totalDollar = parseFloat((totalEth * nativeTokenPrice).toFixed(2));
      }
      const paymodalParams = {
        chainIdNumber: selectedChain.chainIdNumber,
        gasFeeDollar,
        gasFeeETH: totalGasFeeInGwei.toFixed(6),
        networkName: selectedChain.name,
        networkCurrency: selectedChain.symbol,
        valueETH: valueETH.toFixed(6),
        valueDollar,
        totalDollar,
        totalETH: totalEth.toFixed(6),
        appImage: selectedChain.logo_url,
        finalGasPrice: finalGasPriceInHex,
        gasLimit,
        gasPrice: gasDetail,
        payload,
      };

      payModal(paymodalParams, to);
    })
    .catch(error => {
      // TODO (user feedback): Give feedback to user.
      Sentry.captureException(error);
    });
}
