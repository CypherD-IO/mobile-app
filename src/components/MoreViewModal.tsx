/* eslint-disable react-native/no-raw-text */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { Platform } from 'react-native';
import { ifIphoneX } from 'react-native-iphone-x-helper';
import Modal from 'react-native-modal';
import AppImages from '../../assets/images/appImages';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { DynamicTouchView } from '../styles/viewStyle';
const {
  CText,
  DynamicView,
  DynamicImage,
  ModalView
} = require('../styles');

export default function MoreViewModal (props: any) {
  const { isModalVisible, onPress, onHome, onHistory, onBookmark } = props;

  return (
        <Modal isVisible={isModalVisible}
            onBackdropPress={() => { onPress(); }}
            onBackButtonPress={() => { onPress(); }}
            animationIn="fadeIn"
            animationOut="fadeOut"
        >
            <DynamicView dynamic dynamicWidth dynamicHeight height={Platform.OS === 'android' ? 90 : 80} width={80} mL={70} aLIT={'flex-end'} jC={'flex-start'} pointerEvents="box-none" >
                <ModalView dynamic dynamicWidth dynamicHeight h={90} {...ifIphoneX({
                  height: 29
                }, {
                  height: 25
                })}
                    width={70} bGC={Colors.whiteColor} bR={10} aLIT={'flex-start'} jC={'flex-start'} >
                    <DynamicTouchView sentry-label='more-view-home-icon' dynamic dynamicWidth width={100} mL={20} fD={'row'} mT={30} jC={'flex-start'} onPress={() => {
                      onHome();
                      onPress();
                    }}>
                        <DynamicImage dynamic dynamicWidth height={22} width={22} mL={-10} resizemode='contain'
                            source={AppImages.HOME_BROWSER} />
                        <CText dynamic fF={C.fontsName.FONT_BOLD} mL={8} fS={16} color={Colors.secondaryTextColor}>Home</CText>
                    </DynamicTouchView>
                    <DynamicTouchView sentry-label='more-view-history-icon' dynamic dynamicWidth width={100} mL={20} mT={15} fD={'row'} jC={'flex-start'} onPress={() => {
                      onHistory();
                      onPress();
                    }}>
                        <DynamicImage dynamic dynamicWidth height={22} width={22} mL={-10} resizemode='contain'
                            source={AppImages.HISTORY_BROWSER} />
                        <CText dynamic fF={C.fontsName.FONT_BOLD} mL={8} fS={16} color={Colors.secondaryTextColor}>History</CText>
                    </DynamicTouchView>
                    <DynamicTouchView sentry-label='more-view-favorites-icon' dynamic dynamicWidth width={100} mL={20} mT={15} fD={'row'} jC={'flex-start'} onPress={() => {
                      onBookmark();
                      onPress();
                    }}>
                        <DynamicImage dynamic dynamicWidth height={22} width={22} mL={-10} resizemode='contain'
                            source={AppImages.BOOKMARK_BROWSER} />
                        <CText dynamic fF={C.fontsName.FONT_BOLD} mL={8} fS={16} color={Colors.secondaryTextColor}>Bookmarks</CText>
                    </DynamicTouchView>
                </ModalView>
            </DynamicView>
        </Modal>
  );
}
