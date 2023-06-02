import React, { useEffect, useState } from 'react';
import { CyDText, CyDView, CyDTouchView, CyDImage } from '../../styles/tailwindStyles';
import clsx from 'clsx';
import LottieView from 'lottie-react-native';
import AppImages from '../../../assets/images/appImages';
import { AppState } from 'react-native';

enum ButtonType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERNARY = 'ternary'
}

interface IButton {
  onPress: () => void
  loading?: boolean
  type?: string
  disabled?: boolean
  title: string
  style?: string
  titleStyle?: string
  loaderStyle?: any
  isLottie?: boolean
  image?: any
  imageStyle?: any
}
export default function Button ({
  onPress,
  loading = false,
  type = 'primary',
  disabled = false,
  title,
  style = 'p-[3%]',
  titleStyle = 'text-[16px]',
  loaderStyle = { height: 40 },
  image,
  isLottie = false,
  imageStyle = 'h-[20px] w-[20px] mt-[3px] mr-[10px]'
}: IButton) {
  const [appState, setAppState] = useState<String>('');
  const [animation, setAnimation] = useState();

  const handleAppStateChange = (nextAppState: String) => {
    if ((appState === 'inactive' || appState === 'background') && nextAppState === 'active') {
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
    <CyDTouchView onPress={onPress} disabled={disabled || loading}
    className={clsx(`rounded-[12px] ${style} flex flex-row items-center justify-center`, {
      'bg-[#FFDE59]': ButtonType.PRIMARY === type,
      'bg-white border-[1px] border-[#525252]': ButtonType.SECONDARY === type,
      'bg-white border-[1px] border-appColor': ButtonType.TERNARY === type,
      'bg-[#dddd]': disabled
    })}>

      {(loading) && <CyDView className={'flex items-center justify-between'}>
        <LottieView
          source={AppImages.LOADER_TRANSPARENT}
          autoPlay
          loop
          style={loaderStyle}
        />
      </CyDView>}
      {(!loading && image && !isLottie) && <CyDImage source={image} className={`${imageStyle}`}/>}
      {(!loading && image && isLottie) && <LottieView source={image} ref={(ref) => setAnimation(ref)} resizeMode={'contain'} autoPlay loop style={{ width: 18, marginRight: 5 }}/>}
      {(!loading) && <CyDText className={`text-[#525252] font-nunito font-extrabold text-center ${titleStyle}`}>{title}</CyDText>}

    </CyDTouchView>
  );
}
