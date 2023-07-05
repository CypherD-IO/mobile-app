/**
 * @format
 * @flow
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RemoveWalletModal from '../../components/RemoveWalletModal';
import { isPinAuthenticated, loadFromKeyChain, removeCredentialsFromKeychain } from '../../core/Keychain';
import * as C from '../../constants/index';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import { clearAllData } from '../../core/asyncStorage';
import { BackHandler } from 'react-native';
import { AUTHORIZE_WALLET_DELETION } from '../../core/util';
const {
  SafeAreaView
} = require('../../styles');

export async function deleteThisWallet (hdWalletContext, activityContext, portfolioContext) {
  await removeCredentialsFromKeychain();
  await clearAllData();
  hdWalletContext.dispatch({ type: 'FORGET_WALLET' });
  activityContext.dispatch({ type: ActivityReducerAction.RESET });
  portfolioContext.dispatchPortfolio({ type: 'RESET' });
};

export default function ImportAnotherWallet (props) {
  const { route } = props;
  const [selectedChain, setSelectedChain] = useState(0);
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();

  const { seedPharse = false, deleteWallet = false, importNewWallet = false } = route.params;

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  const navigateToImportWallet = () => {
    props.navigation.navigate(C.screenTitle.ENTER_KEY);
  };

  const removeTheWallet = async () => {
    const isPinSet = await isPinAuthenticated();
    if (!isPinSet) {
      const authorization = await loadFromKeyChain(AUTHORIZE_WALLET_DELETION);
      if (authorization) {
        navigateToImportWallet();
      }
    } else {
      navigation.navigate(C.screenTitle.PIN, { title: `${t<string>('ENTER_PIN_TO_DELETE')}`, callback: navigateToImportWallet });
    }
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <SafeAreaView dynamic>
            <RemoveWalletModal
                isModalVisible={true}
                titleMsg={seedPharse ? t('SEED_PHARSE_TITLE') : importNewWallet ? t('IMPORT_ANOTHER_WALLET_TITLE') : t('DELTE_WALLET')}
                subTitleMsg={seedPharse ? t('SEED_PHARSE_SUB') : importNewWallet ? t('IMPORT_ANOTHER_WALLET_SUB') : t('DELETE_WALLET_SUB')}
                accoMsg={t('REMOVE_WALL_ACC')}
                onPress={() => {
                  props.navigation.goBack();
                }}
                 removeWallet={() => {
                   void removeTheWallet();
                 }}
                setSelectedChain={setSelectedChain}
                selectedChain={selectedChain}
                seedPharse={seedPharse}
                onPressSeed={route.params.onPressSeed}
                deleteWallet={deleteWallet}
                importNewWallet={importNewWallet}
                navigation={props.navigation}
            />
        </SafeAreaView>
  );
}
