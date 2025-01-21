import { useIsFocused, useNavigation } from '@react-navigation/native';
import clsx from 'clsx';
import { t } from 'i18next';
import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import AppImages from '../../assets/images/appImages';
import { screenTitle } from '../constants';
import { ButtonType } from '../constants/enum';
import { HdWalletContext } from '../core/util';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import {
  CyDFlatList,
  CyDLottieView,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import Button from './v2/button';
import { CyDIconsPack } from '../customFonts';

const randomIcons = [
  'robot-happy-outline',
  'rabbit-variant-outline',
  'robot',
  'penguin',
  'cat',
  'bird',
  'ladybug',
];

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
        'flex flex-row justify-evenly bg-n0 items-center self-center border-[1px] border-n40 h-[60px] rounded-[10px] px-[20px] mb-[10px]'
      }
      onPress={() => {
        // n40;
        setSelectedIndex(item.index);
      }}>
      <CyDText className='ml-[10px] mr-[20px]'>{item.index}</CyDText>
      <CydMaterialDesignIcons
        name={randomIcons[item.index % randomIcons.length]}
        size={24}
        className='text-base400'
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

export default function ChooseWalletIndexComponent({
  walletAddresses,
  handleShowMoreWalletAddressPress = () => {},
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const [loading, setLoading] = useState(false);
  const onlyOneAddressShown = walletAddresses.length === 1;
  const navigation = useNavigation();
  const [showMoreLoading, setShowMoreLoading] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    setShowMoreLoading(false);
  }, [isFocused]);

  return (
    <CyDView className='flex justify-between h-full'>
      <CyDView
        className={onlyOneAddressShown ? 'pb-[24px]' : 'pb-[80px] flex-1'}>
        <CyDView className='flex flex-row mx-[16px] w-full'>
          {!onlyOneAddressShown && (
            <CyDTouchView
              onPress={() => {
                navigation.navigate(screenTitle.ENTER_KEY);
              }}>
              <CyDIconsPack
                name='arrow-left'
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          )}
          <CyDView className='w-[calc(100% - 40px)] mx-auto'>
            <CyDText className='font-semibold text-center -ml-[24px] text-[20px]'>
              {t('WALLETS')}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDText className={'my-[20px] mx-[60px] text-center text-[14px]'}>
          {t('CHOOSE_WALLET_INDEX_TEXT')}
        </CyDText>
        <CyDFlatList
          data={walletAddresses}
          renderItem={({ item }) =>
            RenderWalletAddresses(item, selectedIndex, setSelectedIndex)
          }
          keyExtractor={item => item.index}
          scrollEnabled={!onlyOneAddressShown}
        />
        {onlyOneAddressShown && (
          <CyDView className='w-full items-center justify-center'>
            <CyDText className='text-[12px] text-center'>
              {t('SHOW_MORE_WALLET_ADDRESS_TEXT')}
            </CyDText>
            <CyDTouchView
              className='rounded-[6px] w-[100px] bg-n0 py-[6px] px-[12px] border-[1px] border-[#D0D5DD] mt-[8px] items-center'
              onPress={() => {
                setShowMoreLoading(true);
                setTimeout(() => {
                  handleShowMoreWalletAddressPress();
                }, 50);
              }}>
              {!showMoreLoading ? (
                <CyDText>{t('SHOW_MORE')}</CyDText>
              ) : (
                <CyDLottieView
                  source={AppImages.LOADER_TRANSPARENT}
                  autoPlay
                  loop
                  style={{ height: 18, width: 18 }}
                />
              )}
            </CyDTouchView>
          </CyDView>
        )}
      </CyDView>
      <CyDView
        className={clsx(
          'absolute w-full bottom-[0px] bg-n0 pt-[10px] pb-[32px] px-[16px] shadow-md shadow-n40',
        )}>
        <Button
          type={ButtonType.PRIMARY}
          title={t('SUBMIT_FIRST_LETTER_CAPS')}
          onPress={() => {
            setLoading(true);
            hdWalletContext.dispatch({
              type: 'SET_CHOOSEN_WALLET_INDEX',
              value: { indexValue: selectedIndex },
            });
          }}
          paddingY={12}
          style='mx-[26px] rounded-[12px]'
          titleStyle='text-[18px]'
          loading={loading}
          loaderStyle={{ height: 25, width: 25 }}
        />
        <CyDView className='flex flex-row mt-[8px] justify-center'>
          <CydMaterialDesignIcons
            name='shield-lock'
            size={18}
            className='text-base400'
          />
          <CyDText className='text-[10px] font-medium ml-[6px]'>
            {t('CYPHER_AUDIT_TEXT')}
          </CyDText>
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
