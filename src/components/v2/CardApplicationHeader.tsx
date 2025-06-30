import React from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDIcons,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import { screenTitle } from '../../constants';

interface CardApplicationHeaderProps {
  onBackPress?: () => void;
  showQuestions?: boolean;
  bgColor?: string;
  buttonBgColor?: string;
}

const CardApplicationHeader: React.FC<CardApplicationHeaderProps> = ({
  onBackPress,
  showQuestions = true,
  bgColor = '',
  buttonBgColor = '',
}) => {
  const navigation = useNavigation<NavigationProp<any>>();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  const handleHelpPress = () => {
    navigation.navigate(screenTitle.CARD_FAQ_SCREEN, {
      uri: 'https://help.cypherhq.io/en/collections/3300935-cypher-card-signup-and-kyc-process',
      title: 'Help Center',
    });
  };

  return (
    <CyDView
      className={`flex-row justify-between items-center px-4 py-2 ${
        bgColor ? `bg-${bgColor}` : ''
      }`}>
      <CyDTouchView onPress={handleBack}>
        <CyDIcons name='arrow-left' size={24} className='text-base400' />
      </CyDTouchView>
      {showQuestions && (
        <CyDTouchView onPress={handleHelpPress}>
          <CyDView
            className={`flex-row items-center gap-1 px-3 py-2 rounded-full ${
              buttonBgColor ? `bg-${buttonBgColor}` : 'bg-n20'
            }`}>
            <CyDMaterialDesignIcons
              name='help-circle-outline'
              size={16}
              className='text-base400'
            />
            <CyDText className='text-base400 font-medium'>Questions</CyDText>
          </CyDView>
        </CyDTouchView>
      )}
    </CyDView>
  );
};

export default CardApplicationHeader;
