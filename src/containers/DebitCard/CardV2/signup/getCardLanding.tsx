import React from 'react';
import {
  CyDImage,
  CyDImageBackground,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDView,
} from '../../../../styles/tailwindStyles';
import AppImages from '../../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import Button from '../../../../components/v2/button';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { screenTitle } from '../../../../constants';

export default function GetCardLanding() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <CyDSafeAreaView>
      <CyDScrollView className=''>
        <CyDView className=' bg-cardBgFrom px-[16px] pb-[24px]'>
          <CyDText className='font-extrabold text-[28px]'>{t('Cards')}</CyDText>
          <CyDImageBackground
            className='flex flex-row justify-center items-center h-[190px] w-[300px] self-center my-[30px]'
            resizeMode='stretch'
            source={AppImages.RC_VIRTUAL}
          />

          <CyDText className='font-medium text-[14px] text-center mb-[12px]'>
            {t('UPGRADE_TO_CAPABLE_CARD')}
          </CyDText>
          <Button
            onPress={() => {
              navigation.navigate(screenTitle.SELECT_PLAN);
            }}
            title={t('GET_CYPHER_CARD')}
          />
        </CyDView>
        <CyDView className='px-[16px]'>
          {/* Apple and google pay */}
          <CyDView className='flex flex-row items-center'>
            <CyDView>
              <CyDImage
                source={AppImages.LIST_ICON}
                className='w-[24px] h-[24px]'
              />
            </CyDView>
            <CyDView className='flex-1 ml-[14px] mt-[16px]'>
              <CyDText className='font-semibold text-[16px] mb-[6px]'>
                {t('Apple Pay & google pay')}
              </CyDText>
              <CyDText className='break-words text-[#8C8C8C] font-normal text-[12px]'>
                {t(
                  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy",
                )}
              </CyDText>
            </CyDView>
          </CyDView>

          {/* Wider acceptance */}
          <CyDView className='flex flex-row items-center'>
            <CyDView>
              <CyDImage
                source={AppImages.LIST_ICON}
                className='w-[24px] h-[24px]'
              />
            </CyDView>
            <CyDView className='flex-1 ml-[14px] mt-[16px]'>
              <CyDText className='font-semibold text-[16px] mb-[6px]'>
                {t('Wider Acceptance ')}
              </CyDText>
              <CyDText className='break-words text-[#8C8C8C] font-normal text-[12px]'>
                {t(
                  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy",
                )}
              </CyDText>
            </CyDView>
          </CyDView>

          {/* Wider acceptance */}
          <CyDView className='flex flex-row items-center'>
            <CyDView>
              <CyDImage
                source={AppImages.LIST_ICON}
                className='w-[24px] h-[24px]'
              />
            </CyDView>
            <CyDView className='flex-1 ml-[14px] mt-[16px]'>
              <CyDText className='font-semibold text-[16px] mb-[6px]'>
                {t('Wider Acceptance ')}
              </CyDText>
              <CyDText className='break-words text-[#8C8C8C] font-normal text-[12px]'>
                {t(
                  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy",
                )}
              </CyDText>
            </CyDView>
          </CyDView>

          {/* Wider acceptance */}
          <CyDView className='flex flex-row items-center'>
            <CyDView>
              <CyDImage
                source={AppImages.LIST_ICON}
                className='w-[24px] h-[24px]'
              />
            </CyDView>
            <CyDView className='flex-1 ml-[14px] mt-[16px]'>
              <CyDText className='font-semibold text-[16px] mb-[6px]'>
                {t('Low Forex in the industry ')}
              </CyDText>
              <CyDText className='break-words text-[#8C8C8C] font-normal text-[12px]'>
                {t(
                  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy",
                )}
              </CyDText>
            </CyDView>
          </CyDView>

          {/* Wider acceptance */}
          <CyDView className='flex flex-row items-center pb-[60px]'>
            <CyDView>
              <CyDImage
                source={AppImages.LIST_ICON}
                className='w-[24px] h-[24px]'
              />
            </CyDView>
            <CyDView className='flex-1 ml-[14px] mt-[16px]'>
              <CyDText className='font-semibold text-[16px] mb-[6px]'>
                {t('Low Forex in the industry ')}
              </CyDText>
              <CyDText className='break-words text-[#8C8C8C] font-normal text-[12px]'>
                {t(
                  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy",
                )}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}

// export default GetCardV2;
