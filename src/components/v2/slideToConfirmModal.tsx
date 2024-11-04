import clsx from 'clsx';
import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CyDImage, CyDView } from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { t } from 'i18next';
import { useGlobalModalContext } from './GlobalModal';
import useAxios from '../../core/HttpRequest';

const SlideToConfirm = ({
  approveUrl,
  closeModal,
}: {
  approveUrl: string;
  closeModal: () => void;
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [isError, setIsError] = useState<boolean | null>(null);
  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth } = useAxios();

  const handleAccept = async () => {
    setAcceptLoading(true);
    const response = await postWithAuth(approveUrl, {});
    setAcceptLoading(false);
    if (!response?.isError) {
      setIsError(false);
      setConfirmed(true);
      closeModal();
    } else {
      setIsError(true);
      setConfirmed(true);
      setTimeout(() => {
        closeModal();
      }, 500);
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('TRANSACTION_APPROVAL_FAILED'),
          description:
            response?.error?.message ??
            t('TRANSACTION_APPROVAL_FAILED_REASON_NA'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    }
  };

  const renderLeftActions = () => (
    <CyDView className='justify-center items-center w-[240px] h-full bg-[#333] rounded-l-[25px]'>
      <Text className='text-white ml-[60px]'>
        {isError === null
          ? 'Approving...'
          : isError
            ? 'Approval Failed'
            : 'Approved'}
      </Text>
    </CyDView>
  );

  return (
    <CyDView className='w-[300px] bg-[#333] h-[60px] rounded-[25px] overflow-hidden'>
      <View pointerEvents={confirmed ? 'none' : 'auto'}>
        <Swipeable
          renderLeftActions={renderLeftActions}
          onSwipeableLeftOpen={() => {
            void handleAccept();
          }}
          onActivated={() => setIsSwiping(true)}
          onSwipeableWillClose={() => setIsSwiping(false)}>
          <CyDView className='w-[300px] h-[60px] bg-[#333] justify-center flex-row items-center px-[5px]'>
            <CyDView
              className={clsx(
                'w-[50px] h-[50px] bg-[#f0a500] rounded-full justify-center items-center',
                confirmed && !isError && 'bg-green-600',
                confirmed && isError && 'bg-red-600',
              )}>
              {acceptLoading ? (
                <ActivityIndicator color='white' />
              ) : (
                <CyDImage
                  source={
                    confirmed
                      ? isError
                        ? AppImages.WHITE_CLOSE_ICON
                        : AppImages.CORRECT
                      : AppImages.RIGHT_ARROW
                  }
                  className='w-[20px] h-[20px]'
                />
              )}
            </CyDView>
            <Text
              className={clsx(
                'text-white flex-1 text-center',
                isSwiping && 'text-transparent',
              )}>
              {'Swipe to confirm'}
            </Text>
          </CyDView>
        </Swipeable>
      </View>
    </CyDView>
  );
};

export default SlideToConfirm;
