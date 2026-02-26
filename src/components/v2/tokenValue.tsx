import React, { useContext, useEffect, useState } from 'react';
import { HdWalletContext } from '../../core/util';
import { CyDText, CyDView } from '../../styles/tailwindComponents';
import clsx from 'clsx';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

interface CyDTokenValueProps {
  children: number | string;
  className?: string;
  revealTemporarily?: boolean;
  decimalColorClass?: string;
  mainColorClass?: string;
  parentClass?: string;
}

export default function CyDTokenValue(props: CyDTokenValueProps) {
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;

  const { hideBalance } = hdWallet.state;
  const {
    children,
    className = '',
    revealTemporarily = false,
    decimalColorClass = '!text-[#666666]',
    mainColorClass = 'text-base400',
    parentClass = '',
    ...restProps
  } = props;
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

  const handlePress = (): void => {
    if (hideBalance) {
      setOverrideHideBalance(!overrideHideBalance);
    }
  };

  // Build classes for main part: !font-gambetta + bold + fontSize + mainColorClass
  const mainClasses = clsx(
    '!font-gambetta',
    'font-bold',
    mainColorClass,
    className,
  );

  // Build classes for decimal part: !font-gambetta + normal weight + fontSize + decimalColorClass
  const decimalClasses = clsx(
    '!font-gambetta',
    'font-normal',
    decimalColorClass,
    className,
  );

  const parentClasses = clsx('flex-row items-baseline', parentClass);

  // If balance is hidden, show asterisks
  if (hideBalance && !overrideHideBalance) {
    return (
      <CyDText
        onPress={handlePress}
        disabled={!hideBalance}
        className={mainClasses}
        {...restProps}>
        {hideWithCharacters}
      </CyDText>
    );
  }

  const formattedValue = formatTokenValue.format(Number(children));

  // Always apply split styling if decimal exists
  const decimalIndex = formattedValue.indexOf('.');
  if (decimalIndex !== -1) {
    const mainPart = formattedValue.substring(0, decimalIndex);
    const decimalPart = formattedValue.substring(decimalIndex);

    return (
      <CyDView className={parentClasses}>
        <CyDText
          onPress={handlePress}
          disabled={!hideBalance}
          className={mainClasses}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          {...restProps}>
          {mainPart}
          <CyDText className={decimalClasses}>{decimalPart}</CyDText>
        </CyDText>
      </CyDView>
    );
  }

  // Default rendering (no decimal point in formatted value)
  return (
    <CyDText
      onPress={handlePress}
      disabled={!hideBalance}
      className={mainClasses}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.5}
      {...restProps}>
      {formattedValue}
    </CyDText>
  );
}
