import React, { useCallback, useRef, useState } from 'react';
import {
  CyDImage,
  CyDTouchView,
  CyDView,
  CyDText,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import {
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import clsx from 'clsx';
import Button from '../../components/v2/button';
import { screenTitle } from '../../constants';
import { ButtonType, SeedPhraseType } from '../../constants/enum';
import CyDModalLayout from '../../components/v2/modal';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import CyDContainer from '../../components/v2/container';
import useConnectionManager from '../../hooks/useConnectionManager';
import { t } from 'i18next';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

const { width, height } = Dimensions.get('screen');

const Screen1 = (): JSX.Element => {
  return (
    <CyDView className='flex-1 w-full h-full bg-p100 items-center justify-center'>
      <CyDText className='text-[30px] font-bold'>Screen 1</CyDText>
    </CyDView>
  );
};

const Screen2 = (): JSX.Element => {
  return (
    <CyDView className='flex-1 w-full h-full bg-p100'>
      <CyDText
        className='text-[30px] font-bold mt-[12px] text-left mx-[44px]'
        numberOfLines={4}
        style={{ fontSize: height * 0.03 }}>
        {t('ON_BOARDING_PAGE_2_CONTENT').toString()}
      </CyDText>
      <CyDImage
        source={AppImages.ON_BOARDING_2}
        className='mt-[20px] flex-1'
        resizeMode='contain'
        style={{ width }}
      />
    </CyDView>
  );
};

export default function OnBoarding() {
  const { openWalletConnectModal } = useConnectionManager();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const scrollX: Animated.Value = useRef(new Animated.Value(0)).current;

  const onBoardingFlatListRef = useRef<FlatList>(null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffsetX: number = e?.nativeEvent?.contentOffset?.x;
    const index: number = Math.round(currentOffsetX / width);
    setCurrentCarouselIndex(index);
  };

  const Screen3 = useCallback((): JSX.Element => {
    return (
      <CyDView className='flex-1 w-full h-full bg-p100'>
        <CyDView className='flex-1 py-[20px] rounded-[25px] m-[12px] px-[20px]'>
          <CyDView className='mb-[20px]'>
            <CyDText className='text-[28px] font-extrabold'>Welcome to</CyDText>
            <CyDText className='text-[28px] font-extrabold'>
              Cypher Wallet
            </CyDText>
            <CyDText className='text-[16px] font-bold mt-[12px]'>
              Explore all of Web3 in one place
            </CyDText>
          </CyDView>

          <CyDView className='flex-1 justify-center'>
            <CyDTouchView
              onPress={() => {
                setIsModalVisible(true);
              }}
              className={clsx(
                'bg-p150 py-[14px] items-center rounded-[8px] mt-[20px] flex-row justify-around w-[98%]',
                {
                  'py-[30px]': loading,
                },
              )}>
              {!loading && (
                <CyDText
                  className={'text-[16px] font-extrabold w-[80%] text-black'}>
                  {t('CREATE_WALLET').toString()}
                </CyDText>
              )}
              {!loading && (
                <CyDMaterialDesignIcons
                  name='chevron-right'
                  size={16}
                  className=''
                />
              )}
            </CyDTouchView>
            <CyDTouchView
              onPress={() => {
                navigation.navigate(screenTitle.ENTER_KEY);
              }}
              className={
                'bg-n0 border-[0.3px] border-[#525252] py-[14px] mt-[20px] items-center rounded-[8px] flex-row justify-around w-[98%]'
              }>
              <CyDText className={'text-[16px] font-extrabold w-[80%]'}>
                {t('IMPORT_WALLET').toString()}
              </CyDText>
              <CyDMaterialDesignIcons
                name='chevron-right'
                size={16}
                className='text-base400'
              />
            </CyDTouchView>
            <CyDTouchView
              onPress={() => {
                navigation.navigate(screenTitle.ENTER_PRIVATE_KEY);
              }}
              className={
                'bg-n0 border-[0.3px] border-[#525252] py-[14px] mt-[20px] items-center rounded-[8px] flex-row justify-around w-[98%]'
              }>
              <CyDText className={'text-[16px] font-extrabold w-[80%]'}>
                {t('IMPORT_WALLET_USING_PRIVATE_KEY').toString()}
              </CyDText>
              <CyDMaterialDesignIcons
                name='chevron-right'
                size={16}
                className='text-base400'
              />
            </CyDTouchView>
            <CyDTouchView
              onPress={() => {
                void openWalletConnectModal();
                void logAnalyticsToFirebase(
                  AnalyticEvent.CONNECT_USING_WALLET_CONNECT,
                );
              }}
              className={
                'bg-n0 border-[0.3px] border-[#525252] mt-[20px] px-[12px] items-center rounded-[8px] flex flex-row justify-between w-[98%]'
              }>
              <CyDView>
                <CyDText className={'text-[16px] font-extrabold'}>
                  {t('CONNECT_A_WALLET')}
                </CyDText>
              </CyDView>
              <CyDImage
                source={AppImages.WALLET_ICONS}
                resizeMode={'contain'}
                className={'w-[30%] h-[54px]'}
              />
            </CyDTouchView>
          </CyDView>
          <CyDTouchView
            onPress={() => {
              navigation.navigate(screenTitle.TRACK_WALLET_SCREEN);
            }}
            className={
              'bg-n0 border-[0.3px] border-[#525252] py-[14px] mt-[20px] items-center rounded-[8px] flex-row justify-around w-[98%]'
            }>
            <CyDText className={'text-[16px] font-extrabold w-[80%]'}>
              {t('TRACK_ANY_WALLET')}
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-right'
              size={16}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>
    );
  }, []);

  const onBoardingData: React.FunctionComponent[] = [Screen1, Screen2, Screen3];

  const onPressNext = (): void => {
    const nextIndex: number = currentCarouselIndex + 1;
    if (nextIndex !== onBoardingData.length) {
      const offset: number = nextIndex * width;
      onBoardingFlatListRef?.current?.scrollToOffset({ offset });
      setCurrentCarouselIndex(nextIndex);
    }
  };

  const onPressSkip = (): void => {
    const lastIndex: number = onBoardingData.length - 1;
    const offset: number = width * lastIndex;
    onBoardingFlatListRef?.current?.scrollToOffset({ offset });
    setCurrentCarouselIndex(lastIndex);
  };

  // const Indicator = useCallback(
  //   ({ scrollX }: { scrollX: any }): JSX.Element => {
  //     return (
  //       <CyDView className={''}>
  //         {currentCarouselIndex !== onBoardingData.length - 1 && (
  //           <CyDView className={'flex-row mx-[20px] justify-between mb-[10px]'}>
  //             <Button
  //               onPress={onPressSkip}
  //               title={'SKIP'}
  //               type={'secondary'}
  //               style={'p-[5%] w-[30%]'}
  //             />
  //             <Button
  //               onPress={onPressNext}
  //               title={'NEXT'}
  //               style={'p-[5%] w-[30%]'}
  //             />
  //           </CyDView>
  //         )}
  //         <CyDView className={'flex-row bottom-[2%] w-full justify-center'}>
  //           {onBoardingData.map((_, i) => {
  //             const inputRange: number[] = [
  //               (i - 1) * width,
  //               i * width,
  //               (i + 1) * width,
  //             ];
  //             const scale = scrollX.interpolate({
  //               inputRange,
  //               outputRange: [1, 1.4, 1],
  //               extrapolate: 'clamp',
  //             });

  //             const opacity = scrollX.interpolate({
  //               inputRange,
  //               outputRange: [0.4, 0.9, 0.4],
  //               extrapolate: 'clamp',
  //             });
  //             return (
  //               <Animated.View
  //                 key={`indicator-${i}`}
  //                 style={{
  //                   height: 6,
  //                   width: 6,
  //                   borderRadius: 5,
  //                   backgroundColor: '#434343',
  //                   opacity,
  //                   transform: [{ scale }],
  //                   marginHorizontal: 4,
  //                 }}
  //               />
  //             );
  //           })}
  //         </CyDView>
  //       </CyDView>
  //     );
  //   },
  //   [onBoardingData],
  // );

  const navigateToSeedPhraseGeneration = (type: string) => {
    setIsModalVisible(false);
    setTimeout(() => {
      navigation.navigate(screenTitle.CREATE_SEED_PHRASE, {
        seedPhraseType: type,
      });
    }, MODAL_HIDE_TIMEOUT_250);
  };

  return (
    <CyDContainer>
      <CyDModalLayout
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        setModalVisible={setIsModalVisible}>
        <CyDView
          className={'bg-n20 p-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDText className={'my-[14px] font-black text-center text-[22px]'}>
            {t<string>('CREATE_SEED_PHRASE_TYPE_TITLE')}
          </CyDText>
          <CyDView>
            <Button
              title={t('TWELVE_WORD_SEEDPHRASE')}
              onPress={() => {
                navigateToSeedPhraseGeneration(SeedPhraseType.TWELVE_WORDS);
              }}
              type={ButtonType.PRIMARY}
              style='mt-[5px] w-[80%] h-[50px] mx-auto mb-[10px]'
            />
          </CyDView>
          <CyDView>
            <Button
              title={t('TWENTY_FOUR_WORD_SEEDPHRASE')}
              onPress={() => {
                navigateToSeedPhraseGeneration(
                  SeedPhraseType.TWENTY_FOUR_WORDS,
                );
              }}
              type={ButtonType.PRIMARY}
              style='mt-[5px] w-[80%] h-[50px] mx-auto mb-[10px]'
            />
          </CyDView>
        </CyDView>
      </CyDModalLayout>
      <CyDView className={'h-full w-full'}>
        {/* <CyDImage
          source={AppImages.BG_SETTINGS}
          className={'h-[50%] w-full absolute top-0 right-0'}
        /> */}
        <Animated.FlatList
          ref={onBoardingFlatListRef}
          onMomentumScrollEnd={onScrollEnd}
          data={onBoardingData}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          renderItem={({ item }) => {
            return item();
          }}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          pagingEnabled={true}
        />
        {/* <Indicator scrollX={scrollX} /> */}
      </CyDView>
    </CyDContainer>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
