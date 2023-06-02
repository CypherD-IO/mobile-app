import React, { useEffect, useState } from 'react';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
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
            await intercomAnalyticsLog(`cosmos_bridge_${fromToken.name.toLowerCase()}_${toToken.name.toLowerCase()}_success`, {
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
            await intercomAnalyticsLog(`cosmos_bridge_${fromToken.name.toLowerCase()}_${toToken.name.toLowerCase()}_delayed`, {
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
              description: 'Your transaction in taking more time than expected. Please contact Cypher support.\n Sorry for the inconvenience ',
              onSuccess: () => {
                hideModal();
                setTimeout(() => {
                  navigation.navigate(screenTitle.ACTIVITIES);
                }, MODAL_HIDE_TIMEOUT);
              },
              onFailure: hideModal
            });
          }
        };
        void x(id);
      }, 5000);
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
        <CyDView className={'flex flex-row'}>
          <CyDView className={'flex flex-col items-center'}>
            <CyDImage
              source={{ uri: fromToken?.logoUrl }}
              className={'w-[44px] h-[44px] mb-[12px]'}
            />
            <CyDText className={'text-black text-[14px] font-bold'}>
              {fromToken?.name}
            </CyDText>
          </CyDView>

          <CyDView className={'flex flex-col items-center ml-[40px]'}>
            <CyDText
              className={'font-[#434343] text-[40px] font-bold font-nunito'}
            >
              {convertAmountOfContractDecimal(sentAmount, 6).toString()}
            </CyDText>
            <CyDView className={'flex items-center justify-center'}>
              <CyDView
                className={
                  'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                }
              >
                <CyDImage
                  source={fromChain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={'ml-[6px] font-nunito font-normal text-[12px] text-black '}
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
        <CyDView className={'flex flex-row'}>
          <CyDView className={'flex flex-col items-center'}>
            <CyDImage
              source={{ uri: toToken?.logoUrl }}
              className={'w-[44px] h-[44px] mb-[12px]'}
            />
            <CyDText className={'text-black text-[14px] font-bold'}>
              {toToken?.name}
            </CyDText>
          </CyDView>

          <CyDView className={'flex flex-col items-center ml-[40px]'}>
            <CyDText
              className={'font-[#434343] text-[40px] font-bold font-nunito text-black '}
            >
              {parseFloat(receivedAmount).toFixed(3)}
            </CyDText>
            <CyDView className={'flex items-center justify-center'}>
              <CyDView
                className={
                  'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                }
              >
                <CyDImage
                  source={toChain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={'ml-[6px] text-black font-nunito font-normal text-[12px]'}
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
              'text-center mb-[20px] text-[24px] font-nunito text-black font-extrabold'
            }
          >
            {timeLineIndex === timeLineData.length ? 'Completed' : 'In Progress'}
          </CyDText>}
          footer={<CyDView className={'flex flex-row items-center justify-center mt-[20px] mb-[50%]'}>
            <CyDTouchView
              onPress={() => {
                navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
              }}
              className={'border-[1px] border-[#525252] rounded-[12px] w-3/4 p-[20px]'}
            >
              <CyDText className={'text-center text-black '}>{t<string>('CLOSE')}</CyDText>
            </CyDTouchView>
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
