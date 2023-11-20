import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from '../../../components/v2/modal';
import {
  CyDFastImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import { useTranslation } from 'react-i18next';
import { CosmosActionType } from '../../../reducers/cosmosStakingReducer';
import { StakingVariables } from '../constants';

interface RestakeApproveModalProps {
  modalVisibilityState: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ];
  stakingVariables: StakingVariables;
  buttonLoading: boolean;
  onRestake: (type: CosmosActionType) => Promise<void>;
  setSignModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  gasFeeAmount: string;
  gasFeeTokenName: string;
  restakeValidatorName: string;
  tokenLogoUrl: number;
}

const RestakeApproveModal = ({
  modalVisibilityState,
  buttonLoading,
  stakingVariables,
  onRestake,
  setSignModalVisible,
  gasFeeAmount,
  gasFeeTokenName,
  restakeValidatorName,
  tokenLogoUrl,
}: RestakeApproveModalProps) => {
  const { t } = useTranslation();

  const [isModalVisible, setModalVisible] = modalVisibilityState;

  return (
    <CyDModalLayout
      setModalVisible={setModalVisible}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView
        className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
        <CyDTouchView
          onPress={() => {
            setModalVisible(false);
          }}
          className={'z-[50]'}>
          <CyDFastImage
            source={AppImages.CLOSE}
            className={
              ' w-[22px] h-[22px] z-[50] absolute right-[0px] top-[-10px] '
            }
          />
        </CyDTouchView>
        <CyDView>
          <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
            {t<string>('RESTAKE_INIT_CAPS')}
          </CyDText>
          <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
            {t('TO')}
          </CyDText>
          <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
            {restakeValidatorName}
          </CyDText>
        </CyDView>
        <CyDView className={'flex flex-row mt-[40px]'}>
          <CyDFastImage
            source={tokenLogoUrl}
            className={'h-[16px] w-[16px]'}
            resizeMode='contain'
          />
          <CyDView className={' flex flex-row'}>
            <CyDText
              className={
                ' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
              }>
              {stakingVariables.totalClaimableRewards}
            </CyDText>
          </CyDView>
        </CyDView>

        <CyDView className={'flex flex-row mt-[20px] w-full items-center'}>
          <CyDFastImage
            source={AppImages.GAS_FEES}
            className='h-[16px] w-[16px]'
            resizeMode='contain'
          />
          <CyDView className={'flex flex-row mt-[3px] item-center'}>
            <CyDText
              className={
                ' font-medium text-[16px] ml-[10px] text-primaryTextColor'
              }>
              {t<string>('GAS_FEE')}
            </CyDText>
            <CyDView className='flex flex-row items-center justify-center'>
              <CyDText
                className={
                  'font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
                }>
                {gasFeeAmount}
              </CyDText>
              <CyDText
                className={
                  ' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
                }>
                {gasFeeTokenName}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>

        <CyDView className={'flex flex-col mt-[30px] w-[100%]'}>
          <Button
            onPress={() => {
              setSignModalVisible(false);
              void onRestake(CosmosActionType.TRANSACTION);
            }}
            title={t<string>('APPROVE')}
            style={'py-[5%] min-h-[60px]'}
            loading={buttonLoading}
            loaderStyle={styles.loaderHeight30}
          />
          <Button
            onPress={() => {
              setModalVisible(false);
            }}
            title={t<string>('CANCEL')}
            type={'secondary'}
            style={'py-[5%] mt-[15px]'}
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
  },
  loaderHeight30: {
    height: 30,
  },
});

export default memo(RestakeApproveModal);
