/**
 * @format
 * @flow
 */
import React, { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import AppImages from '../../../assets/images/appImages';
import { PortfolioContext, HdWalletContext } from '../../core/util';
import EmptyView from '../../components/EmptyView';
import { createWallet } from '../../core/HdWallet';
const {
  SafeAreaView,
  DynamicView
} = require('../../styles');

export default function AutoCreate (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎
  const hdWalletContext = useContext(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎
  useEffect(() => {
    createWallet(hdWalletContext, portfolioState);
  }, []);

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <SafeAreaView dynamic>
            <DynamicView dynamic dynamicWidth dynamicHeight height={80} width={100} mT={0} bGC={Colors.whiteColor} aLIT={'center'}>
                <EmptyView
                    text={'Creating Wallet..'}
                    image={AppImages.LOADING_IMAGE}
                    buyVisible={false}
                    marginTop={-50}
                    isLottie={true}
                />
            </DynamicView>
        </SafeAreaView>
  );
}
