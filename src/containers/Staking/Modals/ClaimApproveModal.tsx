import React, { memo } from 'react';
import CyDModalLayout from '../../../components/v2/modal';
import { StyleSheet } from 'react-native';
import {
  CyDFastImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import { CosmosActionType } from '../../../reducers/cosmosStakingReducer';
import { StakingVariables } from '../constants';
import { ChainBackendNames } from '../../../constants/server';
import Button from '../../../components/v2/button';
import { isBasicCosmosChain } from '../../../core/util';

interface ClaimApproveModalProps {
  modalVisibilityState: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ];
  stakingVariables: StakingVariables;
  chainBackendName: ChainBackendNames;
  buttonLoading: boolean;
  onPressClaim: (type: CosmosActionType) => Promise<void>;
  finalTxn: (txnData?: string) => Promise<void>;
  gasFeeAmount: string;
  gasFeeTokenName: string;
}

const ClaimApproveModal = ({
  modalVisibilityState,
  chainBackendName,
  stakingVariables,
  onPressClaim,
  finalTxn,
  buttonLoading,
  gasFeeAmount,
  gasFeeTokenName,
}: ClaimApproveModalProps) => {
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
            className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '}
          />
        </CyDTouchView>
        <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
          {t<string>('REWARD')}
        </CyDText>
        <CyDView className={'flex flex-row mt-[40px] w-full items-center'}>
          <CyDFastImage
            source={AppImages.MONEY_BAG}
            className='h-[16px] w-[16px]'
            resizeMode='contain'
          />
          <CyDView className={' flex flex-row mt-[3px]'}>
            <CyDText
              className={
                ' font-medium text-[16px] ml-[5px] text-primaryTextColor'
              }>
              {t<string>('CLAIMABLE_REWARD')}
            </CyDText>
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
              if (isBasicCosmosChain(chainBackendName)) {
                void onPressClaim(CosmosActionType.TRANSACTION);
              } else {
                void finalTxn();
              }
            }}
            title={t<string>('APPROVE')}
            style={'py-[5%]'}
            loading={buttonLoading}
            loaderStyle={styles.loaderHeight30}
          />
          <Button
            onPress={() => {
              setModalVisible(false);
            }}
            title={t<string>('REJECT')}
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

export default memo(ClaimApproveModal);
