import React, { useContext, useEffect, useMemo, useState } from 'react';
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
  /** Custom currency prefix (e.g. "R$", "€"). When set, overrides the default "$" from Intl. */
  prefix?: string;
  /** Suffix shown after the decimal (e.g. "USD", "BRL"). */
  suffix?: string;
  /** When set, dynamically shrinks font to fit long numbers on screen. */
  maxFontSize?: number;
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
    prefix,
    suffix,
    maxFontSize,
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

  const handlePress = (): void => {
    if (hideBalance) {
      setOverrideHideBalance(!overrideHideBalance);
    }
  };

  // Format the value
  const formattedValue = useMemo(() => {
    if (prefix !== undefined) {
      // Custom prefix mode — format number without Intl currency
      const num = Number(children) || 0;
      const formatted = num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${prefix}${formatted}`;
    }
    // Default: USD currency format
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(children));
  }, [children, prefix]);

  // Dynamic font sizing for maxFontSize
  const sizeStyle = useMemo(() => {
    if (!maxFontSize) return undefined;
    const charCount = formattedValue.length;
    if (charCount <= 7) return { fontSize: maxFontSize };
    const scale = Math.max(0.4, 7 / charCount);
    return { fontSize: Math.round(maxFontSize * scale) };
  }, [maxFontSize, formattedValue]);

  // Build classes
  const sizeClass = maxFontSize ? '' : className;
  const mainClasses = clsx('!font-gambetta', 'font-bold', mainColorClass, sizeClass);
  const decimalClasses = clsx('!font-gambetta', 'font-normal', decimalColorClass, sizeClass);
  const parentClasses = clsx('flex-row items-baseline', parentClass);

  // Hidden state
  if (hideBalance && !overrideHideBalance) {
    return (
      <CyDText
        onPress={handlePress}
        disabled={!hideBalance}
        className={mainClasses}
        style={sizeStyle}
        {...restProps}>
        {hideWithCharacters}
      </CyDText>
    );
  }

  // Split at decimal point
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
          style={sizeStyle}
          {...restProps}>
          {mainPart}
        </CyDText>
        <CyDText
          onPress={handlePress}
          disabled={!hideBalance}
          className={decimalClasses}
          style={sizeStyle}
          {...restProps}>
          {decimalPart}
        </CyDText>
        {suffix ? (
          <CyDText className={clsx('!font-gambetta font-normal', decimalColorClass, 'text-[20px] tracking-[-1px] ml-[2px]')}>
            {suffix}
          </CyDText>
        ) : null}
      </CyDView>
    );
  }

  // No decimal
  return (
    <CyDView className={parentClasses}>
      <CyDText
        onPress={handlePress}
        disabled={!hideBalance}
        className={mainClasses}
        style={sizeStyle}
        {...restProps}>
        {formattedValue}
      </CyDText>
      {suffix ? (
        <CyDText className={clsx('!font-gambetta font-normal', decimalColorClass, 'text-[20px] tracking-[-1px] ml-[2px]')}>
          {suffix}
        </CyDText>
      ) : null}
    </CyDView>
  );
}
