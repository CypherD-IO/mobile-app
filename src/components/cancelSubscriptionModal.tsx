import React from 'react';
import CyDModalLayout from './v2/modal';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../styles/tailwindComponents';
import { StyleSheet } from 'react-native';
import moment from 'moment';
import Button from './v2/button';
import { ButtonType } from '../constants/enum';

interface CancelSubscriptionModalProps {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  currentPlanInfo: {
    expiresOn?: number;
  };
  onCancelSubscription: () => Promise<void>;
}

export default function CancelSubscriptionModal({
  isModalVisible,
  setShowModal,
  currentPlanInfo,
  onCancelSubscription,
}: CancelSubscriptionModalProps): JSX.Element {
  /**
   * Handles the cancel subscription action by calling the parent callback
   */
  const handleCancelSubscription = (): void => {
    void onCancelSubscription();
    setShowModal(false);
  };

  const expirationDate = currentPlanInfo?.expiresOn
    ? moment.unix(currentPlanInfo?.expiresOn).format('MMMM DD, YYYY')
    : '-';

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setShowModal}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}>
      <CyDView className='bg-n0 mb-[6px] rounded-[16px] max-h-[80%] pb-[32px]'>
        {/* Warning Section */}
        <CyDView className='mx-[12px] mt-[12px] bg-n0 rounded-[8px] p-[16px]'>
          <CyDMaterialDesignIcons
            name='alert'
            size={52}
            className='text-p150 mt-[2px]'
          />
          <CyDText className='text-[20px] my-[8px]'>Impact Information</CyDText>

          {/* Impact List */}
          <CyDView className=''>
            {[
              'Fees such as loading and forex will revert to the free plan after that.',
              'Your spending limit will adjust to the free plan limits.',
              'The additional physical plastic card will remain active.',
              'Fraud protection and premium features will be discontinued after the subscription period.',
            ].map((impact, index) => (
              <CyDView
                key={index}
                className='flex flex-row items-start gap-x-[4px] my-[24px] last:mb-0'>
                <CyDText className='text-[15px] font-medium'>{`${index + 1}. ${impact}`}</CyDText>
              </CyDView>
            ))}
          </CyDView>

          {/* Expiration Info */}
          {Boolean(currentPlanInfo?.expiresOn) && (
            <CyDView className='mt-[16px] p-[12px] bg-n20 rounded-[6px]'>
              <CyDText className='text-[14px] font-medium text-orange700'>
                Your subscription will remain active until {expirationDate}
              </CyDText>
            </CyDView>
          )}

          <Button
            onPress={handleCancelSubscription}
            type={ButtonType.RED}
            title='Cancel Subscription'
            style='mt-[24px] rounded-full'
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
