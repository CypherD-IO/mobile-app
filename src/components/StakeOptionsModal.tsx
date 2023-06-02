import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import { StakingContext } from '../core/util';
import { DELEGATE, RE_DELEGATE, UN_DELEGATE } from '../reducers/stakingReducer';
import { platform } from 'process';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';
import Button from '../components/v2/button';
export function StakeOptionsModal (props) {
  const { isModalVisible, onPress, onCancelPress, data, typeOfAction } = props;
  const { t } = useTranslation();
  const stakingValidators = useContext<any>(StakingContext);

  const convert = n => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
  };

  return (
      <CyDModalLayout setModalVisible={() => {}} isModalVisible={isModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
        <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
          <CyDTouchView onPress={() => onCancelPress()} className={'z-[50]'}>
            <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '} />
          </CyDTouchView>
          <CyDText className={'mt-[10] font-bold text-center text-[22px]'}>
                {data.description.name}
          </CyDText>

          <CyDView className={'flex flex-row mt-[40px]'}>
              <CyDImage source={AppImages.APR_ICON} className={'h-[20px] w-[20px]'}/>
              <CyDView className={' flex flex-row'}>
                <CyDText className={' font-medium text-[16px] ml-[4px] text-primaryTextColor'}>{'APR ' + data.apr}</CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row mt-[20px]'}>
              <CyDImage source={AppImages[data.logo + '_LOGO']} className={'w-[16px] h-[16px] mt-[3px]'} />
              <CyDView className={' flex flex-row'}>
                <CyDText className={' font-medium text-[16px] ml-[10px] text-primaryTextColor'}>{'Voting power with ' + convert(data.tokens * (10 ** -18)) + ' EVMOS'}</CyDText>
              </CyDView>
            </CyDView>

            {data.balance !== BigInt(0) && <Button onPress={async () => {
              stakingValidators.dispatchStaking({ value: { typeOfDelegation: RE_DELEGATE } });
              onPress();
            }}
              title={t('REDELEGATE')}
              style={'py-[5%] mt-[50px]'}
              loaderStyle={{ height: 30 }}
            />}
            {typeOfAction !== 'unstake' && <Button onPress={() => {
              stakingValidators.dispatchStaking({ value: { typeOfDelegation: DELEGATE } });
              onPress();
            }}
              title={t('DELEGATE')}
              type={'secondary'}
              style={'py-[5%] mt-[15px]'}
            />}
            {data.balance !== BigInt(0) && <Button onPress={() => {
              stakingValidators.dispatchStaking({ value: { typeOfDelegation: UN_DELEGATE } });
              onPress();
            }}
              title={t('UNDELEGATE')}
              type={'secondary'}
              style={'py-[5%] mt-[15px]'}
              />}
        </CyDView>
      </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
