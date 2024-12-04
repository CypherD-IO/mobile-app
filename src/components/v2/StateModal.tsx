import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import {
  CyDImage,
  CyDText,
  CyDView,
  CyDTouchView,
  CyDScrollView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import { getExplorerUrl, copyToClipboard } from '../../core/util';
import { screenTitle } from '../../constants';
import { State } from '../../models/globalModal.interface';
import Button from './button';
import { ButtonType } from '../../constants/enum';

const StateModal: React.FC<State> = (store: State) => {
  const { t } = useTranslation();

  enum modalImage {
    warning = AppImages.CYPHER_WARNING,
    info = AppImages.CYPHER_INFO,
    success = AppImages.CYPHER_SUCCESS,
    error = AppImages.CYPHER_ERROR,
  }

  enum modalTitle {
    warning = 'WARNING_TITLE',
    info = 'INFO_TITLE',
    success = 'SUCCESS_TITLE',
    error = 'ERROR_TITLE',
    custom = 'CUSTOM_TITLE',
  }

  enum modalType {
    warning = 'warning',
    info = 'info',
    success = 'success',
    error = 'error',
    custom = 'custom',
  }

  const RenderImage = useCallback(() => {
    return (
      <CyDImage
        className={'h-[22%] w-[40%] mt-[15%]'}
        source={
          modalImage[store.type] ? modalImage[store.type] : store.modalImage
        }
        resizeMode='contain'
      />
    );
  }, [store.type, store.modalImage]);

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

  const RenderDescription = useCallback(() => {
    const typeOfDesription = typeof store.description;
    if (typeOfDesription === 'string') {
      return (
        <CyDView className='max-h-[150px]'>
          <CyDScrollView className='flex-grow-0'>
            <CyDText className={'mt-[15px] mb-[15px] text-center'}>
              {store.description}
            </CyDText>
          </CyDScrollView>
        </CyDView>
      );
    } else if (typeOfDesription === 'object') {
      if (React.isValidElement(store.description)) {
        return <CyDView>{store.description}</CyDView>;
      } else if (store.type === modalType.error) {
        return (
          <CyDText className={'mt-[15px] mb-[15px] text-center'}>
            {t<string>('UNEXPECTED_ERROR')}
          </CyDText>
        );
      }
    }
    return <></>;
  }, [store.type, store.description]);

  const RenderActions = useCallback(() => {
    if (store.type === modalType.warning) {
      return (
        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px] mt-[50px]'
            title={t('PROCEED')}
            titleStyle='text-white'
            onPress={() => {
              onSuccess();
            }}
            type={ButtonType.RED}
          />
          <Button
            style='h-[54px] mt-[15px]'
            title={t('CANCEL')}
            onPress={() => {
              onFailure();
            }}
            type={ButtonType.SECONDARY}
          />
        </CyDView>
      );
    } else if (store.type === modalType.custom) {
      return (
        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px] mt-[10px]'
            title={t('YES')}
            onPress={() => {
              onSuccess();
            }}
          />
          <Button
            style='h-[54px] mt-[15px]'
            title={t('NO')}
            onPress={() => {
              onFailure();
            }}
            type={ButtonType.SECONDARY}
          />
        </CyDView>
      );
    }
    return (
      <CyDView className={'w-[100%]'}>
        <Button
          style='h-[54px] mt-[35px]'
          title={t('OK')}
          onPress={() => {
            onSuccess();
          }}
        />
      </CyDView>
    );
  }, [store.type, onSuccess, onFailure]);

  return (
    <CyDModalLayout
      setModalVisible={() => {
        onSuccess();
      }}
      disableBackDropPress={store.type === 'warning'}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      isModalVisible={
        store.hasOwnProperty('isModalVisible') ? store.isModalVisible : false
      }
      style={styles.modalContainer}>
      <CyDView
        className={
          'bg-white w-[100%] px-[40px] flex items-center rounded-t-[24px]'
        }>
        <RenderImage />
        <CyDText className={'mt-[10px] font-bold text-[20px] text-center'}>
          {store.title ? store.title : `${t(modalTitle[store.type])}`}
        </CyDText>
        <RenderDescription />
        <RenderActions />
      </CyDView>
    </CyDModalLayout>
  );
};

export const SuccessTransaction = ({
  hash,
  symbol,
  name,
  navigation,
  hideModal,
}: {
  hash: string;
  symbol: string;
  name: string;
  navigation: any;
  hideModal: () => void;
}) => {
  const { t } = useTranslation();

  const formatHash = (hash: string) => {
    return hash.substring(0, 8) + '....' + hash.substring(hash.length - 8);
  };

  const copyHash = (url: string) => {
    copyToClipboard(url);
  };
  return (
    <CyDView className='px-[12px] my-[15px]'>
      <CyDView className='flex flex-row items-center justify-evenly'>
        <CyDView className='flex flex-row justify-center items-center mt-[5px]'>
          <CyDText className={'text-center text-[14px] font-extrabold'}>
            {formatHash(hash)}
          </CyDText>
        </CyDView>
        <CyDTouchView
          onPress={() => copyHash(String(getExplorerUrl(symbol, name, hash)))}>
          <CyDImage
            source={AppImages.COPY}
            className='h-[20px] w-[20px]'
            resizeMode='contain'
          />
        </CyDTouchView>
      </CyDView>
      <CyDTouchView
        className='flex flex-row items-center justify-center mt-[15px]'
        onPress={() => {
          hideModal();
          setTimeout(() => {
            navigation.navigate(screenTitle.TRANS_DETAIL, {
              url: getExplorerUrl(symbol, name, hash),
            });
          }, MODAL_HIDE_TIMEOUT);
        }}>
        <CyDText className='text-[15px] text-blue-500 underline'>
          {t<string>('CLICK_HERE_TO_VIEW_TRANSACTION')}
        </CyDText>
      </CyDTouchView>
    </CyDView>
  );
};

export const BuyOrBridge = ({
  text,
  navigation,
  portfolioState,
  hideModal,
}: {
  text: string;
  navigation: any;
  portfolioState: any;
  hideModal: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <CyDView className='px-[12px]'>
      <CyDView className='flex flex-column items-center justify-between'>
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDText className={'mt-[15px] text-center'}>{text}</CyDText>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center w-[140px] mt-[10px]'>
          <CyDTouchView
            onPress={() => {
              hideModal();
              portfolioState.dispatchPortfolio({
                value: { buyButtonClicked: true },
              });
            }}>
            <CyDView
              className={
                'flex flex-column justify-center items-center pt-[15px]'
              }>
              <CyDImage
                source={AppImages.BUY_SHORTCUT}
                className={'w-[46px] h-[46px]'}
              />
              <CyDText className={'font-bold text-[15px] pt-[5px]'}>
                {t('BUY').toString()}
              </CyDText>
            </CyDView>
          </CyDTouchView>
          <CyDTouchView
            onPress={() => {
              hideModal();
              setTimeout(() => {
                navigation.navigate(screenTitle.BRIDGE_SCREEN);
              }, MODAL_HIDE_TIMEOUT);
            }}>
            <CyDView
              className={
                'flex flex-column justify-center items-center pt-[15px]'
              }>
              <CyDImage
                source={AppImages.BRIDGE_SHORTCUT}
                className={'w-[46px] h-[46px]'}
              />
              <CyDText className={'font-bold text-[15px] pt-[5px]'}>
                {t('BRIDGE').toString()}
              </CyDText>
            </CyDView>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

export default StateModal;

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
