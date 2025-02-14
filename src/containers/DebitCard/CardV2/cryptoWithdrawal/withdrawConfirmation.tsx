import React, { useContext, useState } from 'react';
import {
  CyDFastImage,
  CyDIcons,
  CyDKeyboardAwareScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import useAxios from '../../../../core/HttpRequest';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../../../assets/images/appImages';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import { screenTitle } from '../../../../constants';
import { round } from 'lodash';
import { HdWalletContext, parseErrorMessage } from '../../../../core/util';
import { HdWalletContextDef } from '../../../../reducers/hdwallet_reducer';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import { StyleSheet } from 'react-native';
import { Card } from '../../../../models/card.model';
import Tooltip from 'react-native-walkthrough-tooltip';

interface RouteParams {
  amount: string;
  currentCardProvider: string;
  card: Card;
  cardBalance: string;
  withdrawalId: string;
  withdrawalFee: string;
  withdrawableAmount: string;
}

export default function WithdrawConfirmation() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { postWithAuth } = useAxios();
  const insets = useSafeAreaInsets();
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const { showModal, hideModal } = useGlobalModalContext();

  const {
    amount,
    card,
    currentCardProvider,
    withdrawalId,
    withdrawalFee,
    withdrawableAmount,
  } = route.params ?? {};
  const ethereumAddress = hdWallet?.state?.wallet?.ethereum?.address ?? '';

  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const postWithdrawal = async () => {
    setLoading(true);
    const postBody = {
      requestId: withdrawalId,
    };
    const { isError, error } = await postWithAuth(
      '/v1/cards/crypto-withdrawal/confirm',
      postBody,
    );
    if (isError) {
      showModal('state', {
        type: 'error',
        title: t('WITHDRAW_ERROR'),
        description:
          parseErrorMessage(error) ?? t('CONTACT_SUPPORT_MORE_DETAILS'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      navigation.navigate(screenTitle.WITHDRAW_SUCCESS, {
        amount,
        card,
        currentCardProvider,
      });
    }
    setLoading(false);
  };

  return (
    <CyDView
      className='flex flex-col justify-between h-full bg-n30'
      style={{ paddingTop: insets.top }}>
      <CyDView className='flex-1  px-[16px]'>
        <CyDTouchView
          className=''
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>

        <CyDKeyboardAwareScrollView className='flex-1 bg-n30 mt-[12px]'>
          <CyDText className='font-bold text-[28px] text-base400 '>
            {'Does Everything look right ?'}
          </CyDText>
          <CyDView className='bg-n0 p-6 rounded-[16px] flex flex-col gap-y-6 mt-[24px]'>
            <CyDView className='flex flex-col gap-1'>
              <CyDText className='font-medium text-[12px] text-n100'>
                {'To'}
              </CyDText>
              <CyDText className='font-medium text-[12px] text-n200'>
                {ethereumAddress}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-col gap-1'>
              <CyDText className='font-medium text-[12px] text-n100'>
                {'Your are withdrawing '}
              </CyDText>
              <CyDText className='font-bold text-[20px] text-base400 flex flex-row items-end'>
                {`$ ${amount}`}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-col gap-1'>
              <CyDView className='flex flex-row items-center'>
                <CyDText className='font-medium text-[12px] text-n100'>
                  {'Conversion Fee'}
                </CyDText>
                <Tooltip
                  isVisible={showTooltip}
                  disableShadow={true}
                  content={
                    <CyDView className='p-[5px]'>
                      <CyDText className='text-[15px] font-bold text-base400'>
                        {
                          '$1 or 0.5% of the amount, whichever is higher is collected as withdrawal fee'
                        }
                      </CyDText>
                    </CyDView>
                  }
                  onClose={() => setShowTooltip(false)}
                  placement='top'>
                  <CyDTouchView onPress={() => setShowTooltip(true)}>
                    <CyDIcons
                      name='information'
                      size={24}
                      className='text-n200'
                    />
                  </CyDTouchView>
                </Tooltip>
              </CyDView>
              <CyDText className='font-bold text-[20px] text-base400'>
                {`$ ${withdrawalFee}`}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-col gap-1'>
              <CyDText className='font-medium text-[12px] text-n100'>
                {'Crypto value you will receive'}
              </CyDText>
              <CyDView className='flex flex-row items-center gap-x-1'>
                <CyDView className='relative mr-[2px]'>
                  <CyDFastImage
                    source={AppImages.USDC_TOKEN}
                    className='w-[18px] h-[18px] '
                  />
                  <CyDFastImage
                    source={AppImages.BASE_LOGO}
                    className='w-[8px] h-[8px] absolute bottom-[0px] right-[0px]'
                  />
                </CyDView>
                <CyDText className='font-bold text-[16px] text-base400'>
                  {`${round(parseFloat(withdrawableAmount), 2)}`}
                </CyDText>
                <CyDText className='text-[14px] text-base400 font-bold'>
                  {'USDC'}
                </CyDText>
                <CyDText className='text-[12px] text-base400'>
                  {'( BASE Chain )'}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='bg-n0 p-6 rounded-[16px] flex flex-row items-center mt-[24px]'>
            <CyDIcons
              name={'information'}
              size={32}
              className='text-n200 -ml-[12px]'
            />
            <CyDText className='font-medium text-[12px] text-n200 mt-[4px] flex-1'>
              {'It will take up to 2-3 business days to credit in your wallet '}
            </CyDText>
          </CyDView>
        </CyDKeyboardAwareScrollView>
      </CyDView>

      <CyDView className='bg-n0 px-[16px] pb-[32px] pt-[24px] rounded-t-[16px]'>
        <Button
          title={t('ACCEPT')}
          loaderStyle={styles.loader}
          loading={loading}
          onPress={() => {
            void postWithdrawal();
          }}
        />
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: {
    height: 20,
    width: 20,
  },
});
