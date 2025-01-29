import React, { useState } from 'react';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { DynamicTouchView } from '../styles/viewStyle';
import { CyDFastImage, CyDMaterialDesignIcons } from '../styles/tailwindStyles';
const { CText, DynamicView, DynamicImage } = require('../styles');

export default function PushModal(props) {
  const { isModalVisible, onAllowPress, onDenyPress, modalParams } = props;
  const { t } = useTranslation();

  return (
    <Modal
      isVisible={isModalVisible}
      onBackdropPress={() => {
        onPress();
      }}
      onRequestClose={() => {
        onPress();
      }}
      style={{ margin: 0 }}>
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeight
        width={100}
        height={100}
        jC={'flex-end'}>
        <DynamicView
          dynamic
          dynamicWidth
          dynamicHeight
          width={100}
          height={42}
          bGC={'white'}
          style={{
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
          }}>
          <DynamicTouchView
            sentry-label='push-modal-deny'
            dynamic
            dynamicWidth
            width={95}
            mT={5}
            aLIT={'flex-end'}
            onPress={() => {
              onDenyPress();
            }}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </DynamicTouchView>
          <DynamicView dynamic dynamicWidth width={95} fD={'row'} jC={'center'}>
            <CText
              dynamic
              fF={C.fontsName.FONT_BLACK}
              fS={16}
              mT={5}
              mL={20}
              color={Colors.primaryTextColor}>
              {t('PERMISSION_REQUEST')}
            </CText>
          </DynamicView>

          <DynamicView
            dynamic
            dynamicWidth
            width={80}
            mT={15}
            pV={10}
            bGC={Colors.backLight}
            bR={18}
            jC={'center'}>
            <CText
              dynamic
              mL={10}
              mH={10}
              fF={C.fontsName.FONT_BLACK}
              mT={14}
              fS={10}
              color={Colors.primaryTextColor}>
              {modalParams.app_name} wants permission to send push notification
              messages to your phone for the following reason: {'\n'}
              {modalParams.reasonMessage}
            </CText>
          </DynamicView>

          <DynamicView
            dynamic
            dynamicWidth
            width={100}
            jC={'center'}
            fD={'row'}>
            <CyDFastImage
              className='h-[20px] w-[20px] mx-[6px]'
              source={{ uri: modalParams.appImage }}
            />
            <CText
              dynamic
              mL={10}
              mH={10}
              fF={C.fontsName.FONT_BLACK}
              mT={14}
              fS={14}
              color={Colors.primaryTextColor}>
              {modalParams.app_name}
            </CText>
          </DynamicView>

          <DynamicView dynamic fD={'row'}>
            <ButtonWithOutImage
              sentry-label='push-modal-deny-button'
              mT={20}
              wT={45}
              mH={12}
              bG={Colors.whiteColor}
              vC={Colors.appColor}
              mB={30}
              text={t('DENY')}
              isBorder={true}
              onPress={() => {
                onDenyPress();
              }}
            />
            <ButtonWithOutImage
              sentry-label='push-modal-allow-button'
              mT={20}
              wT={45}
              bG={Colors.appColor}
              vC={Colors.appColor}
              mB={30}
              text={t('ALLOW')}
              isBorder={false}
              onPress={() => {
                onAllowPress();
              }}
            />
          </DynamicView>

          <DynamicView dynamic bGC={Colors.switchColor} mT={10} bR={10} />
        </DynamicView>
      </DynamicView>
    </Modal>
  );
}
