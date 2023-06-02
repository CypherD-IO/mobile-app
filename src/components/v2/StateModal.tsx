import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { ButtonWithOutImage } from '../../containers/Auth/Share';
import AppImages from '../../../assets/images/appImages';
import {
  CyDImage,
  CyDText,
  CyDView,
  CyDTouchView
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import { getExplorerUrl, copyToClipboard } from '../../core/util';
import { screenTitle } from '../../constants';

interface state {
  type: string
  title: string
  description: string | JSX.Element
  isModalVisible: boolean
  onSuccess: () => void
  onFailure: () => void
}

const StateModal: React.FC<state> = (store: state) => {
  const { t } = useTranslation();

  enum modalImage {
    warning = AppImages.CYPHER_WARNING,
    info = AppImages.CYPHER_INFO,
    success = AppImages.CYPHER_SUCCESS,
    error = AppImages.CYPHER_ERROR
  }

  enum modalTitle {
    warning = 'WARNING_TITLE',
    info = 'INFO_TITLE',
    success = 'SUCCESS_TITLE',
    error = 'ERROR_TITLE'
  }

  enum modalType {
    warning = 'warning',
    info = 'info',
    success = 'success',
    error = 'error'
  }

  const RenderImage = () => {
    return (
      <CyDImage
        style={{ resizeMode: 'stretch' }}
        className={'h-[22%] w-[40%] mt-[15%]'}
        source={modalImage[store.type]}
        resizeMode='contain'
      ></CyDImage>
    );
  };

  function onSuccess () {
    if (typeof store.onSuccess === 'undefined') {
      store.isModalVisible = false;
    } else {
      store.onSuccess();
    }
  }

  function onFailure () {
    if (typeof store.onFailure === 'undefined') {
      store.isModalVisible = false;
    } else {
      store.onFailure();
    }
  }

  const RenderActions = () => {
    if (store.type === modalType.warning) {
      return (
        <CyDView className={'w-[100%]'}>
          <ButtonWithOutImage
            sentry-label="alert-on-press"
            bG={Colors.red}
            mT={50}
            vC={Colors.appColor}
            fC={Colors.whiteColor}
            text={t('PROCEED')}
            isBorder={false}
            onPress={() => {
              onSuccess();
            }}
          />
          <ButtonWithOutImage
            sentry-label="alert-on-press"
            // bG={Colors.appColor}
            bC={Colors.sepratorColor}
            bW={1.5}
            mT={15}
            vC={Colors.appColor}
            text={t('CANCEL')}
            isBorder={true}
            onPress={() => {
              onFailure();
            }}
          />
        </CyDView>
      );
    }
    return (
      <CyDView className={'w-[100%]'}>
        <ButtonWithOutImage
          sentry-label="alert-on-press"
          bG={Colors.appColor}
          mT={35}
          vC={Colors.appColor}
          text={t('OK')}
          isBorder={false}
          onPress={() => {
            onSuccess();
          }}
        />
      </CyDView>
    );
  };

  return (
      <CyDModalLayout
        setModalVisible={ () => { onSuccess(); }}
        disableBackDropPress={ store.type === 'warning' }
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        animationInTiming = {300}
        animationOutTiming = {300}
        isModalVisible={store.hasOwnProperty('isModalVisible') ? store.isModalVisible : false}
        style={styles.modalContainer}
      >
        <CyDView
          className={
            'bg-white w-[100%] px-[40px] flex items-center rounded-t-[50]'
          }
        >
          <RenderImage />
          <CyDText className={'mt-[10] font-bold text-[20px] text-center'}>{store.title ? store.title : `${t(modalTitle[store.type])}`}</CyDText>
          {
            typeof store.description === 'string'
              ? <CyDText className={'mt-[15] mb-[15] text-center'}>{store.description}</CyDText>
              : store.description
          }
          <RenderActions />
        </CyDView>
      </CyDModalLayout>
  );
};

export const SuccessTransaction = (
  { hash, symbol, name, navigation, hideModal }:
  { hash: string, symbol: string, name: string, navigation: any, hideModal: () => void }
) => {
  const { t } = useTranslation();

  const formatHash = (hash: string) => {
    return hash.substring(0, 8) + '....' + hash.substring(hash.length - 8);
  };

  const copyHash = (url: string) => {
    copyToClipboard(url);
  };
  return (
    <CyDView className='px-[12px] mt-[15px]'>
      <CyDView className='flex flex-row items-center justify-between'>
        <CyDView className='flex flex-row justify-between items-center mt-[5px]'>
          <CyDText className={'text-center text-[14px] font-extrabold'}>{formatHash(hash)}</CyDText>
        </CyDView>
        <CyDTouchView onPress={() => copyHash(String(getExplorerUrl(symbol, name, hash)))}>
          <CyDImage source={AppImages.COPY} className='h-[20px] w-[20px]' resizeMode='contain'/>
        </CyDTouchView>
      </CyDView>
      <CyDTouchView className='flex flex-row items-center justify-center mt-[15px]' onPress={() => {
        hideModal();
        setTimeout(() => {
          navigation.navigate(screenTitle.TRANS_DETAIL, {
            url: getExplorerUrl(symbol, name, hash)
          });
        }, MODAL_HIDE_TIMEOUT);
      }}
      >
        <CyDText className='text-[15px] text-blue-500 underline'>{t<string>('CLICK_HERE_TO_VIEW_TRANSACTION')}</CyDText>
      </CyDTouchView>
    </CyDView>
  );
};

export const BuyOrBridge = (
  { text, navigation, portfolioState, hideModal }:
  {text: string, navigation: any, portfolioState: any, hideModal: () => void}
) => {
  const { t } = useTranslation();
  return (
    <CyDView className='px-[12px]'>
      <CyDView className='flex flex-column items-center justify-between'>
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDText className={'mt-[15] text-center'}>{text}</CyDText>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center w-[140] mt-[10px]'>
          <CyDTouchView onPress={() => {
            hideModal();
            portfolioState.dispatchPortfolio({ value: { buyButtonClicked: true } });
          }}>
            <CyDView className={'flex flex-column justify-center items-center pt-[15px]'}>
              <CyDImage source={AppImages.BUY_SHORTCUT} className={'w-[46px] h-[46px]'}/>
              <CyDText className={'font-bold text-[15px] pt-[5px]'}>{t('BUY').toString()}</CyDText>
            </CyDView>
          </CyDTouchView>
          <CyDTouchView onPress={() => {
            hideModal();
            setTimeout(() => {
              navigation.navigate(screenTitle.BRIDGE_SCREEN);
            }, MODAL_HIDE_TIMEOUT);
          }}>
            <CyDView className={'flex flex-column justify-center items-center pt-[15px]'}>
              <CyDImage source={AppImages.BRIDGE_SHORTCUT} className={'w-[46px] h-[46px]'}/>
              <CyDText className={'font-bold text-[15px] pt-[5px]'}>{t('BRIDGE').toString()}</CyDText>
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
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center'
  }
});
