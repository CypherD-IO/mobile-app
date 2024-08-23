import React, { useEffect, useState } from 'react';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { screenTitle } from '../../../constants';
import { get } from 'lodash';
import AppImages from '../../../../assets/images/appImages';
import ThreeDSecureOptionModal from '../../../components/v2/threeDSecureOptionModal';

export default function ThreeDSecure({ route, navigation }) {
  const { currentCardProvider, card } = route.params;
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(
    get(card, 'is3dsEnabled', false),
  );
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <ThreeDSecureOptionModal
        setModalVisible={setShowModal}
        isModalVisible={showModal}
        card={card}
        currentCardProvider={currentCardProvider}
        isTelegramEnabled={isTelegramEnabled}
        setIsTelegramEnabled={setIsTelegramEnabled}
      />
      <CyDSafeAreaView className={'h-full bg-cardBgFrom pt-[10px]'}>
        <CyDView className='mx-[16px] mt-[16px]'>
          <CyDText className='text-[12px] text-n200 mt-[16px] font-[600]'>
            3D Secure notification
          </CyDText>
          <CyDTouchView
            className='flex flex-row mt-[12px] bg-white rounded-[10px] px-[12px] py-[16px] justify-between items-center'
            onPress={() => {
              setShowModal(true);
            }}>
            <CyDView className='flex flex-row items-center'>
              <CyDText className='text-[18px] font-[500] '>
                3D Secure Verification
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row items-center'>
              <CyDText className='text-[14px] text-b150'>
                {isTelegramEnabled ? 'Telegram' : 'SMS'}
              </CyDText>
              <CyDImage
                source={AppImages.RIGHT_ARROW}
                className='w-[12px] h-[12px] ml-[8px]'
              />
            </CyDView>
          </CyDTouchView>
          <CyDText className='text-n200 text-[10px] text-[500] mx-[20px] mt-[6px]'>
            {
              "Choose where you'd like to receive the online payment verification code."
            }
          </CyDText>
        </CyDView>
      </CyDSafeAreaView>
    </>
  );
}
