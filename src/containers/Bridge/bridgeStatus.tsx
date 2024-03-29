import React, { useEffect, useState } from 'react';
import { CyDImage, CyDText, CyDView } from '../../styles/tailwindStyles';
import axios, { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import clsx from 'clsx';
import AppImages from '../../../assets/images/appImages';
import Timeline from '../../components/v2/timeline';
import { screenTitle } from '../../constants';
import { BridgeStatusPropsInterface } from '../../models/bridgeStatusProps.interface';
import { useTranslation } from 'react-i18next';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { convertAmountOfContractDecimal } from '../../core/util';
import { hostWorker } from '../../global';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';
import * as Sentry from '@sentry/react-native';

export default function BridgeStatus ({ navigation, route }: { navigation: any, route: { params: BridgeStatusPropsInterface}}) {
  const { t } = useTranslation();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const [timeLineIndex, setTimeLineIndex] = useState<number>(0);
  const [error, setError] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();

  const {
    fromChain,
    fromToken,
    toChain,
    toToken,
    sentAmount,
    receivedAmount,
    quoteId,
    sentAmountUsd
  }: BridgeStatusPropsInterface = route.params;
  const timeLineData = [
    'Bridge Initiated',
    'Transferring from your wallet',
    `Swapping ${(fromToken.name).toUpperCase()} to ${(toToken.name).toUpperCase()}`,
    'Depositing into your wallet'
  ];

  useEffect(() => {
    const pingTicket = async (id: string) => {
      const intervalID = setInterval(() => {
        const x = async (id: string) => {
          const activityStatusUrl = `${ARCH_HOST}/v1/activities/status/bridge/${id}`;
          try {
            const { data: { activityStatus: { status } } } = await axios.get(activityStatusUrl, { timeout: 3000 });
            if (status === 'COMPLETED') {
              await intercomAnalyticsLog('cosmos_bridge_success', {
                from_token: fromToken,
                form_chain: fromChain,
                to_chain: toChain,
                to_token: toToken,
                amount_crypto: sentAmount,
                amount_usd: sentAmountUsd
              });
              setTimeLineIndex(3);
              clearInterval(intervalID);
            } else if (status === 'SWAPPED') setTimeLineIndex(2);
            else if (status === 'RECEIVED_IBC') setTimeLineIndex(1);
            else if (status === 'DELAYED') {
              await intercomAnalyticsLog('cosmos_bridge_delayed', {
                from_token: fromToken,
                form_chain: fromChain,
                to_chain: toChain,
                to_token: toToken,
                amount_crypto: sentAmount,
                amount_usd: sentAmountUsd
              });
              clearInterval(intervalID);
              setError(true);
              showModal('state', {
                type: 'error',
                title: 'Delayed',
                description: `Your transaction in taking more time than expected. Please contact customer support with the quote_id: ${id}`,
                onSuccess: () => {
                  hideModal();
                  setTimeout(() => {
                    navigation.navigate(screenTitle.ACTIVITIES);
                  }, MODAL_HIDE_TIMEOUT);
                },
                onFailure: hideModal
              });
            }
          } catch (e) {
            Sentry.captureException(e);
          }
        };
        void x(id);
      }, 5000);
      return () => {
        clearInterval(intervalID);
      };
    };
    void pingTicket(quoteId);
  }, []);

  return (
    <CyDView className={'bg-white h-full w-full'}>
      <CyDView
        className={clsx('py-[20px]  flex flex-col items-center', {
          'bg-[#F3FFFB]': timeLineIndex === 3,
          'bg-[#F6F7FF]': timeLineIndex < 3
        })}
      >
        <CyDView className={'flex flex-row justify-evenly items-center w-3/4 '}>
          <CyDView className={'flex flex-col justify-center items-center w-1/2'}>
            <CyDImage
              source={{ uri: fromToken?.logoUrl }}
              className={'w-[34px] h-[34px] mb-[12px] rounded-[8px]'}
            />
            <CyDText className={'text-[14px] font-bold text-center'}>
              {fromToken?.name}
            </CyDText>
          </CyDView>

          <CyDView className={'flex flex-col items-center'}>
            <CyDText
              className={'text-[32px] font-bold'}
            >
              {convertAmountOfContractDecimal(sentAmount, 6).toString()}
            </CyDText>
            <CyDView className={'flex items-center justify-center'}>
              <CyDView
                className={
                  'bg-white flex flex-row items-center p-[4px]'
                }
              >
                <CyDImage
                  source={fromChain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={'ml-[6px] font-normal text-[12px] '}
                >
                  {fromChain.name}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className={'flex flex-row items-center my-[20px]'}>
          <CyDView className={'w-4/12 h-[1px] bg-[#E1E1EF]'}></CyDView>
          <CyDImage source={AppImages.APP_SEL} className={'mx-[8px]'}/>
          <CyDView className={'w-4/12 h-[1px] bg-[#E1E1EF]'}></CyDView>
        </CyDView>
        <CyDView className={'flex flex-row justify-evenly items-center w-3/4 '}>
          <CyDView className={'flex flex-col justify-center items-center w-1/2'}>
            <CyDImage
              source={{ uri: toToken?.logoUrl }}
              className={'w-[34px] h-[34px] mb-[12px] rounded-[8px]'}
            />
            <CyDText className={' text-[14px] font-bold text-center'}>
              {toToken?.name}
            </CyDText>
          </CyDView>

          <CyDView className={'flex flex-col items-center'}>
            <CyDText
              className={'text-[32px] font-bold'}
            >
              {parseFloat(receivedAmount).toFixed(3)}
            </CyDText>
            <CyDView className={'flex items-center justify-center'}>
              <CyDView
                className={
                  'bg-white flex flex-row items-center p-[4px]'
                }
              >
                <CyDImage
                  source={toChain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={'ml-[6px] font-normal text-[12px]'}
                >
                  {toChain.name}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
      <CyDView className={'p-[24px] h-[80%]'}>
        <Timeline
          header={<CyDText
            className={
              'text-center mb-[20px] text-[24px] font-extrabold'
            }
          >
            {timeLineIndex === timeLineData.length ? 'Completed' : 'In Progress'}
          </CyDText>}
          footer={<CyDView className={'flex flex-row items-center justify-center mt-[20px] mb-[50%]'}>
            <Button
              title={t('CLOSE')}
              type={ButtonType.GREY}
              style='h-[60px] w-full'
              onPress={() => {
                navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
              }}
            />
          </CyDView>}
          fillIndex={timeLineIndex}
          data={
            timeLineData
          }
          error={error}
        />
      </CyDView>
    </CyDView>);
}
