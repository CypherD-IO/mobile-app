import React, { useContext, useEffect, useState } from 'react';
import {
  CyDText,
  CyDView,
  CyDTouchView,
  CyDImage,
  CyDLottieView,
} from '../../styles/tailwindComponents';
import clsx from 'clsx';
import AppImages from '../../../assets/images/appImages';
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { ButtonType, IconPosition, ImagePosition } from '../../constants/enum';
import { HdWalletContext } from '../../core/util';
interface IButton {
  onPress: () => void;
  loading?: boolean;
  type?: ButtonType;
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
  icon?: React.ReactNode;
  iconPosition?: IconPosition;
  testID?: string;
  accessibilityLabel?: string;
}
export default function Button({
  onPress,
  loading = false,
  type = ButtonType.PRIMARY,
  disabled = false,
  title,
  style = 'p-[3%]',
  titleStyle = 'text-[16px]',
  loaderStyle = { height: 22, width: 22 },
  image,
  isLottie = false,
  imageStyle = 'h-[20px] w-[20px] mt-[1px] mr-[10px]',
  imagePosition = ImagePosition.LEFT,
  isPrivateKeyDependent = false,
  paddingY,
  icon,
  iconPosition = IconPosition.LEFT,
  testID,
  accessibilityLabel,
}: IButton) {
  const [appState, setAppState] = useState<string>('');
  const [animation, setAnimation] = useState();
  const hdWallet = useContext<any>(HdWalletContext);
  const isReadOnlyWallet = hdWallet?.state?.isReadOnlyWallet;
  const isLocked = isPrivateKeyDependent && isReadOnlyWallet;
  const spinnerColor = [ButtonType.RED, ButtonType.DARK].includes(type)
    ? '#FFFFFF'
    : '#000000';

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
      testID={testID ?? `button-${title}`}
      accessibilityLabel={accessibilityLabel ?? title}
      accessible={true}
      accessibilityRole='button'
      className={clsx(
        `rounded-[12px] py-[${
          paddingY ?? 15
        }px] flex flex-row items-center justify-center ${style}`,
        {
          'bg-buttonColor': ButtonType.PRIMARY === type,
          'bg-n0 border-[1px]  border-greyButtonBackgroundColor':
            ButtonType.SECONDARY === type,
          'bg-n0 border-[1px] border-buttonColor': ButtonType.TERNARY === type,
          'bg-n0 border-[1px] border-greyButtonBackgroundColor':
            ButtonType.GREY === type,
          'bg-n20': ButtonType.GREY_FILL === type,
          'bg-red300': ButtonType.RED === type,
          'bg-black': ButtonType.DARK === type,
          'bg-n50': disabled,
          'bg-n0': ButtonType.WHITE_FILL === type,
          'bg-base200': ButtonType.DARK_GREY_FILL === type,
          'bg-yellow': ButtonType.YELLOW_FILL === type,
        },
      )}>
      {loading && (
        // IMPORTANT:
        // We render an ActivityIndicator as the primary loader to ensure it always appears.
        // We still keep the existing Lottie animation, but it is not relied on for visibility.
        <CyDView className='flex-row items-center justify-center'>
          <ActivityIndicator
            style={loaderStyle}
            size='small'
            color={spinnerColor}
          />
        </CyDView>
      )}
      {!loading &&
        image &&
        !isLottie &&
        !icon &&
        imagePosition === ImagePosition.LEFT && (
          <CyDImage
            source={image}
            className={imageStyle}
            resizeMode='contain'
          />
        )}
      {!loading &&
        !image &&
        !isLottie &&
        icon &&
        iconPosition === IconPosition.LEFT && (
          <CyDView className=''>{icon}</CyDView>
        )}
      {!loading && image && isLottie && (
        <CyDLottieView
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
          className={clsx(`font-extrabold text-center ${titleStyle}`, {
            'ml-[5px]': isLocked,
            'text-white': [ButtonType.RED, ButtonType.DARK].includes(type),
            'text-base400': [
              ButtonType.SECONDARY,
              ButtonType.TERNARY,
              ButtonType.WHITE_FILL,
              ButtonType.GREY_FILL,
            ].includes(type),
            'text-black': ![
              ButtonType.RED,
              ButtonType.DARK,
              ButtonType.TERNARY,
              ButtonType.SECONDARY,
              ButtonType.WHITE_FILL,
              ButtonType.GREY_FILL,
            ].includes(type),
            'font-manrope tracking-[-1px] leading-[130%] text-[20px] text-black':
              ButtonType.YELLOW_FILL === type,
          })}>
          {title}
        </CyDText>
      )}
      {!loading &&
        image &&
        !isLottie &&
        !icon &&
        imagePosition === ImagePosition.RIGHT && (
          <CyDImage
            source={image}
            className={imageStyle}
            resizeMode='contain'
          />
        )}
      {!loading &&
        !image &&
        !isLottie &&
        icon &&
        iconPosition === IconPosition.RIGHT && <>{icon}</>}
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
