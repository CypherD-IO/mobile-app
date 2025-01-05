import Clipboard from '@react-native-clipboard/clipboard';
import LottieView from 'lottie-react-native';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import * as C from '../../constants/index';
import { ChainBackendNames } from '../../constants/server';
import { Colors } from '../../constants/theme';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import { showToast } from '../../containers/utilities/toastUtility';
import { HdWalletContext } from '../../core/util';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CydMaterialDesignIcons,
  CyDView,
  CyDFastImage,
  CydIcons,
} from '../../styles/tailwindStyles';
import { IconProps } from '@react-native-vector-icons/common';
import CydIconsPack from '../../customFonts/generator';

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
    <CyDView className='flex flex-row justify-between h-[65px] mx-[20px] border-b-[0.5px] border-n40'>
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
      {chain.toUpperCase() === ChainBackendNames.SOLANA.toUpperCase() && (
        <LottieView
          source={AppImages.NEW}
          autoPlay
          loop
          style={styles.lottieViewWidth}
        />
      )}
      <CyDView className='flex flex-row justify-between items-center w-[16%]'>
        {wallet?.address !== '' && (
          <CyDTouchView
            onPress={() => {
              navigation.navigate(C.screenTitle.QRCODE, {
                addressType: addressTypeQRCode,
              });
            }}>
            <CydIcons name={'qr-code-1'} size={32} className='text-base400' />
          </CyDTouchView>
        )}

        {wallet?.address !== '' && (
          <CyDTouchView
            onPress={() => {
              copyToClipboard(wallet.address);
              showToast(`${chain} ${t('ADDRESS_COPY_ALL_SMALL')}`);
              sendFirebaseEvent(hdWalletContext, 'copy_address');
            }}>
            <CydMaterialDesignIcons
              name={'content-copy'}
              size={20}
              className='text-base400'
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
  image,
  shouldDot = false,
}: {
  sentryLabel: string;
  onPress: () => void;
  title: string;
  logo?: any;
  image?: any;
  shouldDot?: boolean;
}) => {
  return (
    <CyDTouchView
      sentry-label={sentryLabel}
      className='flex flex-row justify-between items-center border-b border-n40 py-[24px] px-[12px]'
      onPress={onPress}>
      <CyDView className='flex flex-row items-center'>
        {image ? (
          <CyDFastImage source={image} className='h-[24px] w-[24px]' />
        ) : (
          <CydIcons name={logo} size={32} className='text-base400' />
        )}
        <CyDText className='font-normal text-[14px] ml-1'>{title}</CyDText>
        {shouldDot && (
          <CyDView className='bg-red300 w-1.5 h-1.5 rounded-full' />
        )}
      </CyDView>
      <CyDView>
        <CydMaterialDesignIcons
          name={'chevron-right'}
          size={24}
          className='text-base400'
        />
      </CyDView>
    </CyDTouchView>
  );
};

const styles = StyleSheet.create({
  lottieViewWidth: {
    width: 34,
    marginTop: 5,
    marginLeft: -30,
  },
});
