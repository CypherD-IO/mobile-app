import React, { useContext, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDScrollView,
  CyDSwitch,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
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
import ChooseTokenModal from '../../../components/v2/chooseTokenModal';
import DatePickerModal from 'react-native-modal-datetime-picker';
import Button from '../../../components/v2/button';
import { ButtonType } from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { EVM_CHAINS_TYPE } from '../../../constants/type';
import { map } from 'lodash';
import usePortfolio from '../../../hooks/usePortfolio';

export default function AutoLoad({ navigation }: { navigation: any }) {
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
  }, []);

  useEffect(() => {
    void getSupportedTokens();
  }, []);

  const getSupportedTokens = async () => {
    const localPortfolio = await getLocalPortfolio();
    const totalHoldings = localPortfolio.totalHoldings;
    const tempSupportedTokens = totalHoldings.filter(token => {
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
      const { chain, assetId, threshold, amountToBeLoaded, expiry, repeatFor } =
        response.data;
      const tempSelectedToken = supportedTokens?.find(
        (token: Holding) =>
          token.chainDetails.backendName === chain && token.denom === assetId,
      );
      if (tempSelectedToken) {
        setSelectedToken(tempSelectedToken);
        setThreshold(String(threshold));
        setAmountToLoad(String(amountToBeLoaded));
        setExpiryDate(expiry);
        setRepeatFor(repeatFor);
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
    <CyDScrollView className='flex-1'>
      <CyDKeyboardAwareScrollView>
        <ChooseTokenModal
          isChooseTokenModalVisible={isChooseTokenVisible}
          tokenList={supportedTokens}
          minTokenValueLimit={0}
          onSelectingToken={token => {
            setIsChooseTokenVisible(false);
            setSelectedToken(token as Holding);
          }}
          onCancel={() => {
            setIsChooseTokenVisible(false);
          }}
          noTokensAvailableMessage={t<string>('CARD_INSUFFICIENT_FUNDS')}
          renderPage={'autoLoad'}
        />
        <DatePickerModal
          isVisible={isDatePickerVisible}
          mode='date'
          date={new Date(expiryDate)}
          onConfirm={(date: Date) => onConfirmDate(date)}
          onCancel={() => setIsDatePickerVisible(false)}
        />
        <CyDView className='bg-white py-[22px] px-[16px]'>
          <CyDView className='flex flex-row justify-start border-[1px] border-sepratorColor rounded-[12px] py-[12px] px-[12px]'>
            <CyDView className='self-end'>
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
        <CyDView className='flex flex-col bg-white my-[14px] mx-[16px] rounded-[12px]'>
          <CyDView className='flex flex-col p-[16px]'>
            <CyDText>When the balance falls below:</CyDText>
            <CyDView className='flex flex-row justify-start items-center mt-[8px]'>
              <CyDView
                className='flex flex-row justify-start items-center border-b-[2px] border-sepratorColor py-[6px]'
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
              <CyDView className='bg-cardBg p-[4px] rounded-[25px]'>
                <CyDImage
                  source={AppImages.EDIT}
                  className='h-[18px] w-[18px]'
                  resizeMode='contain'
                />
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='flex flex-col p-[16px]'>
            <CyDView className='flex flex-col pb-[32px] border-b-[1px] border-sepratorColor'>
              <CyDText>Automatically top up:</CyDText>
              <CyDView className='flex flex-row justify-start items-center mt-[8px]'>
                <CyDView
                  className='flex flex-row justify-start items-center border-b-[2px] border-sepratorColor py-[6px]'
                  style={{ width: 65 + String(amountToLoad).length * 18 }}>
                  <CyDText className='text-[36px] text-mandarin font-bold'>
                    {'$'}
                  </CyDText>
                  <CyDTextInput
                    className='text-[36px] text-mandarin font-bold w-[90%]'
                    keyboardType={'number-pad'}
                    value={amountToLoad}
                    onChangeText={value => {
                      setAmountToLoad(value);
                    }}
                  />
                </CyDView>
                <CyDView className='bg-cardBg p-[4px] rounded-[25px]'>
                  <CyDImage
                    source={AppImages.EDIT}
                    className='h-[18px] w-[18px]'
                    resizeMode='contain'
                  />
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='mt-[16px]'>
              <CyDText>Auto Load using:</CyDText>
              <CyDView className='flex flex-row justify-between items-center mt-[6px]'>
                <CyDView className='flex flex-row items-center'>
                  <CyDImage
                    source={{ uri: selectedToken?.logoUrl }}
                    className='h-[18px] w-[18px]'
                    resizeMode='contain'
                  />
                  <CyDText className='font-bold ml-[4px] text-[16px]'>
                    {selectedToken?.name}
                  </CyDText>
                </CyDView>
                <CyDTouchView
                  className='flex flex-row items-center ml-[2px] bg-cardBg py-[6px] px-[16px] rounded-[14px]'
                  onPress={() => {
                    setIsChooseTokenVisible(true);
                  }}>
                  <CyDText className='font-bold'>Change</CyDText>
                  <CyDImage
                    source={AppImages.DOWN_ARROW}
                    className='h-[15px] w-[12px] ml-[4px]'
                    resizeMode='contain'
                  />
                </CyDTouchView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='bg-white py-[22px] px-[16px] rounded-[12px] mx-[16px]'>
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
            <CyDView className='flex flex-col pt-[12px] border-t-[1.5px] border-sepratorColor mt-[18px]'>
              <CyDView>
                <CyDText>Auto load until:</CyDText>
                <CyDTouchView
                  className='flex flex-row justify-start items-center mt-[2px]'
                  onPress={() => {
                    setIsDatePickerVisible(true);
                  }}>
                  <CyDView className='flex flex-row justify-start items-center border-b-[2px] border-sepratorColor py-[6px]'>
                    <CyDText className='text-[18px] font-bold'>
                      {moment.utc(expiryDate).local().format('MMMM DD, YYYY')}
                    </CyDText>
                  </CyDView>
                  <CyDView className='bg-cardBg p-[4px] rounded-[25px] ml-[12px]'>
                    <CyDImage
                      source={AppImages.EDIT}
                      className='h-[18px] w-[18px]'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDTouchView>
              </CyDView>
              <CyDView className='mt-[16px]'>
                <CyDText>No.of times to auto load:</CyDText>
                <CyDView className='flex flex-row justify-start items-center mt-[2px]'>
                  <CyDView
                    className='flex flex-row justify-start items-center border-b-[2px] border-sepratorColor py-[6px]'
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
                  <CyDView className='bg-cardBg p-[4px] rounded-[25px]'>
                    <CyDImage
                      source={AppImages.EDIT}
                      className='h-[18px] w-[18px]'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          )}
        </CyDView>
        <Button
          type={ButtonType.PRIMARY}
          title={t('PREVIEW')}
          style={'mx-[16px] h-[54px] mt-[16px]'}
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
      </CyDKeyboardAwareScrollView>
    </CyDScrollView>
  );
}
