import React, { useContext, useEffect, useState } from 'react';
import SignatureModal from '../components/v2/signatureModal';
import { CyDText } from '../styles/tailwindStyles';
import { DynamicView } from '../styles/viewStyle';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { t } from 'i18next';
import { CText } from '../styles/textStyle';
import { DynamicImage } from '../styles/imageStyle';
import AppImages from '../../assets/images/appImages';
import { Colors } from '../constants/theme';
import { GlobalContext } from '../core/globalContext';
import useWeb3 from '../hooks/useWeb3';
import { Web3Origin } from '../constants/enum';
import { useGlobalModalContext } from './v2/GlobalModal';
import { getNativeTokenBalance, PortfolioContext } from '../core/util';
import { ALL_CHAINS, ChainNameMapping } from '../constants/server';
import { find } from 'lodash';
import { MODAL_SHOW_TIMEOUT } from '../constants/timeOuts';

export default function WalletConnectModal (props) {
  const globalContext = useContext<any>(GlobalContext);
  const [handleWeb3] = useWeb3(Web3Origin.WALLETCONNECT);
  const portfolioState = useContext<any>(PortfolioContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const { walletConnectModalVisible, setWalletConnectModalVisible, renderContent, walletConnectApproveRequest, walletConnectRejectRequest, params, request, walletConnectDispatch, dispatchActivity } = props;
  const [isChainSwitched, setIsChainSwitched] = useState(false);

  const checkGasFee = () => {
    const item = find(ALL_CHAINS, { chainIdNumber: Number(renderContent.chainInfo.chainId) });
    const chain = portfolioState.statePortfolio.tokenPortfolio[ChainNameMapping[item.backendName]];
    const nativeTokenSymbol: string = chain?.holdings[0]?.symbol;
    if (!getNativeTokenBalance(nativeTokenSymbol, chain.holdings)) {
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('INSUFFICIENT_FUNDS'),
          description: `You don't have sufficient ${nativeTokenSymbol} to pay gas fee.`,
          onSuccess: hideModal,
          onFailure: hideModal
        });
      }, MODAL_SHOW_TIMEOUT);
    }
  };

  useEffect(() => {
    if (!walletConnectModalVisible && isChainSwitched) {
      checkGasFee();
    }
  }, [walletConnectModalVisible]);

  return (
        <SignatureModal isModalVisible={walletConnectModalVisible} setModalVisible = {setWalletConnectModalVisible} onCancel = {() => { walletConnectRejectRequest({ connector: request.connector, payload: request.payload, method: (request.payload.method === 'session_request') ? 'reject_session' : 'reject_request', dispatch: walletConnectDispatch }); }}>
            <CText style={{ color: 'black', fontWeight: '600', fontSize: 24, textAlign: 'center' }}>{t(renderContent.title)}</CText>
            <DynamicView dynamic width={250} mL={41} mT={45} fD={'row'}>
                <CText style={{ color: 'black', fontWeight: '600', fontSize: 16 }}> Using</CText>
                <DynamicImage dynamic source={renderContent?.chainInfo?.image} width={28} height={28}></DynamicImage>
                <CText style={{ fontSize: 14, color: 'black' }}>{renderContent?.chainInfo?.address}</CText>
            </DynamicView>
            <DynamicView dynamic jC = {'center'} width = {'100%'}>
                <DynamicImage dynamic source={AppImages.LINE} width={308} height={10} mT={10}></DynamicImage>
            </DynamicView>
            <DynamicView dynamic width={250} mL={41} mT={10} fD={'row'}>
                <CText style={{ color: 'black', fontWeight: '600', fontSize: 16 }}>Connected to</CText>
                <DynamicImage dynamic source={{ uri: renderContent?.dAppInfo?.image }} width={28} height={28} style = {{ borderRadius: 20 }}></DynamicImage>
                <CText style={{ fontSize: 14, color: 'black' }}>{renderContent?.dAppInfo?.name}</CText>
            </DynamicView>

            <DynamicView dynamic jC = {'center'} width = {'100%'} mB={10}>
                <DynamicImage dynamic source={AppImages.LINE} width={308} height={10} mT={10}></DynamicImage>
            </DynamicView>

            {renderContent?.otherInfo?.map((element) => {
              return (
                    <DynamicView dynamic fD={'row'} jC={'space-between'} mL={41} mR={30} mT={20}>
                        <CText style={{ color: 'black', fontWeight: '600', fontSize: 16, marginRight: 20, width: 100 }}> {element.key}</CText>
                        <CText style={{ flex: 1, flexWrap: 'wrap', fontSize: 14, color: 'black', width: 100 }}>{element.value}</CText>
                    </DynamicView>
              );
            })
            }

            <DynamicView dynamic jC={'center'} >
                {renderContent?.staticInfo?.map((element) => {
                  return (
                        <DynamicView dynamic fD={'row'} width={348} bGC={'#F7F8FE'} jC={'flex-start'} style={{ borderRadius: 20, marginTop: 20 }}>
                            <DynamicImage source = {element.image} width={43} height={43} style = {{ marginLeft: 5, fontSize: '14px' }}></DynamicImage>
                            <CText style={{ marginRight: 20, marginLeft: 10, color: 'black', textAlign: 'center' }}>{element.description}</CText>
                        </DynamicView>
                  );
                })}
            </DynamicView>

            <DynamicView dynamic jC = {'center'} mB = {30}>
                <ButtonWithOutImage
                    wT={85}
                    bG={Colors.appColor}
                    vC={Colors.appColor}
                    mT={30}
                    text={t(renderContent?.buttonMessage)}
                    isBorder={false}
                    onPress={() => {
                      setWalletConnectModalVisible(false); setIsChainSwitched(true); walletConnectApproveRequest(handleWeb3, params, globalContext, dispatchActivity);
                    }}
                />

                <ButtonWithOutImage
                    wT={85}
                    bG={Colors.whiteColor}
                    vC={Colors.whiteColor}
                    mT={10}
                    text={t('REJECT')}
                    isBorder={true}
                    onPress={() => { setWalletConnectModalVisible(false); setIsChainSwitched(false); walletConnectRejectRequest({ connector: request.connector, payload: request.payload, method: (request.payload.method === 'session_request') ? 'reject_session' : 'reject_request', dispatch: walletConnectDispatch }); }}
                />
            </DynamicView>
        </SignatureModal>
  );
}
