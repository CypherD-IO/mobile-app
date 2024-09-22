import React, {
  Dispatch,
  SetStateAction,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  CyDView,
  CyDText,
  CyDFastImage,
  CyDTouchView,
  CyDFlatList,
} from '../../../styles/tailwindStyles';
import { t } from 'i18next';
import { BackHandler, FlatList, RefreshControl } from 'react-native';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import Loading from '../../../components/v2/loading';
import useAxios from '../../../core/HttpRequest';
import { DEFI_URL } from '../../../constants/server';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import { HdWalletContext } from '../../../core/util';
import {
  DeFiFilter,
  DefiData,
  DefiResponse,
  Protocol,
  defiProtocolData,
  protocolOptionType,
} from '../../../models/defi.interface';
import _ from 'lodash';
import {
  getChainLogo,
  parseDefiData,
  sortDefiProtocolDesc,
} from '../../../core/defi';
import AppImages from '../../../../assets/images/appImages';
import { getDeFiData, storeDeFiData } from '../../../core/asyncStorage';
import DeFiFilterModal from '../components/deFiFilterModal';
import CyDTokenValue from '../../../components/v2/tokenValue';
import { screenTitle } from '../../../constants';
import EmptyView from '../../../components/EmptyView';

const MAX_CHAIN_COUNT = 3;

interface DeFiSceneProps {
  navigation: any;
  filters: DeFiFilter;
  setFilters: Dispatch<SetStateAction<DeFiFilter>>;
  userProtocols: protocolOptionType[];
  setUserProtocols: Dispatch<SetStateAction<protocolOptionType[]>>;
  filterVisible: boolean;
  setFilterVisible: Dispatch<SetStateAction<boolean>>;
}

const DeFiTotal = ({
  value,
  debt,
  supply,
  claimable,
}: {
  value: number;
  debt: number;
  supply: number;
  claimable: number;
}) => {
  if (supply > 0 || debt > 0 || value > 0 || claimable > 0)
    return (
      <CyDView className='pt-[10px]'>
        <CyDView className='bg-white flex flex-row justify-evenly items-center'>
          <CyDView className='w-[48%] h-[85px] rounded-[10px] border border-sepratorColor mr-[3px] mb-[2px] p-[2%]'>
            <CyDView className='w-full h-full  flex-1 flex-col justify-center items-start'>
              <CyDTokenValue
                className={'text-center font-extrabold text-[18px]'}>
                {value}
              </CyDTokenValue>

              <CyDView className='flex flex-row justify-center items-center'>
                <CyDText className='font-medium text-[16px]'>
                  {t('TOTAL_BALANCE')}
                </CyDText>
                <CyDFastImage
                  source={AppImages.DEFI_VALUE}
                  className='w-[20px] h-[20px] ml-[4px]'
                  resizeMode='contain'
                />
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='w-[48%] h-[85px] rounded-[10px] border border-sepratorColor ml-[3px] mb-[2px] p-[2%]'>
            <CyDView className='w-full h-full  flex-1 flex-col justify-center items-start'>
              <CyDTokenValue
                className={'text-center font-extrabold text-[18px]'}>
                {debt}
              </CyDTokenValue>

              <CyDView className='flex flex-row justify-center items-center'>
                <CyDText className='font-medium text-[16px]'>
                  {t('TOTAL_DEBT')}
                </CyDText>
                <CyDFastImage
                  source={AppImages.DEFI_DEBT}
                  className='w-[20px] h-[20px] ml-[4px]'
                  resizeMode='contain'
                />
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='bg-white flex flex-row justify-evenly items-center'>
          <CyDView className='w-[48%] h-[85px] rounded-[10px] border border-sepratorColor mt-[6px] mr-[2px] p-[2%]'>
            <CyDView className='w-full h-full  flex-1 flex-col justify-center items-start'>
              <CyDTokenValue
                className={'text-center font-extrabold text-[18px]'}>
                {supply}
              </CyDTokenValue>

              <CyDView className='flex flex-row justify-center items-center'>
                <CyDText className='font-medium text-[16px]'>
                  {t('TOTAL_SUPPLY')}
                </CyDText>
                <CyDFastImage
                  source={AppImages.DEFI_SUPPLY}
                  className='w-[20px] h-[20px] ml-[4px]'
                  resizeMode='contain'
                />
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='w-[48%] h-[85px] rounded-[10px] border border-sepratorColor mt-[6px] ml-[2px] p-[2%]'>
            <CyDView className='w-full h-full  flex-1 flex-col justify-center items-start'>
              <CyDTokenValue
                className={'text-center font-extrabold text-[18px]'}>
                {claimable}
              </CyDTokenValue>

              <CyDView className='flex flex-row justify-center items-center'>
                <CyDText className='font-medium text-[16px]'>
                  {t('TOTAL_REWARDS')}
                </CyDText>
                <CyDFastImage
                  source={AppImages.DEFI_REWARDS}
                  className='w-[20px] h-[20px] ml-[4px]'
                  resizeMode='contain'
                />
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    );
};

const DeFiScene = ({
  navigation,
  filters,
  setFilters,
  userProtocols,
  setUserProtocols,
  filterVisible,
  setFilterVisible,
}: DeFiSceneProps) => {
  const flatListRef = useRef<FlatList<any>>(null);
  const { getWithoutAuth } = useAxios();
  const hdWalletContext = useContext<HdWalletContextDef | null>(
    HdWalletContext,
  );
  const ethereum = hdWalletContext?.state.wallet?.ethereum;
  const [refreshActivity, setRefreshActivity] = useState<{
    isRefreshing: boolean;
    lastRefresh: string;
  }>({ isRefreshing: false, lastRefresh: 'Retrieving...' });
  const [loading, setLoading] = useState<boolean>(true);
  const [deFiData, setDeFiData] = useState<{
    iat: string;
    rawData: DefiResponse;
    filteredData: DefiData;
  }>({
    iat: '',
    rawData: {} as DefiResponse,
    filteredData: {} as DefiData,
  });

  // useEffect(() => {
  //   if (flatListRef.current) {
  //     if (scrollY.value <= OFFSET_TABVIEW + bannerHeight) {
  //       flatListRef.current.scrollToOffset({
  //         offset: Math.max(
  //           Math.min(scrollY.value, OFFSET_TABVIEW + bannerHeight),
  //           OFFSET_TABVIEW,
  //         ),
  //         animated: false,
  //       });
  //     } else {
  //       flatListRef.current.scrollToOffset({
  //         offset: OFFSET_TABVIEW + bannerHeight,
  //         animated: false,
  //       });
  //     }
  //     trackRef(routeKey, flatListRef.current);
  //   }
  // }, [flatListRef.current, loading]);

  useEffect(() => {
    if (!_.isEmpty(deFiData.rawData)) {
      const protocols = deFiData.rawData?.protocols;
      const { defiData, defiOptionsData } = parseDefiData(protocols, filters);
      if (userProtocols.length === 0) setUserProtocols(defiOptionsData);

      setDeFiData(prev => ({ ...prev, filteredData: defiData }));
    }
  }, [filters, deFiData.rawData]);

  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  useEffect(() => {
    void intercomAnalyticsLog('visited_defi_homescreen');
    void getDeFiHoldings();
    BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
  }, []);

  const RenderProtocolRow = useCallback(
    ({ protocol, index }: { protocol: defiProtocolData; index: number }) => {
      const moreChainsCount = protocol.chains.length - MAX_CHAIN_COUNT;
      return (
        <CyDTouchView
          key={`${protocol.protocolName}`}
          className='relative px-[14px] py-[20px] border border-sepratorColor rounded-[10px] flex  mt-[40px]'
          onPress={() => {
            navigation.navigate(screenTitle.DEFI_PROTOCOL_OVERVIEW_SCREEN, {
              protocol,
            });
          }}>
          <CyDFastImage
            source={protocol.protocolLogo}
            className='absolute -top-[21px] right-[50%] h-[42px] w-[42px] rounded-full bg-white border border-sepratorColor'
            resizeMode='contain'
          />
          <CyDView className='flex flex-row'>
            <CyDView className='flex-1 flex-row gap-[4px] justify-start items-center'>
              <CyDView className=''>
                <CyDTouchView
                  className='flex-1 flex-row gap-[4px] justify-start items-center'
                  onPress={() => {
                    navigation.navigate(screenTitle.BROWSER, {
                      screen: screenTitle.BROWSER_SCREEN,
                      params: {
                        url: protocol.protocolURL,
                      },
                    });
                  }}>
                  <CyDText className='underline font-bold text-[20px]'>
                    {protocol.protocolName}
                  </CyDText>
                  <CyDFastImage
                    source={AppImages.LINK}
                    className='h-[14px] w-[14px]'
                    resizeMode='contain'
                  />
                </CyDTouchView>
                <CyDView className='flex-1 flex-row justify-start items-center'>
                  {protocol.chains
                    .slice(0, moreChainsCount === 1 ? 4 : 3)
                    .map((chain, index) => {
                      return (
                        <CyDFastImage
                          key={`${protocol.protocolName}-${chain}-${index}`}
                          source={getChainLogo(chain)}
                          className='h-[16px] w-[16px] rounded-full'
                          resizeMode='contain'
                        />
                      );
                    })}
                  {moreChainsCount > 1 && (
                    <CyDView className='h-[16px] w-[16px] rounded-full flex justify-center items-center'>
                      <CyDText className='text-[12px] '>
                        {t('PLUS')}
                        {moreChainsCount}
                      </CyDText>
                    </CyDView>
                  )}
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='flex-2 justify-start items-end'>
              <CyDTokenValue className={'text-center font-bold text-[18px]'}>
                {protocol.total.value}
              </CyDTokenValue>
              {protocol.total.debt > 0 && (
                <CyDTokenValue
                  className={
                    'text-center font-semibold text-[14px] text-warningTextYellow'
                  }>
                  {protocol.total.debt}
                </CyDTokenValue>
              )}
            </CyDView>
          </CyDView>
          <CyDView className='relative border border-sepratorColor rounded-[10px]  p-[8px] mt-[15px] flex'>
            {Object.values(protocol.types)
              .slice(0, 3)
              .map(type => {
                return (
                  <CyDView
                    className='flex flex-row justify-center items-center w-full my-[5px]'
                    key={`${type.type}-${protocol.protocolName}`}>
                    <CyDView className='flex-1 flex-row justify-start items-center gap-x-[4px]'>
                      <CyDFastImage
                        source={type.typeLogo}
                        className='w-[18px] h-[18px]'
                        resizeMode='contain'
                      />
                      <CyDText className='font-medium text-[18px]'>
                        {type.type}
                      </CyDText>
                    </CyDView>
                    <CyDView className='flex-2 flex-row justify-end items-center'>
                      <CyDTokenValue
                        className={'text-center font-semibold text-[18px]'}>
                        {type.total.value}
                      </CyDTokenValue>
                    </CyDView>
                  </CyDView>
                );
              })}
            <CyDView className=' bg-white border border-sepratorColor rounded-[10px] absolute -bottom-[11px] right-[42%]'>
              <CyDText className='text-[12px] font-medium px-[4px] py-[2px]'>
                {t('VIEW_MORE')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDTouchView>
      );
    },
    [filters],
  );

  const fetchDefiData = async (address: string, forceRefresh = false) => {
    const url = forceRefresh
      ? `${DEFI_URL}/${address}?forceRefresh=true`
      : `${DEFI_URL}/${address}`;
    const { isError, data: rawDeFiData } = await getWithoutAuth(url, {}, 40000);
    if (!isError) {
      if (!_.isEmpty(rawDeFiData?.protocols)) {
        const protocols = rawDeFiData?.protocols;
        const { defiData, defiOptionsData } = parseDefiData(
          protocols as Protocol[],
          filters,
        );
        if (userProtocols.length === 0) setUserProtocols(defiOptionsData);
        const data = {
          iat: rawDeFiData?.iat,
          rawData: rawDeFiData,
          filteredData: defiData,
        };
        setDeFiData(data);
        await storeDeFiData(data);
      }
      setRefreshActivity({ isRefreshing: false, lastRefresh: rawDeFiData.iat });
    } else {
      setRefreshActivity({
        isRefreshing: false,
        lastRefresh: new Date().toLocaleString(),
      });
    }
  };
  const getDeFiHoldings = async (forceRefresh = false) => {
    if (!forceRefresh) setLoading(true);

    if (forceRefresh) {
      setRefreshActivity(prev => ({ ...prev, isRefreshing: true }));
      if (ethereum?.wallets[0].address) {
        await fetchDefiData(ethereum?.wallets[0].address, true);
      }
    } else {
      const data = await getDeFiData();
      if (data !== null) {
        setDeFiData(data);
      }
      if (ethereum?.wallets[0].address) {
        await fetchDefiData(ethereum?.wallets[0].address);
      }
    }

    if (!forceRefresh) setLoading(false);
  };

  const onRefresh = () => {
    void getDeFiHoldings(true);
  };

  return (
    <CyDView className='flex-1 mx-[10px]'>
      <DeFiFilterModal
        navigation={navigation}
        filters={filters}
        setFilters={setFilters}
        visible={filterVisible}
        setVisible={setFilterVisible}
        protocols={userProtocols}
      />
      {!loading ? (
        <CyDFlatList
          data={
            !_.isEmpty(deFiData.filteredData)
              ? Object.values(deFiData.filteredData.protocols).sort(
                  sortDefiProtocolDesc,
                )
              : []
          }
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <RenderProtocolRow protocol={item} index={index} />
          )}
          keyExtractor={(item: defiProtocolData) => item.protocolName}
          onRef={flatListRef}
          refreshControl={
            <RefreshControl
              refreshing={refreshActivity.isRefreshing}
              onRefresh={() => {
                void onRefresh();
              }}
            />
          }
          ListHeaderComponent={
            <DeFiTotal
              value={
                !_.isEmpty(deFiData.filteredData)
                  ? deFiData.filteredData.total.value
                  : 0
              }
              debt={
                !_.isEmpty(deFiData.filteredData)
                  ? deFiData.filteredData.total.debt
                  : 0
              }
              supply={
                !_.isEmpty(deFiData.filteredData)
                  ? deFiData.filteredData.total.supply
                  : 0
              }
              claimable={
                !_.isEmpty(deFiData.filteredData)
                  ? deFiData.filteredData.total.claimable
                  : 0
              }
            />
          }
          ListEmptyComponent={
            <CyDView className='flex flex-col justify-start items-center'>
              <EmptyView
                text={t('NO_CURRENT_HOLDINGS')}
                image={AppImages.EMPTY}
                buyVisible={false}
              />
            </CyDView>
          }
        />
      ) : (
        <CyDView className='w-full absolute bottom-[100px]'>
          <Loading />
        </CyDView>
      )}
    </CyDView>
  );
};

export default memo(DeFiScene);
