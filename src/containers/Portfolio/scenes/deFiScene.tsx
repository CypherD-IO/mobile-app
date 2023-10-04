import React, { Dispatch, SetStateAction, memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CyDView, CyDText, CyDFastImage, CyDTouchView, CyDFlatList } from '../../../styles/tailwindStyles';
import { t } from 'i18next';
import Animated, {
  Extrapolate,
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  BackHandler,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import { isIOS } from '../../../misc/checkers';
import Loading from '../../../components/v2/loading';
import { AnimatedTabView } from '../animatedComponents';
import { PortfolioBannerHeights } from '../../../hooks/useScrollManager';
import useAxios from '../../../core/HttpRequest';
import { ChainBackendNames, DEFI_URL } from '../../../constants/server';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import { HdWalletContext } from '../../../core/util';
import { DeFiFilter, DefiAllocation, DefiData, DefiResponse, Protocol, defiProtocolData, protocolOptionType } from '../../../models/defi.interface';
import _, { last } from 'lodash';
import { getChainLogo, parseDefiData, sortDefiProtocolDesc } from '../../../core/defi';
import { formatDistanceToNow } from 'date-fns';
import moment from 'moment';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { getDeFiData, storeDeFiData } from '../../../core/asyncStorage';
import DeFiFilterModal from '../components/deFiFilterModal';
import CyDTokenValue from '../../../components/v2/tokenValue';
import { screenTitle } from '../../../constants';
import EmptyView from '../../../components/EmptyView';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
const MAX_CHAIN_COUNT = 3;

interface DeFiSceneProps {
  routeKey: string;
  scrollY: SharedValue<number>;
  trackRef: (key: string, ref: FlatList<any> | ScrollView) => void;
  onMomentumScrollBegin: (e: ScrollEvent) => void;
  onMomentumScrollEnd: (e: ScrollEvent) => void;
  onScrollEndDrag: (e: ScrollEvent) => void;
  navigation: any;
  bannerHeight: PortfolioBannerHeights;
  refreshActivity:{isRefreshing: boolean; lastRefresh: string};
  setRefreshActivity:React.Dispatch<React.SetStateAction<{isRefreshing: boolean; lastRefresh: string}>>;
  filters:DeFiFilter;
  setFilters: Dispatch<SetStateAction<DeFiFilter>>;
  userProtocols: protocolOptionType[]
  setUserProtocols: Dispatch<SetStateAction<protocolOptionType[]>>;
  filterVisible: boolean;
  setFilterVisible: Dispatch<SetStateAction<boolean>>;
}

const DeFiTotal = ({value,debt,supply}:{value:number;debt:number;supply:number})=>{
  return( 
  <CyDView className='bg-white flex justify-between items-center p-[14px] border border-sepratorColor rounded-[10px]'>
    <CyDView className='flex flex-row justify-center items-center w-full'>
      <CyDView className='flex-1 flex-row justify-start items-center gap-x-[4px]'>
        {/* <CyDFastImage
        source={AppImages.DEFI_VALUE}
        className='w-[18px] h-[18px]'
        resizeMode='contain'
        /> */}
        <CyDText className='font-medium text-[18px]'>{t('TOTAL_BALANCE')}</CyDText>
      </CyDView>
      <CyDView className='flex-2 flex-row justify-end items-center'>
        <CyDTokenValue className={'text-center font-bold text-[18px]'}>{value}</CyDTokenValue>
      </CyDView>
    </CyDView>
    {debt>0 && 
    <>
      <CyDView className='h-[1px] w-full rounded-full border-t border-sepratorColor my-[15px]' />
      <CyDView className='flex flex-row justify-center items-center w-full'>
        <CyDView className='flex-1 flex-row justify-start items-center gap-x-[4px]'>
          {/* <CyDFastImage
          source={AppImages.DEFI_DEBT}
          className='w-[18px] h-[18px]'
          resizeMode='contain'
          /> */}
          <CyDText className='font-medium text-[18px]'>{t('TOTAL_DEBT')}</CyDText>
        </CyDView>
        <CyDView className='flex-2 flex-row justify-end items-center'>
          <CyDTokenValue className={'text-center font-bold text-[18px] text-redCyD'}>{debt}</CyDTokenValue>
        </CyDView>
      </CyDView>
      <CyDView className='h-[1px] w-full rounded-full border-t border-sepratorColor my-[15px]' />
      <CyDView className='flex flex-row justify-center items-center w-full'>
        <CyDView className='flex-1 flex-row justify-start items-center gap-x-[4px]'>
          {/* <CyDFastImage
          source={AppImages.DEFI_SUPPLY}
          className='w-[18px] h-[18px]'
          resizeMode='contain'
          /> */}
          <CyDText className='font-medium text-[18px]'>{t('TOTAL_SUPPLY')}</CyDText>
        </CyDView>
        <CyDView className='flex-2 flex-row justify-end items-center'>
          <CyDTokenValue className={'text-center font-bold text-[18px]'}>{supply}</CyDTokenValue>
        </CyDView>
      </CyDView>
    </>}
  </CyDView>
  );
};

const DeFiScene = ({
  routeKey,
  scrollY,
  trackRef,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onScrollEndDrag,
  navigation,
  bannerHeight,
  refreshActivity,
  setRefreshActivity,
  filters,
  setFilters,
  userProtocols,
  setUserProtocols,
  filterVisible,
  setFilterVisible,
}: DeFiSceneProps) => {
  const flatListRef = useRef<FlatList<any>>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const OFFSET_TABVIEW = isIOS() ? -bannerHeight : 0;
  const rotateAnimation = useSharedValue(0);
  const { getWithoutAuth } = useAxios();
  const hdWalletContext = useContext<HdWalletContextDef | null>(HdWalletContext);
  const ethereum = hdWalletContext?.state.wallet?.ethereum;
  const [deFiData, setDeFiData] = useState<{
    iat: string;
    rawData: DefiResponse;
    filteredData: DefiData;
  }>({
    iat: '',
    rawData:{} as DefiResponse,
    filteredData: {} as DefiData,
  });

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: scrollY.value });
      trackRef(routeKey, flatListRef.current);
    }
  }, [flatListRef.current]);

  useEffect(()=>{
    if(!_.isEmpty(deFiData.rawData)){
      const protocols = deFiData.rawData?.protocols;
        const { defiData, defiOptionsData  } = parseDefiData(
          protocols,
          filters,
          );
        if (userProtocols.length === 0) setUserProtocols(defiOptionsData);
       
        setDeFiData(prev =>({...prev, filteredData:defiData}));
    }
  },[filters,deFiData.rawData]);
  
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  useEffect(() => {
    void intercomAnalyticsLog('visited_defi_homescreen'); 
    void getDeFiHoldings();
    BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
  },[]);

  const RenderProtocolRow = useCallback(({protocol, index}:{protocol:defiProtocolData; index:number;}) =>{
    const moreChainsCount = protocol.chains.length - MAX_CHAIN_COUNT;
    return (
    <CyDTouchView 
    key={`${protocol.protocolName}`}
      className='relative px-[14px] py-[20px] border border-sepratorColor rounded-[10px] flex  mt-[40px]'
      onPress={() => {
        navigation.navigate(screenTitle.DEFI_PROTOCOL_OVERVIEW_SCREEN, {
          protocol,
        });
      }}
    >
      <CyDFastImage
            source={protocol.protocolLogo}
            className="absolute -top-[21px] right-[50%] h-[42px] w-[42px] rounded-full bg-white border border-sepratorColor"
            resizeMode="contain"/> 
      <CyDView className='flex flex-row'>
        <CyDView
          className='flex-1 flex-row gap-[4px] justify-start items-center'
        >
            <CyDView className=''>
              <CyDTouchView
                className='flex-1 flex-row gap-[4px] justify-start items-center'
                onPress={()=>{
                  void Linking.openURL(protocol.protocolURL);
                }}
              >
                <CyDText className='underline font-bold text-[20px]'>{protocol.protocolName}</CyDText>
                <CyDFastImage
                source={AppImages.LINK}
                className="h-[14px] w-[14px]"
                resizeMode="contain"/> 
              </CyDTouchView>
              <CyDView className='flex-1 flex-row justify-start items-center'>
                {protocol.chains.slice(0, moreChainsCount === 1 ? 4 : 3).map((chain, index) =>{
                  return (
                    <CyDFastImage
                      key={`${protocol.protocolName}-${chain}-${index}`}
                      source={getChainLogo(chain)}
                      className="h-[16px] w-[16px] rounded-full"
                      resizeMode="contain"
                    /> );
                })}
                {moreChainsCount>1 && 
                <CyDView className='h-[16px] w-[16px] rounded-full flex justify-center items-center'>
                  <CyDText className="text-[12px] ">
                      {t('PLUS')}{ moreChainsCount}
                  </CyDText>
                  </CyDView>
                }
              </CyDView>
            </CyDView>
        </CyDView>
        <CyDView className='flex-2 justify-start items-end'>
          <CyDTokenValue className={'text-center font-bold text-[18px]'}>{protocol.total.value}</CyDTokenValue>
          { protocol.total.debt>0 && <CyDTokenValue className={'text-center font-semibold text-[14px] text-warningTextYellow'}>{protocol.total.debt}</CyDTokenValue>}
        </CyDView>
      </CyDView>
      <CyDView className='relative border border-sepratorColor rounded-[10px]  p-[8px] mt-[15px] flex'>
        {Object.values(protocol.types).slice(0, 3).map(type =>{
          return (
          <CyDView className='flex flex-row justify-center items-center w-full my-[5px]' key={`${type.type}-${protocol.protocolName}`}>
            <CyDView className='flex-1 flex-row justify-start items-center gap-x-[4px]'>
              <CyDFastImage
              source={type.typeLogo}
              className='w-[18px] h-[18px]'
              resizeMode='contain'
              />
              <CyDText className='font-medium text-[18px]'>{type.type}</CyDText>
            </CyDView>
            <CyDView className='flex-2 flex-row justify-end items-center'>
              <CyDTokenValue className={'text-center font-semibold text-[18px]'}>{type.total.value}</CyDTokenValue>
            </CyDView>
          </CyDView>);
        })}
        <CyDView className=' bg-white border border-sepratorColor rounded-[10px] absolute -bottom-[11px] right-[42%]' >
          <CyDText className='text-[12px] font-medium px-[4px] py-[2px]'>{t('VIEW_MORE')}</CyDText>
        </CyDView>
      </CyDView>
    </CyDTouchView>
    );
  },[filters]);

  const fetchDefiData = async (address: string, forceRefresh=false)=>{
    const url = forceRefresh? `${DEFI_URL}/${address}?forceRefresh=true` : `${DEFI_URL}/${address}`;
    const { isError, data: rawDeFiData } = await getWithoutAuth(url);
    if (!_.isEmpty(rawDeFiData?.protocols)) {
      const protocols = rawDeFiData?.protocols;
      const { defiData, defiOptionsData  } = parseDefiData(
        protocols as Protocol[],
        filters,
        );
      if (userProtocols.length === 0) setUserProtocols(defiOptionsData);
      const data ={
        iat: rawDeFiData?.iat,
        rawData: rawDeFiData,
        filteredData: defiData,
      };
      setDeFiData(data);
      await storeDeFiData(data);
    }
    setRefreshActivity({isRefreshing:false, lastRefresh: rawDeFiData.iat});
  };
  const getDeFiHoldings = async (forceRefresh = false ) => {
    if(!forceRefresh)setLoading(true);
    
    if(forceRefresh){ 
      setRefreshActivity(prev =>({...prev, isRefreshing:true}));
      if (ethereum?.wallets[0].address) {
        await fetchDefiData(ethereum?.wallets[0].address,true);
      }
    }else{
      const data = await getDeFiData();
      if(data !== null ){
        setDeFiData(data);

      }
      if(ethereum?.wallets[0].address){
        await fetchDefiData(ethereum?.wallets[0].address);
      }
    }
    
    if(!forceRefresh)setLoading(false);

  };

  const onRefresh = () => {
    
    void getDeFiHoldings(true);
    
  };
  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(rotateAnimation.value, [0, 1], [0, 90], Extrapolate.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  const handleAnimation = (toValue: number) => {
    rotateAnimation.value = withTiming(toValue, {
      duration: 300,
    });
  };
  
  
  return (
    <CyDView className="flex-1 mx-[10px]">
      <DeFiFilterModal
        navigation={navigation}
        filters={filters}
        setFilters={setFilters}
        visible={filterVisible}
        setVisible={setFilterVisible}
        protocols={userProtocols}
      />
      {!loading ?
      <AnimatedTabView
        data={!_.isEmpty(deFiData.filteredData) ? Object.values(deFiData.filteredData.protocols).sort(sortDefiProtocolDesc): []}
        renderItem={({item,index})=><RenderProtocolRow protocol={item} index={index}/>}
        keyExtractor={(item:defiProtocolData) => item.protocolName}
        bannerHeight={bannerHeight}
        scrollY={scrollY}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        onRef={flatListRef}
        refreshControl={
          <RefreshControl 
            refreshing={refreshActivity.isRefreshing} 
            onRefresh={()=>{
              void onRefresh();
            }} 
            progressViewOffset={bannerHeight} 
          />
        }
        ListHeaderComponent={
          <DeFiTotal 
            value={!_.isEmpty(deFiData.filteredData) ? deFiData.filteredData.total.value:0} 
            debt={!_.isEmpty(deFiData.filteredData) ? deFiData.filteredData.total.debt:0} 
            supply={!_.isEmpty(deFiData.filteredData) ? deFiData.filteredData.total.supply:0}
          />
        }
        ListEmptyComponent={
          <CyDView className='flex flex-col justify-center items-center'>
            <EmptyView
              text={t('NO_CURRENT_HOLDINGS')}
              image={AppImages.EMPTY}
              buyVisible={false}
              marginTop={30}
            />
          </CyDView>
        } 
      />: <Loading/>}
    </CyDView>
  );
};

export default memo(DeFiScene);
