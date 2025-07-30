import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import clsx from 'clsx';
import React, { useCallback, useContext, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { screenTitle } from '../../constants';
import { ButtonType, IconPosition } from '../../constants/enum';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import useAxios from '../../core/HttpRequest';
import { AirdropData } from '../../models/airdrop.interface';
import { CardProfile } from '../../models/cardProfile.model';
import {
  CyDImage,
  CyDImageBackground,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import Loading from '../Loading';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { t } from 'i18next';
import { parseErrorMessage } from '../../core/util';
import { get } from 'lodash';

export default function AirdropEligibility() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { top } = useSafeAreaInsets();

  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalState.cardProfile as CardProfile;
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const [airdropData, setAirdropData] = useState<AirdropData | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(false);

  const airdropAddress: string =
    cardProfile?.evmAddress ?? cardProfile.primaryAddress ?? '';

  const onError = (title: string, description: string) => {
    showModal('state', {
      type: 'error',
      title,
      description,
      onSuccess: () => {
        hideModal();
        navigation.navigate(screenTitle.OPTIONS_SCREEN);
      },
      onFailure: () => {
        hideModal();
        navigation.navigate(screenTitle.OPTIONS_SCREEN);
      },
    });
  };

  const fetchAirdropData = async () => {
    setIsLoading(true);
    const res = await getWithAuth(`/v1/airdrop/${airdropAddress}`);
    if (res.isError) {
      onError(
        t('UNABLE_TO_FETCH_AIRDROP_DATA'),
        res.error ? parseErrorMessage(res.error) : t('CONTACT_CYPHERD_SUPPORT'),
      );
    } else {
      const data = res.data;
      setAirdropData(data);
    }
    setIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      void fetchAirdropData();
    }, []),
  );

  if (isLoading) {
    return (
      <>
        <Loading
          backgroundColor='bg-black'
          loadingText='Checking your eligibility...'
        />
      </>
    );
  }

  if (!airdropData) {
    return <Loading backgroundColor='bg-black' loadingText='Loading...' />;
  }

  return (
    <CyDView className='!bg-[#0D0E12] flex-1'>
      <CyDImageBackground
        source={AppImages.MSITE_AIRDROP_ELIGIBILITY_BG}
        className='flex w-full'
        style={styles.bottomRounded}>
        <CyDView style={{ paddingTop: top }} className='p-[24px]'>
          <CyDTouchView
            onPress={() => navigation.goBack()}
            className='w-[32px] h-[32px] bg-black rounded-full flex items-center justify-center'>
            <CyDMaterialDesignIcons
              name='arrow-left'
              size={20}
              className='text-white'
            />
          </CyDTouchView>

          <CyDImage
            source={AppImages.AIRDROP_TOKEN_WIGGLE}
            className='w-[200px] h-[200px] self-center'
          />
          <CyDText className='font-nord font-bold !text-[32px] text-white leading-[120%] tracking-[-0.5px] text-center mt-6'>
            {t('CYPR_AIRDROP')}
          </CyDText>
        </CyDView>
      </CyDImageBackground>
      <CyDView className='p-[24px] flex-1 flex justify-between'>
        <CyDView className='flex-1'>
          <CyDText className='font-medium !text-[22px] text-white text-center leading-[145%] tracking-[-1px]'>
            {'Airdrop Eligibility'}
          </CyDText>
          <CyDView className='mt-[24px]'>
            <CyDView className='py-[12px]'>
              <CyDText className='font-medium !text-[16px] text-white leading-[145%] tracking-[-0.5px]'>
                {'To wallet address'}
              </CyDText>
              <CyDView className='mt-[12px] !bg-[#2F3139] rounded-[8px] p-[16px]'>
                <CyDText className='font-medium !text-[14px] text-white leading-[145%] tracking-[-0.6px]'>
                  {airdropAddress}
                </CyDText>
              </CyDView>
            </CyDView>

            {get(airdropData, 'airdrop.claimInfo.isClaimed', false) && (
              <CyDView
                className={clsx(
                  'rounded-[12px] mt-[6px] py-[12px] px-[16px] flex flex-row gap-x-[6px] !bg-[#0E2713]',
                )}>
                <CyDMaterialDesignIcons
                  name='parachute'
                  size={42}
                  className='text-white'
                />
                <CyDView>
                  <CyDText className='font-medium !text-[16px] text-white leading-[150%] tracking-[-0.8px]'>
                    {'You have claimed your airdrop rewards!'}
                  </CyDText>
                  <CyDText
                    className={clsx(
                      'font-normal !text-[#8CB59F] !text-[14px] leading-[145%] tracking-[-0.6px] mt-[4px]',
                    )}>
                    {'Lock your tokens to earn more rewards.'}
                  </CyDText>
                </CyDView>
              </CyDView>
            )}

            {!get(airdropData, 'airdrop.claimInfo.isClaimed', false) && (
              <CyDView
                className={clsx(
                  'rounded-[12px] mt-[6px] py-[12px] px-[16px] flex flex-row gap-x-[12px]',
                  {
                    '!bg-[#0E2713]': airdropData.isEligible,
                    '!bg-[#C94848]': !airdropData.isEligible,
                  },
                )}>
                {airdropData.isEligible && (
                  <CyDMaterialDesignIcons
                    name='emoticon-excited-outline'
                    size={42}
                    className='text-white'
                  />
                )}
                {!airdropData.isEligible && (
                  <CyDMaterialDesignIcons
                    name='emoticon-sad-outline'
                    size={42}
                    className='text-white'
                  />
                )}
                <CyDView>
                  <CyDText className='font-medium !text-[16px] text-white leading-[150%] tracking-[-0.8px]'>
                    {airdropData.isEligible
                      ? t('AWESOME_YOU_QUALIFY_FOR_THE_AIRDROP')
                      : t('OOPS_YOU_DO_NOT_QUALIFY_FOR_THE_AIRDROP')}
                  </CyDText>
                  <CyDText
                    className={clsx(
                      'font-normal text-white !text-[14px] leading-[145%] tracking-[-0.6px] mt-[4px]',
                    )}>
                    {airdropData.isEligible
                      ? t('CONTINUE_TO_CLAIM_THE_AIRDROP_REWARDS')
                      : t('KEEP_SPENDING_FOR_EXCITING_REWARDS_ON_EVERY_SPEND')}
                  </CyDText>
                </CyDView>
              </CyDView>
            )}
          </CyDView>
        </CyDView>

        {airdropData.isEligible &&
          !get(airdropData, 'airdrop.claimInfo.isClaimed', false) && (
            <Button
              title='Check your rewards'
              disabled={!airdropData.isEligible}
              onPress={() => {
                navigation.navigate(screenTitle.AIRDROP_CLAIM, {
                  airdropData: airdropData.airdrop,
                });
              }}
              style='w-full rounded-full py-[16px] px-[16px] justify-between mb-[24px] !bg-[#F9D26C]'
              type={ButtonType.PRIMARY}
              icon={
                <CyDMaterialDesignIcons
                  name='arrow-right-thin'
                  size={24}
                  className='text-black'
                />
              }
              iconPosition={IconPosition.RIGHT}
            />
          )}
      </CyDView>
    </CyDView>
  );
}

// Use StyleSheet for performance and maintainability.
// Only the bottom corners are rounded for the background container.
const styles = StyleSheet.create({
  bottomRounded: {
    borderBottomLeftRadius: 16, // Rounds the bottom left corner
    borderBottomRightRadius: 16, // Rounds the bottom right corner
  },
});
