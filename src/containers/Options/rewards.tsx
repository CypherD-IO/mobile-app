import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar } from 'react-native';
import {
  CyDIcons,
  CyDImage,
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import useAxios from '../../core/HttpRequest';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { CyDIconsPack } from '../../customFonts';

export default function Rewards() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [loading, setLoading] = useState<boolean>(false);
  const { getWithAuth } = useAxios();
  const [rewardPoints, setRewardPoints] = useState({
    total: 0,
    spend: 0,
    invites: 0,
    influencer: 0,
  });

  useEffect(() => {
    void fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    const response = await getWithAuth('/v1/cards/rewardPoints');
    if (!response.isError) {
      const tempRewardPoints = response.data;
      const spendRewards = Number(tempRewardPoints.userSpendRewards) || 0;
      const referralsSpendRewards =
        Number(tempRewardPoints.referralsSpendRewards) || 0;
      const influencerRewards =
        Number(tempRewardPoints.otherRewards?.influencerRewardPoints) || 0;
      const otherRewards =
        Object.entries(tempRewardPoints.otherRewards ?? {}).reduce(
          (sum, [key, value]) => {
            // Exclude influencerRewardPoints from otherRewards as we're tracking it separately
            if (key === 'influencerRewardPoints') return sum;
            return sum + Number(value ?? 0);
          },
          0,
        ) || 0;
      setRewardPoints({
        total:
          spendRewards +
          referralsSpendRewards +
          otherRewards +
          influencerRewards,
        spend: spendRewards,
        invites: referralsSpendRewards + otherRewards,
        influencer: influencerRewards,
      });
    }
    setLoading(false);
  };

  const LoaderWithText = ({
    value,
    loaderSize = 25,
  }: {
    value: string;
    loaderSize: number;
  }) => {
    return (
      <>
        {loading ? (
          <CyDLottieView
            source={AppImages.LOADER_TRANSPARENT}
            autoPlay
            loop
            style={{
              width: loaderSize,
              height: loaderSize,
              marginRight: 30,
              marginBottom: 5,
            }}
          />
        ) : (
          <CyDText>{value}</CyDText>
        )}
      </>
    );
  };

  return (
    <>
      <SafeAreaView className='flex bg-n20 h-full'>
        <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
        <CyDView>
          <CyDTouchView
            onPress={() => {
              navigation.goBack();
            }}>
            <CyDIcons
              name='arrow-left'
              size={24}
              className='text-base400 ml-[16px] mb-[12px]'
            />
          </CyDTouchView>
        </CyDView>
        <ScrollView>
          <CyDView className='flex flex-col px-[16px] mb-[24px]'>
            <CyDView className='flex flex-col'>
              <CyDText className='text-[28px] font-bold'>
                Cypher Rewards
              </CyDText>
              <CyDView className='flex flex-col mt-[12px] rounded-[16px] bg-n0 p-[16px]'>
                <CyDImage
                  source={AppImages.REWARDS_YELLOW_STAR}
                  className='w-[60px] h-[60px]'
                />
                <CyDView className='mt-[10px]'>
                  <CyDText className='font-bold text-[28px]'>
                    <LoaderWithText
                      value={rewardPoints.total.toLocaleString()}
                      loaderSize={33}
                    />
                  </CyDText>
                  <CyDText className='text-[14px] text-n200'>
                    {'Total Reward Balance'}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row flex-wrap items-center mt-[16px] gap-x-6 gap-y-4'>
                  <CyDView className='min-w-[120px]'>
                    <CyDText className='text-[14px] font-bold text-n300'>
                      <LoaderWithText
                        value={rewardPoints.spend.toLocaleString()}
                        loaderSize={15}
                      />
                    </CyDText>
                    <CyDText className='text-[12px] text-n200'>
                      {'Rewards From Spend'}
                    </CyDText>
                  </CyDView>
                  <CyDView className='min-w-[120px]'>
                    <CyDText className='text-[14px] font-bold text-n300'>
                      <LoaderWithText
                        value={rewardPoints.invites.toLocaleString()}
                        loaderSize={15}
                      />
                    </CyDText>
                    <CyDText className='text-[12px] text-n200'>
                      {'Rewards From Referral'}
                    </CyDText>
                  </CyDView>
                  {rewardPoints.influencer > 0 && (
                    <CyDView className='min-w-[120px]'>
                      <CyDText className='text-[14px] font-bold text-n300'>
                        <LoaderWithText
                          value={rewardPoints.influencer.toLocaleString()}
                          loaderSize={15}
                        />
                      </CyDText>
                      <CyDText className='text-[12px] text-n200'>
                        {'Influencer Reward Points'}
                      </CyDText>
                    </CyDView>
                  )}
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-col mt-[16px]'>
              <CyDText className='text-[14px] font-bold'>
                {'How to earn rewards'}
              </CyDText>
              <CyDView className='flex flex-row w-full mt-[12px] gap-x-2'>
                <CyDView className='w-1/2 flex-shrink-0 flex-col h-[228px] p-[12px] bg-rewardsBlue rounded-[16px]'>
                  <CyDView className='flex flex-col items-end'>
                    <CyDImage
                      source={AppImages.CARDS_AND_COINS}
                      className='h-[90px] w-[80px]'
                    />
                  </CyDView>
                  <CyDText className='text-[12px] text-white'>
                    {'Cypher Spend'}
                  </CyDText>
                  <CyDText className='text-[16px] font-bold text-white'>
                    {
                      'Spend across 50M+ Outlets \naround the world to earn Rewards'
                    }
                  </CyDText>
                </CyDView>
                <CyDTouchView
                  className='w-1/2 flex-shrink-0 flex-col h-[228px] p-[12px] bg-rewardsYellow rounded-[16px]'
                  onPress={() => {
                    navigation.navigate(screenTitle.REFERRALS, {
                      fromOptionsStack: true,
                    });
                  }}>
                  <CyDView className='flex flex-col items-end'>
                    <CyDImage
                      source={AppImages.MAN_WITH_PHONE}
                      className='w-[91px] h-[86px]'
                    />
                  </CyDView>
                  <CyDText className='text-[12px] text-white'>
                    {'Cypher Refer'}
                  </CyDText>
                  <CyDText className='text-[16px] font-bold text-white'>
                    {'Refer your friends and family, to earn rewards'}
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-col mt-[16px]'>
              <CyDText className='text-[14px] font-bold'>
                {'What can you do with your rewards'}
              </CyDText>
              <CyDView className='bg-n0 flex flex-row relative rounded-[16px] p-[24px] mt-[28px]'>
                <CyDImage
                  source={AppImages.COMING_SOON}
                  className='absolute bottom-[20px] left-[20px] h-[88px] w-[52px]'
                />
                <CyDView className='ml-[12px] flex flex-col ml-[50px]'>
                  <CyDText className='text-n90 text-[12px] font-bold'>
                    {"We're cooking something"}
                  </CyDText>
                  <CyDText className='text-[16px] font-bold'>
                    {'Coming Soon....'}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
