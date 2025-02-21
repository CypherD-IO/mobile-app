import * as React from 'react';
import { useContext, useState } from 'react';
import AppImages from '../../../assets/images/appImages';
import SwitchView from '../../components/v2/switchView';
import { AddressFunctionalityList } from '../../constants/enum';
import {
  CHAIN_ARBITRUM,
  CHAIN_AVALANCHE,
  CHAIN_BSC,
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_OPTIMISM,
  CHAIN_OSMOSIS,
  CHAIN_POLYGON,
  CHAIN_NOBLE,
  FundWalletAddressType,
  CHAIN_ZKSYNC_ERA,
  CHAIN_BASE,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_SOLANA,
} from '../../constants/server';
import { HdWalletContext } from '../../core/util';
import {
  CyDIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { AddressBookContainer } from '../Auth/Share';
import { Contacts } from './contacts';
import { BackHandler } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

interface RouteParams {
  indexValue: number;
}
export function AddressBook() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { indexValue = 0 } = route.params;
  const [index, setIndex] = useState(indexValue);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { ethereum, cosmos, osmosis, noble, coreum, injective, solana } =
    hdWalletContext.state.wallet;

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  return (
    <>
      <CyDSafeAreaView className={'h-full bg-n20 pt-[10px]'}>
        <CyDView
          className={'flex flex-row w-full pl-[10px] items-center mb-[8%]'}>
          <CyDTouchView
            onPress={() => {
              navigation.goBack();
            }}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
          <CyDView className='flex-1 items-center mr-[20px]'>
            <SwitchView
              titles={AddressFunctionalityList}
              index={index}
              length={81}
              setIndexChange={(_index: number) => {
                setIndex(_index);
              }}
            />
          </CyDView>
        </CyDView>
        {index === 0 && (
          <CyDScrollView className={'flex flex-col w-[100%]'}>
            <CyDView className={'w-[100%] flex flex-col items-center'}>
              <AddressBookContainer
                chain={CHAIN_ETH.name}
                wallet={ethereum}
                logo={AppImages.ETHEREUM}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.EVM}
                bGC={'#f6f6f9'}
              />

              <AddressBookContainer
                chain={CHAIN_SOLANA.name}
                wallet={solana.wallets[solana.currentIndex]}
                logo={AppImages.SOLANA_LOGO}
                bGC={'#f1f4fa'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.SOLANA}
              />

              <AddressBookContainer
                chain={CHAIN_COSMOS.name}
                wallet={cosmos.wallets[cosmos.currentIndex]}
                logo={AppImages.COSMOS_LOGO}
                bGC={'#eff0f5'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.COSMOS}
              />

              <AddressBookContainer
                chain={CHAIN_OSMOSIS.name}
                wallet={osmosis.wallets[osmosis.currentIndex]}
                logo={AppImages.OSMOSIS_LOGO}
                bGC={'#f5edfa'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.OSMOSIS}
              />

              <AddressBookContainer
                chain={CHAIN_NOBLE.name}
                wallet={noble.wallets[noble.currentIndex]}
                logo={AppImages.NOBLE_LOGO}
                bGC={'#ebebeb'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.NOBLE}
              />

              <AddressBookContainer
                chain={CHAIN_COREUM.name}
                wallet={coreum.wallets[coreum.currentIndex]}
                logo={AppImages.COREUM_LOGO}
                bGC={'#f3fee3'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.COREUM}
              />

              <AddressBookContainer
                chain={CHAIN_INJECTIVE.name}
                wallet={injective.wallets[injective.currentIndex]}
                logo={AppImages.INJECTIVE_LOGO}
                bGC={'#f1f4fa'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.INJECTIVE}
              />

              <AddressBookContainer
                chain={CHAIN_POLYGON.name}
                wallet={ethereum}
                logo={AppImages.POLYGON}
                bGC={'#f5efff'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.POLYGON}
              />

              <AddressBookContainer
                chain={CHAIN_BSC.name}
                wallet={ethereum}
                logo={AppImages.BINANCE}
                bGC={'#fff7e3'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.BSC}
              />

              <AddressBookContainer
                chain={CHAIN_AVALANCHE.name}
                wallet={ethereum}
                logo={AppImages.AVALANCHE}
                bGC={'#fff6f5'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.AVALANCHE}
              />

              <AddressBookContainer
                chain={CHAIN_ARBITRUM.name}
                wallet={ethereum}
                logo={AppImages.ARBITRUM}
                bGC={'#f1f4fa'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.ARBITRUM}
              />

              <AddressBookContainer
                chain={CHAIN_OPTIMISM.name}
                wallet={ethereum}
                logo={AppImages.OPTIMISM}
                bGC={'#fff0f0'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.OPTIMISM}
              />

              <AddressBookContainer
                chain={CHAIN_ZKSYNC_ERA.name}
                wallet={ethereum}
                logo={AppImages.ZKSYNC_ERA_LOGO}
                bGC={'#f6f6f9'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.ZKSYNC_ERA}
              />

              <AddressBookContainer
                chain={CHAIN_BASE.name}
                wallet={ethereum}
                logo={AppImages.BASE_LOGO}
                bGC={'#f1f4fa'}
                navigation={navigation}
                addressTypeQRCode={FundWalletAddressType.BASE}
              />
            </CyDView>
          </CyDScrollView>
        )}
        {index === 1 && <Contacts />}
      </CyDSafeAreaView>
    </>
  );
}
