import React, { useContext, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { DynamicTouchView } from '../styles/viewStyle';
import { deleteThisWallet } from '../containers/Options/ImportAnotherWallet';
import { AUTHORIZE_WALLET_DELETION, ActivityContext, HdWalletContext, PortfolioContext } from '../core/util';
import axios from '../core/Http';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';
import { hostWorker } from '../global';
import { GlobalContext } from '../core/globalContext';
import { getReadOnlyWalletData } from '../core/asyncStorage';
import { DELETE_WALLET_TIMEOUT, MODAL_CLOSING_TIMEOUT } from '../constants/timeOuts';
import { isPinAuthenticated, loadFromKeyChain } from '../core/Keychain';

const {
  CText,
  DynamicImage
} = require('../styles');

export default function RemoveWalletModal (props) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { isModalVisible, onPress, accoMsg, image, titleMsg, subTitleMsg, removeWallet, seedPharse, onPressSeed, importNewWallet, deleteWallet, navigation } = props;
  const { t } = useTranslation();
  const [selectAcc, setSelectAcc] = useState(false);
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const portfolioContext = useContext<any>(PortfolioContext);

  const cosmosAddress = hdWalletContext.state.wallet.cosmos?.wallets[0]?.address;
  const osmosisAddress = hdWalletContext.state.wallet.osmosis?.wallets[0]?.address;
  const junoAddress = hdWalletContext.state.wallet.juno?.wallets[0]?.address;

  const deleteTheWallet = async () => {
    const { isReadOnlyWallet } = hdWalletContext.state;
    const { ethereum } = hdWalletContext.state.wallet;
    if (!isReadOnlyWallet) {
      const config = {
        headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` },
        data: {
          cosmosAddress,
          osmosisAddress,
          junoAddress
        }
      };
      axios
        .delete(`${ARCH_HOST}/v1/configuration/device`, config)
        .catch((error) => {
          Sentry.captureException(error);
        });
    } else {
      const data = await getReadOnlyWalletData();
      if (data) {
        const readOnlyWalletData = JSON.parse(data);
        axios.delete(`${ARCH_HOST}/v1/configuration/address/${ethereum.address}/observer/${readOnlyWalletData.observerId}`)
          .catch((error) => {
            Sentry.captureException(error);
          });
      }
    }
    onPress();
    setTimeout(() => {
      void ResetReducers();
    }, DELETE_WALLET_TIMEOUT);
  };

  const onDeleteWallet = async () => {
    const isPinSet = await isPinAuthenticated();
    if (!isPinSet) {
      const authorization = await loadFromKeyChain(AUTHORIZE_WALLET_DELETION);
      if (authorization) {
        await deleteTheWallet();
      }
    } else {
      navigation.navigate(C.screenTitle.PIN, { title: `${t<string>('ENTER_PIN_TO_DELETE')}`, callback: deleteTheWallet });
    }
  };

  const ResetReducers = async () => {
    try {
      await deleteThisWallet(hdWalletContext, activityContext, portfolioContext);
      analytics().logEvent('delete_wallet');
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  return (
        <CyDModalLayout isModalVisible={isModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}
        setModalVisible={() => { onPress(); }}
        >
            <CyDView className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
              <CyDTouchView onPress={() => onPress()} className={'z-[50]'}>
                <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '} />
              </CyDTouchView>
              <CyDText className={'mt-[10px] font-black text-center text-[22px]'}>
                {titleMsg}
              </CyDText>
                <CyDView>
                    <DynamicImage dynamic source={image} width={100} height={20} mT={10} />
                    <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={15}color={Colors.primaryTextColor}>{subTitleMsg}</CText>

                    {importNewWallet && <DynamicTouchView dynamic fD={'row'} mT={25} mL={5} aLIT={'center'} jC={'flex-start'} onPress={() => { setSelectAcc(!selectAcc); }}>
                        <DynamicTouchView sentry-label='remove-wallet' dynamic bO={1} bC={'black'} bR={4} dynamicWidthFix dynamicHeightFix height={18} width={18} mH={5} bGC={selectAcc ? 'black' : 'transparent'}
                                          onPress={() => { setSelectAcc(!selectAcc); }}>
                            {selectAcc && <DynamicImage dynamic source={AppImages.CORRECT} width={10} height={15} />}
                        </DynamicTouchView>
                        <CText dynamic fF={C.fontsName.FONT_REGULAR} tA={'left'} mL={8} fS={10} color={Colors.primaryTextColor}>{accoMsg}</CText>
                    </DynamicTouchView>}

                    {deleteWallet && <DynamicTouchView dynamic fD={'row'} mT={25} mL={5} aLIT={'center'} jC={'flex-start'} onPress={() => { setSelectAcc(!selectAcc); }}>
                        <DynamicTouchView sentry-label='remove-wallet' dynamic bO={1} bC={'black'} aLIT={'center'} bR={4} dynamicWidthFix dynamicHeightFix height={18} width={18} mH={5} bGC={selectAcc ? 'black' : 'transparent'}
                                          onPress={() => { setSelectAcc(!selectAcc); }} >
                            {selectAcc && <DynamicImage dynamic source={AppImages.CORRECT} width={10} height={15} />}
                        </DynamicTouchView>
                        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={10} tA={'left'} mL={8} color={Colors.primaryTextColor}>{accoMsg}</CText>
                    </DynamicTouchView>}

                    {seedPharse &&
                        <ButtonWithOutImage sentry-label='remove-wallet-seed' mT={20} wT={95} bG={Colors.appColor}
                                            vC={Colors.appColor} mB={20}
                                            text={t('COPY')} isBorder={false} onPress={() => {
                                              onPress();
                                              setTimeout(() => {
                                                onPressSeed();
                                              }, MODAL_CLOSING_TIMEOUT);
                                            }}/>
                    }

                    {importNewWallet && <ButtonWithOutImage sentry-label='remove-wallet-remove' disable={!selectAcc} mT={10} bG={Colors.appColor} vC={Colors.appColor}
                                                            text={t('IMPORT_ANOTHER_WALLET')} isBorder={false} onPress={() => {
                                                              onPress();
                                                              setTimeout(() => {
                                                                removeWallet();
                                                              }, MODAL_CLOSING_TIMEOUT);
                                                            }} />
                    }
                    {deleteWallet && <ButtonWithOutImage sentry-label='delete-wallet' disable={!selectAcc} bG={selectAcc ? Colors.redColor : Colors.redOffColor} vC={Colors.redColor} mT={10}
                                                         text={t('DELETE_WALLET')} isBorder={false} fC={'white'} onPress={async () => {
                                                           onDeleteWallet();
                                                         }} />
                    }

                    <ButtonWithOutImage isBorder={true} bG={Colors.whiteColor} vC={Colors.appColor} mB={30} mT={10}
                                        text={t('CANCEL')} onPress={() => {
                                          onPress();
                                        }} />
                </CyDView>
            </CyDView>
        </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
