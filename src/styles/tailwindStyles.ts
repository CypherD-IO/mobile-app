import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  Switch,
  TextInput,
  Image,
  TouchableWithoutFeedback,
  TouchableHighlight,
  KeyboardAvoidingView,
  InputAccessoryView,
} from 'react-native';
import { styled } from 'nativewind';
import FastImage from 'react-native-fast-image';
import { Dropdown } from 'react-native-element-dropdown';
import Animated from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export const CyDText = styled(Text, 'text-[#434343] ');
export const CyDTextInput = styled(TextInput, 'pb-[0px] text-[#434343] ');
export const CyDView = styled(View);
export const CyDTouchView = styled(TouchableOpacity);
export const CyDFlatList = styled(FlatList);
export const CyDSafeAreaView = styled(SafeAreaView);
export const CyDImage = styled(Image);
export const CyDFastImage = styled(FastImage);
export const CyDImageBackground = styled(ImageBackground);
export const CyDModal = styled(Modal);
export const CyDRefreshControl = styled(RefreshControl);
export const CyDScrollView = styled(ScrollView);
export const CyDSwitch = styled(Switch);
export const CyDTouchableWithoutFeedback = styled(TouchableWithoutFeedback);
export const CyDTouchableHighlight = styled(TouchableHighlight);
export const CyDKeyboardAvoidingView = styled(KeyboardAvoidingView);
export const CyDDropDown = styled(Dropdown);
export const CyDAnimatedView = styled(Animated.View);
export const CyDKeyboardAwareScrollView = styled(KeyboardAwareScrollView);
export const CyDInputAccessoryView = styled(InputAccessoryView);
