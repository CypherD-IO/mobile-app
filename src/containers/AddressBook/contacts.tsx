import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { screenTitle } from '../../constants';
import {
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import AddressProfile from './addressProfile';
import { setContactBookData } from '../../core/asyncStorage';
import Loading from '../../components/v2/loading';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import clsx from 'clsx';
import Fuse from 'fuse.js';
import { Colors } from '../../constants/theme';
import {
  Contact,
  getContactBookWithMultipleAddress,
} from '../utilities/contactBookUtility';

export function Contacts() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const [name, setName] = useState('');
  const [contactBook, setContactBook] = useState({});
  const [addressDirectory, setAddressDirectory] = useState({});
  const [loading, setLoading] = useState(true);
  const { showModal, hideModal } = useGlobalModalContext();
  const [filteredContactBook, setFilteredContactBook] = useState({});
  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
  };
  const fuseByNames = new Fuse(Object.keys(contactBook), searchOptions);
  const fuseByAddresses = new Fuse(Object.keys(addressDirectory));

  useEffect(() => {
    if (isFocused) {
      void buildAddressDirectory();
    }
  }, [isFocused]);

  const buildAddressDirectory = async () => {
    setLoading(true);
    const tempContactBook: Record<string, Contact> =
      await getContactBookWithMultipleAddress();
    if (tempContactBook) {
      setContactBook(tempContactBook);
      setFilteredContactBook(tempContactBook);
      const tempAddressDirectory: Record<string, string[]> = {};
      for (const contact in tempContactBook) {
        for (const [listOfAddresses] of Object.entries(
          tempContactBook[contact].addresses,
        )) {
          for (const address of listOfAddresses) {
            if (tempAddressDirectory[address]) {
              tempAddressDirectory[address] = [
                ...tempAddressDirectory[address],
                tempContactBook[contact].name,
              ];
            } else {
              tempAddressDirectory[address] = [tempContactBook[contact].name];
            }
          }
        }
        setAddressDirectory(tempAddressDirectory);
      }
    }
    setLoading(false);
  };

  const removeContactFromAsyncStorage = async (contactName: string) => {
    const updatedContactBook = { ...contactBook }; // Created a new object to update state correctly
    delete updatedContactBook[contactName];
    setContactBook(updatedContactBook); // Updated state before setting to AsyncStorage
    hideModal();
    setLoading(true);
    await setContactBookData(updatedContactBook); // Updated state before setting to AsyncStorage
    void buildAddressDirectory();
  };

  const deleteContact = (contactName: string) => {
    showModal('state', {
      type: 'warning',
      title: `${t('DELETE')} ${contactName}`,
      description: `${t('ARE_YOU_SURE_TO_DELETE')} ${contactName} ${t(
        'FROM_YOUR_CONTACTS',
      )} ?`,
      onSuccess: () => {
        void removeContactFromAsyncStorage(contactName);
      },
      onFailure: hideModal,
    });
  };

  const handleSearch = (text: string) => {
    if (text !== '') {
      const contactNamesByNames = fuseByNames
        .search(text)
        .map(contact => contact.item);
      const contactNamesByAddresses: string[] = [];
      fuseByAddresses
        .search(text)
        .map(contact => contact.item)
        .forEach(address => {
          for (const name of addressDirectory[address]) {
            contactNamesByAddresses.push(name);
          }
        });
      const contactNames = [
        ...new Set([...contactNamesByNames, ...contactNamesByAddresses]),
      ];
      const filteredContacts = Object.fromEntries(
        Object.entries(contactBook).filter(([key, value]) =>
          contactNames.includes(key),
        ),
      );
      setFilteredContactBook(filteredContacts);
    } else {
      setFilteredContactBook(contactBook);
    }
  };

  return loading ? (
    <Loading />
  ) : (
    <>
      <CyDScrollView className={'flex flex-col w-[100%]'}>
        <CyDView className={'flex flex-row justify-around mx-[15px]'}>
          <CyDTextInput
            className={clsx(
              ' w-[80%] border-[1px] border-n40 rounded-[8px] p-[12px] pr-[38px] text-[16px] bg-n0',
              { 'border-redOffColor': false },
            )}
            value={name}
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={(value: string) => {
              setName(value);
              handleSearch(value);
            }}
            placeholderTextColor={Colors.placeHolderColor}
            placeholder={t('Search Name')}
          />

          <CyDTouchView
            className='rounded-[8px] w-[55px] h-[60px] bg-n0 flex items-center justify-center border-[1px] border-n40 '
            onPress={() => {
              navigation.navigate(screenTitle.CREATE_CONTACT, { contactBook });
            }}>
            <CyDMaterialDesignIcons
              name={'account-plus'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        <CyDView className='items-center mx-[20px] mt-[-28px]'>
          <AddressProfile
            content={filteredContactBook}
            deleteContact={deleteContact}
            navigation={navigation}
          />
        </CyDView>
      </CyDScrollView>
    </>
  );
}
