import clsx from 'clsx';
import React, { useContext, useEffect, useState } from 'react';
import { HdWalletContext, limitDecimalPlaces } from '../../core/util';
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
      return Number(limitDecimalPlaces(Number(children), decimalPlaces));
    }
    return new Intl.NumberFormat('en-US', {
      maximumSignificantDigits: 4,
    }).format(Number(children));
  };

  return (
    <CyDText
      onPress={() => {
        hideBalance && setOverrideHideBalance(!overrideHideBalance);
      }}
      {...props}
      className={clsx('', { 'pt-[0px]': hideBalance && !overrideHideBalance })}>
      {hideBalance && !overrideHideBalance
        ? hideWithCharacters
        : formatTokenAmount()}
    </CyDText>
  );
}
