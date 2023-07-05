import * as React from 'react';
import Modal from 'react-native-modal';

export default function CyDModalLayout ({
  isModalVisible,
  setModalVisible,
  children,
  disableBackDropPress = false,
  style = {},
  animationIn = '',
  animationOut = '',
  animationInTiming = 200,
  animationOutTiming = 200,
  avoidKeyboard = false,
  onModalHide = () => {}
}) {
  return (
    <Modal
      avoidKeyboard = {avoidKeyboard}
      isVisible={isModalVisible}
      onBackdropPress={() => {
        !disableBackDropPress ? setModalVisible(false) : '';
      }}
      onBackButtonPress={() => {
        setModalVisible(false);
      }}
      backdropColor={'#000000'}
      avoiKeyboardLikeIOS={true}
      keyboardAvoidingBehavior="height"
      backdropOpacity={0.85}
      animationIn={!animationIn ? 'zoomIn' : animationIn}
      animationOut={!animationOut ? 'zoomOut' : animationOut}
      animationInTiming={animationInTiming}
      animationOutTiming={animationOutTiming}
      onModalHide={onModalHide}
      style={style}
    >
      {children}
    </Modal>
  );
}
