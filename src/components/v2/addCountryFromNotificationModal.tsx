import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { CyDImage, CyDText, CyDView } from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { t } from 'i18next';
import Button from './button';
import CyDModalLayout from './modal';
import { capitalize, get } from 'lodash';
import useAxios from '../../core/HttpRequest';
import { parseErrorMessage } from '../../core/util';
import {
  ParamListBase,
  useNavigation,
  NavigationProp,
} from '@react-navigation/native';
import { screenTitle } from '../../constants';
import { CardControlTypes } from '../../constants/enum';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
export default function AddCountryFromNotificationModal({
  isModalVisible,
  closeModal,
  data,
}: {
  isModalVisible: boolean;
  closeModal: () => void;
  data: {
    reason?: string;
    merchant?: string;
    merchantCountry?: string;
    merchantCity?: string;
    cardId?: string;
    provider?: string;
    transactionCurrency?: string;
    amount?: string;
  };
}) {
  const { getWithAuth, patchWithAuth } = useAxios();

  const [loading, setLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getCountryFromReason = (reason = '', merchantCountry = '') => {
    const match = reason.match(/(.*?) is not in the allow list/);
    return match ? capitalize(match[1]) : merchantCountry;
  };

  const onPressAddCountry = async () => {
    if (data?.provider && data?.cardId && data?.merchantCountry) {
      setLoading(true);
      const {
        data: limits,
        error: limitError,
        isError: isLimitError,
      } = await getWithAuth(
        `/v1/cards/${data?.provider}/card/${data?.cardId}/limits`,
      );

      if (!isLimitError) {
        const payload = {
          cusL: {
            intl: {
              ...get(limits, 'cusL.intl'),
              cLs: [...get(limits, 'cusL.intl.cLs'), data?.merchantCountry],
              dis: false,
            },
          },
        };
        const { error: _updateError, isError: isUpdateError } =
          await patchWithAuth(
            `/v1/cards/${data?.provider}/card/${data?.cardId}/limits`,
            payload,
          );
        if (!isUpdateError) {
          setLoading(false);
          setUpdateSuccess(true);
        } else {
          setLoading(false);
          setUpdateError(true);
          setErrorMessage(parseErrorMessage(_updateError));
        }
      } else {
        setUpdateError(true);
        setErrorMessage(parseErrorMessage(limitError));
        setLoading(false);
      }
    }
  };

  return (
    <CyDModalLayout
      setModalVisible={() => {}}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView className=''>
        <CyDView className='bg-n10 px-[20px] pt-[24px] pb-[36px] rounded-t-[16px] h-[300px]'>
          {!updateSuccess && !updateError && (
            <>
              <CyDView className='flex-row items-center justify-center'>
                <CyDImage
                  source={AppImages.DECLINE}
                  className='w-[32px] h-[32px]'
                />
                <CyDText className='font-semibold text-[20px] ml-[8px]'>
                  {t('TRANSACTION_DECLINE')}
                </CyDText>
              </CyDView>

              <CyDView className='mt-[20px]'>
                <CyDText className='text-[16px] text-center'>
                  {`Your transaction with `}
                  <CyDText className='font-semibold'>
                    {capitalize(data?.merchant) ?? ''}
                  </CyDText>
                  {` in `}
                  <CyDText className='font-semibold'>
                    {capitalize(data?.merchantCity) ?? ''}
                    {`, ${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
                  </CyDText>
                  {` for `}
                  <CyDText className='font-semibold'>{`${data?.amount ?? ''} ${data?.transactionCurrency ?? ''}`}</CyDText>
                  {` got declined.`}
                </CyDText>

                <CyDText className='text-center mt-[10px] text-[16px]'>
                  <CyDText className='font-semibold'>
                    {`${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
                  </CyDText>
                  {` is not in the `}
                  <CyDText className='font-semibold'>
                    International allow list
                  </CyDText>
                  {`.`}
                </CyDText>
              </CyDView>

              <CyDView className='mt-[20px]'>
                <Button
                  title={`Add ${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
                  onPress={() => {
                    void onPressAddCountry();
                  }}
                  loading={loading}
                />
                <Button
                  title={t('CANCEL')}
                  type='secondary'
                  onPress={closeModal}
                  style={'p-[3%] mt-[10px]'}
                />
              </CyDView>
            </>
          )}
          {updateSuccess && (
            <CyDView className='flex-1 flex-col justify-between'>
              <CyDView />
              <CyDView>
                <CyDImage
                  source={AppImages.SUCCESS_TICK_GREEN_BG}
                  className='w-[60px] h-[60px] self-center'
                />

                <CyDText className='text-[20px] text-center font-medium mt-[12px]'>
                  {`${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
                  {' is now enabled'}
                </CyDText>

                <CyDText className='mt-[6px] text-[16px] text-center'>
                  {'Retry the transaction now to make it successful'}
                </CyDText>
              </CyDView>

              <Button
                title={'Done'}
                onPress={() => {
                  setUpdateSuccess(false);
                  closeModal();
                }}
                style={'p-[3%] mt-[20px]'}
              />
            </CyDView>
          )}
          {updateError && (
            <CyDView className='flex-1 flex-col justify-between'>
              <CyDView />
              <CyDView>
                <CyDImage
                  source={AppImages.ERROR_EXCLAMATION_RED_BG_ROUNDED}
                  className='w-[60px] h-[60px] self-center'
                />

                <CyDText className='text-[18px] text-center font-medium mt-[12px]'>
                  {'Unable to add '}
                  {`${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
                </CyDText>

                <CyDText className='mt-[6px] text-[16px] text-center'>
                  {errorMessage}
                </CyDText>
              </CyDView>

              <Button
                title={'Add manually'}
                onPress={() => {
                  setUpdateError(false);
                  closeModal();
                  //   navigation.navigate(screenTitle.INTERNATIONAL_CARD_CONTROLS, {
                  //     cardId: data?.cardId,
                  //     currentCardProvider: data?.provider,
                  //     cardControlType: CardControlTypes.INTERNATIONAL,
                  //   });
                }}
                style={'p-[3%] mt-[20px]'}
              />
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
