import React, { useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { t } from 'i18next';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImageBackground,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import Button from './button';
import { ButtonType } from '../../constants/enum';
import { screenTitle } from '../../constants';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import AppImages from '../../../assets/images/appImages';
import { FREE_SAFEPAL_CLAIM_URL } from '../../constants/data';

export const STORAGE_KEY_DISMISSED = '@free_safepal_claim_modal_dismissed';
export const SAFEPAL_BOTTOM_SHEET_ID = 'free-safepal-claim';

const safeSetItem = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to save ${key} to AsyncStorage:`, error);
  }
};

const windowHeight = Dimensions.get('window').height;
const maxBgHeight = Math.min(windowHeight * 0.85, 750);

export default function FreeSafepalClaimContent({
  onDismiss,
  navigation,
}: {
  onDismiss: () => void;
  navigation: NavigationProp<ParamListBase>;
}): React.ReactElement {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClaim = async (): Promise<void> => {
    void logAnalyticsToFirebase(AnalyticEvent.FREE_SAFEPAL_CLAIM_CLICKED, {
      category: 'free_safepal_claim_modal',
      action: 'claim_button_clicked',
      label: 'claim',
    });

    if (dontShowAgain) {
      await safeSetItem(STORAGE_KEY_DISMISSED, 'true');
    }

    onDismiss();
    navigation.navigate(screenTitle.CARD_FAQ_SCREEN, {
      uri: FREE_SAFEPAL_CLAIM_URL,
    });
  };

  const handleCheckboxChange = async (): Promise<void> => {
    const newState = !dontShowAgain;
    setDontShowAgain(newState);
    void logAnalyticsToFirebase(AnalyticEvent.FREE_SAFEPAL_DONT_SHOW_CLICKED, {
      category: 'free_safepal_claim_modal',
      action: 'dont_show_again_toggled',
      label: newState ? 'checked' : 'unchecked',
    });

    if (newState) {
      await safeSetItem(STORAGE_KEY_DISMISSED, 'true');
      onDismiss();
    }
  };

  return (
    <CyDImageBackground
      source={AppImages.SAFEPAL_CLAIM_MODAL}
      className='rounded-t-[24px] overflow-hidden flex-1'
      imageStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      style={{ height: maxBgHeight }}
      resizeMode='cover'>
      <CyDView className='flex-1 justify-end'>
        <CyDView
          className={`px-[16px] ${
            Platform.OS === 'ios' ? 'pb-[12px]' : 'pb-[0px]'
          }`}>
          <CyDTouchView
            activeOpacity={0.8}
            onPress={handleCheckboxChange}
            className='flex-row items-center justify-center mb-[10px]'>
            <CyDMaterialDesignIcons
              name={
                dontShowAgain ? 'checkbox-marked' : 'checkbox-blank-outline'
              }
              size={20}
              className={dontShowAgain ? 'text-p100' : 'text-white'}
            />
            <CyDText className='ml-[10px] text-[14px] text-white opacity-70'>
              {t("Don't show again") as string}
            </CyDText>
          </CyDTouchView>

          <Button
            title={t('Claim Free Safepal')}
            type={ButtonType.YELLOW_FILL}
            onPress={handleClaim}
            style='rounded-full'
          />
        </CyDView>
      </CyDView>
    </CyDImageBackground>
  );
}
