import * as React from 'react';
import {
  CyDFlatList,
  CyDImage,
  CyDImageBackground,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { t } from 'i18next';
import AppImages from '../../../assets/images/appImages';
import { Dispatch, SetStateAction, useContext, useState } from 'react';
import Button from '../../components/v2/button';
import { HdWalletContext } from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

const RadioButton = (props: { selected: boolean }) => {
  const { selected } = props;
  return (
    <CyDView
      className={
        'h-[22px] w-[22px] rounded-[11px] border-[1.5px] border-borderColor flex flex-row justify-center items-center'
      }>
      {selected ? (
        <CyDView className={'h-[10px] w-[10px] rounded-[5px] bg-appColor'} />
      ) : null}
    </CyDView>
  );
};

const RenderWalletAddresses = (
  item: { address: string; index: number },
  selectedIndex: number,
  setSelectedIndex: Dispatch<SetStateAction<number>>,
) => {
  return (
    <CyDTouchView
      className={
        'flex flex-row justify-evenly items-center self-center border-[1px] border-sepratorColor w-[353px] h-[60px] rounded-[10px] px-[20px] mb-[10px]'
      }
      onPress={() => {
        setSelectedIndex(item.index);
      }}>
      <CyDText className='ml-[10px] mr-[20px]'>{item.index}</CyDText>
      <CyDImage
        source={AppImages[`ADDRESS_PROFILE_${(item.index % 4) + 1}`]}
        className='h-[30px] w-[30px]'
        resizeMode='contain'
      />
      <CyDText className='grow text-center'>
        {item.address.substring(0, 8) +
          '...' +
          item.address.substring(item.address.length - 6)}
      </CyDText>
      <RadioButton selected={selectedIndex === item.index} />
    </CyDTouchView>
  );
};

export function ChooseWalletIndex({ route, navigation }) {
  const { walletAddresses = [] } = route.params;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const [loading, setLoading] = useState(false);

  return (
    <>
      <CyDSafeAreaView className={'h-full bg-white'}>
        {/* <CyDImageBackground
          className={'h-[100%] pt-[30px]'}
          source={AppImages.BG_SETTINGS}
          resizeMode={'cover'}> */}
        <CyDText className={'my-[20px] text-center text-[16px]'}>
          {t('CHOOSE_WALLET_INDEX_TEXT')}
        </CyDText>
        <CyDFlatList
          data={walletAddresses}
          renderItem={({ item }) =>
            RenderWalletAddresses(item, selectedIndex, setSelectedIndex)
          }
          keyExtractor={item => item.index}
        />
        {/* </CyDImageBackground> */}
        <Button
          title={t('CONTINUE')}
          onPress={() => {
            setLoading(true);
            hdWalletContext.dispatch({
              type: 'SET_CHOOSEN_WALLET_INDEX',
              value: { indexValue: selectedIndex },
            });
          }}
          style={'h-[60px] w-[80%] mt-[10px] mx-[10%]'}
          loading={loading}
        />
      </CyDSafeAreaView>
    </>
  );
}
