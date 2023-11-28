import clsx from 'clsx';
import React, { useContext, useEffect, useState } from 'react';
import {
  HdWalletContext,
  formatAmount,
  limitDecimalPlaces,
} from '../../core/util';
import { CyDText } from '../../styles/tailwindStyles';

export default function CyDTokenAmount(props?: any) {
  const hdWallet = useContext<any>(HdWalletContext);
  const { hideBalance } = hdWallet.state;
  const { children, revealTemporarily = false, decimalPlaces = 3 } = props;
  const hideWithCharacters = '******';
  const [overrideHideBalance, setOverrideHideBalance] =
    useState(revealTemporarily);

  useEffect(() => {
    if (hideBalance) {
      setOverrideHideBalance(false);
    }
  }, [hideBalance]);

  const formatTokenAmount = () => {
    if (props.decimalPlaces) {
      return limitDecimalPlaces(children, decimalPlaces);
    }
    return formatAmount(children, 4);
  };

  return (
    <CyDText
      onPress={() => {
        hideBalance && setOverrideHideBalance(!overrideHideBalance);
      }}
      disabled={!hideBalance}
      {...props}
      className={clsx('', { 'pt-[0px]': hideBalance && !overrideHideBalance })}>
      {hideBalance && !overrideHideBalance
        ? hideWithCharacters
        : formatTokenAmount()}
    </CyDText>
  );
}
