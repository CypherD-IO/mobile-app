import Toast from 'react-native-toast-message';
import Web3 from 'web3';
import { NativeTokenMapping } from '../constants/server';
import { getGasPriceFor } from '../containers/Browser/gasHelper';
import { SwapMetaData } from '../models/swapMetaData';

// Contract ABI for allowance and approval
const contractABI = [
  {
    constant: true,
    inputs: [
      {
        name: '',
        type: 'address',
      },
      {
        name: '',
        type: 'address',
      },
    ],
    name: 'allowance',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'guy',
        type: 'address',
      },
      {
        name: 'wad',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// Gives the router address the approval to access the token to be swapped in user's wallet
export const getApproval = async ({
  web3,
  fromTokenContractAddress,
  hdWallet,
  gasLimit,
  gasFeeResponse,
  contractData,
}: SwapMetaData) => {
  const { ethereum } = hdWallet.state.wallet;
  return await new Promise((resolve, reject) => {
    void (async () => {
      try {
        let gasPrice = gasFeeResponse.gasPrice;
        if (gasPrice > 1) {
          gasPrice = Math.floor(gasPrice);
        }
        const tx = {
          from: ethereum.address,
          to: fromTokenContractAddress,
          gasPrice: web3.utils.toWei(String(gasPrice.toFixed(9)), 'gwei'),
          value: '0x0',
          gas: web3.utils.toHex(String(gasLimit)),
          data: contractData,
        };
        const signPromise = web3.eth.accounts.signTransaction(
          tx,
          String(ethereum.privateKey),
        );
        signPromise.then(
          (signedTx: { rawTransaction: string }) => {
            void web3.eth
              .sendSignedTransaction(signedTx.rawTransaction)
              .once('transactionHash', function (hash: string) {})
              .once('receipt', function (receipt: unknown) {
                resolve(receipt);
              })
              .on('confirmation', function (confNumber: any) {})
              .on('error', function (error: any) {
                resolve(false);
              })
              .then(function (receipt: any) {});
          },
          (err: any) => {
            resolve(false);
          },
        );
      } catch (e: any) {
        resolve(false);
      }
    })();
  });
};

// Checks the allowance of router address over the token to be swapped in user's wallet and returns the contract data for approval
export const checkAllowance = async ({
  web3,
  fromToken,
  fromTokenContractAddress,
  routerAddress,
  amount,
  hdWallet,
}: SwapMetaData) => {
  const { ethereum } = hdWallet?.state.wallet;
  return await new Promise((resolve, reject) => {
    void (async () => {
      try {
        const contract = new web3.eth.Contract(
          contractABI,
          fromTokenContractAddress,
        );
        const response = await contract.methods
          .allowance(ethereum.address, routerAddress)
          .call();
        const tokenAmount = web3?.utils.toWei(
          String(Number(amount).toFixed(9)),
        );
        const allowance = response;
        if (Number(tokenAmount) > Number(allowance)) {
          if (Number(amount) < 1000) amount = 1000;
          const tokens = Web3.utils.toWei((Number(amount) * 10).toString());
          const resp = contract.methods
            .approve(routerAddress, tokens)
            .encodeABI();
          const gasLimit = await web3?.eth.estimateGas({
            from: ethereum.address,
            // For Optimism the ETH token has different contract address
            to: fromTokenContractAddress,
            value: '0x0',
            data: resp,
          });
          const gasFeeResponse = await getGasPriceFor(
            fromToken?.chainDetails,
            web3,
          );
          resolve({
            isAllowance: false,
            contract,
            contractData: resp,
            tokens,
            gasLimit,
            gasFeeResponse,
          });
        } else {
          resolve({ isAllowance: true });
        }
      } catch (e) {
        resolve(false);
      }
    })();
  });
};

// Sends the token to be swapped to router address
export const swapTokens = async ({
  web3,
  fromToken,
  amount,
  routerAddress,
  quoteData,
  hdWallet,
  gasLimit,
  gasFeeResponse,
}: SwapMetaData) => {
  return await new Promise((resolve, reject) => {
    void (async () => {
      try {
        const nativeTokenSymbol =
          NativeTokenMapping[fromToken.chainDetails.symbol] ||
          fromToken.chainDetails.symbol;
        const isNative = fromToken.symbol === nativeTokenSymbol;
        const { ethereum } = hdWallet.state.wallet;

        const tx = {
          chainId: quoteData.data.chainId,
          value: isNative
            ? web3.utils.toWei(
                String(Number(amount).toFixed(fromToken?.contractDecimals)),
                'ether',
              )
            : '0',
          to: routerAddress,
          data: quoteData.data.data,
          gas: web3.utils.toHex(2 * Number(gasLimit)),
          gasPrice: web3.utils.toWei(
            String(gasFeeResponse.gasPrice.toFixed(9)),
            'gwei',
          ),
        };
        const signPromise = web3?.eth.accounts.signTransaction(
          tx,
          String(ethereum.privateKey),
        );
        signPromise.then(
          (signedTx: { rawTransaction: any }) => {
            void web3.eth
              .sendSignedTransaction(signedTx.rawTransaction)
              .once('transactionHash', function (hash: any) {
                Toast.show({
                  type: 'info',
                  text1: 'Transaction Hash',
                  text2: hash,
                  position: 'bottom',
                });
              })
              .once('receipt', function (receipt: unknown) {
                resolve({ isError: false, receipt });
              })
              .on('confirmation', function (confNumber: any) {})
              .on('error', function (error: any) {
                resolve({ isError: true, error });
              })
              .then(function (receipt: unknown) {});
          },
          (err: any) => {
            resolve({ isError: true, error: err });
          },
        );
      } catch (e: any) {
        resolve({ isError: true, error: e });
      }
    })();
  });
};
