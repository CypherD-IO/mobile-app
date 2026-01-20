import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/v2/button';
import {
  ALL_CHAINS,
  ChainNames,
  QRScannerScreens,
} from '../../constants/server';
import {
  generateRandomInt,
  isEthereumAddress,
  extractAddressFromURI,
} from '../../core/util';
import {
  CyDView,
  CyDText,
  CyDScrollView,
  CyDTextInput,
  CyDTouchView,
  CyDFastImage,
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { Formik } from 'formik';
import * as yup from 'yup';
import clsx from 'clsx';
import { setContactBookData } from '../../core/asyncStorage';
import { isCosmosAddress } from '../utilities/cosmosSendUtility';
import { isOsmosisAddress } from '../utilities/osmosisSendUtility';
import { isNobleAddress } from '../utilities/nobleSendUtility';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { ContactInfo } from '../../models/contactInfo.interface';
import { screenTitle } from '../../constants';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import { BackHandler } from 'react-native';
import ChooseContactModal from '../../components/v2/chooseContactModal';
import {
  Contact,
  getContactBookWithMultipleAddress,
} from '../utilities/contactBookUtility';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';
import { showToast } from '../utilities/toastUtility';
import { isCoreumAddress } from '../utilities/coreumUtilities';
import { isInjectiveAddress } from '../utilities/injectiveUtilities';
import { isSolanaAddress } from '../utilities/solanaUtilities';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import PageHeader from '../../components/PageHeader';

interface RouteParams {
  editContact: boolean;
  editContactName: string;
  contactBook: {};
  additionalAddress: {
    chain: string;
    toAddress: string;
  };
}
export const CreateContact = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const editContact = route.params ? route.params.editContact : false;
  const editContactName = route.params ? route.params.editContactName : '';
  const additionalAddress =
    route.params && route.params.additionalAddress
    ? route.params.additionalAddress
    : { chain: '', toAddress: '' };
  const [contactBook, setContactBook] = useState(
    route.params?.contactBook ? route.params?.contactBook : {},
  );
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const [chooseChainModalVisible, setChooseChainModalVisible] = useState(false);
  const [chooseContactModalVisible, setChooseContactModalVisible] =
    useState(false);
  const [editContactInfo, setEditContactInfo] = useState<ContactInfo>({
    name: '',
  });

  const [createContactInfo, setCreateContactInfo] = useState<ContactInfo>({
    name: '',
    ethereum: [''],
  });

  const labels = {
    name: {
      label: t('NAME').toUpperCase(),
      placeHolder: t('ADD_NAME'),
      logo: null,
    },
    ethereum: {
      label: t(`${ChainNames.ETH.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.ETHEREUM,
    },
    cosmos: {
      label: t(`${ChainNames.COSMOS.toUpperCase()} ADDRESS`),
      placeHolder: t('COSMOS_ADDRESS_PLACEHOLDER'),
      logo: AppImages.COSMOS_LOGO,
    },
    osmosis: {
      label: t(`${ChainNames.OSMOSIS.toUpperCase()} ADDRESS`),
      placeHolder: t('OSMOSIS_ADDRESS_PLACEHOLDER'),
      logo: AppImages.OSMOSIS_LOGO,
    },
    noble: {
      label: t(`${ChainNames.NOBLE.toUpperCase()} ADDRESS`),
      placeHolder: t('NOBLE_ADDRESS_PLACEHOLDER'),
      logo: AppImages.NOBLE_LOGO,
    },
    binance: {
      label: t(`${ChainNames.BSC.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.BINANCE,
    },
    polygon: {
      label: t(`${ChainNames.POLYGON.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.POLYGON,
    },
    avalanche: {
      label: t(`${ChainNames.AVALANCHE.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.AVALANCHE,
    },
    optimism: {
      label: t(`${ChainNames.OPTIMISM.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.OPTIMISM,
    },
    arbitrum: {
      label: t(`${ChainNames.ARBITRUM.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.ARBITRUM,
    },
    zksync_era: {
      label: t(`${ChainNames.ZKSYNC_ERA.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.ZKSYNC_ERA_LOGO,
    },
    base: {
      label: t(`${ChainNames.BASE.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.BASE_LOGO,
    },
    coreum: {
      label: t(`${ChainNames.COREUM.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.COREUM_LOGO,
    },
    injective: {
      label: t(`${ChainNames.INJECTIVE.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.INJECTIVE_LOGO,
    },
    solana: {
      label: t(`${ChainNames.SOLANA.toUpperCase()} ADDRESS`),
      placeHolder: t('ETHEREUM_ADDRESS_PLACEHOLDER'),
      logo: AppImages.SOLANA_LOGO,
    },
  };

  const validateAddress = (
    address: string | undefined,
    validator: (addr: string) => boolean,
  ) => {
    if (address && address !== '') return validator(address);
    return true;
  };

  const checkForDuplicates = (
    addressList: Array<string | undefined> | undefined,
  ) => {
    if (addressList === undefined) {
      return true;
    } else {
      const emptyFieldCount = addressList.filter(
        address => address === undefined,
      ).length;
      if (emptyFieldCount) {
        return true;
      }
      return (
        addressList.length > 0 &&
        new Set(addressList).size === addressList.length
      );
    }
  };

  const contactInfoValidationScheme = yup.object({
    name: yup
      .string()
      .required(t('NAME_REQUIRED'))
      .test('isValidName', t('NAME_ALREADY_EXISTS'), name => {
        if (Object.keys(contactBook).includes(String(name)) && !editContact)
          return false;
        return true;
      }),
    ethereum: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), eth =>
            validateAddress(eth, isEthereumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    cosmos: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), cosmos =>
            validateAddress(cosmos, isCosmosAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    osmosis: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), osmosis =>
            validateAddress(osmosis, isOsmosisAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    noble: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), noble =>
            validateAddress(noble, isNobleAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    coreum: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), coreum =>
            validateAddress(coreum, isCoreumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    injective: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), injective =>
            validateAddress(injective, isInjectiveAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    binance: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), binance =>
            validateAddress(binance, isEthereumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    polygon: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), polygon =>
            validateAddress(polygon, isEthereumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    avalanche: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), avalanche =>
            validateAddress(avalanche, isEthereumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    optimism: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), optimism =>
            validateAddress(optimism, isEthereumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    arbitrum: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), arbitrum =>
            validateAddress(arbitrum, isEthereumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    zksync_era: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), zksync_era =>
            validateAddress(zksync_era, isEthereumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    base: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), base =>
            validateAddress(base, isEthereumAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
    solana: yup
      .array()
      .of(
        yup
          .string()
          .test('isValidAddress', t('INVALID_ADDRESS'), solana =>
            validateAddress(solana, isSolanaAddress),
          ),
      )
      .test('isDuplicate', t('DUPLICATE_FOUND'), addressList =>
        checkForDuplicates(addressList),
      ),
  });

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (editContact) {
      const tempContactInfo = editContactInfo;
      const contactToEdit = contactBook[editContactName];
      tempContactInfo.name = contactToEdit.name;
      for (const address of Object.keys(contactToEdit.addresses)) {
        tempContactInfo[address] = contactToEdit.addresses[address];
      }
      setEditContactInfo(tempContactInfo);
      if (additionalAddress.chain !== '' && additionalAddress.toAddress !== '') {
        const additionalAddressesChain = contactBook[editContactName].addresses[
          additionalAddress.chain
        ]
          ? [
              ...contactBook[editContactName].addresses[
                additionalAddress.chain
              ],
              additionalAddress.toAddress,
            ]
          : [additionalAddress.toAddress];
        setEditContactInfo(ec => ({
          ...ec,
          [additionalAddress.chain]: additionalAddressesChain,
        }));
      }
    }
    void fetchContactBookData();
  }, [additionalAddress]);

  useEffect(() => {
    if (additionalAddress.chain !== '' && additionalAddress.toAddress !== '') {
      setCreateContactInfo({
        name: '',
        [additionalAddress.chain]: [additionalAddress.toAddress],
      });
    }
  }, [additionalAddress]);

  const fetchContactBookData = async () => {
    const tempContactBook: Record<string, Contact> =
      await getContactBookWithMultipleAddress();
    if (tempContactBook) {
      setContactBook(tempContactBook);
    }
  };

  const onSubmitContact = async (contact: ContactInfo) => {
    setLoading(true);
    const filteredContactDetails = Object.fromEntries(
      Object.entries(contact).filter(([key, value]) => value !== ''),
    );
    const contactDetails = {
      name: filteredContactDetails.name,
      imageProfile: generateRandomInt(1, 4).toString(),
      addresses: {},
    };
    delete filteredContactDetails.name;
    if (Object.keys(filteredContactDetails).length) {
      const filteredContactDetailsWithoutEmptyAddresses: Record<
        string,
        string[]
      > = {};
      for (const chain in filteredContactDetails) {
        const emptyStringsRemoved = filteredContactDetails[chain].filter(
          (address: string) => address !== '',
        );
        if (emptyStringsRemoved.length) {
          filteredContactDetailsWithoutEmptyAddresses[chain] =
            emptyStringsRemoved;
        }
      }
      if (Object.keys(filteredContactDetailsWithoutEmptyAddresses).length) {
        contactDetails.addresses = filteredContactDetailsWithoutEmptyAddresses;
        if (editContact) {
          delete contactBook[editContactName];
        }
        if (contactBook && !contactBook[contactDetails.name]) {
          contactBook[contactDetails.name] = contactDetails;
          await setContactBookData(contactBook);
          setLoading(false);
          showToast(
            `${contactDetails.name} ${t('SAVED_TO_CONTACTS_ALL_SMALL')}`,
          );
          if (additionalAddress.chain !== '' && additionalAddress.toAddress !== '') {
            navigation.popToTop();
            navigation.navigate(screenTitle.ACTIVITIES);
          } else {
            navigation.navigate(screenTitle.MY_ADDRESS, { indexValue: 1 });
          }
        }
      } else {
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: t('ADDRESS_REQUIRED'),
          description: t('ADD_ATLEAST_ONE_ADDRESS'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: t('ADDRESS_REQUIRED'),
        description: t('ADD_ATLEAST_ONE_ADDRESS'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const onSuccess = (e: any, formProps, detail, addressIndex) => {
    // Extract address from URI schemes using utility function
    const extractedAddress = extractAddressFromURI(e.data);

    if (!extractedAddress) {
      return;
    }

    const newFieldValue = formProps.values[detail].filter(
      (addressToBeQRd, indexOfAddress) => indexOfAddress !== addressIndex,
    );
    formProps.setFieldValue(`${detail}`, [
      ...newFieldValue.slice(0, addressIndex),
      extractedAddress,
      ...newFieldValue.slice(addressIndex),
    ]);
    formProps.values[detail as keyof ContactInfo][addressIndex] =
      extractedAddress;
  };

  const setChooseChainFunction = ({ item }) => {
    const tempContactInfo = editContact
      ? { ...editContactInfo }
      : { ...createContactInfo };
    if (tempContactInfo[ChainNames[item.backendName]]) {
      tempContactInfo[ChainNames[item.backendName]] = [
        ...tempContactInfo[ChainNames[item.backendName]],
        '',
      ];
    } else {
      tempContactInfo[ChainNames[item.backendName]] = [''];
    }
    editContact
      ? setEditContactInfo(tempContactInfo)
      : setCreateContactInfo(tempContactInfo);
  };

  const handleTextChange = (text, handleChange, detail, addressIndex) => {
    handleChange(detail);
    const tempCreateContactInfo = editContact
      ? { ...editContactInfo }
      : { ...createContactInfo };
    if (detail !== 'name') {
      const updatedAddresses = tempCreateContactInfo[detail].map(
        (unchangedAddress, indexOfAddress) =>
          indexOfAddress !== addressIndex ? unchangedAddress : text,
      );
      tempCreateContactInfo[detail] = updatedAddresses;
    } else {
      tempCreateContactInfo[detail] = text;
    }
    editContact
      ? setEditContactInfo(tempCreateContactInfo)
      : setCreateContactInfo(tempCreateContactInfo);
  };

  return (
    <CyDSafeAreaView className={'bg-n0 flex-1'} edges={['top']}>
      <ChooseChainModal
        setModalVisible={setChooseChainModalVisible}
        isModalVisible={chooseChainModalVisible}
        data={ALL_CHAINS}
        title={'Choose Chain'}
        selectedItem={''}
        onPress={setChooseChainFunction}
      />
      <ChooseContactModal
        isChooseContactModalVisible={chooseContactModalVisible}
        onSelectingContact={(contact: {
          name: string;
          addresses: Object;
          imageProfile: string;
        }) => {
          setChooseContactModalVisible(false);
          navigation.push(screenTitle.CREATE_CONTACT, {
            editContact: true,
            editContactName: contact.name,
            contactBook,
            ...(additionalAddress.chain !== '' && additionalAddress.toAddress !== '' ? { additionalAddress } : {}),          });
        }}
        onCancel={() => {
          setChooseContactModalVisible(false);
        }}
      />
      <Formik
        enableReinitialize={true}
        initialValues={editContact ? editContactInfo : createContactInfo}
        validationSchema={contactInfoValidationScheme}
        onSubmit={async values => await onSubmitContact(values)}>
        {formProps => (
          <CyDView className='flex flex-1'>
            <PageHeader title={'CREATE_NEW_CONTACT'} navigation={navigation} />
            <CyDView className='flex flex-1 h-full bg-n20'>
              <CyDScrollView className='flex flex-col w-full'>
                <CyDView className='flex flex-1 h-full'>
                  {Object.keys(
                    editContact ? editContactInfo : createContactInfo,
                  ).map((detail, index) => {
                    if (detail === 'name') {
                      return (
                        <CyDView
                          className='flex-1 mt-[25px] self-center w-[87%]'
                          key={index}>
                          <CyDView className='flex flex-row justify-start gap-[10px]'>
                            <CyDText className='font-bold '>
                              {labels[detail as keyof ContactInfo].label}
                            </CyDText>
                          </CyDView>
                          <CyDView className='flex flex-row justify-between items-center w-[100%]'>
                            <CyDTextInput
                              className={clsx(
                                'mt-[5px] w-[100%] border-[1px] border-base80 rounded-[10px] p-[12px] pr-[38px] text-[16px]  ',
                                {
                                  'border-redOffColor':
                                    formProps.touched[
                                      detail as keyof ContactInfo
                                    ] &&
                                    formProps.errors[
                                      detail as keyof ContactInfo
                                    ],
                                },
                              )}
                              value={
                                formProps.values[detail as keyof ContactInfo]
                              }
                              autoCapitalize='none'
                              key={index}
                              autoCorrect={false}
                              onChangeText={text => {
                                handleTextChange(
                                  text,
                                  formProps.handleChange,
                                  detail,
                                  0,
                                );
                              }}
                              placeholderTextColor={'#C5C5C5'}
                              placeholder={
                                labels[detail as keyof ContactInfo].placeHolder
                              }
                            />
                            {formProps.values[detail as keyof ContactInfo] !==
                            '' ? (
                              <CyDTouchView
                                className='left-[-32px]'
                                onPress={() => {
                                  formProps.setFieldValue(`${detail}`, '');
                                }}>
                                <CyDMaterialDesignIcons
                                  name={'close'}
                                  size={24}
                                  className='text-base400'
                                />
                              </CyDTouchView>
                            ) : (
                              <></>
                            )}
                          </CyDView>
                          {formProps.touched[detail as keyof ContactInfo] &&
                            formProps.errors[detail as keyof ContactInfo] && (
                              <CyDView
                                className={'ml-[5px] mt-[6px] mb-[-11px]'}>
                                <CyDText
                                  className={'text-redOffColor font-semibold'}>
                                  {
                                    formProps.errors[
                                      detail as keyof ContactInfo
                                    ]
                                  }
                                </CyDText>
                              </CyDView>
                            )}
                        </CyDView>
                      );
                    } else {
                      return (
                        editContact ? editContactInfo : createContactInfo
                      )[detail].map((oneAddress, addressIndex) => {
                        if (!formProps.values[detail as keyof ContactInfo]) {
                          return null;
                        }
                        return (
                          <CyDView
                            className='flex-1 mt-[25px] self-center w-[87%]'
                            key={`${index}-${addressIndex}`}>
                            <CyDView className='flex flex-row justify-start gap-[10px]'>
                              <CyDFastImage
                                source={
                                  labels[detail as keyof ContactInfo].logo
                                }
                                className='h-[18px] w-[18px]'
                                resizeMode='contain'
                              />
                              <CyDText className='font-bold '>
                                {labels[detail as keyof ContactInfo].label}
                              </CyDText>
                            </CyDView>
                            <CyDView className='flex flex-row justify-between items-center w-[100%]'>
                              <CyDTextInput
                                className={clsx(
                                  'mt-[5px] w-[100%] border-[1px] border-base80 rounded-[10px] p-[12px] pr-[38px] text-[16px]',
                                  {
                                    'border-redOffColor':
                                      formProps.touched[
                                        detail as keyof ContactInfo
                                      ] &&
                                      formProps.errors[
                                        detail as keyof ContactInfo
                                      ] &&
                                      formProps.touched[
                                        detail as keyof ContactInfo
                                      ][addressIndex] &&
                                      formProps.errors[
                                        detail as keyof ContactInfo
                                      ][addressIndex],
                                  },
                                )}
                                value={
                                  formProps.values[detail as keyof ContactInfo][
                                    addressIndex
                                  ]
                                }
                                autoCapitalize='none'
                                key={`${index}-${addressIndex}`}
                                autoCorrect={false}
                                onChangeText={text => {
                                  handleTextChange(
                                    text,
                                    formProps.handleChange,
                                    detail,
                                    addressIndex,
                                  );
                                }}
                                placeholderTextColor={'#C5C5C5'}
                                placeholder={
                                  labels[detail as keyof ContactInfo]
                                    .placeHolder
                                }
                              />
                              {formProps.values[detail as keyof ContactInfo][
                                addressIndex
                              ] === '' ? (
                                <CyDTouchView
                                  className='left-[-32px]'
                                  onPress={() => {
                                    navigation.navigate(
                                      screenTitle.QR_CODE_SCANNER,
                                      {
                                        fromPage: QRScannerScreens.SEND,
                                        onSuccess: e => {
                                          onSuccess(
                                            e,
                                            formProps,
                                            detail,
                                            addressIndex,
                                          );
                                        },
                                      },
                                    );
                                  }}>
                                  <CyDIcons
                                    name={'qr-scanner'}
                                    size={28}
                                    className='text-base400'
                                  />
                                </CyDTouchView>
                              ) : (
                                <CyDTouchView
                                  className='left-[-32px]'
                                  onPress={() => {
                                    const newFieldValue = formProps.values[
                                      detail
                                    ].filter(
                                      (addressToBeRemoved, indexOfAddress) =>
                                        indexOfAddress !== addressIndex,
                                    );
                                    formProps.setFieldValue(`${detail}`, [
                                      ...newFieldValue.slice(0, addressIndex),
                                      '',
                                      ...newFieldValue.slice(addressIndex),
                                    ]);
                                    formProps.values[
                                      detail as keyof ContactInfo
                                    ][addressIndex] = '';
                                  }}>
                                  <CyDMaterialDesignIcons
                                    name={'close'}
                                    size={24}
                                    className='text-base400'
                                  />
                                </CyDTouchView>
                              )}
                            </CyDView>
                            {formProps.touched[detail as keyof ContactInfo] &&
                              formProps.errors[detail as keyof ContactInfo] &&
                              formProps.touched[detail as keyof ContactInfo][
                                addressIndex
                              ] &&
                              formProps.errors[detail as keyof ContactInfo][
                                addressIndex
                              ] && (
                                <CyDView
                                  className={'ml-[5px] mt-[6px] mb-[-11px]'}>
                                  <CyDText
                                    className={
                                      'text-redOffColor font-semibold'
                                    }>
                                    {formProps.errors[
                                      detail as keyof ContactInfo
                                    ][addressIndex].length !== 1
                                      ? formProps.errors[
                                          detail as keyof ContactInfo
                                        ][addressIndex]
                                      : formProps.errors[
                                          detail as keyof ContactInfo
                                        ]}
                                  </CyDText>
                                </CyDView>
                              )}
                          </CyDView>
                        );
                      });
                    }
                  })}
                </CyDView>
                <CyDView
                  className={
                    'flex flex-row w-[87%] self-center justify-between'
                  }>
                  <CyDText
                    className={'text-blue-700 font-bold py-[17px]'}
                    onPress={() => {
                      setChooseContactModalVisible(!chooseContactModalVisible);
                    }}>
                    {t('PLUS_ADD_TO_EXISTING_CONTACT')}
                  </CyDText>
                  <CyDText
                    className={'text-blue-700 font-bold py-[17px]'}
                    onPress={() => {
                      setChooseChainModalVisible(!chooseChainModalVisible);
                    }}>
                    {t('PLUS_ADD_ADDRESS')}
                  </CyDText>
                </CyDView>
              </CyDScrollView>
              <CyDView className='w-full px-[24px] items-center mb-[20px]'>
                <Button
                  style='h-[60px] w-[90%]'
                  title={t('SAVE')}
                  loading={loading}
                  onPress={() => {
                    formProps.handleSubmit();
                    void intercomAnalyticsLog('save_or_edit_contact');
                  }}
                />
              </CyDView>
            </CyDView>
          </CyDView>
        )}
      </Formik>
    </CyDSafeAreaView>
  );
};
