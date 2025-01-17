import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  CyDView,
  CyDTouchView,
  CyDImage,
  CyDText,
  CyDFlatList,
} from '../styles/tailwindStyles';
import Button from './v2/button';
import AppImages from '../../assets/images/appImages';
import { HdWalletContext } from '../core/util';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import { t } from 'i18next';
import { ButtonType } from '../constants/enum';
import { generateMultipleWalletAddressesFromSeedPhrase } from '../core/Address';
import { screenTitle } from '../constants';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { title } from 'process';
import clsx from 'clsx';
import { isIOS } from '../misc/checkers';

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
        'flex flex-row justify-evenly bg-white items-center self-center border-[1px] border-sepratorColor w-[353px] h-[60px] rounded-[10px] px-[20px] mb-[10px]'
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
              <CyDImage
                source={AppImages.BACK_ARROW_GRAY}
                className='w-[32px] h-[32px]'
              />
            </CyDTouchView>
          )}
          <CyDView className='w-[calc(100% - 40px)] mx-auto'>
            <CyDText className='font-semibold text-black text-center -ml-[24px] text-[20px]'>
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
              className='rounded-[6px] w-[100px] bg-white py-[6px] px-[12px] border-[1px] border-[#D0D5DD] mt-[8px] items-center'
              onPress={() => {
                setShowMoreLoading(true);
                setTimeout(() => {
                  handleShowMoreWalletAddressPress();
                }, 50);
              }}>
              {!showMoreLoading ? (
                <CyDText>{t('SHOW_MORE')}</CyDText>
              ) : (
                <LottieView
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
          'absolute w-full bottom-[0px] bg-white pt-[10px] pb-[32px] px-[16px]',
          {
            'bottom-[-32px]': isIOS(),
          },
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
          <CyDImage
            className='h-[16px] w-[16px]'
            source={AppImages.AUDIT_ICON}
          />
          <CyDText className='text-[10px] font-medium ml-[6px]'>
            {t('CYPHER_AUDIT_TEXT')}
          </CyDText>
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
