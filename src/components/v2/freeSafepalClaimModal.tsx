import React, { useState, useRef } from 'react';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
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
import CyDBottomSheet, { CyDBottomSheetRef } from './CyDBottomSheet';

export const STORAGE_KEY_DISMISSED = '@free_safepal_claim_modal_dismissed';

const safeSetItem = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to save ${key} to AsyncStorage:`, error);
  }
};

const windowHeight = Dimensions.get('window').height;
const maxBgHeight = Math.min(windowHeight * 0.8, 750);

export default function FreeSafepalClaimModal({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const bottomSheetRef = useRef<CyDBottomSheetRef>(null);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const handleClaim = async () => {
    void logAnalyticsToFirebase(AnalyticEvent.FREE_SAFEPAL_CLAIM_CLICKED, {
      category: 'free_safepal_claim_modal',
      action: 'claim_button_clicked',
      label: 'claim',
    });

    if (dontShowAgain) {
      await safeSetItem(STORAGE_KEY_DISMISSED, 'true');
    }

    bottomSheetRef.current?.dismiss();
    navigation.navigate(screenTitle.CARD_FAQ_SCREEN, {
      uri: FREE_SAFEPAL_CLAIM_URL,
    });
  };

  const handleCheckboxChange = async () => {
    const newState = !dontShowAgain;
    setDontShowAgain(newState);
    void logAnalyticsToFirebase(AnalyticEvent.FREE_SAFEPAL_DONT_SHOW_CLICKED, {
      category: 'free_safepal_claim_modal',
      action: 'dont_show_again_toggled',
      label: newState ? 'checked' : 'unchecked',
    });

    if (newState) {
      await safeSetItem(STORAGE_KEY_DISMISSED, 'true');
      bottomSheetRef.current?.dismiss();
    }
  };

  const handleClose = async () => {
    if (dontShowAgain) {
      await safeSetItem(STORAGE_KEY_DISMISSED, 'true');
    }
    onDismiss();
  };

  return (
    <CyDBottomSheet
      ref={bottomSheetRef}
      snapPoints={['90%']}
      initialSnapIndex={0}
      backgroundColor='#131426'
      borderRadius={24}
      scrollable={false}
      enablePanDownToClose={true}
      showHandle={false}
      onClose={handleClose}>
      <CyDImageBackground
        source={AppImages.SAFEPAL_CLAIM_MODAL}
        className='rounded-t-[24px] overflow-hidden '
        style={{ height: maxBgHeight }}
        imageStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        resizeMode='cover'>
        <CyDView className='flex-1 justify-end'>
          <CyDView className='px-[16px] pb-[0px]'>
            <CyDTouchView
              activeOpacity={0.8}
              onPress={handleCheckboxChange}
              className='flex-row items-center justify-center mb-[5px]'>
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
    </CyDBottomSheet>
  );
}
