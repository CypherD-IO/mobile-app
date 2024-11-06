import React, { Dispatch, SetStateAction, useState } from 'react';
import AppImages from '../../../../../assets/images/appImages';
import { CyDImage, CyDText, CyDView } from '../../../../styles/tailwindStyles';
import Button from '../../../../components/v2/button';
import { t } from 'i18next';

export default function ZrmIntro({
  setIsFirstZrmEnable,
}: {
  setIsFirstZrmEnable: Dispatch<SetStateAction<boolean | null>>;
}) {
  const [index, setIndex] = useState(0);
  return (
    <>
      {index === 0 ? (
        <CyDView className='h-full bg-base400 '>
          <CyDView className='h-[50%] flex flex-col items-center justify-center'>
            <CyDImage
              source={AppImages.ZRM_INTRO_1}
              className='w-[176px] h-[176px]'
            />
          </CyDView>
          <CyDView className='h-[50%] flex flex-col items-center justify-between'>
            <CyDView>
              <CyDText className='text-n0 text-[40px] font-extrabold text-center'>
                Meet
              </CyDText>
              <CyDText className='text-n0 text-[40px] font-extrabold text-center'>
                Zero Restriction
              </CyDText>
              <CyDView className='mt-[24px] px-[20px]'>
                <CyDView className='flex flex-row'>
                  <CyDText className='text-n0 text-[18px] font-medium mr-[8px]'>
                    •
                  </CyDText>
                  <CyDText className='text-n0 text-[18px] font-medium '>
                    Temporarily lift all restrictions with Zero Restriction.
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row mt-[24px]'>
                  <CyDText className='text-n0 text-[18px] font-medium mr-[8px]'>
                    •
                  </CyDText>
                  <CyDText className='text-n0 text-[18px] font-medium '>
                    Ensure your important payment goes through without
                    interruptions.
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='w-full mb-[50px] px-[16px]'>
              <Button
                onPress={() => {
                  setIndex(1);
                }}
                title={t('CONTINUE')}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      ) : (
        <CyDView className='h-full bg-base400 '>
          <CyDView className='h-[50%] flex flex-col items-center justify-center'>
            <CyDImage
              source={AppImages.ZRM_INTRO_2}
              className='w-[176px] h-[176px]'
            />
          </CyDView>
          <CyDView className='h-[50%] flex flex-col items-center justify-between'>
            <CyDView>
              <CyDText className='text-n0 text-[40px] font-extrabold text-center'>
                Quick. Secure.
              </CyDText>
              <CyDText className='text-n0 text-[40px] font-extrabold text-center'>
                Unrestricted.
              </CyDText>
              <CyDView className='mt-[24px] px-[20px]'>
                <CyDView className='flex flex-row'>
                  <CyDText className='text-n0 text-[18px] font-medium mr-[8px]'>
                    •
                  </CyDText>
                  <CyDText className='text-n0 text-[18px] font-medium '>
                    Your card remains protected, and you stay in control.
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row mt-[24px]'>
                  <CyDText className='text-n0 text-[18px] font-medium mr-[8px]'>
                    •
                  </CyDText>
                  <CyDText className='text-n0 text-[18px] font-medium '>
                    Use Zero Restriction for smooth transactions when it matters
                    most.
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='w-full mb-[50px] px-[16px]'>
              <Button
                onPress={() => {
                  setIsFirstZrmEnable(false);
                }}
                title={t('ENABLE_ZERO_RESTRICTION_MODE')}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      )}
    </>
  );
}
