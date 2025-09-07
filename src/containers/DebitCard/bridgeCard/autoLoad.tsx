import React, { useContext, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDSwitch,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import AppImages from '../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Holding } from '../../../core/portfolio';
import {
  AUTO_LOAD_SUPPORTED_CHAINS,
  COSMOS_CHAINS_LIST,
  EVM_CHAINS,
  STABLE_TOKEN_CHAIN_MAP,
} from '../../../constants/server';
import useAxios from '../../../core/HttpRequest';
import DatePickerModal from 'react-native-modal-datetime-picker';
import Button from '../../../components/v2/button';
import { ButtonType } from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { EVM_CHAINS_TYPE } from '../../../constants/type';
import { capitalize, get, map } from 'lodash';
import usePortfolio from '../../../hooks/usePortfolio';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import ChooseTokenModalV2 from '../../../components/v2/chooseTokenModalV2';
import PageHeader from '../../../components/PageHeader';

export default function AutoLoad() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [threshold, setThreshold] = useState('100');
  const [amountToLoad, setAmountToLoad] = useState('500');
  const [expiryDate, setExpiryDate] = useState<string>(
    moment().add(1, 'year').toISOString(),
  );
  const [autoLoadExpiry, setAutoLoadExpiry] = useState<boolean>(false);
  const [repeatFor, setRepeatFor] = useState('40');
  const [isDatePickerVisible, setIsDatePickerVisible] =
    useState<boolean>(false);
  const [isChooseTokenVisible, setIsChooseTokenVisible] =
    useState<boolean>(false);
  const { t } = useTranslation();
  const { getWithAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [supportedTokens, setSupportedTokens] = useState<Holding[]>();
  const [selectedToken, setSelectedToken] = useState<Holding>();
  const { getLocalPortfolio } = usePortfolio();

  useEffect(() => {
    if (cardProfile.isAutoloadConfigured && supportedTokens?.length) {
      void getAutoLoadConfig();
    }
  }, [supportedTokens]);

  useEffect(() => {
    void getSupportedTokens();
  }, []);

  const getSupportedTokens = async () => {
    const localPortfolio = await getLocalPortfolio();
    const totalHoldings = localPortfolio?.totalHoldings;
    const tempSupportedTokens = totalHoldings?.filter(token => {
      const { backendName: chain } = token.chainDetails;
      const stableTokens = STABLE_TOKEN_CHAIN_MAP.get(chain as EVM_CHAINS_TYPE);
      if (
        map(EVM_CHAINS, 'backendName').includes(chain) &&
        stableTokens?.find(
          stableToken =>
            stableToken.contractAddress.toLowerCase() ===
            token.contractAddress.toLowerCase(),
        )
      ) {
        return AUTO_LOAD_SUPPORTED_CHAINS.includes(chain) && token.isFundable;
      } else if (map(COSMOS_CHAINS_LIST, 'backendName').includes(chain)) {
        return AUTO_LOAD_SUPPORTED_CHAINS.includes(chain) && token.isFundable;
      }
      return false;
    });
    setSupportedTokens(tempSupportedTokens);
    setSelectedToken(tempSupportedTokens?.[0]);
  };

  const getAutoLoadConfig = async () => {
    const response = await getWithAuth('/v1/cards/autoLoad');
    if (!response.isError) {
      const {
        chain,
        assetId,
        threshold: _threshold,
        amountToBeLoaded,
        expiry,
        repeatFor: _repeatFor,
      } = response.data;
      const tempSelectedToken = supportedTokens?.find(
        (token: Holding) =>
          token.chainDetails.backendName === chain &&
          get(
            token,
            map(EVM_CHAINS, 'backendName').includes(chain)
              ? 'contractAddress'
              : 'denom',
          ) === assetId,
      );
      if (tempSelectedToken) {
        setSelectedToken(tempSelectedToken);
        setThreshold(String(_threshold));
        setAmountToLoad(String(amountToBeLoaded));
        setExpiryDate(expiry);
        setRepeatFor(_repeatFor);
      }
    }
  };

  const onConfirmDate = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const dateTemp = new Date(date.getTime() - offset * 60 * 1000);
    setExpiryDate(moment(dateTemp).toISOString());
    setIsDatePickerVisible(false);
  };
  return (
    <CyDSafeAreaView className='h-full bg-n0' edges={['top']}>
      <PageHeader title={t('AUTO_LOAD')} navigation={navigation} />
      <CyDView className='flex-1 justify-between bg-n20 pt-[24px]'>
        <CyDKeyboardAwareScrollView>
          <ChooseTokenModalV2
            isChooseTokenModalVisible={isChooseTokenVisible}
            setIsChooseTokenModalVisible={setIsChooseTokenVisible}
            tokenList={supportedTokens}
            minTokenValueLimit={0}
            onSelectingToken={token => {
              setIsChooseTokenVisible(false);
              setSelectedToken(token as Holding);
            }}
            onCancel={() => {
              setIsChooseTokenVisible(false);
            }}
            noTokensAvailableMessage={t<string>(
              'AUTO_LOAD_NO_TOKENS_AVAILABLE',
              {
                supportedChains: AUTO_LOAD_SUPPORTED_CHAINS.join(', '),
              },
            )}
          />
          <DatePickerModal
            isVisible={isDatePickerVisible}
            mode='date'
            date={new Date(expiryDate)}
            onConfirm={(date: Date) => onConfirmDate(date)}
            onCancel={() => setIsDatePickerVisible(false)}
          />
          <CyDView className='bg-n0 mx-[16px] rounded-2xl'>
            <CyDView className='flex flex-row justify-start rounded-[12px] py-[12px] px-[12px]'>
              <CyDView className='self-center'>
                <CyDImage
                  source={AppImages.CARD_SEL}
                  className='h-[45px] w-[45px]'
                  resizeMode='contain'
                />
              </CyDView>
              <CyDView className='flex flex-col justify-between w-[85%] ml-[12px]'>
                <CyDText>{t('AUTO_LOAD_DESC1')}</CyDText>
                <CyDView className='flex flex-row flex-wrap justify-start items-center mt-[8px]'>
                  <CyDImage
                    source={AppImages.CELEBRATE}
                    className='h-[20px] w-[20px]'
                    resizeMode='contain'
                  />
                  <CyDText className='ml-[2px]'>{t('AUTO_LOAD_DESC2')}</CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='flex flex-col bg-n0 my-[14px] mx-[16px] rounded-[12px]'>
            <CyDView className='flex flex-col p-[16px]'>
              <CyDText>When the balance falls below:</CyDText>
              <CyDView className='flex flex-row justify-start items-center mt-[8px]'>
                <CyDView
                  className='flex flex-row justify-start items-center border-b-[2px] border-n40 py-[6px]'
                  style={{ width: 65 + String(threshold).length * 18 }}>
                  <CyDText className='text-[26px] font-bold'>{'$'}</CyDText>
                  <CyDTextInput
                    className='text-[26px] font-bold w-[90%]'
                    keyboardType={'number-pad'}
                    value={threshold}
                    onChangeText={value => {
                      setThreshold(value);
                    }}
                  />
                </CyDView>
                <CyDView className='bg-n40 p-[4px] rounded-[25px]'>
                  <CyDMaterialDesignIcons
                    name='pencil-outline'
                    size={18}
                    className='text-base400'
                  />
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-col p-[16px]'>
              <CyDView className='flex flex-col pb-[32px] border-b-[1px] border-n40'>
                <CyDText>Automatically top up:</CyDText>
                <CyDView className='flex flex-row justify-start items-center mt-[8px]'>
                  <CyDView
                    className='flex flex-row justify-start items-center border-b-[2px] border-n40 py-[6px]'
                    style={{ width: 65 + String(amountToLoad).length * 18 }}>
                    <CyDText className='text-[36px] text-p150 font-bold'>
                      {'$'}
                    </CyDText>
                    <CyDTextInput
                      className='text-[36px] text-p150 font-bold w-[90%]'
                      keyboardType={'number-pad'}
                      value={amountToLoad}
                      onChangeText={value => {
                        setAmountToLoad(value);
                      }}
                    />
                  </CyDView>
                  <CyDView className='bg-n40 p-[4px] rounded-[25px]'>
                    <CyDMaterialDesignIcons
                      name='pencil-outline'
                      size={18}
                      className='text-base400'
                    />
                  </CyDView>
                </CyDView>
              </CyDView>
              <CyDView className='mt-[16px]'>
                <CyDText>Auto Load using:</CyDText>
                <CyDView className='flex flex-row justify-between items-center mt-[6px]'>
                  <CyDView className='flex flex-row items-center'>
                    <CyDImage
                      source={{ uri: selectedToken?.logoUrl ?? '' }}
                      className='h-[18px] w-[18px]'
                      resizeMode='contain'
                    />
                    <CyDText className='font-bold ml-[4px] text-[16px]'>
                      {selectedToken?.name}
                    </CyDText>
                  </CyDView>
                  <CyDTouchView
                    className='flex flex-row items-center ml-[2px] bg-base40 py-[6px] px-[16px] rounded-[14px]'
                    onPress={() => {
                      setIsChooseTokenVisible(true);
                    }}>
                    <CyDText className='font-bold'>
                      {capitalize(selectedToken?.chainDetails?.name) ??
                        'Change'}
                    </CyDText>

                    <CyDMaterialDesignIcons
                      name={'chevron-down'}
                      size={16}
                      className={'text-base400 ml-2'}
                    />
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='bg-n0 py-[22px] px-[16px] rounded-[12px] mx-[16px]'>
            <CyDView className='flex flex-row justify-between items-center'>
              <CyDText className='font-bold text-[16px]'>Set Expiry</CyDText>
              <CyDView>
                <CyDSwitch
                  onValueChange={() => {
                    setAutoLoadExpiry(!autoLoadExpiry);
                  }}
                  value={autoLoadExpiry}
                />
              </CyDView>
            </CyDView>
            {autoLoadExpiry && (
              <CyDView className='flex flex-col pt-[12px] border-t-[1.5px] border-n40 mt-[18px]'>
                <CyDView>
                  <CyDText>Auto load until:</CyDText>
                  <CyDTouchView
                    className='flex flex-row justify-start items-center mt-[2px]'
                    onPress={() => {
                      setIsDatePickerVisible(true);
                    }}>
                    <CyDView className='flex flex-row justify-start items-center border-b-[2px] border-n40 py-[6px]'>
                      <CyDText className='text-[18px] font-bold'>
                        {moment.utc(expiryDate).local().format('MMMM DD, YYYY')}
                      </CyDText>
                    </CyDView>
                    <CyDView className='bg-n20 p-[4px] rounded-[25px] ml-[12px]'>
                      <CyDMaterialDesignIcons
                        name='pencil-outline'
                        size={18}
                        className='text-base400'
                      />
                    </CyDView>
                  </CyDTouchView>
                </CyDView>
                <CyDView className='mt-[16px]'>
                  <CyDText>No.of times to auto load:</CyDText>
                  <CyDView className='flex flex-row justify-start items-center mt-[2px]'>
                    <CyDView
                      className='flex flex-row justify-start items-center border-b-[2px] border-n40 py-[6px]'
                      style={{ width: 65 + String(repeatFor).length * 18 }}>
                      <CyDTextInput
                        className='text-[18px] font-bold w-[90%]'
                        keyboardType={'number-pad'}
                        value={repeatFor}
                        onChangeText={value => {
                          setRepeatFor(value);
                        }}
                      />
                    </CyDView>
                    <CyDView className='bg-n20 p-[4px] rounded-[25px]'>
                      <CyDMaterialDesignIcons
                        name='pencil-outline'
                        size={18}
                        className='text-base400'
                      />
                    </CyDView>
                  </CyDView>
                </CyDView>
              </CyDView>
            )}
          </CyDView>
        </CyDKeyboardAwareScrollView>
        <CyDView className='w-full px-[24px] items-center py-[20px] bg-n20 mb-[20px]'>
          <Button
            type={ButtonType.PRIMARY}
            title={t('PREVIEW')}
            style={'h-[60px] w-full'}
            onPress={() => {
              navigation.navigate(screenTitle.PREVIEW_AUTO_LOAD_SCREEN, {
                threshold,
                amountToLoad,
                autoLoadExpiry,
                selectedToken,
                expiryDate,
                repeatFor,
              });
            }}
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
