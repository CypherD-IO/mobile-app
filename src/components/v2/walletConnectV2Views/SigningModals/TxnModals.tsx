import React from 'react';
import { DecodedResponseTypes } from '../../../../constants/enum';
import { Chain } from '../../../../constants/server';
import { intercomAnalyticsLog } from '../../../../containers/utilities/analyticsUtility';
import {
  IDAppInfo,
  ISendTxnData,
  IExtendedDecodedTxnResponse,
  ISwapTxnData,
  IApproveTokenData,
} from '../../../../models/signingModalData.interface';
import { formatAmount, getMaskedAddress } from '../../../../core/util';
import {
  CyDFastImage,
  CyDIcons,
  CyDText,
  CyDView,
} from '../../../../styles/tailwindStyles';
import {
  Divider,
  RenderDAPPInfo,
  RenderMessage,
  RenderMethod,
  RenderNetwork,
} from './SigningModalComponents';
import { t } from 'i18next';
import AppImages from '../../../../../assets/images/appImages';
import { DecimalHelper } from '../../../../utils/decimalHelper';

export const RenderTransactionSignModal = ({
  dAppInfo,
  chain,
  method,
  data,
  nativeSendTxnData,
}: {
  dAppInfo: IDAppInfo | undefined;
  chain: Chain;
  method: string;
  data: IExtendedDecodedTxnResponse | null;
  nativeSendTxnData: ISendTxnData | null;
}) => {
  if (!nativeSendTxnData) {
    if (data && 'to' in data) {
      // Render fallback modal given that it is a EvmosTxn
      return (
        <RenderDefaultSignModal
          dAppInfo={dAppInfo}
          chain={chain}
          method={method}
          data={data}
        />
      );
    }
    switch (data?.type) {
      case DecodedResponseTypes.SEND: {
        void intercomAnalyticsLog('eth_sendTransaction_SEND');
        if (data?.gasPrice && data.native_token.amount && data.type_send) {
          const gasPriceInWei = DecimalHelper.multiply(
            data?.gasPrice,
            DecimalHelper.pow(10, 9),
          );
          const gasInTokens = DecimalHelper.multiply(data?.gas.gas_limit, [
            gasPriceInWei,
            DecimalHelper.pow(10, -data?.native_token.decimals),
          ]);
          const gasAndUSDAppx = `${formatAmount(gasInTokens)} ${
            data?.native_token.symbol
          } ≈ $${formatAmount(
            DecimalHelper.multiply(gasInTokens, data?.native_token.price),
          )} USD`;
          const availableBalance = `${formatAmount(data.native_token.amount)} ${
            data.native_token.symbol
          }`;
          const sendTxnData = {
            chainLogo: chain.logo_url,
            token: {
              logo: data.type_send.token.logo_url,
              name: data.type_send.token.name,
              amount: String(data.type_send.token_amount),
              valueInUSD: DecimalHelper.multiply(
                data.type_send.token_amount,
                data?.type_send?.token.price,
              ).toString(),
            },
            toAddress: data.type_send.to_addr,
            fromAddress: data.from_addr,
            gasAndUSDAppx,
            availableBalance,
          };
          return (
            <RenderSendTransactionSignModal
              dAppInfo={dAppInfo}
              sendTxnData={sendTxnData}
            />
          );
        } else {
          return (
            <RenderDefaultSignModal
              dAppInfo={dAppInfo}
              chain={chain}
              method={method}
              data={data}
            />
          );
        }
      }
      case DecodedResponseTypes.APPROVE: {
        void intercomAnalyticsLog('eth_sendTransaction_APPROVE');
        if (
          data?.type_token_approval &&
          data.gasPrice &&
          data.native_token.amount
        ) {
          const approvalToken = data?.type_token_approval?.token;
          const gasPriceInWei = DecimalHelper.multiply(
            data?.gasPrice,
            DecimalHelper.pow(10, 9),
          );
          const gasInTokens = DecimalHelper.multiply(data?.gas.gas_limit, [
            gasPriceInWei,
            DecimalHelper.pow(10, -data?.native_token.decimals),
          ]);
          const approveTokenData: IApproveTokenData = {
            approvalTokenLogo: approvalToken.logo_url,
            chainLogo: chain.logo_url,
            amount: {
              inTokensWithSymbol: `${data.type_token_approval.token_amount} ${data.type_token_approval.token_symbol}`,
              inUSDWithSymbol: `$${DecimalHelper.multiply(
                data.type_token_approval.token_amount,
                approvalToken.price,
              ).toString()}`,
            },
            spender: {
              address: getMaskedAddress(data.type_token_approval.spender, 10),
              protocol: {
                logo: data.type_token_approval.spender_protocol_logo_url,
                name: data.type_token_approval.spender_protocol_name,
              },
            },
            gasWithUSDAppx: `${formatAmount(gasInTokens)} ${
              data?.native_token.symbol
            } ≈ $${formatAmount(
              DecimalHelper.multiply(gasInTokens, data?.native_token.price),
            )} USD`,
            availableBalance: `${formatAmount(data.native_token.amount)} ${
              data.native_token.symbol
            }`,
          };
          return (
            <RenderApproveTokenModal
              dAppInfo={dAppInfo}
              approveTokenData={approveTokenData}
            />
          );
        } else {
          return (
            <RenderDefaultSignModal
              dAppInfo={dAppInfo}
              chain={chain}
              method={method}
              data={data}
            />
          );
        }
      }
      case DecodedResponseTypes.CALL: {
        void intercomAnalyticsLog('eth_sendTransaction_CALL');
        if (data?.gasPrice) {
          const {
            send_token_list: sendTokenList,
            receive_token_list: receiveTokenList,
          } = data.balance_change;
          if (
            sendTokenList[0]?.amount &&
            sendTokenList[0]?.usd_value &&
            receiveTokenList[0]?.amount &&
            receiveTokenList[0]?.usd_value
          ) {
            const gasPriceInWei = DecimalHelper.multiply(
              data?.gasPrice,
              DecimalHelper.pow(10, 9),
            );
            const gasInTokens = DecimalHelper.multiply(data?.gas.gas_limit, [
              gasPriceInWei,
              DecimalHelper.pow(10, -data?.native_token.decimals),
            ]);
            const swapTxnData: ISwapTxnData = {
              sendToken: {
                name: sendTokenList[0].name,
                logo: sendTokenList[0].logo_url,
              },
              receiveToken: {
                name: receiveTokenList[0].name,
                logo: receiveTokenList[0].logo_url,
              },
              chain: {
                name: chain.name,
                logo: chain.logo_url,
              },
              sentAmount: {
                inTokensWithSymbol: `${formatAmount(
                  sendTokenList[0]?.amount,
                )} ${sendTokenList[0].symbol}`,
                inUSDWithSymbol: `${formatAmount(
                  sendTokenList[0]?.usd_value,
                )} USD`,
              },
              receivedAmount: {
                inTokensWithSymbol: `${formatAmount(
                  receiveTokenList[0].amount,
                )} ${receiveTokenList[0].symbol}`,
                inUSDWithSymbol: `${formatAmount(
                  receiveTokenList[0].usd_value,
                )} USD`,
              },
              gas: {
                inTokensWithSymbol: `${formatAmount(gasInTokens)} ${
                  data?.native_token.symbol
                }`,
                inUSDWithSymbol: `${formatAmount(
                  DecimalHelper.multiply(gasInTokens, data?.native_token.price),
                )} USD`,
              },
            };
            return (
              <RenderSwapTransactionSignModal
                dAppInfo={dAppInfo}
                swapTxnData={swapTxnData}
              />
            );
          } else {
            return (
              <RenderDefaultSignModal
                dAppInfo={dAppInfo}
                chain={chain}
                method={method}
                data={data}
              />
            );
          }
        } else {
          return (
            <RenderDefaultSignModal
              dAppInfo={dAppInfo}
              chain={chain}
              method={method}
              data={data}
            />
          );
        }
      }
      default: {
        void intercomAnalyticsLog('eth_sendTransaction_DEFAULT');
        return (
          <RenderDefaultSignModal
            dAppInfo={dAppInfo}
            chain={chain}
            method={method}
            data={data}
          />
        );
      }
    }
  } else {
    // isNative and no data param = definitely send txn
    void intercomAnalyticsLog('eth_sendTransaction_SEND');
    if (nativeSendTxnData) {
      return (
        <RenderSendTransactionSignModal
          dAppInfo={dAppInfo}
          sendTxnData={nativeSendTxnData}
        />
      );
    } else {
      return (
        <RenderDefaultSignModal
          dAppInfo={dAppInfo}
          chain={chain}
          method={method}
          data={data}
        />
      );
    }
  }
};

const RenderDefaultSignModal = ({
  dAppInfo,
  chain,
  method,
  data,
}: {
  dAppInfo: IDAppInfo | undefined;
  chain: Chain | undefined;
  method: string;
  data: any;
}) => {
  return (
    <CyDView>
      {dAppInfo ? (
        <>
          <RenderDAPPInfo dAppInfo={dAppInfo} />
          <Divider />
        </>
      ) : null}
      <CyDView className='flex flex-row items-center rounded-[8px] justify-center py-[16px] mb-[20px] bg-warningYellow'>
        <CyDFastImage
          source={AppImages.CYPHER_WARNING_RED}
          className='h-[30px] w-[30px] ml-[13px] mr-[13px]'
          resizeMode='contain'
        />
        <CyDText className='text-red-500 text-[12px] font-medium px-[10px] w-[80%] '>
          {t<string>('UNABLE_TO_DECODE_TRANSACTION')}
        </CyDText>
      </CyDView>
      <RenderNetwork chain={chain} />
      <Divider />
      <RenderMethod method={method} />
      <Divider />
      <CyDView>
        <CyDView>
          <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>
            {t<string>('DATA')}
          </CyDText>
        </CyDView>
        <CyDView>
          <CyDView
            className={'my-[5px] border-[1px] border-n40 bg-n0 rounded-[8px]'}>
            <CyDView className='p-[10px]'>
              <CyDText className={'text-[16px] ml-[6px]'}>
                {JSON.stringify(data, null, '\t')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

const RenderSendTransactionSignModal = ({
  dAppInfo,
  sendTxnData,
}: {
  dAppInfo: IDAppInfo | undefined;
  sendTxnData: ISendTxnData;
}) => {
  const {
    chainLogo,
    token,
    toAddress,
    fromAddress,
    gasAndUSDAppx,
    availableBalance,
  } = sendTxnData;
  return (
    <CyDView>
      {dAppInfo ? (
        <>
          <RenderDAPPInfo dAppInfo={dAppInfo} />
        </>
      ) : null}
      <CyDView className='my-[10px]'>
        <CyDView>
          <CyDView className='flex flex-col items-center'>
            <CyDView className={'flex flex-row justify-center items-center'}>
              <CyDView className='flex flex-row h-full mb-[10px] items-center self-center pl-[13px] pr-[10px]'>
                <CyDFastImage
                  className={'h-[30px] w-[30px] rounded-[50px]'}
                  source={{ uri: token.logo }}
                  resizeMode='contain'
                />
                <CyDView className='absolute top-[60%] right-[3px]'>
                  <CyDFastImage
                    className={
                      'h-[18px] w-[18px] rounded-[50px] border-[1px] border-n40 bg-n0'
                    }
                    source={chainLogo}
                    resizeMode='contain'
                  />
                </CyDView>
              </CyDView>
              <CyDView>
                <CyDText className='text-[22px] font-bold mb-[10px]'>
                  {token.name}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView>
              <CyDText className='text-[48px] font-bold'>
                {formatAmount(token.amount)}
              </CyDText>
            </CyDView>
            <CyDView>
              <CyDText className='text-[24px] text-subTextColor font-semibold'>
                {formatAmount(token.valueInUSD).toString() + ' USD'}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='my-[10px]'>
            <CyDView className={'bg-n40 rounded-[8px] py-[20px] px-[10px]'}>
              <CyDView className='flex flex-row justify-between'>
                <CyDText className={'text-[16px] ml-[6px] font-bold'}>
                  {t('TO')}
                </CyDText>
                <CyDText className={'text-[16px]'}>
                  {getMaskedAddress(toAddress, 10)}
                </CyDText>
              </CyDView>
              <CyDView className={'h-[1px] bg-n40 mt-[14px] mb-[8px]'} />
              <CyDView className='flex flex-row justify-between'>
                <CyDText className={'text-[16px] ml-[6px] font-bold'}>
                  {t('FROM')}
                </CyDText>
                <CyDText className={'text-[16px]'}>
                  {getMaskedAddress(fromAddress, 10)}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='my-[10px]'>
            <CyDView
              className={
                'bg-infoTextBackground rounded-[8px] py-[20px] px-[10px]'
              }>
              <CyDView className='flex flex-row justify-between'>
                <CyDText className={'font-bold text-[16px]'}>
                  {t('GAS')}
                </CyDText>
                <CyDText
                  className={'font-medium text-[16px] text-subTextColor'}>
                  {gasAndUSDAppx}
                </CyDText>
              </CyDView>
              <CyDView className={'h-[1px] bg-n40 mt-[14px] mb-[8px]'} />
              <CyDView className='flex flex-row justify-between'>
                <CyDText className={'font-bold text-[16px]'}>
                  {t('AVAILABLE_BALANCE')}
                </CyDText>
                <CyDText
                  className={'font-medium text-[16px] text-subTextColor'}>
                  {availableBalance}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

const RenderSwapTransactionSignModal = ({
  dAppInfo,
  swapTxnData,
}: {
  dAppInfo: IDAppInfo | undefined;
  swapTxnData: ISwapTxnData;
}) => {
  const { sendToken, receiveToken, chain, sentAmount, receivedAmount, gas } =
    swapTxnData;
  return (
    <CyDView>
      {dAppInfo ? (
        <>
          <RenderDAPPInfo dAppInfo={dAppInfo} />
        </>
      ) : null}
      <CyDView className='my-[10px]'>
        <CyDView className='flex flex-col items-center'>
          <CyDView className={'flex flex-row justify-center items-center'}>
            <CyDView
              className={
                'flex flex-row justify-between items-center w-[100%] my-[20px] bg-[#F7F8FE] rounded-[8px] px-[15px] py-[20px]'
              }>
              <CyDView className={'flex w-[40%] items-center justify-center'}>
                <CyDView className='items-center'>
                  <CyDFastImage
                    source={{ uri: sendToken.logo }}
                    className={'w-[44px] h-[44px] rounded-[8px]'}
                  />
                  <CyDText
                    className={
                      'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center '
                    }>
                    {sendToken.name}
                  </CyDText>
                  <CyDView
                    className={
                      'bg-n0 rounded-[8px] flex flex-row items-center p-[4px]'
                    }>
                    <CyDFastImage
                      source={chain.logo}
                      className={'w-[14px] h-[14px]'}
                    />
                    <CyDText
                      className={
                        'ml-[6px]  font-normal text-black  text-[12px]'
                      }>
                      {chain.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
              <CyDView className={'flex h-[16px] w-[16px] justify-center'}>
                <CyDIcons name='refresh' size={40} className='text-base400' />
              </CyDView>
              <CyDView
                className={
                  'flex w-[40%] items-center self-center align-center justify-center'
                }>
                <CyDView className='items-center'>
                  <CyDFastImage
                    source={{ uri: receiveToken.logo }}
                    className={'w-[44px] h-[44px] rounded-[8px]'}
                  />
                  <CyDText
                    className={
                      'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center '
                    }>
                    {receiveToken.name}
                  </CyDText>
                  <CyDView
                    className={
                      'bg-n0 rounded-[8px] flex flex-row items-center p-[4px]'
                    }>
                    <CyDFastImage
                      source={chain.logo}
                      className={'w-[14px] h-[14px]'}
                    />
                    <CyDText
                      className={
                        'ml-[6px]  text-black font-normal text-[12px]'
                      }>
                      {chain.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <Divider />
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDText className={'text-[16px] font-semibold'}>
            {t<string>('SENT_AMOUNT')}
          </CyDText>
          <CyDView className={'mr-[10px] flex items-end'}>
            <CyDText className='text-[14px] font-bold max-w-[150px]'>
              {sentAmount.inTokensWithSymbol}
            </CyDText>
            <CyDText className='text-[12px] text-subTextColor font-bold'>
              {sentAmount.inUSDWithSymbol}
            </CyDText>
          </CyDView>
        </CyDView>
        <Divider />
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDText className={'text-[16px] font-semibold'}>
            {t<string>('TOTAL_RECEIVED')}
          </CyDText>
          <CyDView className={'mr-[10px] flex items-end'}>
            <CyDText className='text-[14px] font-bold max-w-[150px]'>
              {receivedAmount.inTokensWithSymbol}
            </CyDText>
            <CyDText className='text-[12px] text-subTextColor font-bold'>
              {receivedAmount.inUSDWithSymbol}
            </CyDText>
          </CyDView>
        </CyDView>
        <Divider />
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDText className={'text-[16px] font-semibold'}>
            {t<string>('GAS_FEE')}
          </CyDText>
          <CyDView className={'mr-[10px] flex items-end'}>
            <CyDText className='text-[12px] font-bold max-w-[150px]'>
              {gas.inTokensWithSymbol}
            </CyDText>
            <CyDText className='text-[12px] text-subTextColor font-bold'>
              {gas.inUSDWithSymbol}
            </CyDText>
          </CyDView>
        </CyDView>
        <Divider />
      </CyDView>
    </CyDView>
  );
};

const RenderApproveTokenModal = ({
  dAppInfo,
  approveTokenData,
}: {
  dAppInfo: IDAppInfo | undefined;
  approveTokenData: IApproveTokenData;
}) => {
  const {
    approvalTokenLogo,
    chainLogo,
    spender,
    gasWithUSDAppx,
    availableBalance,
  } = approveTokenData;
  return (
    <CyDView>
      {dAppInfo ? (
        <>
          <RenderDAPPInfo dAppInfo={dAppInfo} />
        </>
      ) : null}
      <CyDView className='my-[10px]'>
        <CyDView className='flex flex-col items-center rounded-[8px] bg-n40'>
          <CyDView className='px-[10px] my-[10px]'>
            <CyDText className='font-bold text-[16px]'>
              {t('APPROVAL_TOKEN')}
            </CyDText>
          </CyDView>
          <CyDView
            className={'flex flex-row justify-center items-center my-[10px]'}>
            <CyDView className='flex flex-row h-full mb-[10px] items-center self-center pr-[10px]'>
              <CyDFastImage
                className={'h-[60px] w-[60px] rounded-[50px]'}
                source={{ uri: approvalTokenLogo }}
                resizeMode='contain'
              />
              <CyDView className='absolute top-[60%] right-[3px]'>
                <CyDFastImage
                  className={
                    'h-[26px] w-[26px] rounded-[50px] border-[1px] border-n40 bg-n0'
                  }
                  source={chainLogo}
                  resizeMode='contain'
                />
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='my-[10px]'>
          <CyDView className={'bg-n40 rounded-[8px] py-[20px] px-[10px]'}>
            <CyDView className='flex flex-row justify-between'>
              <CyDText className={'text-[14px] ml-[6px] font-bold'}>
                {t('SPENDER')}
              </CyDText>
              <CyDText className={'text-[14px]'}>{spender.address}</CyDText>
            </CyDView>
            <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'} />
            <CyDView className='flex flex-row justify-between'>
              <CyDText className={'text-[14px] ml-[6px] font-bold'}>
                {t('APPROVE_TO')}
              </CyDText>
              <CyDView>
                <CyDFastImage source={{ uri: spender.protocol.logo }} />
                <CyDText className={'text-[14px]'}>
                  {spender.protocol.name}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='my-[10px]'>
          <CyDView
            className={
              'bg-infoTextBackground rounded-[8px] py-[20px] px-[10px]'
            }>
            <CyDView className='flex flex-row justify-between'>
              <CyDText className={'font-bold text-[16px]'}>{t('GAS')}</CyDText>
              <CyDText className={'font-medium text-[16px] text-subTextColor'}>
                {gasWithUSDAppx}
              </CyDText>
            </CyDView>
            <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'} />
            <CyDView className='flex flex-row justify-between'>
              <CyDText className={'font-bold text-[16px]'}>
                {t('AVAILABLE_BALANCE')}
              </CyDText>
              <CyDText className={'font-medium text-[16px] text-subTextColor'}>
                {availableBalance}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

export const RenderTypedTransactionSignModal = ({
  dAppInfo,
  chain,
  method,
  messageParams,
}: {
  dAppInfo: IDAppInfo | undefined;
  chain: Chain | undefined;
  method: string;
  messageParams: any;
}) => {
  return (
    <CyDView>
      <CyDView>
        {dAppInfo ? (
          <>
            <RenderDAPPInfo dAppInfo={dAppInfo} />
            <Divider />
          </>
        ) : null}
        {chain && dAppInfo ? (
          <>
            <RenderNetwork chain={chain} />
            <Divider />
          </>
        ) : null}
        {messageParams && !dAppInfo ? (
          <>
            <RenderMessage method={method} messageParams={messageParams} />
          </>
        ) : null}
      </CyDView>
    </CyDView>
  );
};
