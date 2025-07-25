import React, { useEffect, useState } from 'react';
import { SkipApiRouteResponse } from '../../models/skipApiRouteResponse.interface';
import { SkipApiStatus } from '../../models/skipApiStatus.interface';
import Loading from '../../components/v2/loading';
import { capitalize, endsWith, find, get, isEmpty, isNumber } from 'lodash';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import clsx from 'clsx';
import { SvgUri } from 'react-native-svg';
import Button from '../../components/v2/button';
import { StyleSheet, Animated, Easing } from 'react-native';
import { t } from 'i18next';
import { SwapBridgeChainData, SwapBridgeTokenData } from '.';
import AppImages from '../../../assets/images/appImages';
import { ChainIdToBackendNameMapping } from '../../constants/data';
import { ActivityType } from '../../reducers/activity_reducer';
import useIsSignable from '../../hooks/useIsSignable';
import BackgroundTimer from 'react-native-background-timer';
import { DecimalHelper } from '../../utils/decimalHelper';
import { formatUnits } from 'viem';

enum TxnStatus {
  STATE_SUBMITTED = 'STATE_SUBMITTED',
  STATE_PENDING = 'STATE_PENDING',
  STATE_COMPLETED_SUCCESS = 'STATE_COMPLETED_SUCCESS',
  STATE_COMPLETED_ERROR = 'STATE_COMPLETED_ERROR',
  STATE_ABANDONED = 'STATE_ABANDONED',
  STATE_PENDING_ERROR = 'STATE_PENDING_ERROR',
}

export default function BridgeRoutePreview({
  routeResponse,
  chainInfo,
  tokenData,
  loading,
  onGetMSg,
  statusResponse,
  signaturesRequired,
}: {
  routeResponse: SkipApiRouteResponse | null;
  chainInfo: SwapBridgeChainData[] | null;
  tokenData: Record<string, SwapBridgeTokenData[]>;
  loading: boolean;
  onGetMSg: () => Promise<void>;
  statusResponse: SkipApiStatus[];
  signaturesRequired: number;
}) {
  const [isSignableTransaction] = useIsSignable();
  const pulseAnimation = new Animated.Value(1);
  const [countdown, setCountdown] = useState<number | null>(
    isNumber(routeResponse?.estimated_route_duration_seconds)
      ? Number(routeResponse.estimated_route_duration_seconds) + 30
      : null,
  );

  const startPulse = () => {
    pulseAnimation.setValue(0.1);
    Animated.loop(
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    ).start();
  };
  startPulse();

  const handleBridgePress = async () => {
    if (countdown !== null) {
      setCountdown(prev => prev); // Keep the initial value
      startCountdown(); // Start the countdown
    }
    await onGetMSg();
  };

  const startCountdown = () => {
    if (countdown !== null && countdown > 0) {
      BackgroundTimer.runBackgroundTimer(() => {
        setCountdown(prev => {
          const newValue = prev ? prev - 1 : 0;
          if (newValue <= 0) {
            BackgroundTimer.stopBackgroundTimer();
          }
          return newValue;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      BackgroundTimer.stopBackgroundTimer();
    };
  }, []);

  if (!routeResponse) return <Loading />;

  const bridgeDoneStatus =
    statusResponse.length === routeResponse?.chain_ids?.length - 1
      ? get(statusResponse, [statusResponse.length - 1, 'state'])
      : '';

  return (
    <CyDView className={'px-[20px] font-nunito mb-[55px]'}>
      {isNumber(routeResponse?.estimated_route_duration_seconds) && (
        <CyDView className='bg-n0 p-[12px] rounded-[8px] flex flex-row justify-between items-center mb-[12px]'>
          <CyDText>{t('ESTIMATED_TIME')}</CyDText>
          <CyDText>
            {countdown !== null && countdown > 0
              ? countdown > 60 // Check if countdown exceeds 60 seconds
                ? `${Math.floor(countdown / 60)}m ${countdown % 60}s` // Convert to minutes and seconds
                : `${countdown}s` // Display seconds
              : t('LONGER_THAN_USUAL')}
          </CyDText>
        </CyDView>
      )}

      {true && (
        <CyDView className='flex flex-row items-center bg-red20 rounded-[8px] p-[8px] mb-[12px]'>
          <CyDMaterialDesignIcons
            name='alert'
            size={20}
            className='text-red400 mr-[10px]'
          />
          <CyDText className='text-[12px] font-medium w-[85%]'>
            {`Please do not move out of this page or go back as ${signaturesRequired} more ${signaturesRequired > 1 ? 'signatures are' : 'signature is'}  required to complete your bridge`}
          </CyDText>
        </CyDView>
      )}
      {(loading || !isEmpty(statusResponse)) && signaturesRequired === 0 && (
        <CyDView className='flex flex-row items-center bg-emerald-100 rounded-[8px] p-[8px] mb-[12px]'>
          <CyDFastImage
            source={AppImages.SUCCESS_TICK_GREEN_BG}
            className='w-[20px] h-[20px] mr-[10px]'
          />
          <CyDText className='text-[12px] font-medium w-[88%]'>{`Your funds will be transferred to your ${ChainIdToBackendNameMapping[routeResponse?.dest_asset_chain_id as keyof typeof ChainIdToBackendNameMapping]} chain in sometime, please stay on the page till your transaction is complete`}</CyDText>
        </CyDView>
      )}
      <CyDView
        className={
          'bg-n0 py-[40px] rounded-[8px] flex flex-col items-center justify-center relative'
        }>
        <CyDView className=''>
          {routeResponse?.chain_ids.map((item: any, index: number) => {
            const currentChain = chainInfo?.find(
              chain =>
                chain.chainId === get(routeResponse, ['chain_ids', index]),
            );

            const operationsList = get(routeResponse, 'operations');
            const currentOperation = get(operationsList, index);
            const cctp = get(currentOperation, ['cctp_transfer'], null);
            const transfer = get(currentOperation, ['transfer'], null);
            const swap = get(currentOperation, ['swap'], null);
            const axelar = get(currentOperation, ['axelar_transfer'], null);
            const bank = get(currentOperation, ['bank_send'], null);
            const hyperlane = get(
              currentOperation,
              ['hyperlane_transfer'],
              null,
            );

            const data = find(
              [cctp, transfer, swap, axelar, bank, hyperlane],
              constant => constant !== null,
            );
            const chainId = data
              ? get(data, 'from_chain_id', '')
              : routeResponse?.dest_asset_chain_id;
            const chainData = get(tokenData, [chainId]);

            const token = chainData?.find(chainItem => {
              const denom = data
                ? data.denom_in
                : routeResponse?.dest_asset_denom;
              return chainItem.denom === denom;
            });

            const tokenOut = chainData?.find(chainItem => {
              const denom = data
                ? data.denom_out
                : routeResponse.dest_asset_denom;
              return chainItem.denom === denom;
            });

            const currentState = get(statusResponse, [index, 'state'], '');

            return (
              <CyDView key={index}>
                <CyDView className='flex flex-row gap-x-[16px] items-start'>
                  <CyDView className='flex flex-col items-center '>
                    <CyDView className='relative'>
                      {endsWith(currentChain?.logoUrl, '.svg') ? (
                        <CyDView
                          className={clsx(
                            'h-[64px] w-[64px] p-[4px] rounded-full border-[4px] border-gray-200',
                            {
                              'border-green-400':
                                currentState ===
                                  TxnStatus.STATE_COMPLETED_SUCCESS ||
                                currentState === TxnStatus.STATE_PENDING ||
                                currentState === TxnStatus.STATE_SUBMITTED ||
                                bridgeDoneStatus ===
                                  TxnStatus.STATE_COMPLETED_SUCCESS,
                              'border-red-400':
                                currentState === TxnStatus.STATE_ABANDONED ||
                                currentState ===
                                  TxnStatus.STATE_COMPLETED_ERROR ||
                                currentState ===
                                  TxnStatus.STATE_PENDING_ERROR ||
                                bridgeDoneStatus ===
                                  TxnStatus.STATE_PENDING_ERROR ||
                                bridgeDoneStatus ===
                                  TxnStatus.STATE_ABANDONED ||
                                bridgeDoneStatus ===
                                  TxnStatus.STATE_COMPLETED_ERROR,
                            },
                          )}>
                          <SvgUri
                            width='38'
                            height='38'
                            uri={currentChain?.logoUrl ?? ''}
                          />
                        </CyDView>
                      ) : (
                        <CyDFastImage
                          source={{
                            uri: currentChain ? currentChain?.logoUrl : '',
                          }}
                          className={clsx(
                            'h-[64px] w-[64px] p-[4px] rounded-full border-[4px] border-gray-200',
                            {
                              'border-green-400':
                                currentState ===
                                  TxnStatus.STATE_COMPLETED_SUCCESS ||
                                currentState === TxnStatus.STATE_PENDING ||
                                currentState === TxnStatus.STATE_SUBMITTED ||
                                bridgeDoneStatus ===
                                  TxnStatus.STATE_COMPLETED_SUCCESS,
                              'border-red-400':
                                currentState === TxnStatus.STATE_ABANDONED ||
                                currentState ===
                                  TxnStatus.STATE_COMPLETED_ERROR ||
                                currentState ===
                                  TxnStatus.STATE_PENDING_ERROR ||
                                bridgeDoneStatus ===
                                  TxnStatus.STATE_PENDING_ERROR ||
                                bridgeDoneStatus ===
                                  TxnStatus.STATE_ABANDONED ||
                                bridgeDoneStatus ===
                                  TxnStatus.STATE_COMPLETED_ERROR,
                            },
                          )}
                        />
                      )}
                    </CyDView>
                    {index !== routeResponse?.chain_ids.length - 1 && (
                      <Animated.View
                        style={{
                          transform: [{ scale: pulseAnimation }],
                        }}
                        className={clsx('w-[4px] h-[48px] ', {
                          'bg-neutral-200': !currentState,
                          'bg-[#ffdc61]':
                            currentState === TxnStatus.STATE_PENDING ||
                            currentState === TxnStatus.STATE_SUBMITTED,
                          'bg-green-400':
                            currentState === TxnStatus.STATE_COMPLETED_SUCCESS,
                          'bg-red-400':
                            currentState === TxnStatus.STATE_ABANDONED ||
                            currentState === TxnStatus.STATE_COMPLETED_ERROR ||
                            currentState === TxnStatus.STATE_PENDING_ERROR,
                        })}
                      />
                    )}
                  </CyDView>
                  <CyDView>
                    {currentOperation && token && (
                      <CyDView className='flex flex-row gap-x-[8px] items-center'>
                        <CyDText className='text-[18px] font-bold'>
                          {DecimalHelper.toString(
                            DecimalHelper.toDecimal(
                              currentOperation.amount_in,
                              token?.decimals ?? 0,
                            ),
                            6,
                          )}
                        </CyDText>
                        {endsWith(token?.logoUrl, '.svg') ? (
                          <SvgUri width='16' height='16' uri={token?.logoUrl} />
                        ) : (
                          <CyDFastImage
                            source={{ uri: token?.logoUrl ?? '' }}
                            className='w-[16px] h-[16px]'
                          />
                        )}
                        <CyDText className='text-[12px]'>
                          {token?.symbol?.toUpperCase()}
                        </CyDText>
                      </CyDView>
                    )}
                    {currentOperation && tokenOut && (
                      <CyDView className='flex flex-row gap-x-[8px] items-center'>
                        <CyDText className='text-[18px] font-bold'>
                          {DecimalHelper.toString(
                            DecimalHelper.toDecimal(
                              currentOperation.amount_out,
                              tokenOut?.decimals ?? 0,
                            ),
                            4,
                          )}
                        </CyDText>
                        {endsWith(tokenOut?.logoUrl, '.svg') ? (
                          <SvgUri
                            width='16'
                            height='16'
                            uri={tokenOut?.logoUrl}
                          />
                        ) : (
                          <CyDFastImage
                            source={{ uri: tokenOut?.logoUrl ?? '' }}
                            className='w-[16px] h-[16px]'
                          />
                        )}
                        <CyDText className='text-[12px]'>
                          {tokenOut?.symbol?.toUpperCase()}
                        </CyDText>
                      </CyDView>
                    )}
                    {!currentOperation &&
                      index === routeResponse?.chain_ids.length - 1 && (
                        <CyDView className='flex flex-row gap-x-[8px] items-center'>
                          <CyDText className='text-[18px] font-bold'>
                            {formatUnits(routeResponse.amount_out, 6)}
                          </CyDText>
                          {endsWith(tokenOut?.logoUrl, '.svg') ? (
                            <SvgUri
                              width='16'
                              height='16'
                              uri={token?.logoUrl ?? ''}
                            />
                          ) : (
                            <CyDFastImage
                              source={{ uri: token?.logoUrl ?? '' }}
                              className='w-[16px] h-[16px]'
                            />
                          )}
                          <CyDText className='text-[12px]'>
                            {token?.symbol?.toUpperCase()}
                          </CyDText>
                        </CyDView>
                      )}
                    <CyDText className='text-[14px] font-medium'>
                      {capitalize(currentChain?.chainName)}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            );
          })}
        </CyDView>
      </CyDView>

      {isEmpty(statusResponse) && (
        <CyDView className='mt-[32px]'>
          <Button
            onPress={() => {
              isSignableTransaction(ActivityType.BRIDGE, () => {
                void handleBridgePress();
              });
            }}
            title={'Accept'}
            disabled={isEmpty(routeResponse)}
            loading={loading}
            loaderStyle={styles.loaderStyle}
          />
        </CyDView>
      )}
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loaderStyle: {
    height: 22,
  },
});
