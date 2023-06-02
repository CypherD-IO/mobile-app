/**
 * @format
 * @flow
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RemoveWalletModal from '../../components/RemoveWalletModal';
import { removeCredentialsFromKeychain } from '../../core/Keychain';
import * as C from '../../constants/index';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import { clearAllData } from '../../core/asyncStorage';
import { PORTFOLIO_LOADING, PORTFOLIO_NEW_LOAD } from '../../reducers/portfolio_reducer';
const {
  SafeAreaView
} = require('../../styles');

export async function deleteThisWallet (hdWalletContext, activityContext, portfolioContext) {
  await removeCredentialsFromKeychain();
  await clearAllData();
  hdWalletContext.dispatch({ type: 'FORGET_WALLET' });
  activityContext.dispatch({ type: ActivityReducerAction.RESET });
  portfolioContext.dispatch({ type: 'RESET' });
};

export default function ImportAnotherWallet (props) {
  const { route } = props;
  const [selectedChain, setSelectedChain] = useState(0);
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();

  const { seedPharse = false, deleteWallet = false, importNewWallet = false } = route.params;

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
                   props.navigation.navigate(C.screenTitle.ENTER_KEY);
                 }}
                setSelectedChain={setSelectedChain}
                selectedChain={selectedChain}
                seedPharse={seedPharse}
                onPressSeed={route.params.onPressSeed}
                deleteWallet={deleteWallet}
                importNewWallet={importNewWallet}
            />
        </SafeAreaView>
  );
}
