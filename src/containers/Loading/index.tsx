/**
 * @format
 * @flow
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/theme';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { currentSchemaVersion } from '../../core/Keychain';
import useConnectionManager from '../../hooks/useConnectionManager';
import { useNavigation } from '@react-navigation/native';
import { getSchemaVersion } from '../../core/asyncStorage';

export default function Loading({ loadingText }: { loadingText?: string }) {
  const { t } = useTranslation();
  const [isContinueWithUpdate, setIsContinueWithUpdate] = useState(false);
  const { deleteWallet } = useConnectionManager();
  const navigation = useNavigation();

  useEffect(() => {
    async function checkSchemaVersion() {
      const schemaVersion = await getSchemaVersion();
      if (schemaVersion) {
        setIsContinueWithUpdate(
          !(parseInt(schemaVersion) < currentSchemaVersion),
        );
      }
    }

    void checkSchemaVersion();
  });

  return (
    <CyDSafeAreaView className='h-full'>
      <CyDView className='flex flex-1 flex-col h-full w-[70%] justify-center self-center'>
        <ActivityIndicator size='large' color={Colors.appColor} />
        <CyDText className='text-center font-nunito text-[14px] mt-[10px]'>
          {loadingText ?? t('LOADING_TEXT')}
        </CyDText>

        {!isContinueWithUpdate && (
          <>
            <CyDTouchView
              onPress={() => {
                setIsContinueWithUpdate(true);
              }}
              className={
                'bg-white border-[0.3px] border-[#525252] py-[14px] mt-[40px] items-center rounded-[8px] flex-row justify-around w-[98%]'
              }>
              <CyDText className={'text-[16px] font-extrabold w-[80%]'}>
                {t('CONTINUE_WITH_UPDATE').toString()}
              </CyDText>
              <CyDImage
                source={AppImages.RIGHT_ARROW}
                resizeMode={'contain'}
                className={'w-[9px] h-[17px]'}
                style={{ tintColor: '#434343' }}
              />
            </CyDTouchView>
            <CyDTouchView
              onPress={() => {
                try {
                  void deleteWallet({ navigation, importNewWallet: true });
                } catch (error) {
                  console.log('eror : ', error);
                }
              }}
              className={
                'bg-white border-[0.3px] border-[#525252] py-[14px] mt-[20px] items-center rounded-[8px] flex-row justify-around w-[98%]'
              }>
              <CyDText className={'text-[16px] font-extrabold w-[80%]'}>
                {t('IMPORT_WALLET').toString()}
              </CyDText>
              <CyDImage
                source={AppImages.RIGHT_ARROW}
                resizeMode={'contain'}
                className={'w-[9px] h-[17px]'}
                style={{ tintColor: '#434343' }}
              />
            </CyDTouchView>
          </>
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
}
