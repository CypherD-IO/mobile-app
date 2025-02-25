import React, { useState } from 'react';
import { CyDView } from '../../../../../styles/tailwindComponents';
import Button from '../../../../../components/v2/button';
import { useTranslation } from 'react-i18next';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { screenTitle } from '../../../../../constants';
import WelcomeSceen1 from './welcomeScreen1';
import WelcomeSceen2 from './welcomeScreen2';
import WelcomeSceen3 from './welcomeScreen3';
import WelcomeSceen4 from './welcomeScreen4';

export default function WelcomeSceens() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [index, setIndex] = useState(0);

  const onPressNext = () => {
    if (index === 3) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: screenTitle.GET_YOUR_CARD,
            params: {
              deductAmountNow: false,
              toPage: screenTitle.CARD_APPLICATION,
            },
          },
        ],
      });
    } else setIndex(prev => prev + 1);
  };

  return (
    <CyDView className='h-full flex flex-col justify-between bg-black'>
      <CyDView className='h-[85%]'>
        {index === 0 && <WelcomeSceen1 />}
        {index === 1 && <WelcomeSceen2 />}
        {index === 2 && <WelcomeSceen3 />}
        {index === 3 && <WelcomeSceen4 />}
      </CyDView>
      <CyDView className='pb-[40px] w-full px-[16px]'>
        <Button
          onPress={onPressNext}
          title={index === 3 ? t('GET_STARTED') : t('CONTINUE')}
        />
      </CyDView>
    </CyDView>
  );
}
