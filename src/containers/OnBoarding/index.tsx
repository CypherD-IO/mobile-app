import React, { useRef, useState } from 'react';
import { CyDSafeAreaView, CyDImage, CyDTouchView, CyDView, CyDText, CyDScrollView } from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { Animated, Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import clsx from 'clsx';
import Button from '../../components/v2/button';
import { screenTitle } from '../../constants';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('screen');

export default function OnBoarding ({ navigation }) {
  const { t } = useTranslation();

  const scrollX: Animated.Value = useRef(new Animated.Value(0)).current;

  const onBoardingFlatListRef = useRef<FlatList>(null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffsetX: number = e?.nativeEvent?.contentOffset?.x;
    const index: number = Math.round(currentOffsetX / width);
    setCurrentCarouselIndex(index);
  };

  const Screen1 = (): JSX.Element => {
    return (
      <CyDScrollView className={''} style={{ width }}>
        <CyDText className={'text-versionColor font-bold mt-[10%] text-left mx-[44px]'}
                 numberOfLines={4} style={{ fontSize: height * 0.03 }}>{t('ON_BOARDING_PAGE_1_CONTENT').toString()}</CyDText>
        <CyDImage source={AppImages.ON_BOARDING_1} className={clsx('mt-[20px]')} resizeMode='contain' style={{ height: height * 0.6, width }}/>
      </CyDScrollView>
    );
  };

  const Screen2 = (): JSX.Element => {
    return (
      <CyDScrollView className={''} style={{ width }}>
        <CyDText className={'text-versionColor text-[30px] font-bold mt-[10%] text-left mx-[44px]'}
                 numberOfLines={4} style={{ fontSize: height * 0.03 }}>{t('ON_BOARDING_PAGE_2_CONTENT').toString()}</CyDText>
        <CyDImage source={AppImages.ON_BOARDING_2} className={clsx('mt-[20px]')} resizeMode='contain' style={{ height: height * 0.6, width }}/>
      </CyDScrollView>
    );
  };

  const Screen3 = (): JSX.Element => {
    return (
      <CyDScrollView className={''} style={{ width }}>
        <CyDText className={'text-versionColor font-bold mt-[10%] text-left mx-[44px]'} numberOfLines={4} style={{ fontSize: height * 0.03 }}>
          {t('ON_BOARDING_PAGE_3_CONTENT').toString()}
        </CyDText>
        <CyDText className={'text-versionColor text-[20px] font-medium my-[5%] text-left mx-[44px]'} numberOfLines={4} style={{ fontSize: height * 0.02 }}>
          {t('ON_BOARDING_PAGE_3_SUB_CONTENT').toString()}
        </CyDText>
        <CyDImage source={AppImages.ON_BOARDING_3} className={clsx('mt-[20px] w-screen -left-[8%] ')} resizeMode='contain'
                  style={{ height: height * 0.40 }}/>

        <CyDView>
          <CyDTouchView onPress={() => { navigation.navigate(screenTitle.CREATE_SEED_PHRASE); }}
                        className={clsx('bg-appColor py-[20px] items-center rounded-[12px] mt-[30px] flex-row justify-around w-[80%] mx-auto', {
                          'py-[30px]': loading
                        })}>
            {!loading && <CyDText className={'text-[16px] font-extrabold '}>{t('CREATE_WALLET').toString()}</CyDText>}
            {/* {loading && <LottieView source={AppImages.LOADER_TRANSPARENT} autoPlay loop />} */}
            {!loading && <CyDImage source={AppImages.RIGHT_ARROW} resizeMode={'contain'} className={'w-[9px] h-[17px]'}
                      style={{ tintColor: '#434343' }}/>}
          </CyDTouchView>
          <CyDTouchView onPress={() => {
            navigation.navigate(screenTitle.ENTER_KEY);
          }}
                        className={'bg-transparent border-[1px] border-[#525252] py-[20px] mt-[20px] items-center rounded-[12px] flex-row justify-around w-[80%] mx-auto'}>
            <CyDText className={'text-[16px] font-extrabold '}>{t('IMPORT_WALLET').toString()}</CyDText>
            <CyDImage source={AppImages.RIGHT_ARROW} resizeMode={'contain'} className={'w-[9px] h-[17px]'}
                      style={{ tintColor: '#434343' }}/>
          </CyDTouchView>
        </CyDView>
      </CyDScrollView>
    );
  };

  const onBoardingData: React.FunctionComponent[] = [Screen1, Screen2, Screen3];

  const onPressNext = (): void => {
    const nextIndex: number = currentCarouselIndex + 1;
    if (nextIndex !== onBoardingData.length) {
      const offset: number = nextIndex * (width);
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

  const Indicator = ({ scrollX }: {scrollX: any}): JSX.Element => {
    return (
      <CyDView className={''}>
        {currentCarouselIndex !== onBoardingData.length - 1 &&
          <CyDView className={'flex-row mx-[20px] justify-between mb-[10px]'}>
          <Button onPress={onPressSkip} title={'SKIP'} type={'secondary'} style={'p-[5%] w-[30%]'}/>
          <Button onPress={onPressNext} title={'NEXT'} style={'p-[5%] w-[30%]'}/>
        </CyDView>}
        <CyDView className={'flex-row bottom-[2%] w-full justify-center'}>
          {onBoardingData.map((_, i) => {
            const inputRange: number[] = [(i - 1) * width, i * width, (i + 1) * width];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [1, 1.4, 1],
              extrapolate: 'clamp'
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 0.9, 0.4],
              extrapolate: 'clamp'
            });
            return <Animated.View
              key={`indicator-${i}`}
              style={{
                height: 6,
                width: 6,
                borderRadius: 5,
                backgroundColor: '#434343',
                opacity,
                transform: [{ scale }],
                marginHorizontal: 4
              }}
            />;
          })}
        </CyDView>
      </CyDView>);
  };

  return (
    <CyDSafeAreaView className={'relative'}>
      <CyDView className={'h-full w-full bg-white'}>
        <CyDImage source={AppImages.BG_SETTINGS} className={'h-[50%] w-full absolute top-0 right-0'} />
        <Animated.FlatList
          ref={onBoardingFlatListRef}
          onMomentumScrollEnd={onScrollEnd}
          data={onBoardingData}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )
          }
          renderItem={({ item }) => {
            return item();
          }}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          pagingEnabled={true}
        />
        <Indicator scrollX={scrollX} />
      </CyDView>

    </CyDSafeAreaView>
  );
}
