/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { DynamicScrollView, DynamicTouchView } from '../styles/viewStyle';
import { CyDMaterialDesignIcons } from '../styles/tailwindStyles';

const { CText, DynamicView } = require('../styles');

export default function BottomModal(props: any) {
  const {
    isModalVisible,
    onSignPress,
    onCancelPress,
    signMessage,
    signMessageTitle,
  } = props;
  const { t } = useTranslation();

  return (
    <Modal
      isVisible={isModalVisible}
      onBackdropPress={onCancelPress}
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
          height={50}
          bGC={'white'}
          style={{
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
          }}>
          <DynamicView dynamic dynamicWidth width={95} fD={'row'}>
            <CText
              dynamic
              fF={C.fontsName.FONT_BLACK}
              fS={16}
              mT={20}
              mL={20}
              color={Colors.primaryTextColor}>
              {t('SIGN_IN_MSG')}
            </CText>
            <DynamicTouchView
              sentry-label='bottom-model-cancel-icon'
              onPress={() => {
                onCancelPress();
              }}>
              <CyDMaterialDesignIcons
                name={'close'}
                size={24}
                className='text-base400'
              />
            </DynamicTouchView>
          </DynamicView>
          <DynamicScrollView
            dynamic
            dynamicHeightFix
            fD={'column'}
            dynamicWidth
            width={80}
            mT={15}
            height={100}
            bGC={Colors.backLight}
            bR={10}
            aLIT={'center'}
            jC={'center'}
            style={{}}>
            <DynamicView dynamic aLIT={'center'} />
            <DynamicView dynamic aLIT={'flex-start'}>
              <CText
                dynamic
                mL={10}
                mH={10}
                fF={C.fontsName.FONT_BLACK}
                mT={10}
                fS={12}
                color={Colors.primaryTextColor}>
                {signMessageTitle}
              </CText>
              <CText
                dynamic
                mL={10}
                mH={10}
                fF={C.fontsName.FONT_REGULAR}
                fS={12}
                color={Colors.primaryTextColor}
              />
              <CText
                dynamic
                mL={10}
                mH={10}
                tA={'left'}
                fF={C.fontsName.FONT_REGULAR}
                fS={12}
                color={Colors.primaryTextColor}>
                {signMessage}
              </CText>
            </DynamicView>
          </DynamicScrollView>

          <DynamicView dynamic fD={'row'}>
            <ButtonWithOutImage
              sentry-label='bottom-model-cancel-button'
              mT={20}
              wT={45}
              mH={12}
              bG={Colors.whiteColor}
              vC={Colors.appColor}
              mB={30}
              text={t('CANCEL')}
              isBorder={true}
              onPress={() => {
                onCancelPress();
              }}
            />
            <ButtonWithOutImage
              sentry-label='bottom-model-sign-button'
              mT={20}
              wT={45}
              bG={Colors.appColor}
              vC={Colors.appColor}
              mB={30}
              text={t('SIGN')}
              isBorder={false}
              onPress={() => {
                onSignPress();
              }}
            />
          </DynamicView>

          <DynamicView dynamic bGC={Colors.switchColor} mT={10} bR={10} />
        </DynamicView>
      </DynamicView>
    </Modal>
  );
}
