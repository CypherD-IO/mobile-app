import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import AppImages from '../../../assets/images/appImages';
import {
  ActivityContext,
  convertAmountOfContractDecimal,
  HdWalletContext,
  validateAmount,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
} from '../../core/util';
import clsx from 'clsx';
import {
  Chain,
  ChainBackendNames,
  GASLESS_CHAINS,
  IBC_CHAINS,
} from '../../constants/server';
import { gasFeeReservation } from '../../constants/data';
import LottieView from 'lottie-react-native';
import { cosmosConfig, IIBCData } from '../../constants/cosmosConfig';
import {
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs-rn/stargate';
import Long from 'long';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import { OfflineDirectSigner } from '@cosmjs-rn/proto-signing';
import { getSignerClient } from '../../core/Keychain';
import { ethers } from 'ethers';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import * as Sentry from '@sentry/react-native';
import SignatureModal from '../../components/v2/signatureModal';
import { screenTitle } from '../../constants';
import axios, { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import {
  createTxIBCMsgTransfer,
  createTxRawEIP712,
  signatureToWeb3Extension,
} from '@tharsis/transactions';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import CyDModalLayout from '../../components/v2/modal';
import Button from '../../components/v2/button';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  IBCTransaction,
} from '../../reducers/activity_reducer';
import { genId } from '../utilities/activityUtilities';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { MODAL_CLOSING_TIMEOUT } from '../../constants/timeOuts';
import { SuccessTransaction } from '../../components/v2/StateModal';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import { AnalyticsType } from '../../constants/enum';

export default function IBC({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { tokenData } = route.params;
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const globalStateContext = useContext<any>(GlobalContext);
  const cosmos = hdWallet.state.wallet.cosmos;
  const ethereum = hdWallet.state.wallet.ethereum;
  const osmosis = hdWallet.state.wallet.osmosis;
  const evmos = hdWallet.state.wallet.evmos;
  const juno = hdWallet.state.wallet.juno;
  const stargaze = hdWallet.state.wallet.stargaze;
  const noble = hdWallet.state.wallet.noble;

  const evmosUrls = globalStateContext.globalState.rpcEndpoints.EVMOS.otherUrls;
  const ACCOUNT_DETAILS = evmosUrls.accountDetails.replace(
    'address',
    evmos.wallets[evmos.currentIndex].address,
  );
  const SIMULATION_ENDPOINT = evmosUrls.simulate;
  const TXN_ENDPOINT = evmosUrls.transact;

  const [chain, setChain] = useState<Chain>([]);
  const [chainData, setChainData] = useState<Chain[]>(IBC_CHAINS);
  const [showChain, setShowChain] = useState<boolean>(false);
  const [showMerged, setShowMerged] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('0.00');
  const [loading, setLoading] = useState<boolean>(false);
  const [wallets, setWallets] = useState<any>(null);
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [senderAddress, setSenderAddress] = useState<string>('');
  const [rpc, setRpc] = useState<string>('');
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [gasFee, setGasFee] = useState<number>(0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const activityContext = useContext<any>(ActivityContext);
  const activityRef = useRef<IBCTransaction | null>(null);
  const { showModal, hideModal } = useGlobalModalContext();
  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    const temp: Chain[] = [];
    IBC_CHAINS.forEach((item) => {
      if (
        (tokenData.chainDetails.backendName === ChainBackendNames.STARGAZE &&
          item.backendName === ChainBackendNames.COSMOS) ||
        (tokenData.chainDetails.backendName === ChainBackendNames.COSMOS &&
          item.backendName === ChainBackendNames.STARGAZE)
      ) {
        return;
      }
      if (tokenData.chainDetails.backendName !== item.backendName) {
        temp.push(item);
      }
    });

    setChainData(temp);
    setChain(temp[0]);

    setRpc(
      globalStateContext.globalState.rpcEndpoints[
        tokenData.chainDetails.chainName.toUpperCase()
      ].primary,
    );
  }, []);

  const getAddress = () => {
    switch (chain.backendName) {
      case ChainBackendNames.COSMOS:
        return cosmos.address;
      case ChainBackendNames.OSMOSIS:
        return osmosis.address;
      case ChainBackendNames.EVMOS:
        return evmos.address;
      case ChainBackendNames.JUNO:
        return juno.address;
      case ChainBackendNames.STARGAZE:
        return stargaze.address;
      case ChainBackendNames.NOBLE:
        return noble.address;
      default:
        return undefined;
    }
  };

  useEffect(() => {
    const address = getAddress();
    setSenderAddress(address);
    if (receiverAddress === senderAddress && senderAddress !== '') {
      setReceiverAddress(address);
    } else setReceiverAddress('');
  }, [chain]);

  const evmosToOtherChainIbcMsg = (
    senderEvmosAddress: string,
    receiverAddress: string,
    inputAmount: string,
    userAccountData: any,
    ethereum: any,
    amount = '14000000000000000',
    gas = '450000',
  ) => {
    const chainData = {
      chainId: 9001,
      cosmosChainId: 'evmos_9001-2',
    };

    const accountData = userAccountData.data.account.base_account;

    const sender = {
      accountAddress: senderEvmosAddress,
      sequence: accountData.sequence,
      accountNumber: accountData.account_number,
      pubkey: accountData.pub_key.key,
    };

    const fee = {
      amount,
      denom: cosmosConfig.evmos.denom,
      gas,
    };

    const params = {
      receiver: receiverAddress,
      denom: tokenData.denom,
      amount: ethers.utils
        .parseUnits(
          convertAmountOfContractDecimal(
            inputAmount,
            tokenData.contractDecimals,
          ),
          tokenData.contractDecimals,
        )
        .toString(),
      sourcePort: 'transfer',
      sourceChannel:
        cosmosConfig[tokenData.chainDetails.chainName].channel[
          chain.name.toLowerCase()
        ],
      revisionNumber: Long.fromNumber(456),
      revisionHeight: Long.fromNumber(123),
      timeoutTimestamp: (
        1e9 *
        (Math.floor(Date.now() / 1e3) + 1200)
      ).toString(),
    };

    const memo = '';

    const msg: any = createTxIBCMsgTransfer(
      chainData,
      sender,
      fee,
      memo,
      params,
    );

    const privateKeyBuffer = Buffer.from(
      ethereum.privateKey.substring(2),
      'hex',
    );

    const signature = signTypedData({
      privateKey: privateKeyBuffer,
      data: msg.eipToSign,
      version: SignTypedDataVersion.V4,
    });

    const extension = signatureToWeb3Extension(chainData, sender, signature);

    const rawTx = createTxRawEIP712(
      msg.legacyAmino.body,
      msg.legacyAmino.authInfo,
      extension,
    );

    const body = generatePostBodyBroadcast(rawTx);
    return body;
  };

  function onModalHide() {
    hideModal();
    setTimeout(() => {
      navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
    }, MODAL_HIDE_TIMEOUT_250);
  }

  const renderSuccessTransaction = (hash: string) => {
    return (
      <SuccessTransaction
        hash={hash}
        symbol={tokenData.chainDetails.symbol}
        name={tokenData.chainDetails.name}
        navigation={navigation}
        hideModal={hideModal}
      />
    );
  };

  const ibcTransfer = async (type = 'simulation'): Promise<void> => {
    const activityData: IBCTransaction = {
      id: genId(),
      status: ActivityStatus.PENDING,
      type: ActivityType.IBC,
      transactionHash: '',
      token: tokenData.name,
      fromChain: tokenData.chainDetails.name,
      toChain: chain.name,
      symbol: tokenData.symbol,
      tokenLogoUrl: tokenData.logoUrl,
      amount: parseFloat(amount).toFixed(3),
      datetime: new Date(),
      receiverAddress,
    };

    if (type === 'txn') {
      activityRef.current = activityData;
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: activityRef.current,
      });
    }

    const currentChain: IIBCData =
      cosmosConfig[tokenData.chainDetails.chainName];
    let isIbcReached = false;

    if (
      [
        ChainBackendNames.COSMOS,
        ChainBackendNames.OSMOSIS,
        ChainBackendNames.JUNO,
        ChainBackendNames.STARGAZE,
        ChainBackendNames.NOBLE,
      ].includes(tokenData.chainDetails.backendName)
    ) {
      try {
        setLoading(true);
        let wallet: OfflineDirectSigner | undefined;

        if (type === 'simulation') {
          const wallets: Map<string, OfflineDirectSigner> =
            await getSignerClient(hdWallet);
          setWallets(wallets);
          wallet = wallets.get(currentChain.prefix);
        } else if (type === 'txn') {
          wallet = wallets.get(currentChain.prefix);
        }

        let senderAddress: any = await wallet.getAccounts();
        senderAddress = senderAddress[0].address;
        const client = await SigningStargateClient.connectWithSigner(
          rpc,
          wallet,
          {
            prefix: currentChain.prefix,
          },
        );

        const transferAmount = {
          denom: tokenData.denom,
          amount: ethers.utils
            .parseUnits(
              convertAmountOfContractDecimal(
                amount,
                tokenData.contractDecimals,
              ),
              tokenData.contractDecimals,
            )
            .toString(),
        };
        const sourcePort = 'transfer';
        const sourceChannel =
          cosmosConfig[tokenData.chainDetails.chainName].channel[
            chain.name.toLowerCase()
          ];

        let timeOut = Long.fromNumber(
          Math.floor(Date.now() / 1000) + 60,
        ).multiply(1000000000);

        const transferMsg: MsgTransferEncodeObject = {
          typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
          value: MsgTransfer.fromPartial({
            sourcePort,
            sourceChannel,
            sender: senderAddress,
            receiver: receiverAddress,
            token: transferAmount,
            timeoutHeight: {
              revisionHeight: Long.fromNumber(123),
              revisionNumber: Long.fromNumber(456),
            },
            timeoutTimestamp: timeOut,
          }),
        };

        const simulation = await client.simulate(
          senderAddress,
          [transferMsg],
          '',
        );

        setGasFee(simulation * currentChain.gasPrice);

        if (type === 'simulation') {
          if (GASLESS_CHAINS.includes(tokenData.chainDetails.backendName)) {
            setGasFee(0);
          }
          setLoading(false);
          setSignModalVisible(true);
        }
        if (type === 'txn') {
          const fee = {
            gas: Math.floor(simulation * 1.8).toString(),
            amount: [
              {
                denom: currentChain.denom,
                amount: GASLESS_CHAINS.includes(
                  tokenData.chainDetails.backendName,
                )
                  ? '0'
                  : parseInt(gasFee.toFixed(6).split('.')[1]).toString(),
              },
            ],
          };

          timeOut = Long.fromNumber(
            Math.floor(Date.now() / 1000) + 60,
          ).multiply(1000000000);

          isIbcReached = true;

          const resp = await client.sendIbcTokens(
            senderAddress,
            receiverAddress,
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

          activityRef.current &&
            activityContext.dispatch({
              type: ActivityReducerAction.PATCH,
              value: {
                id: activityRef.current.id,
                status: ActivityStatus.SUCCESS,
                transactionHash: resp.transactionHash,
              },
            });
          setSignModalVisible(false);
          setTimeout(
            () =>
              showModal('state', {
                type: t<string>('TOAST_TYPE_SUCCESS'),
                title: t<string>('IBC_SUCCESS'),
                description: renderSuccessTransaction(resp.transactionHash),
                onSuccess: onModalHide,
                onFailure: onModalHide,
              }),
            MODAL_HIDE_TIMEOUT_250,
          );
          // monitoring api
          void logAnalytics({
            type: AnalyticsType.SUCCESS,
            txnHash: resp.transactionHash,
            chain: tokenData.chainDetails?.chainName ?? '',
          });
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
        if (type === 'txn') {
          // Save as failed if the error comes from sendIbc function call
          if (isIbcReached) {
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.FAILED,
                },
              });
          } else {
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.DELETE,
                value: { id: activityRef.current.id },
              });
          }
        }
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: tokenData.chainDetails?.chainName ?? '',
          message: parseErrorMessage(error),
          screen: route.name,
        });
        Sentry.captureException(error);
        setSignModalVisible(false);
        setTimeout(
          () =>
            showModal('state', {
              type: t<string>('TOAST_TYPE_ERROR'),
              title: 'Transaction failed',
              description: error.message,
              onSuccess: hideModal,
              onFailure: hideModal,
            }),
          MODAL_HIDE_TIMEOUT_250,
        );
      }
    } else {
      try {
        setLoading(true);
        const evmosAddress = evmos.wallets[evmos.currentIndex].address;

        const accountInfoResponse = await axios.get(ACCOUNT_DETAILS, {
          timeout: 2000,
        });

        let ibcTransferBody = evmosToOtherChainIbcMsg(
          evmosAddress,
          receiverAddress,
          amount,
          accountInfoResponse,
          ethereum,
        );

        const response = await axios.post(SIMULATION_ENDPOINT, ibcTransferBody);

        const simulatedGasInfo = response.data.gas_info
          ? response.data.gas_info
          : 0;
        const gasWanted = simulatedGasInfo.gas_used
          ? simulatedGasInfo.gas_used
          : 0;
        setGasFee(parseFloat(gasWanted) * currentChain.gasPrice);

        if (type === 'simulation') {
          setLoading(false);
          setSignModalVisible(true);
        }
        if (type === 'txn') {
          ibcTransferBody = evmosToOtherChainIbcMsg(
            evmosAddress,
            receiverAddress,
            amount,
            accountInfoResponse,
            ethereum,
            ethers.utils
              .parseUnits(
                (cosmosConfig.evmos.gasPrice * gasWanted).toString(),
                '18',
              )
              .toString(),
            Math.floor(gasWanted * 1.3).toString(),
          );

          isIbcReached = true;

          const resp: any = await axios.post(TXN_ENDPOINT, ibcTransferBody);

          setSignModalVisible(false);
          setLoading(false);
          if (resp.data.tx_response.code === 0) {
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.SUCCESS,
                  transactionHash: resp.data.tx_response.txhash,
                },
              });
            setTimeout(() => {
              showModal('state', {
                type: t<string>('TOAST_TYPE_SUCCESS'),
                title: t<string>('IBC_SUCCESS'),
                description: renderSuccessTransaction(
                  resp.data.tx_response.txhash,
                ),
                onSuccess: onModalHide,
                onFailure: onModalHide,
              });
            }, MODAL_HIDE_TIMEOUT_250);
            // monitoring api
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: resp.data.tx_response.txhash,
              chain: tokenData.chainDetails?.chainName ?? '',
            });
          } else if (resp.data.tx_response.code === 5) {
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.FAILED,
                },
              });
            // monitoring api
            void logAnalytics({
              type: AnalyticsType.ERROR,
              chain: tokenData.chainDetails?.chainName ?? '',
              message: parseErrorMessage(resp.data.tx_response.raw_log),
              screen: route.name,
            });
            Sentry.captureException(resp.data.tx_response.raw_log);
            setTimeout(() => {
              showModal('state', {
                type: t<string>('TOAST_TYPE_ERROR'),
                title: 'Transaction failed',
                description: error.message.toString(),
                onSuccess: hideModal,
                onFailure: onModalHide,
              });
            }, MODAL_HIDE_TIMEOUT_250);
          }
        }
      } catch (error) {
        setLoading(false);
        setSignModalVisible(false);
        if (type === 'txn') {
          if (isIbcReached) {
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.FAILED,
                },
              });
          } else {
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.DELETE,
                value: { id: activityRef.current.id },
              });
          }
        }
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: tokenData.chainDetails?.chainName ?? '',
          message: parseErrorMessage(error),
          screen: route.name,
        });
        Sentry.captureException(error);
        setTimeout(() => {
          showModal('state', {
            type: t<string>('TOAST_TYPE_ERROR'),
            title: 'Transaction failed',
            description: error.message.toString(),
            onSuccess: hideModal,
            onFailure: onModalHide,
          });
        }, MODAL_HIDE_TIMEOUT_250);
      }
    }
  };

  const onIBCSubmit = () => {
    showModal('state', {
      type: 'warning',
      title: 'Warning',
      description: t('IBC_WARNING'),
      onSuccess: () => {
        if (validateAmount(amount)) {
          hideModal();
          setTimeout(
            async () => await ibcTransfer('simulation'),
            MODAL_CLOSING_TIMEOUT,
          );
          setLoading(false);
        }
      },
      onFailure: hideModal,
    });
  };

  return (
    <CyDScrollView className={'w-full h-full bg-white'}>
      <ChooseChainModal
        setModalVisible={setShowChain}
        isModalVisible={showChain}
        data={chainData}
        title={'Choose Chain'}
        selectedItem={chain?.name}
        onPress={({ item }: { item: Chain }) => {
          setChain(item);
        }}
        type={'chain'}
      />

      <CyDModalLayout
        setModalVisible={setShowWarningModal}
        isModalVisible={showWarningModal}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        <CyDView className={'relative bg-white rounded-t-[12px] p-[24px]'}>
          <CyDTouchView
            onPress={() => setShowWarningModal(false)}
            className={'z-[50] absolute right-[16px] top-[16px]'}
          >
            <CyDImage source={AppImages.CLOSE_CIRCLE} />
          </CyDTouchView>
          <CyDView className={'flex items-center'}>
            <CyDImage
              source={AppImages.WARNING}
              className={'w-[110px] h-[100px]'}
            />
            <CyDText
              className={'text-orange-400 text-[16px] mt-[6px] font-bold'}
            >
              {'WARNING'}
            </CyDText>
            <CyDText
              className={
                'text-primaryTextColor text-[16px] mt-[6px] font-bold text-center'
              }
            >
              {t('IBC_WARNING')}
            </CyDText>
            <CyDView className={'flex flex-row item-center '}>
              <Button
                onPress={() => {
                  setShowWarningModal(false);
                }}
                title={'CANCEL'}
                style={'mt-[20px] p-[5%] mr-[24px]'}
                type={'secondary'}
              />
              <Button
                onPress={() => {
                  setShowWarningModal(false);
                  if (validateAmount(amount)) {
                    setTimeout(
                      async () => await ibcTransfer('simulation'),
                      MODAL_CLOSING_TIMEOUT,
                    );
                    setLoading(false);
                  }
                }}
                title={'PROCEED'}
                style={'mt-[20px] p-[5%]'}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      <SignatureModal
        isModalVisible={signModalVisible}
        setModalVisible={setSignModalVisible}
      >
        <CyDView className={'px-[40px]'}>
          <CyDText
            className={
              'text-center font-nunito text-[24px] font-bold   mt-[20px]'
            }
          >
            {'Transfer tokens '}
          </CyDText>
          <CyDView
            className={
              'flex flex-row justify-around my-[20px] bg-[#F7F8FE] rounded-[20px] px-[15px] py-[20px] '
            }
          >
            <CyDView className={'flex items-center justify-center'}>
              <CyDImage
                source={{ uri: tokenData.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-black text-[14px] font-semibold flex flex-row justify-center font-nunito'
                }
              >
                {tokenData.name}
              </CyDText>
              <CyDView
                className={
                  'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                }
              >
                <CyDImage
                  source={tokenData.chainDetails.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={
                    'ml-[6px] font-nunito font-normal text-black  text-[12px]'
                  }
                >
                  {tokenData.chainDetails.name}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex justify-center'}>
              <CyDImage source={AppImages.RIGHT_ARROW_LONG} />
            </CyDView>

            <CyDView className={'flex items-center justify-center '}>
              <CyDImage
                source={{ uri: tokenData.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-black text-[14px] font-semibold flex flex-row justify-center font-nunito'
                }
              >
                {tokenData.name}
              </CyDText>
              <CyDView
                className={
                  'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                }
              >
                <CyDImage
                  source={chain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={
                    'ml-[6px] font-nunito text-black font-normal text-[12px]'
                  }
                >
                  {chain.name}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row justify-between mb-[14px]'}>
            <CyDText
              className={'font-[#434343] font-nunito font-[16px] text-medium'}
            >
              {t('TO_ADDRESS')}
            </CyDText>
            <CyDView className={'mr-[6%] flex flex-col items-end'}>
              <CyDText
                className={
                  'font-nunito font-[16px] text-black font-bold underline'
                }
              >
                {receiverAddress.substring(0, 8) +
                  '...' +
                  receiverAddress.substring(receiverAddress.length - 8)}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row justify-between mb-[14px]'}>
            <CyDText
              className={'font-[#434343] font-nunito font-[16px] text-medium'}
            >
              {t('SENT_AMOUNT')}
            </CyDText>
            <CyDView className={'mr-[6%] flex flex-col items-end'}>
              <CyDText
                className={'font-nunito font-[16px] text-black font-bold'}
              >
                {`${parseFloat(amount).toFixed(3)} ${tokenData.name}`}
              </CyDText>
              <CyDText
                className={'font-nunito font-[12px] text-[#929292] font-bold'}
              >
                {(tokenData.price * parseFloat(amount)).toFixed(3) + ' USD'}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row justify-between mb-[14px]'}>
            <CyDText
              className={'font-[#434343] font-nunito font-[16px] text-medium'}
            >
              {t('TOTAL_GAS')}
            </CyDText>
            <CyDView className={'mr-[6%] flex flex-col items-end'}>
              <CyDText
                className={'font-nunito font-[16px] text-black font-bold'}
              >
                {`${gasFee.toFixed(
                  3,
                )} ${tokenData.chainDetails.name.toUpperCase()}`}
              </CyDText>
              <CyDText
                className={'font-nunito font-[12px] text-[#929292] font-bold'}
              >
                {(tokenData.price * gasFee).toFixed(3) + ' USD'}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>

        <CyDView
          className={
            'flex flex-row w-full justify-center items-center space-x-[16px] px-[30px] pb-[50px]'
          }
        >
          <CyDTouchView
            disabled={loading}
            onPress={() => {
              setSignModalVisible(false);
            }}
            className={
              'border-[1px] border-[#525252] rounded-[12px] px-[20px] py-[20px] w-1/2 flex items-center'
            }
          >
            <CyDText
              className={
                'text-[#525252] text-[16px] font-extrabold font-nunito'
              }
            >
              {'Cancel'}
            </CyDText>
          </CyDTouchView>

          <CyDTouchView
            disabled={loading}
            onPress={async () => {
              await ibcTransfer('txn');
            }}
            className={clsx(
              'rounded-[12px] bg-[#FFDE59] px-[20px]  w-1/2 items-center',
            )}
          >
            {loading && (
              <CyDView className={'mr-[16px]'}>
                <LottieView
                  source={AppImages.LOADING_SPINNER}
                  autoPlay
                  loop
                  style={{ height: 60, left: 2 }}
                />
              </CyDView>
            )}
            {!loading && (
              <CyDText
                className={
                  'text-[#525252] text-[16px] font-extrabold font-nunito my-[20px]'
                }
              >
                {'IBC'}
              </CyDText>
            )}
          </CyDTouchView>
        </CyDView>
      </SignatureModal>

      {!showMerged && (
        <CyDView>
          <CyDView
            className={
              'bg-[#F7F8FE] mx-[20px] border-[1px] border-[#EBEBEB] rounded-[16px] mt-[16px]'
            }
          >
            <CyDView className={'h-[60px] flex flex-row w-full'}>
              <CyDView
                className={
                  'w-3/12 border-r-[1px] border-[#EBEBEB] bg-white px-[18px] rounded-l-[16px] flex items-center justify-center'
                }
              >
                <CyDText
                  className={'text-[#434343] text-[16px] font-extrabold'}
                >
                  {'From'}
                </CyDText>
                <CyDText
                  className={'text-[#434343] text-[16px] font-extrabold'}
                >
                  {'Chain'}
                </CyDText>
              </CyDView>

              <CyDView
                className={
                  'flex flex-row items-center justify-between w-9/12 p-[18px]'
                }
              >
                <CyDView className={'flex flex-row items-center'}>
                  <CyDImage
                    source={tokenData.chainDetails.logo_url}
                    className={'w-[30px] h-[30px]'}
                  />
                  <CyDText
                    className={
                      'text-center text-black font-nunito text-[16px] ml-[20px]'
                    }
                  >
                    {tokenData.chainDetails.name}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>

          <CyDView
            className={
              'bg-[#F7F8FE] mx-[20px] border-[1px] border-[#EBEBEB] rounded-[16px] mt-[16px]'
            }
          >
            <CyDView className={'h-[60px] flex flex-row w-full'}>
              <CyDView
                className={
                  'w-3/12 border-r-[1px] border-[#EBEBEB] bg-white px-[18px] rounded-l-[16px] flex items-center justify-center'
                }
              >
                <CyDText
                  className={'text-[#434343] text-[16px] font-extrabold'}
                >
                  {'From'}
                </CyDText>
                <CyDText
                  className={'text-[#434343] text-[16px] font-extrabold'}
                >
                  {'Token'}
                </CyDText>
              </CyDView>

              <CyDView
                className={
                  'flex flex-row items-center justify-between w-9/12 p-[18px]'
                }
              >
                <CyDView className={'flex flex-row items-center'}>
                  <CyDImage
                    source={{ uri: tokenData.logoUrl }}
                    className={'w-[30px] h-[30px]'}
                  />
                  <CyDText
                    className={
                      'text-center text-black font-nunito text-[16px] ml-[20px]'
                    }
                  >
                    {tokenData.name}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>

          <CyDTouchView
            className={
              'bg-[#F7F8FE] mx-[20px] my-[16px] border-[1px] border-[#EBEBEB] rounded-[16px]'
            }
            onPress={() => setShowChain(true)}
          >
            <CyDView className={'h-[60px] flex flex-row w-full'}>
              <CyDView
                className={
                  'w-3/12 border-r-[1px] border-[#EBEBEB] bg-white px-[18px] rounded-l-[16px] flex items-center justify-center'
                }
              >
                <CyDText
                  className={'text-[#434343] text-[16px] font-extrabold'}
                >
                  {'To'}
                </CyDText>
                <CyDText
                  className={'text-[#434343] text-[16px] font-extrabold'}
                >
                  {'Chain'}
                </CyDText>
              </CyDView>

              <CyDView
                className={
                  'flex flex-row items-center justify-between w-9/12 p-[18px]'
                }
              >
                <CyDView className={'flex flex-row items-center'}>
                  <CyDImage
                    source={chain?.logo_url}
                    className={'w-[30px] h-[30px]'}
                  />
                  <CyDText
                    className={
                      'text-center text-black font-nunito text-[16px] ml-[8px] ml-[20px]'
                    }
                  >
                    {chain?.name}
                  </CyDText>
                </CyDView>
                <CyDImage source={AppImages.DOWN_ARROW} />
              </CyDView>
            </CyDView>
          </CyDTouchView>

          <CyDView
            className={
              'bg-[#F7F8FE] mx-[20px] border-[1px] border-[#EBEBEB] rounded-[16px] pl-[16px] pr-[10px] py-[8px] h-[60px] flex flex-row justify-center items-center'
            }
          >
            <CyDTextInput
              className={clsx(
                'font-medium text-left text-black font-nunito text-[16px] w-[90%] mr-[10px]',
              )}
              onChangeText={(text) => {
                setReceiverAddress(text);
              }}
              placeholder={'Receiver Address'}
              placeholderTextColor={'#929292'}
              value={receiverAddress}
              autoFocus={false}
            />
            <CyDTouchView
              className={''}
              onPress={() => {
                setReceiverAddress('');
              }}
            >
              <CyDImage source={AppImages.CLOSE_CIRCLE} />
            </CyDTouchView>
          </CyDView>

          <CyDTouchView
            className={'flex flex-row justify-end mx-[30px] mb-[16px] mt-[4px]'}
            onPress={() => {
              const address = getAddress();
              setReceiverAddress(address);
            }}
          >
            <CyDText className={'underline font-normal text-[12px] text-black'}>
              {'Use My Address'}
            </CyDText>
          </CyDTouchView>

          <CyDView
            className={
              'bg-[#F7F8FE] mx-[20px] border-[1px] border-[#EBEBEB] rounded-[16px] pl-[16px] pr-[10px] py-[8px] h-[60px] flex flex-row justify-center items-center'
            }
          >
            <CyDTextInput
              className={clsx(
                'font-medium text-left text-black font-nunito text-[16px] w-[90%] mr-[10px]',
              )}
              onChangeText={(text) => {
                setMemo(text);
              }}
              placeholder={'Memo (optional)'}
              placeholderTextColor={'#929292'}
              value={memo}
              autoFocus={false}
            />
            <CyDTouchView
              className={''}
              onPress={() => {
                setMemo('');
              }}
            >
              <CyDImage source={AppImages.CLOSE_CIRCLE} />
            </CyDTouchView>
          </CyDView>
        </CyDView>
      )}

      {showMerged && (
        <CyDTouchView
          onPress={() => {
            setShowMerged(false);
          }}
          className={
            'flex flex-row justify-between my-[16px] bg-[#F7F8FE] rounded-[20px] mx-[20px] px-[15px] py-[20px] '
          }
        >
          <CyDView className={'flex items-center justify-center'}>
            <CyDImage
              source={{ uri: tokenData.logoUrl }}
              className={'w-[44px] h-[44px]'}
            />
            <CyDText
              className={
                'my-[6px] mx-[2px] text-black text-[14px] font-semibold flex flex-row justify-center font-nunito'
              }
            >
              {tokenData.name}
            </CyDText>
            <CyDView
              className={
                'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
              }
            >
              <CyDImage
                source={tokenData.chainDetails.logo_url}
                className={'w-[14px] h-[14px]'}
              />
              <CyDText
                className={
                  'ml-[6px] font-nunito text-black font-normal text-[12px]'
                }
              >
                {tokenData.chainDetails.name}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex justify-center'}>
            <CyDImage
              source={AppImages.RIGHT_ARROW_LONG}
              style={{ tintColor: 'black' }}
              className={'w-[40px] h-[20px]'}
            />
          </CyDView>

          <CyDView className={'flex items-center justify-center '}>
            <CyDImage
              source={{ uri: tokenData.logoUrl }}
              className={'w-[44px] h-[44px]'}
            />
            <CyDText
              className={
                'my-[6px] mx-[2px] text-black text-[14px] font-semibold flex flex-row justify-center font-nunito'
              }
            >
              {tokenData.name}
            </CyDText>
            <CyDView
              className={
                'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
              }
            >
              <CyDImage
                source={chain.logo_url}
                className={'w-[14px] h-[14px]'}
              />
              <CyDText
                className={
                  'ml-[6px] font-nunito text-black font-normal text-[12px]'
                }
              >
                {chain?.name}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDTouchView>
      )}

      <CyDTouchView
        className={clsx(
          ' mt-[25px] pb-[30px] bg-[#F7F8FE] mx-[20px] rounded-[20px]',
        )}
        onPress={() => {
          amount === '0.00' ? setAmount('') : setAmount(amount);
          setShowMerged(true);
        }}
      >
        <CyDText
          className={
            'font-extrabold text-[22px] text-center mt-[20px] font-nunito text-black'
          }
        >
          {'Enter Amount'}
        </CyDText>

        <CyDText
          className={
            'font-extrabold text-[20px] text-center mt-[10px] font-nunito bottom-0 text-black '
          }
        >
          {tokenData.name}
        </CyDText>

        <CyDView className={'flex items-center justify-center items-center'}>
          {!showMerged && (
            <CyDText
              className={clsx(
                'font-bold text-[70px] h-[80px] text-justify font-nunito text-black ',
              )}
            >
              {parseFloat(amount).toFixed(2)}
            </CyDText>
          )}
          {showMerged && (
            <CyDView
              className={'flex flex-row items-center justify-center relative'}
            >
              <CyDTouchView
                onPress={() => {
                  const gasReserved =
                    tokenData?.chainDetails?.symbol === tokenData?.symbol
                      ? gasFeeReservation[tokenData.chainDetails.backendName]
                      : 0;

                  const maxAmount =
                    parseFloat(tokenData?.actualBalance) - gasReserved;
                  const textAmount =
                    maxAmount < 0
                      ? '0.00'
                      : limitDecimalPlaces(maxAmount.toString(), 6);
                  setAmount(textAmount);
                }}
                className={clsx(
                  'absolute bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center ' +
                    'p-[4px] left-[-14%]',
                )}
              >
                <CyDText className={'font-nunito text-black '}>{'MAX'}</CyDText>
              </CyDTouchView>
              <CyDTextInput
                className={clsx(
                  'font-bold text-center text-black h-[80px] font-nunito w-8/12 pt-[16px]',
                  {
                    'text-[70px]': amount.length <= 5,
                    'text-[40px]': amount.length > 5,
                  },
                )}
                keyboardType='numeric'
                onChangeText={(text: string) => {
                  setAmount(text);
                }}
                value={amount}
                autoFocus={true}
              />
            </CyDView>
          )}
        </CyDView>
        <CyDView className='flex flex-row flex-wrap justify-center items-center'>
          <CyDText
            className={
              'font-semibold text-[14px] text-center text-[#929292] font-nunito mt-[8px]'
            }
          >{`${tokenData.name} balance`}</CyDText>
          <CyDTokenAmount className='ml-[10px]' decimalPlaces={6}>
            {tokenData.actualBalance}
          </CyDTokenAmount>
        </CyDView>
      </CyDTouchView>

      <CyDView
        className={'flex flex-row items-center justify-center my-[10px]'}
      >
        <Button
          title={t('SUBMIT')}
          loading={loading}
          disabled={
            loading ||
            parseFloat(amount) <= 0 ||
            receiverAddress === '' ||
            parseFloat(amount) > parseFloat(tokenData.actualBalance)
          }
          onPress={() => {
            onIBCSubmit();
            // setShowWarningModal(true);
          }}
          isPrivateKeyDependent={true}
          style={'w-[90%] py-[18px]'}
        />
      </CyDView>
    </CyDScrollView>
  );
}
