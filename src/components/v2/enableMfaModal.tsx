import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import {
  CyDImage,
  CyDText,
  CyDView,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import Button from './button';
import { ButtonType } from '../../constants/enum';

/**
 * Interface for EnableMfaModal component props
 * @interface EnableMfaModalProps
 * @property {boolean} isModalVisible - Controls modal visibility
 * @property {() => void} onSuccess - Callback when user proceeds with enabling MFA
 * @property {() => void} onFailure - Callback when user dismisses or cancels the modal
 */
interface EnableMfaModalProps {
  isModalVisible: boolean;
  onSuccess: () => void;
  onFailure: () => void;
}

/**
 * EnableMfaModal - A modal component that prompts users to enable Multi-Factor Authentication (MFA)
 * for enhanced account security and asset protection.
 *
 * This modal displays:
 * - A security-focused icon/image
 * - A clear title about enabling MFA
 * - A persuasive message about protecting user assets
 * - Action buttons to proceed or dismiss
 *
 * @param {EnableMfaModalProps} props - Component props
 * @returns {JSX.Element} The rendered modal component
 */
const EnableMfaModal: React.FC<EnableMfaModalProps> = ({
  isModalVisible,
  onSuccess,
  onFailure,
}) => {
  const { t } = useTranslation();

  /**
   * Handles the success/proceed action
   * Calls the onSuccess callback if provided
   */
  const handleProceed = (): void => {
    if (typeof onSuccess !== 'undefined') {
      onSuccess();
    }
  };

  /**
   * Handles the cancel/dismiss action
   * Calls the onFailure callback if provided
   */
  const handleDismiss = (): void => {
    if (typeof onFailure !== 'undefined') {
      onFailure();
    }
  };

  return (
    <CyDModalLayout
      setModalVisible={handleDismiss}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}
      isModalVisible={isModalVisible}
      disableBackDropPress={false}>
      <CyDView
        className={
          'bg-n20 w-[100%] px-[40px] pb-[30px] rounded-t-[24px] relative'
        }>
        {/* Close button */}
        <CyDTouchView
          onPress={handleDismiss}
          className={'absolute top-[25px] right-[25px] z-[50]'}>
          <CyDMaterialDesignIcons
            name={'close'}
            size={24}
            className='text-base400'
          />
        </CyDTouchView>

        {/* Security Icon/Image */}
        <CyDView className='flex items-center justify-center mt-[40px]'>
          <CyDImage
            className={'h-[100px] w-[100px]'}
            source={AppImages.SHIELD_3D}
            resizeMode='contain'
          />
        </CyDView>

        {/* Title */}
        <CyDText className={'mt-[20px] font-bold text-[22px] text-center'}>
          {t('ENABLE_MFA')}
        </CyDText>

        {/* Description */}
        <CyDView className='mt-[16px] mb-[12px]'>
          <CyDText
            className={'text-center text-[15px] leading-[22px] text-base200'}>
            {t('ENABLE_MFA_DESCRIPTION')}
          </CyDText>
        </CyDView>

        {/* Settings Info */}
        <CyDView className='bg-n30 rounded-[12px] px-[16px] py-[12px] mb-[20px]'>
          <CyDText
            className={'text-center text-[12px] leading-[18px] text-base100'}>
            {t('ENABLE_MFA_SETTINGS_INFO')}
          </CyDText>
        </CyDView>

        {/* Action Buttons */}
        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px] mt-[10px]'
            title={t('ENABLE_NOW')}
            titleStyle='text-black'
            onPress={handleProceed}
            type={ButtonType.PRIMARY}
          />
          <Button
            style='h-[54px] mt-[15px]'
            title={t('MAYBE_LATER')}
            titleStyle='text-base400'
            onPress={handleDismiss}
            type={ButtonType.SECONDARY}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
});

export default EnableMfaModal;
