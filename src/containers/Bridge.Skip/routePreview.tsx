import React, { Dispatch, SetStateAction } from 'react';
import { SkipApiRouteResponse } from '../../models/skipApiRouteResponse.interface';
import { SkipApiChainInterface } from '../../models/skipApiChains.interface';
import { SkipApiToken } from '../../models/skipApiTokens.interface';
import { SkipApiStatus } from '../../models/skipApiStatus.interface';
import Loading from '../../components/v2/loading';
import { capitalize, endsWith, find, get, isEmpty } from 'lodash';
import { ethers } from 'ethers';
import {
  CyDFastImage,
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { SvgUri } from 'react-native-svg';
import Button from '../../components/v2/button';
import AppImages from '../../../assets/images/appImages';
import { StyleSheet } from 'react-native';
import { t } from 'i18next';

enum TxnStatus {
  STATE_SUBMITTED = 'STATE_SUBMITTED',
  STATE_PENDING = 'STATE_PENDING',
  STATE_COMPLETED_SUCCESS = 'STATE_COMPLETED_SUCCESS',
  STATE_COMPLETED_ERROR = 'STATE_COMPLETED_ERROR',
  STATE_ABANDONED = 'STATE_ABANDONED',
  STATE_PENDING_ERROR = 'STATE_PENDING_ERROR',
}

export default function RoutePreview({
  setIndex,
  routeResponse,
  chainInfo,
  tokenData,
  loading,
  onGetMSg,
  statusResponse,
  onBridgeSuccess,
}: {
  setIndex: Dispatch<SetStateAction<number>>;
  routeResponse: SkipApiRouteResponse | null;
  chainInfo: SkipApiChainInterface[] | null;
  tokenData: Record<string, SkipApiToken[]>;
  loading: boolean;
  onGetMSg: () => Promise<void>;
  statusResponse: SkipApiStatus[];
  onBridgeSuccess: (status: 'success' | 'falied') => Promise<void>;
}) {
  if (!routeResponse) return <Loading />;

  const bridgeDoneStatus =
    statusResponse.length === routeResponse?.chain_ids.length - 1
      ? get(statusResponse, [statusResponse.length - 1, 'state'])
      : '';

  return (
    <CyDView className={'px-[20px] font-nunito pt-[40px]'}>
      <CyDView
        className={
          'bg-white pb-[40px] rounded-[8px] flex flex-col items-center justify-center relative'
        }>
        <CyDTouchView
          className='flex justify-between w-full ml-[24px] mt-[24px]'
          onPress={() => {
            setIndex(0);
          }}>
          <CyDImage source={AppImages.LEFT_ARROW} className='w-[]' />
          <CyDView />
        </CyDTouchView>

        <CyDView className=''>
          {routeResponse?.chain_ids.map((item: any, index: number) => {
            const currentChain = chainInfo?.find(
              chain =>
                chain.chain_id === get(routeResponse, ['chain_ids', index]),
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
              ? get(data, 'from_chain_id')
              : routeResponse.dest_asset_chain_id;
            const chainData = get(tokenData, [chainId]);

            const token = chainData.find(chainItem => {
              const denom = data
                ? data.denom_in
                : routeResponse.dest_asset_denom;
              return chainItem.denom === denom;
            });

            const tokenOut = chainData.find(chainItem => {
              const denom = data
                ? data.denom_out
                : routeResponse.dest_asset_denom;
              return chainItem.denom === denom;
            });

            const currentState = get(statusResponse, [index, 'state']);

            return (
              <CyDView key={index}>
                <CyDView className='flex flex-row gap-x-[16px] items-start'>
                  <CyDView className='flex flex-col items-center '>
                    <CyDView className='relative'>
                      {endsWith(currentChain?.logo_uri, '.svg') ? (
                        <CyDView
                          className={clsx(
                            'h-[64px] w-[64px] p-[4px] rounded-full border-[8px] border-gray-200',
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
                            uri={currentChain?.logo_uri ?? ''}
                          />
                        </CyDView>
                      ) : (
                        <CyDFastImage
                          source={{
                            uri: currentChain ? currentChain?.logo_uri : '',
                          }}
                          className={clsx(
                            'h-[64px] w-[64px] p-[4px] rounded-full border-[6px] border-gray-200',
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
                      {index < operationsList.length &&
                        get(operationsList, [index - 1, 'tx_index']) !==
                          get(operationsList, [index, 'tx_index']) && (
                          <CyDView className='absolute right-0 bottom-0 bg-red-500 rounded-full w-[12px] h-[12px] p-[2px]' />
                        )}
                    </CyDView>
                    {index !== routeResponse?.chain_ids.length - 1 && (
                      <CyDView
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
                          {ethers.formatUnits(
                            currentOperation.amount_in,
                            token?.decimals,
                          )}
                        </CyDText>
                        {endsWith(token?.logo_uri, '.svg') ? (
                          <SvgUri
                            width='16'
                            height='16'
                            uri={token?.logo_uri}
                          />
                        ) : (
                          <CyDFastImage
                            source={{ uri: token?.logo_uri ?? '' }}
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
                          {parseFloat(
                            ethers.formatUnits(
                              currentOperation.amount_out,
                              tokenOut?.decimals,
                            ),
                          ).toFixed(4)}
                        </CyDText>
                        {endsWith(tokenOut?.logo_uri, '.svg') ? (
                          <SvgUri
                            width='16'
                            height='16'
                            uri={tokenOut?.logo_uri}
                          />
                        ) : (
                          <CyDFastImage
                            source={{ uri: tokenOut?.logo_uri ?? '' }}
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
                            {ethers.formatUnits(routeResponse.amount_out, 6)}
                          </CyDText>
                          {endsWith(tokenOut?.logo_uri, '.svg') ? (
                            <SvgUri
                              width='16'
                              height='16'
                              uri={token?.logo_uri ?? ''}
                            />
                          ) : (
                            <CyDFastImage
                              source={{ uri: token?.logo_uri ?? '' }}
                              className='w-[16px] h-[16px]'
                            />
                          )}
                          <CyDText className='text-[12px]'>
                            {token?.symbol?.toUpperCase()}
                          </CyDText>
                        </CyDView>
                      )}
                    <CyDText className='text-[14px] font-medium'>
                      {capitalize(currentChain?.chain_name)}
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
              void onGetMSg();
            }}
            title={'Bridge'}
            disabled={isEmpty(routeResponse)}
            loading={loading}
            loaderStyle={styles.loaderStyle}
          />
        </CyDView>
      )}
      {bridgeDoneStatus === TxnStatus.STATE_COMPLETED_SUCCESS && (
        <CyDView className='mt-[32px] flex flex-col items-center justify-center'>
          <CyDImage source={AppImages.CYPHER_SUCCESS} />
          <CyDText className='text-center'>{t('BRIDGE_SUCCESS')}</CyDText>
          <CyDView>
            <Button
              onPress={() => {
                setIndex(0);
                void onBridgeSuccess('success');
              }}
              title={'Create new swap'}
              disabled={isEmpty(routeResponse)}
              loading={loading}
            />
          </CyDView>
        </CyDView>
      )}
      {bridgeDoneStatus === TxnStatus.STATE_COMPLETED_ERROR && (
        <CyDView className='mt-[32px] flex flex-col items-center justify-center'>
          <CyDImage source={AppImages.CYPHER_ERROR} />
          <CyDText className='text-center'>{t('BRIDGE_FAILURE')}</CyDText>
          <CyDView>
            <Button
              onPress={() => {
                setIndex(0);
                void onBridgeSuccess('falied');
              }}
              title={'Create new swap'}
              disabled={isEmpty(routeResponse)}
              loading={loading}
            />
          </CyDView>
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
