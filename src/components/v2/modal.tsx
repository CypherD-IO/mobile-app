import * as React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Modal from 'react-native-modal';
import * as animatable from 'react-native-animatable';

interface CyDModalLayoutProps {
  isModalVisible: boolean;
  setModalVisible:
    | (() => void)
    | ((val: any) => void)
    | React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
  disableBackDropPress?: boolean;
  style?: StyleProp<ViewStyle>;
  backdropOpacity?: number;
  backdropTransitionInTiming?: number;
  backdropTransitionOutTiming?: number;
  hideModalContentWhileAnimating?: boolean;
  animationIn?:
    | 'bounce'
    | 'flash'
    | 'jello'
    | 'pulse'
    | 'rotate'
    | 'rubberBand'
    | 'shake'
    | 'swing'
    | 'tada'
    | 'wobble'
    | 'bounceIn'
    | 'bounceInDown'
    | 'bounceInUp'
    | 'bounceInLeft'
    | 'bounceInRight'
    | 'bounceOut'
    | 'bounceOutDown'
    | 'bounceOutUp'
    | 'bounceOutLeft'
    | 'bounceOutRight'
    | 'fadeIn'
    | 'fadeInDown'
    | 'fadeInDownBig'
    | 'fadeInUp'
    | 'fadeInUpBig'
    | 'fadeInLeft'
    | 'fadeInLeftBig'
    | 'fadeInRight'
    | 'fadeInRightBig'
    | 'fadeOut'
    | 'fadeOutDown'
    | 'fadeOutDownBig'
    | 'fadeOutUp'
    | 'fadeOutUpBig'
    | 'fadeOutLeft'
    | 'fadeOutLeftBig'
    | 'fadeOutRight'
    | 'fadeOutRightBig'
    | 'flipInX'
    | 'flipInY'
    | 'flipOutX'
    | 'flipOutY'
    | 'lightSpeedIn'
    | 'lightSpeedOut'
    | 'slideInDown'
    | 'slideInUp'
    | 'slideInLeft'
    | 'slideInRight'
    | 'slideOutDown'
    | 'slideOutUp'
    | 'slideOutLeft'
    | 'slideOutRight'
    | 'zoomIn'
    | 'zoomInDown'
    | 'zoomInUp'
    | 'zoomInLeft'
    | 'zoomInRight'
    | 'zoomOut'
    | 'zoomOutDown'
    | 'zoomOutUp'
    | 'zoomOutLeft'
    | 'zoomOutRight'
    | animatable.CustomAnimation<
        import('react-native').TextStyle &
          ViewStyle &
          import('react-native').ImageStyle
      >;
  animationOut?:
    | 'bounce'
    | 'flash'
    | 'jello'
    | 'pulse'
    | 'rotate'
    | 'rubberBand'
    | 'shake'
    | 'swing'
    | 'tada'
    | 'wobble'
    | 'bounceIn'
    | 'bounceInDown'
    | 'bounceInUp'
    | 'bounceInLeft'
    | 'bounceInRight'
    | 'bounceOut'
    | 'bounceOutDown'
    | 'bounceOutUp'
    | 'bounceOutLeft'
    | 'bounceOutRight'
    | 'fadeIn'
    | 'fadeInDown'
    | 'fadeInDownBig'
    | 'fadeInUp'
    | 'fadeInUpBig'
    | 'fadeInLeft'
    | 'fadeInLeftBig'
    | 'fadeInRight'
    | 'fadeInRightBig'
    | 'fadeOut'
    | 'fadeOutDown'
    | 'fadeOutDownBig'
    | 'fadeOutUp'
    | 'fadeOutUpBig'
    | 'fadeOutLeft'
    | 'fadeOutLeftBig'
    | 'fadeOutRight'
    | 'fadeOutRightBig'
    | 'flipInX'
    | 'flipInY'
    | 'flipOutX'
    | 'flipOutY'
    | 'lightSpeedIn'
    | 'lightSpeedOut'
    | 'slideInDown'
    | 'slideInUp'
    | 'slideInLeft'
    | 'slideInRight'
    | 'slideOutDown'
    | 'slideOutUp'
    | 'slideOutLeft'
    | 'slideOutRight'
    | 'zoomIn'
    | 'zoomInDown'
    | 'zoomInUp'
    | 'zoomInLeft'
    | 'zoomInRight'
    | 'zoomOut'
    | 'zoomOutDown'
    | 'zoomOutUp'
    | 'zoomOutLeft'
    | 'zoomOutRight'
    | animatable.CustomAnimation<
        import('react-native').TextStyle &
          ViewStyle &
          import('react-native').ImageStyle
      >;
  animationInTiming?: number;
  animationOutTiming?: number;
  avoidKeyboard?: boolean;
  onModalHide?: () => void;
  useNativeDriver?: boolean;
}

export default function CyDModalLayout({
  isModalVisible,
  setModalVisible,
  children,
  disableBackDropPress = false,
  style = {},
  animationIn = 'slideInUp',
  animationOut = 'slideOutDown',
  animationInTiming = 200,
  animationOutTiming = 200,
  avoidKeyboard = false,
  onModalHide = () => {},
  backdropOpacity = 0.85,
  backdropTransitionInTiming = 300,
  backdropTransitionOutTiming = 300,
  hideModalContentWhileAnimating = true,
  useNativeDriver = true,
}: CyDModalLayoutProps) {
  return (
    <Modal
      avoidKeyboard={avoidKeyboard}
      isVisible={isModalVisible}
      onBackdropPress={() => {
        !disableBackDropPress && setModalVisible(false);
      }}
      onBackButtonPress={() => {
        setModalVisible(false);
      }}
      backdropColor={'#000000'}
      propagateSwipe={true}
      backdropOpacity={backdropOpacity}
      backdropTransitionInTiming={backdropTransitionInTiming}
      backdropTransitionOutTiming={backdropTransitionOutTiming}
      hideModalContentWhileAnimating={hideModalContentWhileAnimating}
      animationIn={!animationIn ? 'zoomIn' : animationIn}
      animationOut={!animationOut ? 'zoomOut' : animationOut}
      animationInTiming={animationInTiming}
      animationOutTiming={animationOutTiming}
      onModalHide={onModalHide}
      useNativeDriver={useNativeDriver}
      style={style}>
      {children}
    </Modal>
  );
}
