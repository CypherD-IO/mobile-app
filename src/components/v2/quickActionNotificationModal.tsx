import { t } from 'i18next';
import { capitalize, get } from 'lodash';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import useAxios from '../../core/HttpRequest';
import { parseErrorMessage } from '../../core/util';
import {
  CyDImage,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import Button from './button';
import CyDModalLayout from './modal';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { screenTitle } from '../../constants';
import {
  CardControlTypes,
  CardOperationsAuthType,
  CypherDeclineCodes,
  RPCODES,
} from '../../constants/enum';
import { useGlobalModalContext } from './GlobalModal';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

interface TransactionData {
  txnId?: string;
  reason?: string;
  merchant?: string;
  merchantCountry?: string;
  merchantCity?: string;
  cardId?: string;
  provider?: string;
  transactionCurrency?: string;
  amount?: string | number;
  cardType?: string;
  last4?: string;
  declineCode?: string;
  categoryId?: CypherDeclineCodes | RPCODES;
  navigation?: NavigationProp<ParamListBase>;
}

const getCountryFromReason = (reason = '', merchantCountry = '') => {
  const match = reason.match(/(.*?) is not in the allow list/);
  return match ? capitalize(match[1]) : merchantCountry;
};

function RenderHeader({
  closeModal,
  title = 'Transaction Decline',
}: {
  closeModal: () => void;
  title?: string;
}) {
  return (
    <CyDView className='flex-row items-center justify-between px-[20px]'>
      <CyDView className='flex-row items-center justify-center'>
        <CyDText className='font-bold text-[20px]'>{title}</CyDText>
      </CyDView>
      <CyDTouchView onPress={closeModal}>
        <CydMaterialDesignIcons
          name={'close'}
          size={24}
          className='text-base400'
        />
      </CyDTouchView>
    </CyDView>
  );
}

function RenderCountryDecline({
  updateSuccess,
  updateError,
  data,
  loading,
  onPressAddCountry,
  closeModal,
  errorMessage,
  setUpdateSuccess,
  setUpdateError,
}: {
  updateSuccess: boolean;
  updateError: boolean;
  data: TransactionData;
  loading: boolean;
  onPressAddCountry: () => Promise<void>;
  closeModal: () => void;
  errorMessage: string;
  setUpdateSuccess: Dispatch<SetStateAction<boolean>>;
  setUpdateError: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <CyDView className='bg-n10 pt-[24px] rounded-t-[16px]'>
      {!updateSuccess && !updateError && (
        <>
          <RenderHeader closeModal={closeModal} />

          <CyDView className='mt-[40px]'>
            <CyDImage
              source={AppImages.INTERNATIONAL_COUNTRIES_QUICK_ACTION}
              className='w-[220px] h-[180px] self-center'
            />
          </CyDView>

          <CyDView className='mt-[24px] bg-n30 py-[24px] px-[30px]'>
            <CyDText className='text-[22px] font-bold text-center w-[200px] self-center'>
              {'Transaction declined'}
            </CyDText>
            <CyDText className='text-[14px] text-center mt-[12px] text-n300'>
              {`Your transaction with `}
              <CyDText className='font-semibold'>
                {capitalize(data?.merchant) ?? ''}
              </CyDText>
              {` in `}
              <CyDText className='font-semibold'>
                {capitalize(data?.merchantCity) ?? ''}
                {`, ${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
              </CyDText>
              {`\n for `}
              <CyDText className='font-semibold'>{`${data?.amount ?? ''} ${data?.transactionCurrency ?? ''}`}</CyDText>
              {` got declined.`}
            </CyDText>
            <CyDText className='text-[14px] text-center mt-[12px] text-n300'>
              <CyDText className='font-semibold'>
                {`${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
              </CyDText>
              {` is not in the `}
              <CyDText className='font-semibold'>
                International allow list
              </CyDText>
              {`.`}
            </CyDText>

            <CyDView className='mt-[28px] mb-[24px] flex-row justify-between'>
              <Button
                title={t('REVIEW_SETTINGS')}
                type='secondary'
                onPress={() => {
                  closeModal();
                  if (data?.navigation)
                    data?.navigation?.navigate(
                      screenTitle.INTERNATIONAL_CARD_CONTROLS,
                      {
                        cardId: data?.cardId,
                        currentCardProvider: data?.provider,
                        cardControlType: CardControlTypes.INTERNATIONAL,
                      },
                    );
                }}
                style={'p-[15px] w-[48%]'}
              />
              <Button
                title={`Add ${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
                onPress={() => {
                  void onPressAddCountry();
                }}
                loading={loading}
                style={'p-[15px] w-[48%]'}
              />
            </CyDView>
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
              if (data?.navigation)
                data?.navigation?.navigate(
                  screenTitle.INTERNATIONAL_CARD_CONTROLS,
                  {
                    cardId: data?.cardId,
                    currentCardProvider: data?.provider,
                    cardControlType: CardControlTypes.INTERNATIONAL,
                  },
                );
            }}
            style={'p-[3%] mt-[20px]'}
          />
        </CyDView>
      )}
    </CyDView>
  );
}

function RenderCardNotActivatedOrBlocked({
  data,
  loading,
  closeModal,
  isBlocked,
  hideModal,
  showModal,
}: {
  data: TransactionData;
  loading: boolean;
  closeModal: () => void;
  isBlocked: boolean;
  hideModal: () => void;
  showModal: (modalType: string, params: any) => void;
}) {
  const pressButton = () => {
    closeModal();
    if (data?.navigation && !isBlocked)
      data?.navigation?.navigate(screenTitle.CARD_ACTIAVTION_SCREEN, {
        currentCardProvider: data?.provider,
        card: { cardId: data?.cardId },
      });
    if (data?.navigation && isBlocked)
      data?.navigation.navigate(screenTitle.CARD_UNLOCK_AUTH, {
        onSuccess: () => {
          showModal('state', {
            type: 'success',
            title: t('CHANGE_CARD_STATUS_SUCCESS'),
            description: `Successfully unlocked your card!`,
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        },
        currentCardProvider: data?.provider,
        card: { cardId: data?.cardId },
        authType: CardOperationsAuthType.UNBLOCK,
      });
  };
  return (
    <CyDView className='bg-n10 pt-[24px] rounded-t-[16px]'>
      <RenderHeader
        closeModal={closeModal}
        title={isBlocked ? 'Unblock Card' : 'Activate Card'}
      />

      <CyDView className='mt-[40px]'>
        <CyDImage
          source={
            isBlocked
              ? AppImages.UNBLOCK_CARD_QUICK_ACTION
              : AppImages.ACTIVATE_CARD_QUICK_ACTION
          }
          className='w-[190px] h-[180px] self-center'
        />
      </CyDView>

      <CyDView className='mt-[24px] bg-n30 py-[24px] px-[30px]'>
        <CyDText className='text-[22px] font-bold text-center w-[200px] self-center'>
          {'Transaction declined'}
        </CyDText>

        <CyDText className='text-[14px] text-center mt-[12px] text-n300'>
          {`Your transaction with `}
          <CyDText className='font-semibold'>
            {capitalize(data?.merchant) ?? ''}
          </CyDText>
          {` in `}
          <CyDText className='font-semibold'>
            {capitalize(data?.merchantCity) ?? ''}
            {`, ${getCountryFromReason(data?.reason, data?.merchantCountry)}`}
          </CyDText>
          {` \nfor `}
          <CyDText className='font-semibold'>{`${data?.amount ?? ''} ${data?.transactionCurrency ?? ''}`}</CyDText>
          {` got declined.`}
        </CyDText>

        <CyDText className='text-[14px] text-center mt-[12px] text-n300'>
          {`Please ${isBlocked ? 'unblock' : 'activate'} your card to continue with the transaction.`}
        </CyDText>

        <CyDView className='mt-[28px] mb-[24px]'>
          <Button
            title={isBlocked ? 'Unblock your card' : 'Activate your card'}
            onPress={pressButton}
            loading={loading}
            style={'p-[15px] '}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

export default function QuickActionNotificationModal({
  isModalVisible,
  closeModal,
  data,
}: {
  isModalVisible: boolean;
  closeModal: () => void;
  data: TransactionData;
}) {
  const { getWithAuth, patchWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const [loading, setLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onPressAddCountry = async () => {
    if (!data?.provider || !data?.cardId || !data?.merchantCountry) {
      setErrorMessage('Missing required data');
      setUpdateError(true);
      return;
    }
    setLoading(true);
    try {
      const {
        data: limits,
        error: limitError,
        isError: isLimitError,
      } = await getWithAuth(
        `/v1/cards/${data?.provider}/card/${data?.cardId}/limits`,
      );
      if (isLimitError) {
        throw new Error(parseErrorMessage(limitError));
      }
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
      if (isUpdateError) {
        throw new Error(parseErrorMessage(_updateError));
      }
      setUpdateSuccess(true);
    } catch (error) {
      setUpdateError(true);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CyDModalLayout
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      setModalVisible={() => {}}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView className=''>
        {data?.categoryId === CypherDeclineCodes.INT_COUNTRY && (
          <RenderCountryDecline
            updateSuccess={updateSuccess}
            updateError={updateError}
            data={data}
            loading={loading}
            onPressAddCountry={onPressAddCountry}
            closeModal={closeModal}
            errorMessage={errorMessage}
            setUpdateSuccess={setUpdateSuccess}
            setUpdateError={setUpdateError}
          />
        )}
        {data?.categoryId === RPCODES.CardIsNotActivated && (
          <RenderCardNotActivatedOrBlocked
            data={data}
            loading={loading}
            closeModal={closeModal}
            isBlocked={false}
            hideModal={hideModal}
            showModal={showModal}
          />
        )}
        {data?.categoryId === RPCODES.CardIsBlocked && (
          <RenderCardNotActivatedOrBlocked
            data={data}
            loading={loading}
            closeModal={closeModal}
            isBlocked={true}
            hideModal={hideModal}
            showModal={showModal}
          />
        )}
      </CyDView>
    </CyDModalLayout>
  );
}
