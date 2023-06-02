import React, { useContext } from 'react';
import { FlatList, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import { ifIphoneX } from 'react-native-iphone-x-helper';
import { HdWalletContext } from '../core/util';
import { ALL_CHAINS } from '../constants/server';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { DynamicTouchView } from '../styles/viewStyle';
const {
  CText,
  DynamicView,
  DynamicImage,
  ModalView,
  SepraterView
} = require('../styles');

export default function ChooseCoinModal (props) {
  const { isModalVisible, onPress, Data, selectedCoin, setSelectedCoin } = props;
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);

  const renderItem = (item) => {
    return (
            <DynamicTouchView sentry-label='choose-coin-type' dynamic dynamicWidth width={100} fD='row' mT={2} bR={15} pH={8} pV={Platform.OS == 'android' ? 1 : 8} jC={'center'}
                bGC={item.index == selectedCoin ? 'rgba(88, 173, 171, 0.09)' : Colors.whiteColor}
                onPress={() => {
                  setSelectedCoin(item.index);
                  onPress();
                }} jC={'flex-start'}>
                <DynamicView dynamic dynamicWidth width={100} jC={'center'}>
                    <CText dynamic fF={C.fontsName.FONT_REGULAR} mL={8} fS={16} color={Colors.secondaryTextColor}>{item.item.name}</CText>
                </DynamicView>
            </DynamicTouchView>
    );
  };

  return (
        <Modal isVisible={isModalVisible}
            onBackdropPress={() => { onPress(); }}
        >
            <DynamicView dynamic dynamicWidth width={100} jC='center'>
                <ModalView dynamic dynamicWidth dynamicHeight {...ifIphoneX({
                  height: 55
                }, {
                  height: 60
                })} width={90} bGC={Colors.whiteColor} bR={30} >
                    <CText dynamic fF={C.fontsName.FONT_BLACK} fS={18} mT={20} color={Colors.primaryTextColor}></CText>
                    <FlatList
                        data={Data}
                        renderItem={(item) => renderItem(item)}
                        style={{ width: '90%', height: '100%', marginTop: 20, marginBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                    />
                    <SepraterView dynamic mT={20} />
                    <ButtonWithOutImage sentry-label='choose-coin-cancel' mT={-15} hE={30} mB={15} wT={80} bG={Colors.whiteColor} vC={Colors.appColor}
                        text={t('CANCEL')} isBorder={false} onPress={() => {
                          onPress();
                        }} />
                </ModalView>
            </DynamicView>
        </Modal>
  );
}
