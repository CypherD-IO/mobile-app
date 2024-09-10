import clsx from 'clsx';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import {
  CyDFlatList,
  CyDImage,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { useIsFocused } from '@react-navigation/native';
import { ChainConfigMapping } from '../../constants/server';
import { getContactBookWithMultipleAddress } from '../../containers/utilities/contactBookUtility';

interface ContactModalProps {
  isChooseContactModalVisible: boolean;
  onSelectingContact: (token: any) => void;
  onCancel: () => void;
  noContactsAvailableMessage?: string;
}

interface ContactItemProps {
  name: string;
  imageProfile: string;
  addresses: Object;
}

export default function ChooseContactModal(props: ContactModalProps) {
  const { t } = useTranslation();
  const {
    isChooseContactModalVisible,
    onSelectingContact,
    onCancel,
    noContactsAvailableMessage = t<string>('NO_CONTACTS_TEXT'),
  } = props;
  const [searchText, setSearchText] = useState<string>('');
  const [contactBook, setContactBook] = useState({});
  const [filteredContactBook, setFilteredContactBook] = useState({});
  const isFocused = useIsFocused();
  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
  };
  const fuse = new Fuse(Object.keys(contactBook), searchOptions);

  useEffect(() => {
    if (isFocused) {
      void fetchContactBookData();
    }
  }, [isFocused]);

  const fetchContactBookData = async () => {
    const tempContactBook = await getContactBookWithMultipleAddress();
    if (tempContactBook) {
      setContactBook(tempContactBook);
      setFilteredContactBook(tempContactBook);
    }
  };

  const searchContacts = (contactName: string) => {
    if (contactName !== '') {
      const contactNames = fuse
        .search(contactName)
        .map(contact => contact.item);
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

  const ContactItem = ({ name, addresses, imageProfile }: ContactItemProps) => {
    const formatName = (contactName: string) => {
      const result = contactName.match(/.{1,20}/g) ?? [];
      return result;
    };

    const RenderIcon = (contact: ContactItemProps) => {
      let numberOfIcons = 0;
      if (
        contact.name.length > 15 &&
        Object.keys(contact.addresses).length > 3
      ) {
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
          {Object.keys(contact.addresses).length - numberOfIcons > 0 && (
            <CyDView className={'p-[5px] rounded-[30px] ml-[-7px]'}>
              <CyDText>
                {'+' + (Object.keys(contact.addresses).length - 3).toString()}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
      );
    };
    return (
      <CyDTouchView
        disabled={Object.values(filteredContactBook).length === 0}
        onPress={() => {
          onSelectingContact({ name, addresses, imageProfile });
        }}
        className={clsx(
          'flex flex-row justify-between border-b-[1px] border-b-sepratorColor mx-[15px]',
          { 'opacity-25': Object.values(filteredContactBook).length === 0 },
        )}>
        <CyDView
          className={clsx(
            'flex flex-row justify-between items-center w-[100%] py-[12px]',
          )}>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDImage
              source={AppImages[`ADDRESS_PROFILE_${imageProfile}`]}
              className='h-[30px] w-[30px]'
              resizeMode='contain'
            />
            <CyDText className='ml-[10px] text-[16px] font-bold'>
              {formatName(name).join('\n')}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView className='flex flex-row mr-[5px]'>
              <RenderIcon
                name={name}
                imageProfile={imageProfile}
                addresses={addresses}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  };

  const clearSearch = () => {
    setSearchText('');
    searchContacts('');
  };

  return (
    <CyDModalLayout
      setModalVisible={() => {}}
      disableBackDropPress={true}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      isModalVisible={isChooseContactModalVisible}
      style={styles.modalContainer}>
      <CyDView
        className={'bg-white pt-[10px] mt-[50px] w-[100%] rounded-t-[20px]'}
        style={{ height: height - 50 }}>
        <CyDTouchView
          className={'flex flex-row justify-end z-10'}
          onPress={() => {
            clearSearch();
            onCancel();
          }}>
          <CyDImage
            source={AppImages.CLOSE}
            className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
          />
        </CyDTouchView>
        <CyDView>
          <CyDText className='text-center  text-[22px] font-extrabold'>
            {t<string>('CHOOSE_CONTACT')}
          </CyDText>
        </CyDView>
        <CyDView className={'mt-[20px] mb-[100px]'}>
          <CyDView
            className={
              'flex flex-row justify-between items-center self-center border-[1px] border-sepratorColor w-[353px] h-[60px] rounded-[30px] px-[20px]'
            }>
            <CyDTextInput
              className={'self-center py-[15px] w-[95%]'}
              value={searchText}
              autoCapitalize='none'
              autoCorrect={false}
              onChangeText={(text: string) => {
                setSearchText(text);
                searchContacts(text);
              }}
              placeholderTextColor={'#C5C5C5'}
              placeholder='Search contact'
            />
            {searchText !== '' ? (
              <CyDTouchView
                onPress={() => {
                  clearSearch();
                }}>
                <CyDImage className={''} source={AppImages.CLOSE_CIRCLE} />
              </CyDTouchView>
            ) : (
              <></>
            )}
          </CyDView>
          {Object.keys(filteredContactBook).length ? (
            <CyDFlatList
              className={'mt-[20px]'}
              data={Object.values(filteredContactBook)}
              renderItem={({
                item,
                index,
              }: {
                item: ContactItemProps;
                index: number;
              }) => (
                <ContactItem
                  key={index}
                  name={item.name}
                  imageProfile={item.imageProfile}
                  addresses={item.addresses}
                />
              )}
              showsVerticalScrollIndicator={true}></CyDFlatList>
          ) : (
            <CyDView className='flex h-full justify-center items-center mt-[-40px]'>
              <CyDText className='px-[25px] text-[18px] text-center font-bold'>
                {noContactsAvailableMessage}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});
