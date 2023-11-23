import clsx from 'clsx';
import React, { useContext, useEffect, useState } from 'react';
import { HdWalletContext, limitDecimalPlaces } from '../../core/util';
import { CyDText } from '../../styles/tailwindStyles';

export default function CyDTokenValue(props?: any) {
  const hdWallet = useContext<any>(HdWalletContext);
  const { hideBalance } = hdWallet.state;
  const { children, revealTemporarily = false } = props;
  const hideWithCharacters = '******';
  const [overrideHideBalance, setOverrideHideBalance] =
    useState(revealTemporarily);

  useEffect(() => {
    if (hideBalance) {
      setOverrideHideBalance(false);
    }
  }, [hideBalance]);

  const formatTokenValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <CyDText
      onPress={() => {
        hideBalance && setOverrideHideBalance(!overrideHideBalance);
      }}
      disabled={!hideBalance}
      {...props}>
      {hideBalance && !overrideHideBalance
        ? hideWithCharacters
        : formatTokenValue.format(children)}
    </CyDText>
  );
}
