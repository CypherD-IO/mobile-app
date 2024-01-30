import { ethers } from 'ethers';
import {
  ACCOUNT_DETAILS_INFO,
  CHAIN_BSC,
  CHAIN_ETH,
  CHAIN_OPTIMISM,
  ChainBackendNames,
  OP_ETH_ADDRESS,
  SIMULATION_ENDPOINT,
} from '../../constants/server';
import useAxios from '../../core/HttpRequest';
import Web3 from 'web3';
import { removeOutliers } from '../../misc/outliers';
import { GasPriceDetail } from '../../core/types';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { EvmGasInterface } from '../../models/evmGas.interface';
import axios from '../../core/Http';
import { cosmosConfig } from '../../constants/cosmosConfig';
import useEvmosSigner from '../useEvmosSigner';
import { useContext } from 'react';
import { HdWalletContext, limitDecimalPlaces } from '../../core/util';

export default function useGasService() {
  const { getWithoutAuth } = useAxios();
  const minimumGasFee = '20';
  const { getSignedEvmosTransaction } = useEvmosSigner();
  const hdWalletContext = useContext<any>(HdWalletContext);

  async function getGasPriceLocallyUsingGasHistory(
    chain: ChainBackendNames,
    web3RPCEndpoint: Web3,
  ): Promise<GasPriceDetail> {
    const lastNBlocks = 5;
    try {
      const response = await getWithoutAuth(`/v1/prices/native/${chain}`);
      if (!response.isError) {
        const tokenPrice = response.data;
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
          chain,
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
            chainId: chain,
          };
          return gasDetail;
        }
        throw new Error(`Gas fee local calculation failed for ${chain}`);
      } else {
        throw response.error;
      }
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  async function getGasPrice(chain: ChainBackendNames, web3RPCEndpoint: Web3) {
    const response = await getWithoutAuth(`/v1/prices/gas/${chain}`);
    if (!response.isError) {
      return response.data;
    } else {
      if (
        ![
          CHAIN_ETH.backendName,
          CHAIN_OPTIMISM.backendName,
          CHAIN_BSC.backendName,
        ].includes(chain)
      ) {
        try {
          const gasPrice = await getGasPriceLocallyUsingGasHistory(
            chain,
            web3RPCEndpoint,
          );
          return gasPrice;
        } catch (e) {
          Sentry.captureException(e);
        }
      }
    }
    return { chainId: chain, gasPrice: 0, tokenPrice: 0 };
  }

  const estimateGasForEvm = async ({
    web3,
    chain,
    fromAddress,
    toAddress,
    amountToSend,
    contractAddress,
    contractDecimals,
  }: EvmGasInterface) => {
    // How many tokens? -- Use BigNumber everywhere
    const numberOfTokens = ethers.utils.parseUnits(
      amountToSend,
      contractDecimals,
    );
    // Form the contract and contract data
    const contract = new web3.eth.Contract(
      [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            {
              name: '_to',
              type: 'address',
            },
            {
              type: 'uint256',
              name: '_tokens',
            },
          ],
          constant: false,
          outputs: [],
          payable: false,
        },
      ],
      contractAddress,
    );
    const contractData = contract.methods
      .transfer(toAddress, numberOfTokens)
      .encodeABI();
    try {
      const gasPriceDetail = await getGasPrice(chain, web3);
      const gasLimit = await web3.eth.estimateGas({
        from: fromAddress,
        // For Optimism the ETH token has different contract address
        to:
          contractAddress.toLowerCase() === OP_ETH_ADDRESS
            ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            : contractAddress,
        value: '0x0',
        data: contractData,
      });
      if (gasLimit) {
        let finalGasPrice;
        if (gasPriceDetail.gasPrice > 0) {
          finalGasPrice = gasPriceDetail.gasPrice;
        }

        let gasFeeInCrypto = '0';
        if (finalGasPrice) {
          gasFeeInCrypto = web3.utils.fromWei(
            web3.utils.toWei((finalGasPrice * gasLimit).toFixed(9), 'gwei'),
          );
          finalGasPrice = web3.utils.toHex(
            web3.utils.toWei(finalGasPrice.toFixed(9), 'gwei'),
          );
        }
        return { gasFeeInCrypto, gasLimit, gasPrice: finalGasPrice };
      }
    } catch (error) {
      Sentry.captureException(error);
    }
    return { gasFeeInCrypto: 0, gasLimit: 0, gasPrice: 0 }; // fallback
  };

  const simulateEvmosTransaction = async ({
    toAddress,
    amountToSend,
    gasAmount = '14000000000000000',
    gas = '450000',
  }: {
    toAddress: string;
    amountToSend: string;
    gasAmount?: string;
    gas?: string;
  }) => {
    const { evmos } = hdWalletContext.state.wallet;
    const fromAddress: string = evmos.address;
    const userAccountData = await axios.get(
      `${ACCOUNT_DETAILS_INFO}/${fromAddress}`,
    );
    const accountData = userAccountData?.data?.account.base_account;

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

    const memo = '';

    const params = {
      destinationAddress: toAddress,
      amount: ethers.utils
        .parseUnits(limitDecimalPlaces(amountToSend, 18), 18)
        .toString(),
      denom: cosmosConfig.evmos.denom,
    };

    const body = getSignedEvmosTransaction({
      chain,
      sender,
      fee,
      memo,
      params,
    });
    return body;
  };

  const estimateGasForEvmos = async ({
    toAddress,
    amountToSend,
  }: {
    toAddress: string;
    amountToSend: string;
  }) => {
    const txnRequest = await simulateEvmosTransaction({
      toAddress,
      amountToSend,
    });
    const response = await axios.post(SIMULATION_ENDPOINT, txnRequest);
    const simulatedGasInfo = response.data.gas_info
      ? response.data.gas_info
      : 0;
    const gasWanted = simulatedGasInfo.gas_used ? simulatedGasInfo.gas_used : 0;
    const gasFeeInCrypto = cosmosConfig.evmos.gasPrice * gasWanted;
    return {
      simulatedTxnRequest: txnRequest,
      gasFeeInCrypto,
      gasLimit: gasWanted,
      gasPrice: cosmosConfig.evmos.gasPrice,
    };
  };

  return { estimateGasForEvm, estimateGasForEvmos };
}
