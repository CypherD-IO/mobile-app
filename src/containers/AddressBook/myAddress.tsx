import * as React from 'react';
import { useContext, useState } from 'react';
import AppImages from '../../../assets/images/appImages';
import SwitchView from '../../components/v2/switchView';
import { AddressFunctionalityList } from '../../constants/enum';
import { CHAIN_ARBITRUM, CHAIN_AVALANCHE, CHAIN_BSC, CHAIN_COSMOS, CHAIN_ETH, CHAIN_EVMOS, CHAIN_FTM, CHAIN_JUNO, CHAIN_OPTIMISM, CHAIN_OSMOSIS, CHAIN_POLYGON, CHAIN_SHARDEUM, CHAIN_STARGAZE, CHAIN_NOBLE, FundWalletAddressType, CHAIN_SHARDEUM_SPHINX } from '../../constants/server';
import { HdWalletContext } from '../../core/util';
import { CyDImage, CyDSafeAreaView, CyDScrollView, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { AddressBookContainer } from '../Auth/Share';
import { Contacts } from './contacts';
import { BackHandler } from 'react-native';

export function AddressBook ({ route, navigation }) {
  const { indexValue = 0 } = route.params;
  const [index, setIndex] = useState(indexValue);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const evmos = hdWalletContext.state.wallet.evmos;
  const cosmos = hdWalletContext.state.wallet.cosmos;
  const osmosis = hdWalletContext.state.wallet.osmosis;
  const juno = hdWalletContext.state.wallet.juno;
  const { stargaze } = hdWalletContext.state.wallet;
  const noble = hdWalletContext.state.wallet.noble;

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
      <CyDSafeAreaView className={'h-full bg-white pt-[10px]'}>
        <CyDView className={'flex flex-row w-full pl-[10px] items-center mb-[8%]'}>
          <CyDTouchView onPress={() => { navigation.goBack(); }}>
            <CyDImage source={AppImages.BACK} className={' w-[20px] h-[20px] mt-[10]'}/>
          </CyDTouchView>
          <CyDView className='flex-1 items-center mr-[20px]'>
            <SwitchView titles={AddressFunctionalityList} index={index} length={81} setIndexChange={(index) => {
              setIndex(index);
            }}></SwitchView>
            </CyDView>
        </CyDView>
        {index === 0 && <CyDScrollView className={'flex flex-col w-[100%]'}>
        <CyDView className={'w-[100%] flex flex-col items-center'}>
          <AddressBookContainer
            chain={CHAIN_ETH.name}
            wallet={ethereum}
            logo={AppImages.ETHEREUM_NEW}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.EVM}
            bGC={'#f6f6f9'}
          />

          <AddressBookContainer
            chain={CHAIN_COSMOS.name}
            wallet={cosmos.wallets[cosmos.currentIndex]}
            logo={AppImages.COSMOS_LOGO}
            bGC={'#eff0f5'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.COSMOS}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_OSMOSIS.name}
            wallet={osmosis.wallets[osmosis.currentIndex]}
            logo={AppImages.OSMOSIS_LOGO}
            bGC={'#f5edfa'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.OSMOSIS}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_JUNO.name}
            wallet={juno.wallets[juno.currentIndex]}
            logo={AppImages.JUNO_PNG}
            bGC={'#ebebeb'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.JUNO}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_STARGAZE.name}
            wallet={stargaze.wallets[stargaze.currentIndex]}
            logo={AppImages.STARGAZE_LOGO}
            bGC={'#ebebeb'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.STARGAZE}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_NOBLE.name}
            wallet={noble.wallets[noble.currentIndex]}
            logo={AppImages.NOBLE_LOGO}
            bGC={'#ebebeb'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.NOBLE}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_EVMOS.name}
            wallet={evmos.wallets[evmos.currentIndex]}
            logo={AppImages.EVMOS_LOGO_TRANSPARENT}
            bGC={'#fef3f1'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.EVMOS}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_EVMOS.name}
            wallet={ethereum}
            logo={AppImages.EVMOS_LOGO_TRANSPARENT}
            bGC={'#fef3f1'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.EVMOS}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_POLYGON.name}
            wallet={ethereum}
            logo={AppImages.POLYGON}
            bGC={'#f5efff'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.POLYGON}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_BSC.name}
            wallet={ethereum}
            logo={AppImages.BIANCE}
            bGC={'#fff7e3'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.BSC}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_AVALANCHE.name}
            wallet={ethereum}
            logo={AppImages.AVALANCHE}
            bGC={'#fff6f5'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.AVALANCHE}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_FTM.name}
            wallet={ethereum}
            logo={AppImages.FANTOM}
            bGC={'#f4fbff'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.FANTOM}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_ARBITRUM.name}
            wallet={ethereum}
            logo={AppImages.ARBITRUM}
            bGC={'#f1f4fa'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.ARBITRUM}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_OPTIMISM.name}
            wallet={ethereum}
            logo={AppImages.OPTIMISM}
            bGC={'#fff0f0'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.OPTIMISM}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_SHARDEUM.name}
            wallet={ethereum}
            logo={AppImages.SHARDEUM}
            bGC={'#fff0f0'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.SHARDEUM}
          ></AddressBookContainer>

          <AddressBookContainer
            chain={CHAIN_SHARDEUM_SPHINX.name}
            wallet={ethereum}
            logo={AppImages.SHARDEUM}
            bGC={'#fff0f0'}
            navigation={navigation}
            addressTypeQRCode={FundWalletAddressType.SHARDEUM_SPHINX}
          ></AddressBookContainer>
          </CyDView>
        </CyDScrollView>}
        {index === 1 && <Contacts route={route} navigation={navigation}/>}
      </CyDSafeAreaView>
    </>
  );
}