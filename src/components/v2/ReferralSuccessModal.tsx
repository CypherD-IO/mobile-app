import React from 'react';
import Modal from 'react-native-modal';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';

interface ReferralSuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  referralCode: string;
}

const ReferralSuccessModal: React.FC<ReferralSuccessModalProps> = ({
  isVisible,
  onClose,
  referralCode,
}) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.5}
      useNativeDriver
      style={{ margin: 0, justifyContent: 'center', alignItems: 'center' }}>
      <CyDView className='bg-n20 rounded-2xl w-[320px] items-center py-6 px-4'>
        {/* Success Icon */}
        <CyDImage
          source={AppImages.CARD_APP_REFERRAL_SUCCESS_ICON}
          className='w-[47px] h-[47px] mb-3'
        />

        {/* Applied Code */}
        <CyDText className='text-center mb-2 font-bold text-[12px]'>
          "{referralCode} Applied"
        </CyDText>

        {/* Success Message */}
        <CyDText className='text-[18px] font-bold text-center text-green400 mb-3'>
          Referral code applied successfully!
        </CyDText>

        {/* Done Button */}
        <CyDTouchView
          onPress={onClose}
          className='bg-buttonColor w-full rounded-full py-4'>
          <CyDText className='text-center text-black font-bold'>Done</CyDText>
        </CyDTouchView>
      </CyDView>
    </Modal>
  );
};

export default ReferralSuccessModal;
