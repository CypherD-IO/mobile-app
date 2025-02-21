import React, { useContext, useEffect, useState } from 'react';
import SignatureModal from '../components/v2/signatureModal';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import { DynamicTouchView, DynamicView } from '../styles/viewStyle';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { t } from 'i18next';
import { CText } from '../styles/textStyle';
import { DynamicImage } from '../styles/imageStyle';
import { Colors } from '../constants/theme';
import { GlobalContext } from '../core/globalContext';
import useWeb3 from '../hooks/useWeb3';
import { Web3Origin } from '../constants/enum';
import { useGlobalModalContext } from './v2/GlobalModal';
import {
  ALL_CHAINS,
  Chain,
  chainIdNumberMapping,
  EVM_CHAINS,
} from '../constants/server';
import { find } from 'lodash';
import { MODAL_SHOW_TIMEOUT } from '../constants/timeOuts';
import { EVENTS } from '../constants/web3';
import { FlatList, StyleSheet } from 'react-native';
import CyDModalLayout from './v2/modal';
import * as C from '../constants/index';
import { EIP155_SIGNING_METHODS } from '../constants/EIP155Data';
import usePortfolio from '../hooks/usePortfolio';
import { hexToString } from 'viem';

export default function WalletConnectModal(props) {
  const globalContext = useContext<any>(GlobalContext);
  const [handleWeb3] = useWeb3(Web3Origin.WALLETCONNECT);
  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const {
    walletConnectModalVisible,
    setWalletConnectModalVisible,
    renderContent,
    walletConnectApproveRequest,
    walletConnectRejectRequest,
    params,
    request,
    walletConnectDispatch,
    dispatchActivity,
  } = props;
  const [isChainSwitched, setIsChainSwitched] = useState(false);
  const { payload: payloadKeyInParams } = params;
  const paramsKeyInPayload = payloadKeyInParams?.params;
  let currentChain: Chain;
  const { payload } = request;
  const { params: requestParams, method } = payload;
  const { getNativeToken } = usePortfolio();

  if (paramsKeyInPayload) {
    const [paramsFirstChild] = paramsKeyInPayload;
    const { chainId } = paramsFirstChild;
    currentChain = chainIdNumberMapping[chainId];
  }

  const checkGasFee = async () => {
    const item = find(ALL_CHAINS, {
      chainIdNumber: Number(params?.payload?.params[0]?.chainId),
    });
    if (item === undefined) {
      // Quick fix for PERSONAL_SIGN broken in Wallet Connect Flow. Ideally we should detect and skip checkGasFee() for sign transactions like PERSONAL_SIGN and SIGN_TYPED_DATA
      return;
    }
    const nativeToken = await getNativeToken(item.backendName);
    if (renderContent?.dAppInfo?.name !== 'Cypher Wallet DApp') {
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('INSUFFICIENT_FUNDS'),
          description: `You don't have sufficient ${nativeToken?.symbol} to pay gas fee. But you can still continue accessing the DAPP`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, MODAL_SHOW_TIMEOUT);
    }
  };

  useEffect(() => {
    if (!walletConnectModalVisible && isChainSwitched) {
      if (
        !(
          method === EIP155_SIGNING_METHODS.ETH_SIGN ||
          method === EIP155_SIGNING_METHODS.PERSONAL_SIGN ||
          method === EIP155_SIGNING_METHODS.WALLET_GET_PERMISSIONS ||
          method === EIP155_SIGNING_METHODS.WALLET_REQUEST_PERMISSIONS ||
          method.includes('TypedData')
        )
      ) {
        checkGasFee();
      }
    }
  }, [walletConnectModalVisible]);

  const renderChainListItem = ({ item }: { item: Chain }) => {
    return (
      <DynamicTouchView
        sentry-label='portfolio-chain-choose-selection'
        dynamic
        dynamicWidth
        width={100}
        fD='row'
        mT={2}
        bR={15}
        pH={8}
        pV={8}
        onPress={() => {
          params.payload.params[0].chainId = item.chainIdNumber;
          setChooseChain(false);
        }}
        jC={'flex-start'}>
        <DynamicImage dynamic source={item.logo_url} width={25} height={25} />
        <DynamicView dynamic dynamicWidth width={70} aLIT={'flex-start'}>
          <CText
            dynamic
            fF={C.fontsName.FONT_BOLD}
            mL={8}
            fS={16}
            color={Colors.primaryTextColor}>
            {item.name}
          </CText>
          <CText
            dynamic
            fF={C.fontsName.FONT_BOLD}
            mL={8}
            fS={12}
            color={Colors.subTextColor}>
            {item.symbol}
          </CText>
        </DynamicView>
      </DynamicTouchView>
    );
  };

  const RenderData = () => {
    if (method === EIP155_SIGNING_METHODS.PERSONAL_SIGN) {
      let message = '';
      try {
        // message = Web3.utils.hexToUtf8(requestParams[0]);
        message = hexToString(requestParams[0]);
      } catch (e) {
        message = requestParams[0];
      }
      return (
        <CyDView className={'mx-[47px]'}>
          <CyDText className={'text-[17px] font-bold'}>
            {t<string>('MESSAGE')} :
          </CyDText>
          <CyDScrollView
            className={
              'max-h-[180px] bg-p50 p-[8px] mt-[10px] pb-[18px] rounded-[6px]'
            }>
            <CyDText className={'mt-[10px] text-[14px]'}>
              {message ?? ''}
            </CyDText>
          </CyDScrollView>
        </CyDView>
      );
    } else if (method === EIP155_SIGNING_METHODS.ETH_SIGN) {
      let message = '';
      try {
        // message = Web3.utils.hexToUtf8(requestParams[1]);
        message = hexToString(requestParams[1]);
      } catch (e) {
        message = requestParams[1];
      }
      return (
        <CyDView className={'mx-[47px]'}>
          <CyDText className={'text-[17px] font-bold'}>
            {t<string>('MESSAGE')} :
          </CyDText>
          <CyDScrollView
            className={
              'max-h-[180px] bg-backLight p-[8px] mt-[10px] pb-[18px] rounded-[6px]'
            }>
            <CyDText className={'mt-[10px] text-[14px]'}>
              {message ?? ''}
            </CyDText>
          </CyDScrollView>
        </CyDView>
      );
    } else {
      return (
        <CyDView>
          {renderContent?.otherInfo?.map(element => {
            return (
              <DynamicView
                dynamic
                fD={'row'}
                jC={'space-between'}
                mL={41}
                mR={30}
                mT={20}>
                <CText
                  style={{
                    color: 'black',
                    fontWeight: '600',
                    fontSize: 16,
                    marginRight: 20,
                    width: 100,
                  }}>
                  {' '}
                  {element.key}
                </CText>
                <CyDView>
                  <CText
                    style={{
                      flex: 1,
                      flexWrap: 'wrap',
                      fontSize: 14,
                      color: 'black',
                      width: 100,
                    }}>
                    {element.value}
                  </CText>
                </CyDView>
              </DynamicView>
            );
          })}
        </CyDView>
      );
    }
  };

  const renderButtonMessage = () => {
    if (method?.includes('TypedData'))
      return t('REVIEW_PERMISSION').toUpperCase();
    return t(renderContent?.buttonMessage).toUpperCase();
  };

  return (
    <DynamicView>
      <SignatureModal
        isModalVisible={walletConnectModalVisible}
        setModalVisible={setWalletConnectModalVisible}
        onCancel={() => {
          walletConnectRejectRequest({
            connector: request.connector,
            payload: request.payload,
            method:
              request.payload.method === 'session_request'
                ? 'reject_session'
                : 'reject_request',
            dispatch: walletConnectDispatch,
          });
        }}>
        <CyDModalLayout
          setModalVisible={setChooseChain}
          isModalVisible={chooseChain}
          style={stylesheet.modalLayout}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}>
          <CyDView
            className={'bg-n0 p-[25px] pb-[30px] rounded-t-[20px] relative'}>
            <CyDTouchView
              onPress={() => {
                setChooseChain(false);
              }}
              className={'z-[50]'}>
              <CyDMaterialDesignIcons
                name={'close'}
                size={24}
                className='text-base400 z-[50] absolute right-[0px'
              />
            </CyDTouchView>
            <CyDText
              className={' mt-[10px] font-bold text-[22px] text-center '}>
              {t('CHOOSE_CHAIN')}
            </CyDText>
            <FlatList
              data={[...EVM_CHAINS]}
              renderItem={item => renderChainListItem(item)}
              style={stylesheet.chainList}
              showsVerticalScrollIndicator={true}
            />
          </CyDView>
        </CyDModalLayout>
        {renderContent && (
          <CyDView>
            <CText
              style={{
                color: 'black',
                fontWeight: '600',
                fontSize: 24,
                textAlign: 'center',
              }}>
              {t(renderContent.title)}
            </CText>
            <DynamicView dynamic width={250} mL={41} mT={45} fD={'row'}>
              <CText
                style={{
                  color: 'black',
                  fontWeight: '600',
                  fontSize: 16,
                  marginRight: 60,
                }}>
                {' '}
                Using
              </CText>
              <DynamicImage
                dynamic
                source={renderContent?.chainInfo?.image}
                width={28}
                height={28}
              />
              <CText style={{ fontSize: 14, color: 'black', marginLeft: 10 }}>
                {renderContent?.chainInfo?.address}
              </CText>
            </DynamicView>
            <DynamicView dynamic jC={'center'} width={'100%'}>
              <CyDView className='w-[310px] h-[10px] bg-base100 mt-[1px]' />
            </DynamicView>
            <DynamicView dynamic width={250} mL={41} mT={10} fD={'row'}>
              <CText
                style={{
                  color: 'black',
                  fontWeight: '600',
                  fontSize: 16,
                  marginRight: 10,
                }}>
                Connected to
              </CText>
              <DynamicImage
                dynamic
                source={{ uri: renderContent?.dAppInfo?.image }}
                width={28}
                height={28}
                style={{ borderRadius: 20 }}
              />
              <CText
                style={{
                  fontSize: 14,
                  color: 'black',
                  marginLeft: 7,
                  width: '90%',
                }}>
                {renderContent?.dAppInfo?.name}
              </CText>
            </DynamicView>

            <DynamicView dynamic jC={'center'} width={'100%'} mB={10}>
              <CyDView className='w-[310px] h-[10px] bg-base100 mt-[1px]' />
            </DynamicView>

            <RenderData />

            <DynamicView dynamic jC={'center'}>
              {renderContent?.staticInfo?.map(element => {
                return (
                  <DynamicView
                    dynamic
                    fD={'row'}
                    width={348}
                    bGC={'#F7F8FE'}
                    jC={'flex-start'}
                    style={{ borderRadius: 20, marginTop: 20 }}>
                    <DynamicImage
                      source={element.image}
                      width={43}
                      height={43}
                      style={{ marginLeft: 5, fontSize: '14px' }}
                    />
                    <CText
                      style={{
                        marginRight: 20,
                        marginLeft: 10,
                        color: 'black',
                        textAlign: 'center',
                      }}>
                      {element.description}
                    </CText>
                  </DynamicView>
                );
              })}
            </DynamicView>

            {payloadKeyInParams?.method === EVENTS.SESSION_REQUEST &&
              params.payload.params[0].chainId !== 0 && (
                <>
                  <DynamicView dynamic jC={'center'} width={'100%'} mB={10}>
                    <CyDView className='w-[310px] h-[10px] bg-base100 mt-[1px]' />
                  </DynamicView>
                  <CyDView
                    className={
                      'min-w-[250px] max-w-[100%] ml-[41px] mt-[10px] flex flex-row items-center justify-evenly'
                    }>
                    <CText
                      style={{
                        color: 'black',
                        fontWeight: '600',
                        fontSize: 16,
                      }}>
                      Network
                    </CText>
                    <CyDTouchView
                      onPress={() => {
                        setChooseChain(true);
                      }}
                      className={
                        'h-[40px] w-[60%] bg-green20 rounded-[18px] flex flex-row items-center justify-center'
                      }>
                      <CyDFastImage
                        className={'h-[20px] w-[20px] mr-[6px]'}
                        source={currentChain.logo_url}
                      />
                      <CyDText className={'text-center'}>
                        {currentChain.name}
                      </CyDText>

                      <CyDMaterialDesignIcons
                        name={'menu-down'}
                        size={16}
                        className={'text-base400 ml-[8px]'}
                      />
                    </CyDTouchView>
                  </CyDView>
                  <DynamicView dynamic jC={'center'} width={'100%'} mB={10}>
                    <CyDView className='w-[310px] h-[10px] bg-base100 mt-[1px]' />
                  </DynamicView>
                </>
              )}

            <DynamicView dynamic jC={'center'} mB={30}>
              <ButtonWithOutImage
                wT={85}
                bG={Colors.appColor}
                vC={Colors.appColor}
                mT={30}
                text={renderButtonMessage()}
                isBorder={false}
                onPress={() => {
                  setWalletConnectModalVisible(false);
                  setIsChainSwitched(true);
                  walletConnectApproveRequest(
                    handleWeb3,
                    params,
                    globalContext,
                    dispatchActivity,
                  );
                }}
              />

              <ButtonWithOutImage
                wT={85}
                bG={Colors.whiteColor}
                vC={Colors.whiteColor}
                mT={10}
                text={t('REJECT')}
                isBorder={true}
                onPress={() => {
                  setWalletConnectModalVisible(false);
                  setIsChainSwitched(false);
                  walletConnectRejectRequest({
                    connector: request.connector,
                    payload: request.payload,
                    method:
                      request.payload.method === 'session_request'
                        ? 'reject_session'
                        : 'reject_request',
                    dispatch: walletConnectDispatch,
                  });
                }}
              />
            </DynamicView>
          </CyDView>
        )}
      </SignatureModal>
    </DynamicView>
  );
}

const stylesheet = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
    height: '50%',
  },
  chainList: {
    height: '50%',
    marginTop: '10%',
  },
});
