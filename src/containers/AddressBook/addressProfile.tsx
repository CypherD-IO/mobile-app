import React, { useContext, useEffect, useState, useMemo } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import AppImages from '../../../assets/images/appImages';
import { copyToClipboard, PortfolioContext } from '../../core/util';
import Accordion from 'react-native-collapsible/Accordion';
import { verticalScale } from 'react-native-size-matters';
import {
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import {
  ChainBackendNames,
  ChainConfigMapping,
  ChainNames,
  CHAIN_ETH,
  EVM_CHAINS_BACKEND_NAMES,
  EVM_CHAINS_FOR_ADDRESS_DIR,
} from '../../constants/server';
import Loading from '../Loading';
import clsx from 'clsx';
import { screenTitle } from '../../constants/index';
import { showToast } from '../utilities/toastUtility';
import { useTranslation } from 'react-i18next';
import ChooseTokenModal from '../../components/v2/chooseTokenModal';
import _ from 'lodash';
import getTransactionType from '../utilities/transactionTypeUtility';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { use } from 'i18next';
import { getContactBookWithMultipleAddress } from '../utilities/contactBookUtility';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';

const AddressProfile = props => {
  const {
    content = {},
    navigation,
    deleteContact,
    chainChoosen = '',
    setAddressText = () => {},
    setIsDropDown = () => {},
  } = props;
  const [activeSections, setActiveSections] = useState([]);
  const [rotateAnimation] = useState(new Animated.Value(0));
  const [contactBook, setContactBook] = useState(content);
  const [fullContactBook, setFullContactBook] = useState({});
  const [contactNames, setContactNames] = useState(Object.keys(content));
  const [loading, setLoading] = useState(false);
  const [chooseTokenModal, setChooseTokenModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState({});
  const [totalHoldings, setTotalHoldings] = useState([]);
  const [tokenData, setTokenData] = useState<any>([]);
  const portfolioState = useContext<any>(PortfolioContext);
  const [navigationPath, setNavigationPath] = useState<string>('');
  const [sendAddress, setSendAddress] = useState<string>('');
  const [nonEOAExists, setNonEOAExists] = useState<boolean>(false);
  const [isRadioButtonPressed, setIsRadioButtonPressed] = useState('');
  const [isEOA, setIsEOA] = useState({});
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchContactBookData = async () => {
      const tempContactBook = await getContactBookWithMultipleAddress();
      if (tempContactBook) {
        setFullContactBook(tempContactBook);
      }
    };
    void fetchContactBookData();
  }, []);

  useEffect(() => {
    const tempContactBook = content;
    let tempContactNames: string[] = [];
    if (EVM_CHAINS_BACKEND_NAMES.includes(chainChoosen)) {
      for (const contact in tempContactBook) {
        let evmExists = false;
        for (const chain in tempContactBook[contact].addresses) {
          if (EVM_CHAINS_FOR_ADDRESS_DIR.includes(chain)) {
            evmExists = true;
          }
        }
        if (evmExists) {
          tempContactNames.push(contact);
        }
      }
    } else {
      tempContactNames = [...Object.keys(tempContactBook)];
    }
    setContactBook(tempContactBook);
    setContactNames(tempContactNames);
    setActiveSections([]);
  }, [content]);

  useMemo(() => {
    const processAddresses = async () => {
      setLoading(true);
      const tempIsEOA: Record<string, boolean> = {};
      const checkFailingAddress: string[] = [];
      for (const name in fullContactBook) {
        for (const chain in fullContactBook[name].addresses) {
          if (
            EVM_CHAINS_FOR_ADDRESS_DIR.includes(chain) &&
            fullContactBook[name].addresses[chain]
          ) {
            try {
              fullContactBook[name].addresses[chain].forEach(
                async (addressToCheck: string) => {
                  if (addressToCheck) {
                    const transactionType =
                      await getTransactionType(addressToCheck);
                    tempIsEOA[addressToCheck] = transactionType === 'EOA';
                    if (!tempIsEOA[addressToCheck] && !nonEOAExists) {
                      setNonEOAExists(true);
                    }
                  }
                },
              );
            } catch (e) {
              const errorObject: { message: string; errorAddress: string } =
                JSON.parse(e as string);
              checkFailingAddress.push(errorObject.errorAddress);
            }
          }
        }
      }
      setIsEOA(tempIsEOA);
      if (checkFailingAddress.length) {
        showModal('state', {
          type: 'error',
          title: t('CANNOT_GETCODE'),
          description:
            t('CANNOT_GETCODE_DESCRIPTION') +
            checkFailingAddress
              .map(failingAddress => formatAddress(failingAddress))
              .join(),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
      setLoading(false);
    };
    if (Object.keys(fullContactBook).length) {
      void processAddresses();
    }
  }, [fullContactBook]);

  useEffect(() => {
    if (
      portfolioState.statePortfolio.tokenPortfolio &&
      portfolioState.statePortfolio.tokenPortfolio.totalHoldings
    ) {
      setTotalHoldings(
        portfolioState.statePortfolio.tokenPortfolio.totalHoldings,
      );
    }
  }, [portfolioState.statePortfolio.tokenPortfolio]);

  useEffect(() => {
    if (!_.isEmpty(selectedChain)) {
      const oldTokenholding =
        portfolioState.statePortfolio.tokenPortfolio.totalHoldings;
      const newTotalHolding: any = [];
      for (let i = 0; i < oldTokenholding.length; i++) {
        if (
          selectedChain.backendName === CHAIN_ETH.backendName &&
          EVM_CHAINS_BACKEND_NAMES.includes(
            oldTokenholding[i].chainDetails.backendName,
          )
        ) {
          newTotalHolding.push(oldTokenholding[i]);
        } else if (
          oldTokenholding[i].chainDetails.backendName ===
          selectedChain.backendName
        ) {
          newTotalHolding.push(oldTokenholding[i]);
        }
      }
      if (newTotalHolding) {
        setTotalHoldings(newTotalHolding);
      }
    }
  }, [selectedChain]);

  const interpolateRotating = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const animatedStyle = {
    transform: [
      {
        rotate: interpolateRotating,
      },
    ],
    height: verticalScale(18),
    width: 14,
    resizeMode: 'contain',
  };

  const handleAnimation = (toValue: number) => {
    Animated.timing(rotateAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const setSections = sections => {
    setActiveSections(sections.includes(undefined) ? [] : sections);
    if (sections.length) handleAnimation(1);
    else handleAnimation(0);
  };

  const formatAddress = (address: string) => {
    return (
      address.substring(0, 8) + '....' + address.substring(address.length - 8)
    );
  };

  const formatName = (contactName: string) => {
    const result = contactName.match(/.{1,20}/g) ?? [];
    return result;
  };

  const RenderIcon = ({ contact }) => {
    let numberOfIcons = 0;
    if (contact.name.length > 15 && Object.keys(contact.addresses).length > 3) {
      numberOfIcons = 3;
    } else if (
      contact.name.length > 7 &&
      Object.keys(contact.addresses).length > 5
    ) {
      numberOfIcons = 5;
    } else {
      numberOfIcons = 6;
    }
    return (
      <CyDView className={'flex flex-row'}>
        <CyDView className={'flex flex-row'}>
          {Object.keys(contact.addresses)
            .slice(0, numberOfIcons)
            .map((chain, index) => {
              return (
                <CyDView
                  className={`p-[5px] rounded-[30px] bg-${chain} ml-[-7px]`}
                  key={index}>
                  <CyDImage
                    source={ChainConfigMapping[chain].logo_url}
                    className={'h-[20px] w-[20px]'}
                    resizeMode='contain'
                  />
                </CyDView>
              );
            })}
        </CyDView>
        {Object.keys(contact.addresses).length - numberOfIcons > 0 ? (
          <CyDView className={'p-[5px] rounded-[30px] ml-[-7px]'}>
            <CyDText>
              {'+' + (Object.keys(contact.addresses).length - 3).toString()}
            </CyDText>
          </CyDView>
        ) : null}
      </CyDView>
    );
  };

  const renderHeader = (name: string, index: number, isActive: boolean) => {
    return (
      <CyDView
        className={clsx(
          'flex flex-row justify-between items-center w-[100%] py-[12px]',
          { 'border-b-[1px] border-sepratorColor': isActive },
        )}
        key={index}>
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDImage
            source={
              AppImages[`ADDRESS_PROFILE_${contactBook[name].imageProfile}`]
            }
            className='h-[30px] w-[30px]'
            resizeMode='contain'
          />
          <CyDText className='ml-[10px] text-[16px] font-bold'>
            {formatName(contactBook[name].name).join('\n')}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center'>
          {isActive && !chainChoosen ? (
            <CyDView className='flex flex-row'>
              <CyDTouchView
                onPress={() => {
                  navigation.navigate(screenTitle.CREATE_CONTACT, {
                    editContact: true,
                    editContactName: name,
                    contactBook,
                  });
                }}>
                <CyDImage
                  source={AppImages.EDIT}
                  className={'w-[20px] h-[20px] mr-[15px]'}
                  resizeMode='contain'
                />
              </CyDTouchView>
              <CyDTouchView
                onPress={() => {
                  deleteContact(name);
                }}>
                <CyDImage
                  source={AppImages.DELETE}
                  className={'w-[18px] h-[18px] mr-[15px]'}
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
          ) : null}
          {!isActive ? (
            <CyDView className='flex flex-row mr-[5px]'>
              <RenderIcon contact={contactBook[name]} />
            </CyDView>
          ) : null}
          <Animated.Image
            style={isActive ? animatedStyle : ''}
            source={AppImages.UP_ARROW}
          />
        </CyDView>
      </CyDView>
    );
  };

  const onChooseToken = (item: any) => {
    navigation.navigate(screenTitle.ENTER_AMOUNT, {
      tokenData: item,
      sendAddress,
    });
  };

  const renderContent = (name: string, index: number, isActive: boolean) => {
    const filteredAddresses = {};

    if (chainChoosen !== '') {
      if (
        EVM_CHAINS_BACKEND_NAMES.includes(chainChoosen) &&
        contactBook[name]
      ) {
        for (const chainName in contactBook[name].addresses) {
          if (EVM_CHAINS_FOR_ADDRESS_DIR.includes(chainName)) {
            filteredAddresses[chainName] =
              contactBook[name].addresses[chainName];
          }
        }
      }
      if (
        EVM_CHAINS_BACKEND_NAMES.includes(chainChoosen) &&
        contactBook[name].addresses[ChainNames[ChainBackendNames.ETH]]
      ) {
        filteredAddresses[ChainNames[ChainBackendNames.ETH]] =
          contactBook[name].addresses[ChainNames[ChainBackendNames.ETH]];
      }
      if (contactBook[name].addresses[ChainNames[chainChoosen]]) {
        filteredAddresses[ChainNames[chainChoosen]] =
          contactBook[name].addresses[ChainNames[chainChoosen]];
      }
    }
    return (
      <CyDView className='py-[15px]' key={index}>
        <ChooseTokenModal
          isChooseTokenModalVisible={chooseTokenModal}
          tokenList={totalHoldings.length ? totalHoldings : []}
          onSelectingToken={token => {
            setChooseTokenModal(false);
            onChooseToken(token);
          }}
          onCancel={() => {
            setChooseTokenModal(false);
          }}
        />

        {Object.keys(
          chainChoosen !== '' ? filteredAddresses : contactBook[name].addresses,
        ).map(chain => {
          const {
            logo_url: logoUrl,
            symbol,
            backendName,
          } = ChainConfigMapping[chain];
          const addresses = chainChoosen
            ? contactBook[name].addresses[ChainNames[backendName]]
            : contactBook[name].addresses[chain];
          return addresses.map((address: string, index: number) => {
            let addressIsEOA;
            if (
              EVM_CHAINS_FOR_ADDRESS_DIR.includes(chain) &&
              Object.keys(isEOA).length
            ) {
              addressIsEOA = isEOA[address];
            } else {
              addressIsEOA = true;
            }
            return (
              <CyDView key={`${index}-${address}`}>
                {address ? (
                  !chainChoosen ? (
                    <CyDView
                      className='flex flex-row justify-between items-center py-[10px]'
                      key={`${index}-${address}`}>
                      <CyDView className='flex flex-row flex-wrap justify-start items-center w-[80%]'>
                        <CyDView
                          className={`p-[5px] rounded-[30px] bg-${chain} ${addressIsEOA ? '' : 'border border-blue-500'}`}>
                          <CyDImage
                            source={logoUrl}
                            className='h-[20px] w-[20px]'
                            resizeMode='contain'
                          />
                        </CyDView>
                        <CyDText className='ml-[10px] font-bold'>
                          {symbol}
                        </CyDText>
                        <CyDText className='ml-[5px]'>
                          {formatAddress(address)}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex flex-row justify-between items-center'>
                        <CyDTouchView
                          onPress={() => {
                            setSelectedChain(ChainConfigMapping[chain]);
                            setChooseTokenModal(true);
                            setSendAddress(address);
                          }}>
                          <CyDImage
                            source={AppImages.SEND}
                            className='h-[25px] w-[25px] mr-[15px]'
                            resizeMode='contain'
                          />
                        </CyDTouchView>
                        <CyDTouchView
                          onPress={() => {
                            copyToClipboard(address);
                            showToast(
                              `${chain} ${t('ADDRESS_COPY_ALL_SMALL')}`,
                            );
                          }}>
                          <CyDImage
                            source={AppImages.COPY}
                            className='h-[15px] w-[15px] mr-[10px]'
                            resizeMode='contain'
                          />
                        </CyDTouchView>
                      </CyDView>
                    </CyDView>
                  ) : (
                    <CyDTouchView
                      className='flex flex-row justify-between items-center py-[10px]'
                      key={`${index}-${address}`}
                      onPress={() => {
                        setIsRadioButtonPressed(name.concat(backendName));
                        setAddressText(address);
                        setIsDropDown(false);
                        void intercomAnalyticsLog('sendto_search_address_used');
                      }}>
                      <CyDView className='flex flex-row flex-wrap justify-start items-center w-[80%]'>
                        <CyDView
                          className={`p-[5px] rounded-[30px] bg-${chain} ${addressIsEOA ? '' : 'border border-blue-500'}`}>
                          <CyDImage
                            source={logoUrl}
                            className='h-[20px] w-[20px]'
                            resizeMode='contain'
                          />
                        </CyDView>
                        <CyDText className='ml-[10px] font-bold'>
                          {symbol}
                        </CyDText>
                        <CyDText className='ml-[5px]'>
                          {formatAddress(address)}
                        </CyDText>
                      </CyDView>
                      <CyDImage
                        source={
                          isRadioButtonPressed === name.concat(backendName)
                            ? AppImages.RADIO_BUTTON_SELECTED
                            : AppImages.RADIO_BUTTON_UNSELECTED
                        }
                        className={'w-[24px] h-[24px] mr-[10px]'}
                        resizeMode='contain'
                      />
                    </CyDTouchView>
                  )
                ) : null}
              </CyDView>
            );
          });
        })}
      </CyDView>
    );
  };

  return loading ? (
    <Loading />
  ) : (
    <CyDView className='mt-[30px]'>
      {nonEOAExists ? (
        <CyDView className='mx-[15px] mt-[10px]'>
          <CyDText className='text-blue-500 text-[10px] text-center'>
            {t('BLUE_CIRCLE_CONTRACT_ADDRESS_INFO')}
          </CyDText>
        </CyDView>
      ) : null}
      <CyDScrollView>
        <Accordion
          align='bottom'
          activeSections={activeSections}
          sections={contactNames}
          touchableComponent={TouchableOpacity}
          expandMultiple={true}
          renderHeader={renderHeader}
          renderContent={renderContent}
          duration={400}
          onChange={setSections}
          renderAsFlatList={false}
          sectionContainerStyle={
            chainChoosen
              ? styles.sectionContainerSendTo
              : styles.sectionContainer
          }
        />
      </CyDScrollView>
    </CyDView>
  );
};

export default AddressProfile;

const styles = StyleSheet.create({
  sectionContainerSendTo: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: Colors.sepratorColor,
    borderRadius: 16,
    paddingHorizontal: 10,
    marginVertical: 10,
    width: '95%',
    marginLeft: '2.5%',
  },
  sectionContainer: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: Colors.sepratorColor,
    borderRadius: 16,
    paddingHorizontal: 10,
    marginVertical: 10,
  },
});
