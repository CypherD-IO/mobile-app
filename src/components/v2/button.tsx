import React, { useContext, useEffect, useState } from 'react';
import {
  CyDText,
  CyDView,
  CyDTouchView,
  CyDImage,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import LottieView from 'lottie-react-native';
import AppImages from '../../../assets/images/appImages';
import { AppState, Keyboard, StyleSheet } from 'react-native';
import { ButtonType, ImagePosition } from '../../constants/enum';
import { HdWalletContext } from '../../core/util';
interface IButton {
  onPress: () => void;
  loading?: boolean;
  type?: string;
  disabled?: boolean;
  title: string;
  style?: string;
  titleStyle?: string;
  loaderStyle?: any;
  isLottie?: boolean;
  image?: any;
  imageStyle?: any;
  imagePosition?: string;
  isPrivateKeyDependent?: boolean;
  paddingY?: number;
}
export default function Button({
  onPress,
  loading = false,
  type = 'primary',
  disabled = false,
  title,
  style = 'p-[3%]',
  titleStyle = 'text-[16px]',
  loaderStyle = { height: 22 },
  image,
  isLottie = false,
  imageStyle = 'h-[20px] w-[20px] mt-[1px] mr-[10px]',
  imagePosition = ImagePosition.LEFT,
  isPrivateKeyDependent = false,
  paddingY,
}: IButton) {
  const [appState, setAppState] = useState<string>('');
  const [animation, setAnimation] = useState();
  const hdWallet = useContext<any>(HdWalletContext);
  const isReadOnlyWallet = hdWallet?.state?.isReadOnlyWallet;
  const isLocked = isPrivateKeyDependent && isReadOnlyWallet;

  const handleAppStateChange = (nextAppState: string) => {
    if (
      (appState === 'inactive' || appState === 'background') &&
      nextAppState === 'active'
    ) {
      if (animation) {
        animation.play();
      }
    }
    setAppState(nextAppState);
  };

  useEffect(() => {
    if (image && isLottie) {
      AppState.addEventListener('change', handleAppStateChange);
    }
  }, [appState]);

  return (
    <CyDTouchView
      onPress={() => {
        Keyboard.dismiss();
        setTimeout(() => {
          onPress();
        }, 100);
      }}
      disabled={disabled || loading}
      className={clsx(
        `rounded-[12px] py-[${paddingY ?? 15}px] flex flex-row items-center justify-center ${style}`,
        {
          'bg-buttonColor': ButtonType.PRIMARY === type,
          'bg-white border-[1px]  border-greyButtonBackgroundColor':
            ButtonType.SECONDARY === type,
          'bg-white border-[1px] border-buttonColor':
            ButtonType.TERNARY === type,
          'bg-white border-[1px] border-greyButtonBackgroundColor':
            ButtonType.GREY === type,
          'bg-n20': ButtonType.GREY_FILL === type,
          'bg-red300': ButtonType.RED === type,
          'bg-black': ButtonType.DARK === type,
          'bg-n40': disabled,
          'bg-white': ButtonType.WHITE_FILL === type,
        },
      )}>
      {loading && (
        <CyDView className={'flex items-center justify-between'}>
          <LottieView
            source={AppImages.LOADER_TRANSPARENT}
            autoPlay
            loop
            style={loaderStyle}
          />
        </CyDView>
      )}
      {!loading &&
        image &&
        !isLottie &&
        imagePosition === ImagePosition.LEFT && (
          <CyDImage
            source={image}
            className={imageStyle}
            resizeMode='contain'
          />
        )}
      {!loading && image && isLottie && (
        <LottieView
          source={image}
          ref={ref => setAnimation(ref)}
          resizeMode={'contain'}
          autoPlay
          loop
          style={styles.lottie}
        />
      )}
      {!loading && (
        <CyDText
          className={clsx(
            `text-[#525252]  font-extrabold text-center ${titleStyle}`,
            { 'ml-[5px]': isLocked },
          )}>
          {title}
        </CyDText>
      )}
      {!loading &&
        image &&
        !isLottie &&
        imagePosition === ImagePosition.RIGHT && (
          <CyDImage
            source={image}
            className={imageStyle}
            resizeMode='contain'
          />
        )}
    </CyDTouchView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: 22,
    height: 22,
    marginRight: 5,
  },
});
