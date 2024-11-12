/* eslint-disable react-native/no-raw-text */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet } from 'react-native';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import useAxios from '../../core/HttpRequest';
import AppImages from '../../../assets/images/appImages';
import LottieView from 'lottie-react-native';
import clsx from 'clsx';
import { JoinDiscordStatus } from '../../constants/enum';
import { useNavigation } from '@react-navigation/native';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default function JoinDiscordModal(props: {
  isModalVisible: boolean;
  setIsModalVisible: (val: boolean) => void;
  discordToken: string;
}) {
  const { isModalVisible, setIsModalVisible, discordToken } = props;
  const { postWithAuth } = useAxios();
  const [isJoinDiscordLoading, setIsJoinDiscordLoading] = useState(false);
  const [isJoinDiscordStatus, setIsJoinDiscordStatus] = useState<
    undefined | JoinDiscordStatus
  >();

  useEffect(() => {
    void checkDiscordToken(discordToken);
  }, [discordToken]);

  const checkDiscordToken = useCallback(
    async (discordToken: string) => {
      if (discordToken) {
        setIsJoinDiscordLoading(true);
        const res = await joinDiscord(discordToken);
        setIsJoinDiscordLoading(false);
        if (res) {
          setIsJoinDiscordStatus(JoinDiscordStatus.SUCCESS);
        } else {
          setIsJoinDiscordStatus(JoinDiscordStatus.ERROR);
        }
      }
    },
    [discordToken],
  );

  const joinDiscord = async (discordToken: string) => {
    const res = await postWithAuth('/v1/cards/discord/join', {
      discordToken,
    });
    return !res.isError;
  };

  const handleButtonPress = async () => {
    if (isJoinDiscordStatus === JoinDiscordStatus.SUCCESS) {
      const supported = await Linking.canOpenURL(
        'https://discord.com/channels/907358256735879188/1303992483134308383',
      );
      if (supported) {
        await Linking.openURL(
          'https://discord.com/channels/907358256735879188/1303992483134308383',
        );
      }
    }
    setIsModalVisible(false);
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      useNativeDriver={true}
      setModalVisible={(_val: any) => {
        setIsModalVisible(_val);
      }}>
      <CyDView className='h-[600px] rounded-t-[24px] mx-[2px] bg-n20 flex flex-col justify-between'>
        <CyDView className='w-full h-full flex flex-col justify-between'>
          <CyDView>
            <CyDView className='flex flex-row rounded-t-[24px] justify-between p-[16px] mt-[16px]'>
              <CyDText className='font-semibold text-[16px]'>
                {'Connect to Discord'}
              </CyDText>
              <CyDTouchView
                onPress={() => {
                  setIsModalVisible(false);
                }}>
                <CyDImage
                  source={AppImages.CLOSE}
                  className='w-[24px] h-[24px]'
                />
              </CyDTouchView>
            </CyDView>
            <CyDView className='flex flex-col items-center px-[32px]'>
              {isJoinDiscordStatus === JoinDiscordStatus.ERROR ? (
                <CyDView className='flex flex-col items-center'>
                  <CyDImage
                    source={AppImages.RED_CROSS_IMG}
                    className='h-[60px] w-[60px] mt-[100px]'
                  />
                  <CyDText className='text-center text-[16px] font-semibold mt-[24px]'>
                    {'Access limited to Premium users only.'}
                  </CyDText>
                  <CyDText className='text-center text-[14px] mt-[12px]'>
                    {
                      'Get Cypher Premium to access the Premium Discord Channel for exclusive insights and perks.'
                    }
                  </CyDText>
                </CyDView>
              ) : (
                <CyDView className='flex flex-col items-center'>
                  <CyDImage
                    source={AppImages.CONNENCT_DISCORD_HERO}
                    className='h-[133px] w-[166px] mt-[58px]'
                  />
                  <CyDText className='text-center text-[16px] font-semibold mt-[24px]'>
                    {'Join the Exclusive Premium Users Lounge'}
                  </CyDText>
                  <CyDText className='text-center text-[14px] mt-[12px]'>
                    {
                      'Unlock access to the Premium Discord Channel for exclusive insights and perks.'
                    }
                  </CyDText>
                </CyDView>
              )}
            </CyDView>
          </CyDView>

          <CyDView className='w-full px-[32px] mb-[32px]'>
            {isJoinDiscordStatus !== JoinDiscordStatus.ERROR && (
              <CyDView className='flex flex-row bg-n0 rounded-[12px] p-[16px] items-center'>
                {isJoinDiscordLoading ? (
                  <LottieView
                    source={AppImages.LOADER_TRANSPARENT}
                    autoPlay
                    loop
                    style={loaderStyle}
                  />
                ) : (
                  <CyDImage
                    source={AppImages.SUCCESS_TICK_GREEN_BG}
                    className='w-[24px] h-[24px]'
                  />
                )}
                <CyDText className='text-[14px] font-semibold ml-[6px]'>
                  {isJoinDiscordLoading
                    ? 'Connect to Discord'
                    : 'Connected to Discord'}
                </CyDText>
              </CyDView>
            )}
            <CyDTouchView
              className={clsx(
                'flex-row items-center justify-center p-[13px] bg-[#7289D9] rounded-[12px] mt-[16px]',
                isJoinDiscordStatus === JoinDiscordStatus.SUCCESS &&
                  'bg-[#7289D9]',
                isJoinDiscordStatus === JoinDiscordStatus.ERROR &&
                  'bg-[#F9D26C]',
                isJoinDiscordLoading && 'opacity-50',
              )}
              onPress={() => {
                void handleButtonPress();
              }}
              disabled={isJoinDiscordLoading}>
              <CyDText
                className={clsx(
                  'text-white font-bold text-[18px] font-manrope',
                  isJoinDiscordStatus === JoinDiscordStatus.ERROR &&
                    'text-black',
                )}>
                {isJoinDiscordStatus === JoinDiscordStatus.ERROR
                  ? 'Close'
                  : 'Continue'}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const loaderStyle = {
  height: 25,
  width: 25,
  marginBottom: 12,
  marginRight: 12,
};
