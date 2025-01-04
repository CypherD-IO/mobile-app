import React, { useState } from 'react';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import ThreeDSecureOptionModal from '../../../components/v2/threeDSecureOptionModal';
import { RouteProp, useRoute } from '@react-navigation/native';
import { CardProviders } from '../../../constants/enum';
import { Card } from '../../../models/card.model';

interface RouteParams {
  currentCardProvider: CardProviders;
  card: Card;
  isTelegramEnabled: boolean;
  setIsTelegramEnabled: (value: boolean) => void;
}

export default function ThreeDSecure() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { currentCardProvider, card, isTelegramEnabled, setIsTelegramEnabled } =
    route.params;
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
      <CyDSafeAreaView className={'h-full bg-n20 pt-[10px]'}>
        <CyDView className='mx-[16px] mt-[16px]'>
          <CyDText className='text-[14px] text-n200 mt-[16px] font-[600]'>
            3D Secure Notification
          </CyDText>
          <CyDTouchView
            className='flex flex-row mt-[8px] bg-n0 rounded-[10px] px-[12px] py-[16px] justify-between items-center'
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
          <CyDText className='text-n200 text-[14px] text-[500] mx-[20px] mt-[6px]'>
            {
              "Choose where you'd like to receive the online payment verification code."
            }
          </CyDText>
        </CyDView>
      </CyDSafeAreaView>
    </>
  );
}
