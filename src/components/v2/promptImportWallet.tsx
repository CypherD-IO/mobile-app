import { get } from 'lodash';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { ButtonType } from '../../constants/enum';
import Login from '../../containers/Auth/EnterKey';
import { HdWalletContext } from '../../core/util';
import { PromptImportWalletDef } from '../../models/globalModal.interface';
import {
  CyDIcons,
  CyDImage,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import Button from './button';
import Loading from './loading';
import CyDModalLayout from './modal';

const PromptImportWallet: React.FC<PromptImportWalletDef> = (
  store: PromptImportWalletDef,
) => {
  const { t } = useTranslation();
  const [showEnterKey, setShowEnterKey] = useState(false);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  const [loading, setLoading] = useState(false);

  function onSuccess() {
    if (typeof store.onSuccess === 'undefined') {
      store.isModalVisible = false;
    } else {
      store.onSuccess();
    }
  }

  function onFailure() {
    if (typeof store.onFailure === 'undefined') {
      store.isModalVisible = false;
    } else {
      store.onFailure();
    }
  }

  useEffect(() => {
    if (hdWalletContext.state.choosenWalletIndex === -1) {
      setLoading(true);
    } else {
      if (store.address === ethereumAddress) {
        onSuccess();
      } else {
        onFailure();
      }
      setLoading(false);
    }
  }, [hdWalletContext.state.choosenWalletIndex]);

  const RenderContent = () => {
    if (showEnterKey) {
      return <Login />;
    } else {
      return (
        <CyDView className='flex flex-col justify-between items-center px-[20px] w-[100%]'>
          <CyDView className='mb-[30px] bg-infoTextBackground p-[20px] mt-[5px]'>
            <CyDText className='text-center'>{`You are currently in read-only mode. As a result, you cannot ${store.type}. You will be required to import the wallet using seed phrase to proceed.`}</CyDText>
          </CyDView>
          <CyDImage
            source={AppImages.UNLOCK_FROM_TRACKWALLET}
            className='h-[42%] w-[500px] mb-[30px]'
            resizeMode='contain'
          />
          <Button
            title={t('IMPORT_ANOTHER_WALLET')}
            style='w-[100%]'
            onPress={() => {
              setShowEnterKey(true);
            }}
          />
          <Button
            title={t('SKIP')}
            style='w-[100%]'
            type={ButtonType.SECONDARY}
            onPress={() => {
              store.onCancel();
            }}
          />
        </CyDView>
      );
    }
  };

  return (
    <CyDModalLayout
      setModalVisible={() => {
        onSuccess();
      }}
      disableBackDropPress={true}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      isModalVisible={
        Object.prototype.hasOwnProperty.call(store, 'isModalVisible')
          ? store.isModalVisible
          : false
      }
      style={styles.modalContainer}>
      {loading ? (
        <Loading />
      ) : (
        <CyDSafeAreaView
          className={'flex-1 bg-n0 w-[100%] px-[40px] flex items-center'}>
          <CyDView className='flex-row justify-center items-center w-[100%] px-[10px]'>
            <CyDTouchView
              onPress={() => {
                store.onCancel();
              }}>
              <CyDIcons name='arrow-left' size={24} className='text-base400' />
            </CyDTouchView>
            <CyDView className='flex flex-1 items-center'>
              <CyDText className='font-extrabold text-[20px] ml-[-25px]'>
                {store.type.toUpperCase()}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='flex flex-row items-center mt-[20px]'>
            <CyDIcons
              name='lock'
              size={20}
              className='text-base400 mr-[10px]'
            />
            <CyDText className='font-extrabold text-center text-[20px]'>
              {t('ACTION_REQUIRED')}
            </CyDText>
          </CyDView>
          <RenderContent />
        </CyDSafeAreaView>
      )}
    </CyDModalLayout>
  );
};

export default PromptImportWallet;

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
