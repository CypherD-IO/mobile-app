import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  CyDFastImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/v2/button';
import Loading from '../../components/v2/loading';
import { ButtonType } from '../../constants/enum';
import useAxios from '../../core/HttpRequest';
import useBribesClaimer from '../../hooks/useBribesClaimer';
import { showToast } from '../utilities/toastUtility';
import {
  ClaimBribesResult,
  IBribeClaimResponse,
} from '../../models/bribesClaim.interface';
import {
  buildClaimParamsList,
  buildMerchantRows,
  MerchantBribeRow,
  summarizeClaimResults,
} from './claimBribes.helpers';

const formatUsd = (value?: string): string | null => {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
};

function MerchantRow({ row }: { row: MerchantBribeRow }) {
  return (
    <CyDView className='bg-n0 border-[1px] border-n40 rounded-[16px] p-[16px] mb-[12px]'>
      <CyDView className='flex-row items-center mb-[10px]'>
        {row.logoUrl ? (
          <CyDFastImage
            source={{ uri: row.logoUrl }}
            className='w-[28px] h-[28px] rounded-full mr-[10px]'
            resizeMode='contain'
          />
        ) : (
          <CyDView className='w-[28px] h-[28px] rounded-full bg-n30 mr-[10px]' />
        )}
        <CyDText className='text-[15px] font-bold text-base400 flex-1'>
          {row.merchantName}
        </CyDText>
      </CyDView>
      {row.tokens.map((tk, i) => {
        const usd = formatUsd(tk.valueUSD);
        return (
          <CyDView
            key={`${row.candidateId}-${tk.symbol}-${i}`}
            className='flex-row items-center justify-between mt-[6px]'>
            <CyDView className='flex-row items-center flex-1 mr-[8px]'>
              {tk.logo ? (
                <CyDFastImage
                  source={{ uri: tk.logo }}
                  className='w-[18px] h-[18px] rounded-full mr-[6px]'
                  resizeMode='contain'
                />
              ) : null}
              <CyDText className='text-[14px] font-semibold text-base400'>
                {tk.amountFormatted}
              </CyDText>
            </CyDView>
            {usd ? (
              <CyDText className='text-[13px] text-n200'>{usd}</CyDText>
            ) : null}
          </CyDView>
        );
      })}
    </CyDView>
  );
}

/**
 * Claim Incentives (bribes) screen. Lists claimable bribes per merchant and
 * claims them on-chain (one tx per veNFT) via useBribesClaimer.
 */
export default function ClaimBribesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getWithAuth, patchWithAuth } = useAxios();
  const { claimBribesBatch } = useBribesClaimer();

  const [bribesData, setBribesData] = useState<IBribeClaimResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [statusText, setStatusText] = useState('');

  const fetchBribes = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await getWithAuth('/v1/cypher-protocol/bribes/claim');
      setBribesData(
        !res.isError && res.data ? (res.data as IBribeClaimResponse) : null,
      );
    } catch {
      setBribesData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBribes();
  }, []);

  const data = bribesData;
  const rows = buildMerchantRows(data?.candidateBribes);
  const claimParams = buildClaimParamsList(data?.mergedBribes);
  const canClaim = claimParams.length > 0;
  const totalValue = Number(data?.summary?.totalClaimableBribes) || 0;

  const onClaimAll = async (): Promise<void> => {
    if (!canClaim) return;
    setClaiming(true);
    try {
      const results: ClaimBribesResult[] = await claimBribesBatch(
        claimParams.map(p => ({ ...p, onStatusUpdate: setStatusText })),
      );
      const { claimed, total } = summarizeClaimResults(results);
      // Non-blocking backend sync; failure is logged, not surfaced.
      void patchWithAuth('/v1/cypher-protocol/user/mark-claimed', {
        unixTimestamp: Math.floor(Date.now() / 1000),
      }).catch(() => undefined);
      showToast(
        t('BRIBES_CLAIMED_X_OF_Y', 'Claimed {{claimed}} of {{total}}', {
          claimed,
          total,
        }),
      );
      await fetchBribes();
    } catch {
      showToast(t('BRIBES_CLAIM_FAILED', 'Claim failed, please try again'));
    } finally {
      setClaiming(false);
      setStatusText('');
    }
  };

  if (loading) return <Loading />;

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <PageHeader
        title={t('CLAIM_INCENTIVES_HEADER', 'Claim Incentives')}
        navigation={navigation}
      />
      <CyDScrollView
        className='flex-1 bg-n20 px-[16px]'
        showsVerticalScrollIndicator={false}>
        <CyDView className='h-[12px]' />

        {/* Total card */}
        <CyDView className='bg-n0 border-[1px] border-n40 rounded-[16px] p-[16px] mb-[16px]'>
          <CyDText className='text-[13px] text-n200'>
            {t('CLAIM_INCENTIVES_TOTAL', 'Total claimable')}
          </CyDText>
          <CyDText className='text-[26px] font-bold text-base400 mt-[2px]'>
            {`$${totalValue.toFixed(2)}`}
          </CyDText>
          {data?.summary ? (
            <CyDText className='text-[12px] text-n200 mt-[4px]'>
              {t(
                'CLAIM_INCENTIVES_COUNTS',
                '{{veNFTs}} veNFT(s) · {{merchants}} merchant(s)',
                {
                  veNFTs: data.summary.totalVeNFTs ?? 0,
                  // summary.totalCandidates comes back 0 from the API; the real
                  // count is the merchants we actually render.
                  merchants: rows.length,
                },
              )}
            </CyDText>
          ) : null}
        </CyDView>

        {rows.length > 0 ? (
          rows.map(row => <MerchantRow key={row.candidateId} row={row} />)
        ) : canClaim ? (
          <CyDView className='bg-n0 border-[1px] border-n40 rounded-[16px] p-[16px] mb-[12px]'>
            <CyDText className='text-[14px] text-base400'>
              {t(
                'CLAIM_INCENTIVES_READY',
                'Claimable bribes ready across {{count}} veNFT(s).',
                { count: claimParams.length },
              )}
            </CyDText>
          </CyDView>
        ) : (
          <CyDView className='items-center justify-center py-[40px]'>
            <CyDText className='text-[14px] text-n200 text-center'>
              {t('CLAIM_INCENTIVES_EMPTY', 'No incentives to claim right now.')}
            </CyDText>
          </CyDView>
        )}

        {claiming && statusText ? (
          <CyDText className='text-[12px] text-n200 text-center mb-[8px]'>
            {statusText}
          </CyDText>
        ) : null}

        <CyDView className='h-[24px]' />
      </CyDScrollView>

      {canClaim ? (
        <CyDView className='bg-n0 border-t-[1px] border-n40 px-[16px] pt-[14px] pb-[20px]'>
          <Button
            title={t('CLAIM_INCENTIVES_CTA', 'Claim All')}
            type={ButtonType.PRIMARY}
            loading={claiming}
            disabled={claiming}
            onPress={() => {
              void onClaimAll();
            }}
          />
        </CyDView>
      ) : null}
    </CyDSafeAreaView>
  );
}
