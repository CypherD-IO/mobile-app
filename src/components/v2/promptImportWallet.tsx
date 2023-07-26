import { useNavigation } from '@react-navigation/native';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { ButtonType } from '../../constants/enum';
import Login from '../../containers/Auth/EnterKey';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import { PromptImportWalletDef } from '../../models/globalModal.interface';
import { PORTFOLIO_EMPTY, PORTFOLIO_ERROR, PORTFOLIO_LOADING, PORTFOLIO_NEW_LOAD, PORTFOLIO_NOT_EMPTY } from '../../reducers/portfolio_reducer';
import { CyDImage, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import Button from './button';
import Loading from './loading';
import CyDModalLayout from './modal';

const PromptImportWallet: React.FC<PromptImportWalletDef> = (store: PromptImportWalletDef) => {
  const { t } = useTranslation();
  const [showEnterKey, setShowEnterKey] = useState(false);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const { ethereum } = hdWalletContext.state.wallet;
  const [loading, setLoading] = useState(false);
  const [isportfolioLoadStarted, setIsPortfolioLoadStarted] = useState(false);

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

  useEffect(() => {
    if (portfolioState.statePortfolio.portfolioState === PORTFOLIO_LOADING) {
      setLoading(true);
    } else if (loading && portfolioState.statePortfolio.portfolioState === PORTFOLIO_NEW_LOAD) {
      setIsPortfolioLoadStarted(true);
    } else if (loading && isportfolioLoadStarted && portfolioState.statePortfolio.portfolioState === PORTFOLIO_NOT_EMPTY) {
      setLoading(false);
      if (store.address === ethereum.address) {
        onSuccess();
      } else {
        onFailure();
      }
    } else if (loading && (portfolioState.statePortfolio.portfolioState === PORTFOLIO_EMPTY || portfolioState.statePortfolio.portfolioState === PORTFOLIO_ERROR)) {
      onFailure();
    }
  }, [portfolioState.statePortfolio.portfolioState]);

  const RenderContent = () => {
    if (showEnterKey) {
      return (
          <Login/>
      );
    } else {
      return (
        <CyDView className='flex flex-col justify-between items-center px-[20px] w-[100%]'>
          <CyDView className='mb-[30px] bg-infoTextBackground p-[20px] mt-[5px]'>
            <CyDText className='text-center'>{`You are currently in read-only mode. As a result, you cannot ${store.type}. You will be required to import the wallet using seed phrase to proceed.`}</CyDText>
          </CyDView>
          <CyDImage source={AppImages.UNLOCK_FROM_TRACKWALLET} className='h-[42%] w-[500px] mb-[30px]' resizeMode='contain'/>
          <Button title={t('IMPORT_ANOTHER_WALLET')} style='w-[100%]' onPress={() => { setShowEnterKey(true); }}/>
          <Button title={t('SKIP')} style='w-[100%]' type={ButtonType.SECONDARY} onPress={() => { store.onCancel(); }}/>
        </CyDView>);
    }
  };

  return (
    <CyDModalLayout
      setModalVisible={() => { onSuccess(); } }
      disableBackDropPress={true}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      isModalVisible={Object.prototype.hasOwnProperty.call(store, 'isModalVisible') ? store.isModalVisible : false}
      style={styles.modalContainer}>
        {loading
          ? <Loading/>
          : <CyDSafeAreaView
          className={
            'flex-1 bg-white w-[100%] px-[40px] flex items-center'
          }
        >
          <CyDView className='flex-row justify-center items-center w-[100%] px-[10px]'>
            <CyDTouchView onPress={() => { store.onCancel(); }}>
              <CyDImage source={AppImages.BACK} className='h-[22px] w-[25px]' resizeMode='contain'/>
            </CyDTouchView>
            <CyDView className='flex flex-1 items-center'>
              <CyDText className='font-extrabold text-[20px] ml-[-25px]'>{store.type.toUpperCase()}</CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='flex flex-row items-center mt-[20px]'>
            <CyDImage source={AppImages.CYPHER_LOCKED} className='h-[20px] w-[20px] mr-[10px]' resizeMode='contain'/>
            <CyDText className='font-extrabold text-center text-[20px]'>{t('ACTION_REQUIRED')}</CyDText>
          </CyDView>
          <RenderContent/>
        </CyDSafeAreaView>}

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
    alignItems: 'center'
  }
});
