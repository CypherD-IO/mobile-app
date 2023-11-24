import React, { useContext } from 'react';
import { ActivityIndicator } from 'react-native';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import { HdWalletContext } from '../../core/util';
import { showToast } from '../../containers/utilities/toastUtility';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
const {
  CText,
  DynamicView,
  DynamicImage,
  DynamicButton,
  DynamicTouchView,
} = require('../../styles');

function copyToClipboard(text) {
  Clipboard.setString(text);
}

export const ButtonWithImage = ({
  mL,
  mT,
  bG,
  vC,
  text,
  imageName,
  isBorder,
  onPress,
  indicator,
  wT,
}) => {
  return (
    <DynamicButton
      dynamic
      dynamicWidth
      bw={1}
      width={wT || 100}
      height={50}
      bGC={bG}
      mT={mT}
      bR={8}
      bW={isBorder ? 1 : 0}
      bC={Colors.borderColor}
      onPress={() => {
        onPress();
      }}>
      <DynamicView
        dynamic
        dynamicWidthFix
        dynamicHeightFix
        jC={'center'}
        bGC={vC}
        height={35}
        width={35}
        bR={8}
        style={[
          { position: 'absolute', left: 8, top: 8 },
          !isBorder && {
            borderColor: '#FFDE59',
            shadowColor: 'gray',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.7,
            elevation: 3,
          },
        ]}>
        <DynamicImage dynamic source={imageName} width={13} height={13} />
      </DynamicView>
      {indicator && (
        <ActivityIndicator
          size='large'
          color={Colors.toastColor}
          style={{ flex: 1, position: 'absolute', alignItems: 'center' }}
        />
      )}
      <CText
        dynamic
        mL={mL || 20}
        fF={C.fontsName.FONT_EXTRA_BOLD}
        fS={13}
        color={Colors.primaryTextColor}>
        {text}
      </CText>
    </DynamicButton>
  );
};

export const ButtonWithOutImage = ({
  fE = C.fontsName.FONT_BLACK,
  mT = 0,
  bR = 8,
  fS = 15,
  bG,
  mH = 0,
  vC,
  wT,
  hE = 50,
  bW = 1,
  text,
  mB = 0,
  bC = Colors.borderColor,
  fC = Colors.primaryTextColor,
  isBorder = false,
  onPress,
  disable = false,
  indicator = false,
}) => {
  return (
    <DynamicButton
      disabled={disable}
      dynamic
      dynamicWidth
      bw={1}
      width={wT || 100}
      height={hE}
      bGC={!disable ? bG : '#dddd'}
      mT={mT}
      bR={bR}
      mH={mH}
      bW={isBorder ? bW : 0}
      bC={bC}
      mB={mB}
      onPress={() => {
        onPress && onPress();
      }}>
      {indicator && (
        <ActivityIndicator
          size='large'
          color={Colors.toastColor}
          style={{ flex: 1, position: 'absolute', alignItems: 'center' }}
        />
      )}
      <CyDText className={`font-black text-[${fS}px] text-[${fC}]`}>
        {text}
      </CyDText>
    </DynamicButton>
  );
};

export const AddressBookContainer = ({
  chain,
  wallet = { address: '' },
  bGC,
  logo,
  navigation,
  addressTypeQRCode,
}: {
  chain: string;
  wallet: { address: string };
  bGC: string;
  logo: string;
  navigation: any;
  addressTypeQRCode: string;
}) => {
  const { t } = useTranslation();
  const hdWalletContext = useContext<any>(HdWalletContext);

  return (
    <CyDView className='flex flex-row justify-between h-[65px] mx-[20px] border-b-[0.5px] border-sepratorColor'>
      <CyDView className='flex flex-row w-[80%] items-center'>
        <CyDView
          className={'flex p-[5px] rounded-[50px] mr-[10px]'}
          style={{ backgroundColor: bGC }}>
          <CyDImage
            source={logo}
            className='h-[25px] w-[25px]'
            resizeMode='contain'
          />
        </CyDView>
        <CyDView className='flex-wrap w-[90%]'>
          <CyDText className='font-bold'>{chain.toUpperCase()}</CyDText>
          {wallet?.address !== '' ? (
            <CyDText>
              {wallet === undefined
                ? 'Importing...'
                : wallet.address.substring(0, 8) +
                  '...' +
                  wallet.address.substring(wallet.address.length - 8)}
            </CyDText>
          ) : (
            <CyDImage
              source={AppImages.BLURRED_ADDRESS}
              className='h-[30px] w-[145px]'
              resizeMode='contain'
            />
          )}
        </CyDView>
      </CyDView>
      <CyDView className='flex flex-row justify-between items-center w-[16%]'>
        {wallet?.address !== '' && (
          <CyDTouchView
            onPress={() => {
              navigation.navigate(C.screenTitle.QRCODE, {
                addressType: addressTypeQRCode,
              });
            }}>
            <CyDImage
              source={AppImages.QR_CODE}
              className='h-[20px] w-[20px]'
              resizeMode='contain'
            />
          </CyDTouchView>
        )}

        {wallet?.address !== '' && (
          <CyDTouchView
            onPress={() => {
              copyToClipboard(wallet.address);
              showToast(`${chain} ${t('ADDRESS_COPY_ALL_SMALL')}`);
              sendFirebaseEvent(hdWalletContext, 'copy_address');
            }}>
            <CyDImage
              source={AppImages.COPY}
              className='h-[18px] w-[18px]'
              resizeMode='contain'
            />
          </CyDTouchView>
        )}
      </CyDView>
    </CyDView>
  );
};

export const OptionsContainer = ({
  sentryLabel,
  onPress,
  title,
  logo,
  shouldDot = false,
  mT = 0,
  bH = 60,
  iW = 100,
}) => {
  return (
    <DynamicTouchView
      sentry-label={sentryLabel}
      dynamic
      dynamicWidth
      width={88}
      fD={'row'}
      mT={mT}
      onPress={() => {
        onPress();
      }}>
      <DynamicView dynamic dynamicHeightFix height={bH} fD={'row'} pH={15}>
        <DynamicView
          dynamic
          dynamicWidthFix
          height={bH}
          width={30}
          dynamicHeightFix
          aLIT='flex-start'
          fD={'column'}
          jC='center'>
          <DynamicView
            dynamic
            dynamicWidthFix
            width={17}
            fD={'row'}
            jC={'flex-start'}>
            <DynamicImage
              dynamic
              dynamicWidth
              height={20}
              width={iW}
              source={logo}
            />
          </DynamicView>
        </DynamicView>
        <DynamicView
          dynamic
          dynamicWidthFix
          width={200}
          dynamicHeightFix
          height={bH}
          aLIT='flex-start'
          fD={'column'}
          jC='center'>
          <DynamicView
            dynamic
            dynamicWidthFix
            width={200}
            fD={'row'}
            jC={'flex-start'}>
            <CText
              dynamic
              fF={C.fontsName.FONT_REGULAR}
              fS={14}
              color={Colors.primaryTextColor}>
              {title}
            </CText>
            {sentryLabel === 'activities' && shouldDot && (
              <CText
                dynamic
                fF={C.fontsName.FONT_REGULAR}
                fS={42}
                mT={-16}
                color={Colors.activityFailed}>
                {'·'}
              </CText>
            )}
          </DynamicView>
        </DynamicView>
      </DynamicView>
      <DynamicImage
        dynamic
        dynamicWidth
        height={11}
        width={11}
        resizemode='contain'
        source={AppImages.OPTIONS_ARROW}
      />
    </DynamicTouchView>
  );
};

export const AppButton = ({
  mT,
  mB,
  bGC,
  text,
  onPress,
  indicator,
  disable = false,
}) => {
  return (
    <DynamicButton
      dynamic
      dynamicWidth
      bw={1}
      bR={12}
      width={100}
      height={50}
      bGC={bGC || Colors.appColor}
      disabled={disable}
      mT={mT}
      mB={mB}
      onPress={() => {
        onPress();
      }}>
      {indicator && (
        <ActivityIndicator
          size='large'
          color={Colors.toastColor}
          style={{ flex: 1, position: 'absolute', alignItems: 'center' }}
        />
      )}
      <CText
        dynamic
        fF={C.fontsName.FONT_EXTRA_BOLD}
        fS={13}
        color={Colors.primaryTextColor}>
        {text}
      </CText>
    </DynamicButton>
  );
};
