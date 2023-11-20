import React, { memo } from 'react';
import CyDModalLayout from '../../../components/v2/modal';
import {
  CyDFastImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { isBasicCosmosChain } from '../../../core/util';
import { StyleSheet } from 'react-native';
import Button from '../../../components/v2/button';
import { ChainBackendNames } from '../../../constants/server';
import { CosmosActionType } from '../../../reducers/cosmosStakingReducer';
import { StakingVariables } from '../constants';

interface ClaimModalProps {
  modalVisibilityState: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ];
  actionTypeState: [
    CosmosActionType,
    React.Dispatch<React.SetStateAction<CosmosActionType>>,
  ];
  stakingVariables: StakingVariables;
  chainBackendName: ChainBackendNames;
  buttonLoading: boolean;
  onPressClaim: (type: CosmosActionType) => Promise<void>;
  txnSimulation: (method: string) => Promise<void>;
}

const ClaimModal = ({
  modalVisibilityState,
  actionTypeState,
  stakingVariables,
  chainBackendName,
  buttonLoading,
  onPressClaim,
  txnSimulation,
}: ClaimModalProps) => {
  const { t } = useTranslation();

  const [isModalVisible, setModalVisible] = modalVisibilityState;
  const [actionType, setActionType] = actionTypeState;

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
          onPress={() => setModalVisible(false)}
          className={'z-[50]'}>
          <CyDFastImage
            source={AppImages.CLOSE}
            className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '}
          />
        </CyDTouchView>
        <CyDView>
          <LottieView
            source={AppImages.NEW}
            autoPlay
            loop
            style={styles.lottieViewWidth}
          />

          <CyDText className={'mt-[10px] font-bold text-[22px]'}>
            {t<string>('HAVE_OPTION_TO_STAKE_REWARDS')}
          </CyDText>
          <CyDView className={'flex flex-row mt-[40px]'}>
            <CyDFastImage source={AppImages.MONEY_BAG} />
            <CyDView className={' flex flex-row mt-[3px]'}>
              <CyDText className={'text-[16px] font-medium'}>
                {t<string>('TOTAL_CLAIMABLE_REWARDS')}
              </CyDText>
              <CyDText className={'ml-[10px] text-[18px] font-bold'}>
                {stakingVariables.totalClaimableRewards}
              </CyDText>
            </CyDView>
          </CyDView>

          {isBasicCosmosChain(chainBackendName) ? (
            <CyDView className={'flex flex-col mt-[40px] w-[100%]'}>
              <Button
                onPress={() => {
                  setActionType(CosmosActionType.RESTAKE);
                  void onPressClaim(CosmosActionType.SIMULATION);
                }}
                loading={
                  actionType === CosmosActionType.RESTAKE && buttonLoading
                }
                loaderStyle={styles.loaderStyle}
                title={t<string>('RESTAKE')}
                style={'py-[5%]'}
              />
              <Button
                onPress={() => {
                  setActionType(CosmosActionType.CLAIM);
                  void onPressClaim(CosmosActionType.SIMULATION);
                }}
                title={t<string>('CLAIM')}
                type={'secondary'}
                style={'py-[5%] mt-[15px]'}
                loading={actionType === CosmosActionType.CLAIM && buttonLoading}
                loaderStyle={styles.loaderStyle}
              />
            </CyDView>
          ) : (
            <CyDView className={'flex flex-col mt-[24px] w-[100%]'}>
              <Button
                onPress={() => {
                  setActionType(CosmosActionType.RESTAKE);
                  void txnSimulation(CosmosActionType.RESTAKE);
                }}
                title={t<string>('RESTAKE')}
                style={'py-[5%]'}
                loading={
                  actionType === CosmosActionType.RESTAKE && buttonLoading
                }
                loaderStyle={styles.loaderStyle}
              />
              <Button
                onPress={() => {
                  // setClaimModal(false);
                  setActionType(CosmosActionType.CLAIM);
                  void txnSimulation(CosmosActionType.CLAIM);
                }}
                title={t<string>('CLAIM')}
                type={'secondary'}
                style={'py-[5%] mt-[15px]'}
                loading={actionType === CosmosActionType.CLAIM && buttonLoading}
                loaderStyle={styles.loaderStyle}
              />
            </CyDView>
          )}
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
  lottieViewWidth: {
    width: 34,
  },
  loaderStyle: {
    height: 22,
  },
});

export default memo(ClaimModal);
