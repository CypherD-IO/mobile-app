import React, { useEffect, useMemo, useState } from 'react';
import { t } from 'i18next';
import type { PublicClient } from 'viem';
import { formatUnits } from 'viem';
import {
  CyDText,
  CyDView,
} from '../../../../styles/tailwindComponents';
import {
  Divider,
  RenderDAPPInfo,
} from './SigningModalComponents';
import { ScamWarningBanner } from './ScamWarningBanner';
import { IDAppInfo } from '../../../../models/signingModalData.interface';
import { NormalizedPermit, PermitItem } from '../../../../utils/permitParser';
import {
  PermitItemAssessment,
  assessPermitRisk,
  permitBannerCopy,
} from '../../../../utils/approveGuard';
import { useTokenBalances } from '../../../../hooks/useTokenBalances';
import { getMaskedAddress } from '../../../../core/util';
import { isAddressScamRemote } from '../../../../core/securityCheck';

const KIND_TITLE_KEY: Record<NormalizedPermit['kind'], string> = {
  eip2612: 'PERMIT_KIND_EIP2612',
  'permit2-single': 'PERMIT_KIND_PERMIT2_SINGLE',
  'permit2-batch': 'PERMIT_KIND_PERMIT2_BATCH',
};

const noopRiskAssessed = (_required: boolean): void => {
  // intentional noop
};

export const RenderPermitSignModal = ({
  dAppInfo,
  permit,
  publicClient,
  ownerAddress,
  onRiskAssessed = noopRiskAssessed,
}: {
  dAppInfo: IDAppInfo | undefined;
  permit: NormalizedPermit;
  publicClient?: PublicClient;
  ownerAddress?: string;
  onRiskAssessed?: (required: boolean) => void;
}) => {
  const tokenAddresses = useMemo(
    () => permit.items.map(i => i.token),
    [permit.items],
  );
  const { balances } = useTokenBalances(
    publicClient,
    tokenAddresses,
    ownerAddress,
  );

  // Server-side scam-spender lookup. Defaults to false; updates async if the
  // arch endpoint reports a hit. Fails open on network error.
  const [remoteScamSpender, setRemoteScamSpender] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void isAddressScamRemote(permit.spender).then(hit => {
      if (!cancelled) setRemoteScamSpender(hit);
    });
    return () => {
      cancelled = true;
    };
  }, [permit.spender]);

  const risk = useMemo(
    () =>
      assessPermitRisk(
        permit,
        token => balances.get(token.toLowerCase()) ?? null,
        remoteScamSpender,
      ),
    [permit, balances, remoteScamSpender],
  );

  const bannerCopy = useMemo(() => permitBannerCopy(risk), [risk]);

  useEffect(() => {
    onRiskAssessed(risk.requiresHardGate);
  }, [risk.requiresHardGate, onRiskAssessed]);

  return (
    <CyDView>
      {dAppInfo ? <RenderDAPPInfo dAppInfo={dAppInfo} /> : null}
      {bannerCopy ? (
        <ScamWarningBanner
          level={bannerCopy.level}
          title={t<string>(bannerCopy.titleKey)}
          message={bannerCopy.message}
        />
      ) : null}
      <CyDView className='my-[10px]'>
        <CyDText className='text-[14px] font-bold mb-[6px] ml-[4px]'>
          {t<string>(KIND_TITLE_KEY[permit.kind])}
        </CyDText>
        <CyDView className='bg-n40 rounded-[8px] py-[12px] px-[12px]'>
          {risk.perItem.map((entry, idx) => (
            <PermitItemRow key={`${entry.item.token}-${idx}`} entry={entry} />
          ))}
        </CyDView>
      </CyDView>
      <Divider />
      <CyDView className='my-[10px]'>
        <CyDView className='bg-n40 rounded-[8px] py-[12px] px-[12px]'>
          <CyDView className='flex flex-row justify-between'>
            <CyDText className='text-[14px] font-bold'>
              {t<string>('SPENDER')}
            </CyDText>
            <CyDText className='text-[14px]'>
              {getMaskedAddress(permit.spender, 10)}
            </CyDText>
          </CyDView>
          {permit.deadline ? (
            <>
              <CyDView className='h-[1px] bg-gray-200 mt-[10px] mb-[8px]' />
              <CyDView className='flex flex-row justify-between'>
                <CyDText className='text-[14px] font-bold'>
                  {t<string>('DEADLINE')}
                </CyDText>
                <CyDText className='text-[14px]'>
                  {formatDeadline(permit.deadline)}
                </CyDText>
              </CyDView>
            </>
          ) : null}
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

const PermitItemRow = ({ entry }: { entry: PermitItemAssessment }) => {
  const { item, isUnlimited, isOverBalance } = entry;
  return (
    <CyDView className='py-[8px]'>
      <CyDView className='flex flex-row justify-between items-center'>
        <CyDView className='flex-1 pr-[10px]'>
          <CyDText className='text-[13px] font-bold'>
            {item.tokenSymbol ?? getMaskedAddress(item.token, 8)}
          </CyDText>
          <CyDText className='text-[11px] text-subTextColor mt-[2px]'>
            {getMaskedAddress(item.token, 8)}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-col items-end'>
          <CyDText
            className={`text-[16px] font-extrabold ${
              isUnlimited ? 'text-errorTextRed' : ''
            }`}>
            {isUnlimited
              ? t<string>('PERMIT_AMOUNT_UNLIMITED', {
                  symbol: item.tokenSymbol ?? '',
                }).trim()
              : formatPermitAmount(item)}
          </CyDText>
          {item.expiration ? (
            <CyDText className='text-[11px] text-subTextColor'>
              {t<string>('PERMIT_EXPIRES_AT', {
                when: formatDeadline(item.expiration),
              })}
            </CyDText>
          ) : null}
          {isOverBalance && !isUnlimited ? (
            <CyDText className='text-[11px] text-warningTextYellow font-medium mt-[2px]'>
              {t<string>('PERMIT_AMOUNT_EXCEEDS_BALANCE')}
            </CyDText>
          ) : null}
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

function formatPermitAmount(item: PermitItem): string {
  const symbol = item.tokenSymbol ?? '';
  if (item.amount === 0n) return `0 ${symbol}`.trim();
  const hasDecimals =
    typeof item.decimals === 'number' &&
    Number.isInteger(item.decimals) &&
    item.decimals >= 0 &&
    item.decimals <= 78;
  if (hasDecimals) {
    try {
      const display = formatUnits(item.amount, item.decimals as number).replace(
        /\.?0+$/,
        '',
      );
      return `${display}${symbol ? ` ${symbol}` : ''}`;
    } catch {
      // fall through to raw display
    }
  }
  return t<string>('PERMIT_AMOUNT_RAW', {
    amount: item.amount.toString(),
    symbol,
  }).trim();
}

function formatDeadline(deadlineUnix: number): string {
  if (!Number.isFinite(deadlineUnix) || deadlineUnix <= 0) return '—';
  if (deadlineUnix > 1e12) return new Date(deadlineUnix).toLocaleString();
  return new Date(deadlineUnix * 1000).toLocaleString();
}
