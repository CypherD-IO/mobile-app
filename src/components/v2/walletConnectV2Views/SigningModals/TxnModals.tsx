import React from 'react';
import { DecodedResponseTypes } from '../../../../constants/enum';
import { Chain } from '../../../../constants/server';
import { intercomAnalyticsLog } from '../../../../containers/utilities/analyticsUtility';
import { IDAppInfo, ISendTxnData, IExtendedDecodedTxnResponse, ISwapTxnData, IApproveTokenData } from '../../../../models/signingModalData.interface';
import { formatAmount, getMaskedAddress } from '../../../../core/util';
import { CyDFastImage, CyDText, CyDView } from '../../../../styles/tailwindStyles';
import { Divider, RenderDAPPInfo, RenderMethod, RenderNetwork } from './SigningModalComponents';
import { t } from 'i18next';
import AppImages from '../../../../../assets/images/appImages';

export const RenderTransactionSignModal = ({ dAppInfo, chain, method, decodedABIData, nativeSendTxnData }: { dAppInfo: IDAppInfo | undefined, chain: Chain, method: string, decodedABIData: IExtendedDecodedTxnResponse | null, nativeSendTxnData: ISendTxnData | null }) => {
  if (!nativeSendTxnData) {
    switch (decodedABIData?.type) {
      case DecodedResponseTypes.SEND : {
        void intercomAnalyticsLog('eth_sendTransaction_SEND');
        if (decodedABIData?.gasPrice && decodedABIData.native_token.amount && decodedABIData.type_send) {
          const gasPriceInWei = decodedABIData?.gasPrice * 10 ** 9;
          const gasInTokens = (
            decodedABIData?.gas.gas_limit *
            gasPriceInWei *
            10 ** -decodedABIData?.native_token.decimals
          );
          const gasAndUSDAppx = `${formatAmount(gasInTokens)} ${decodedABIData?.native_token.symbol} ≈ $${formatAmount(gasInTokens * decodedABIData?.native_token.price)} USD`;
          const availableBalance = `${formatAmount(decodedABIData.native_token.amount)} ${decodedABIData.native_token.symbol}`;
          const sendTxnData = {
            chainLogo: chain.logo_url,
            token: {
              logo: decodedABIData.type_send.token.logo_url,
              name: decodedABIData.type_send.token.name,
              amount: decodedABIData.type_send.token_amount,
              valueInUSD: decodedABIData.type_send.token_amount * decodedABIData?.type_send?.token.price
            },
            toAddress: decodedABIData.type_send.to_addr,
            fromAddress: decodedABIData.from_addr,
            gasAndUSDAppx,
            availableBalance
          };
          return <RenderSendTransactionSignModal dAppInfo={dAppInfo} sendTxnData={sendTxnData} />;
        } else {
          return <RenderDefaultSignModal dAppInfo={dAppInfo} chain={chain} method={method} data={decodedABIData} />;
        }
      }
      case DecodedResponseTypes.APPROVE : {
        void intercomAnalyticsLog('eth_sendTransaction_APPROVE');
        if (decodedABIData?.type_token_approval && decodedABIData.gasPrice && decodedABIData.native_token.amount) {
          const approvalToken = decodedABIData?.type_token_approval?.token;
          const gasPriceInWei = decodedABIData?.gasPrice * 10 ** 9;
          const gasInTokens = (
            decodedABIData?.gas.gas_limit *
            gasPriceInWei *
            10 ** -decodedABIData?.native_token.decimals
          );
          const approveTokenData: IApproveTokenData = {
            approvalTokenLogo: approvalToken.logo_url,
            chainLogo: chain.logo_url,
            amount: {
              inTokensWithSymbol: `${decodedABIData.type_token_approval.token_amount} ${decodedABIData.type_token_approval.token_symbol}`,
              inUSDWithSymbol: `$${(decodedABIData.type_token_approval.token_amount * approvalToken.price).toLocaleString()}`
            },
            spender: {
              address: getMaskedAddress(decodedABIData.type_token_approval.spender, 10),
              protocol: {
                logo: decodedABIData.type_token_approval.spender_protocol_logo_url,
                name: decodedABIData.type_token_approval.spender_protocol_name
              }
            },
            gasWithUSDAppx: `${formatAmount(gasInTokens)} ${decodedABIData?.native_token.symbol} ≈ $${formatAmount(gasInTokens * decodedABIData?.native_token.price)} USD`,
            availableBalance: `${formatAmount(decodedABIData.native_token.amount)} ${decodedABIData.native_token.symbol}`
          };
          return <RenderApproveTokenModal dAppInfo={dAppInfo} approveTokenData={approveTokenData} />;
        } else {
          return <RenderDefaultSignModal dAppInfo={dAppInfo} chain={chain} method={method} data={decodedABIData} />;
        }
      }
      case DecodedResponseTypes.CALL : {
        void intercomAnalyticsLog('eth_sendTransaction_CALL');
        if (decodedABIData?.gasPrice) {
          const { send_token_list: sendTokenList, receive_token_list: receiveTokenList } = decodedABIData.balance_change;
          if (sendTokenList[0]?.amount && sendTokenList[0]?.usd_value && receiveTokenList[0]?.amount && receiveTokenList[0]?.usd_value) {
            const gasPriceInWei = decodedABIData?.gasPrice * 10 ** 9;
            const gasInTokens = (
              decodedABIData?.gas.gas_limit *
              gasPriceInWei *
              10 ** -decodedABIData?.native_token.decimals
            );
            const swapTxnData: ISwapTxnData = {
              sendToken: {
                name: sendTokenList[0].name,
                logo: sendTokenList[0].logo_url
              },
              receiveToken: {
                name: receiveTokenList[0].name,
                logo: receiveTokenList[0].logo_url
              },
              chain: {
                name: chain.name,
                logo: chain.logo_url
              },
              sentAmount: {
                inTokensWithSymbol: `${formatAmount(sendTokenList[0]?.amount)} ${sendTokenList[0].symbol}`,
                inUSDWithSymbol: `${formatAmount(sendTokenList[0]?.usd_value)} USD`
              },
              receivedAmount: {
                inTokensWithSymbol: `${formatAmount(receiveTokenList[0].amount)} ${receiveTokenList[0].symbol}`,
                inUSDWithSymbol: `${formatAmount(receiveTokenList[0].usd_value)} USD`
              },
              gas: {
                inTokensWithSymbol: `${formatAmount(gasInTokens)} ${decodedABIData?.native_token.symbol}`,
                inUSDWithSymbol: `${formatAmount(gasInTokens * decodedABIData?.native_token.price)} USD`
              }
            };
            return <RenderSwapTransactionSignModal dAppInfo={dAppInfo} swapTxnData={swapTxnData} />;
          } else {
            return <RenderDefaultSignModal dAppInfo={dAppInfo} chain={chain} method={method} data={decodedABIData} />;
          }
        } else {
          return <RenderDefaultSignModal dAppInfo={dAppInfo} chain={chain} method={method} data={decodedABIData} />;
        }
      }
      default : {
        void intercomAnalyticsLog('eth_sendTransaction_DEFAULT');
        return <RenderDefaultSignModal dAppInfo={dAppInfo} chain={chain} method={method} data={decodedABIData} />;
      }
    }
  } else { // isNative and no data param = definitely send txn
    void intercomAnalyticsLog('eth_sendTransaction_SEND');
    if (nativeSendTxnData) {
      return <RenderSendTransactionSignModal dAppInfo={dAppInfo} sendTxnData={nativeSendTxnData} />;
    } else {
      return <RenderDefaultSignModal dAppInfo={dAppInfo} chain={chain} method={method} data={decodedABIData} />;
    }
  }
};

const RenderDefaultSignModal = ({ dAppInfo, chain, method, data }: {dAppInfo: IDAppInfo | undefined, chain: Chain | undefined, method: string, data: any }) => {
  return (
    <CyDView>
      {dAppInfo
        ? <>
        <RenderDAPPInfo dAppInfo={dAppInfo} />
        <Divider />
         </>
        : null}
      <RenderNetwork chain={chain} />
      <Divider />
      <RenderMethod method={method} />
      <Divider />
      <CyDView>
          <CyDView>
            <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{t<string>('DATA')}</CyDText>
          </CyDView>
          <CyDView>
            <CyDView className={'my-[5px] border-[1px] border-sepratorColor bg-infoTextBackground rounded-[6px]'}>
              <CyDView className='p-[10px]'>
                <CyDText className={'text-[16px] ml-[6px]'}>{JSON.stringify(data, null, '\t')}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
    </CyDView>
  );
};

const RenderSendTransactionSignModal = ({ dAppInfo, sendTxnData }: {dAppInfo: IDAppInfo | undefined, sendTxnData: ISendTxnData}) => {
  const { chainLogo, token, toAddress, fromAddress, gasAndUSDAppx, availableBalance } = sendTxnData;
  return (
      <CyDView>
        {dAppInfo
          ? <>
        <RenderDAPPInfo dAppInfo={dAppInfo} />
         </>
          : null}
        <CyDView className='my-[10px]'>
          <CyDView>
            <CyDView className='flex flex-col items-center'>
              <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDView className='flex flex-row h-full mb-[10px] items-center rounded-r-[20px] self-center pl-[13px] pr-[10px]'>
                  <CyDFastImage
                    className={'h-[30px] w-[30px] rounded-[50px]'}
                    source={{ uri: token.logo }}
                    resizeMode='contain'
                    />
                  <CyDView className='absolute top-[60%] right-[3px]'>
                    <CyDFastImage
                      className={'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'}
                      source={chainLogo}
                      resizeMode='contain'
                      />
                  </CyDView>
                </CyDView>
                <CyDView>
                  <CyDText className='text-[22px] font-bold mb-[10px]'>{token.name}</CyDText>
                </CyDView>
              </CyDView>
              <CyDView>
                  <CyDText className='text-[48px] font-bold'>{formatAmount(token.amount)}</CyDText>
              </CyDView>
              <CyDView>
                  <CyDText className='text-[24px] text-subTextColor font-semibold'>{formatAmount(token.valueInUSD) + ' USD'}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='my-[10px]'>
              <CyDView className={'bg-sepratorColor rounded-[12px] py-[20px] px-[10px]'}>
                <CyDView className='flex flex-row justify-between'>
                  <CyDText className={'text-[16px] ml-[6px] font-bold'}>{t('TO')}</CyDText>
                  <CyDText className={'text-[16px]'}>{getMaskedAddress(toAddress, 10)}</CyDText>
                </CyDView>
                <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'}></CyDView>
                <CyDView className='flex flex-row justify-between'>
                  <CyDText className={'text-[16px] ml-[6px] font-bold'}>{t('FROM')}</CyDText>
                  <CyDText className={'text-[16px]'}>{getMaskedAddress(fromAddress, 10)}</CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='my-[10px]'>
              <CyDView className={'bg-infoTextBackground rounded-[12px] py-[20px] px-[10px]'}>
                <CyDView className='flex flex-row justify-between'>
                <CyDText className={'font-bold text-[16px]'}>{t('GAS')}</CyDText>
                <CyDText className={'font-medium text-[16px] text-subTextColor'}>{gasAndUSDAppx}</CyDText>
                </CyDView>
                <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'}></CyDView>
                <CyDView className='flex flex-row justify-between'>
                <CyDText className={'font-bold text-[16px]'}>{t('AVAILABLE_BALANCE')}</CyDText>
                <CyDText className={'font-medium text-[16px] text-subTextColor'}>{availableBalance}</CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
        </CyDView>
      </CyDView>
      </CyDView>
  );
};

const RenderSwapTransactionSignModal = ({ dAppInfo, swapTxnData }: {dAppInfo: IDAppInfo | undefined, swapTxnData: ISwapTxnData}) => {
  const { sendToken, receiveToken, chain, sentAmount, receivedAmount, gas } = swapTxnData;
  return (
        <CyDView>
          {dAppInfo
            ? <>
        <RenderDAPPInfo dAppInfo={dAppInfo} />
         </>
            : null}
          <CyDView className='my-[10px]'>
              <CyDView className='flex flex-col items-center'>
                <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDView className={'flex flex-row justify-between items-center w-[100%] my-[20px] bg-[#F7F8FE] rounded-[20px] px-[15px] py-[20px]'}>
                      <CyDView className={'flex w-[40%] items-center justify-center'}>
                        <CyDView className="items-center">
                          <CyDFastImage source={{ uri: sendToken.logo }} className={'w-[44px] h-[44px]'} />
                            <CyDText className={'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'}>
                              {sendToken.name}
                            </CyDText>
                            <CyDView className={'bg-white rounded-[20px] flex flex-row items-center p-[4px]'}>
                              <CyDFastImage source={chain.logo} className={'w-[14px] h-[14px]'} />
                              <CyDText className={'ml-[6px] font-nunito font-normal text-black  text-[12px]'}>
                                {chain.name}
                              </CyDText>
                            </CyDView>
                        </CyDView>
                      </CyDView>
                      <CyDView className={'flex h-[16px] w-[16px] justify-center'}>
                        <CyDFastImage source={AppImages.SWAP} className='h-full w-full' resizeMode='contain' />
                      </CyDView>
                      <CyDView className={'flex w-[40%] items-center self-center align-center justify-center'}>
                        <CyDView className="items-center">
                          <CyDFastImage source={{ uri: receiveToken.logo }} className={'w-[44px] h-[44px]'} />
                          <CyDText className={'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'}>
                            {receiveToken.name}
                          </CyDText>
                          <CyDView className={'bg-white rounded-[20px] flex flex-row items-center p-[4px]'}>
                            <CyDFastImage source={chain.logo} className={'w-[14px] h-[14px]'} />
                            <CyDText className={'ml-[6px] font-nunito text-black font-normal text-[12px]'}>
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

const RenderApproveTokenModal = ({ dAppInfo, approveTokenData }: {dAppInfo: IDAppInfo | undefined, approveTokenData: IApproveTokenData}) => {
  const { approvalTokenLogo, chainLogo, spender, gasWithUSDAppx, availableBalance } = approveTokenData;
  return (
      <CyDView>
        {dAppInfo
          ? <>
        <RenderDAPPInfo dAppInfo={dAppInfo} />
         </>
          : null}
        <CyDView className='my-[10px]'>
        <CyDView className='flex flex-col gap-[10px] items-center rounded-[20px] bg-sepratorColor'>
              <CyDView className='px-[10px] my-[10px]'>
                <CyDText className='font-bold text-[16px]'>
                    {t('APPROVAL_TOKEN')}
                </CyDText>
              </CyDView>

              <CyDView className={'flex flex-row justify-center items-center my-[10px]'}>
                <CyDView className='flex flex-row h-full mb-[10px] items-center rounded-r-[20px] self-center pr-[10px]'>
                  <CyDFastImage
                    className={'h-[60px] w-[60px] rounded-[50px]'}
                    source={{ uri: approvalTokenLogo }}
                    resizeMode='contain'
                    />
                  <CyDView className='absolute top-[60%] right-[3px]'>
                    <CyDFastImage
                      className={'h-[26px] w-[26px] rounded-[50px] border-[1px] border-white bg-white'}
                      source={chainLogo}
                      resizeMode='contain'
                      />
                  </CyDView>
                </CyDView>
              </CyDView>
        </CyDView>
        <CyDView className='my-[10px]'>
          <CyDView className={'bg-sepratorColor rounded-[12px] py-[20px] px-[10px]'}>
            <CyDView className='flex flex-row justify-between'>
              <CyDText className={'text-[14px] ml-[6px] font-bold'}>{t('SPENDER')}</CyDText>
              <CyDText className={'text-[14px]'}>{spender.address}</CyDText>
            </CyDView>
            <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'}></CyDView>
            <CyDView className='flex flex-row justify-between'>
              <CyDText className={'text-[14px] ml-[6px] font-bold'}>{t('APPROVE_TO')}</CyDText>
              <CyDView>
              <CyDFastImage source={{ uri: spender.protocol.logo }} />
              <CyDText className={'text-[14px]'}>{spender.protocol.name}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='my-[10px]'>
          <CyDView className={'bg-infoTextBackground rounded-[12px] py-[20px] px-[10px]'}>
            <CyDView className='flex flex-row justify-between'>
              <CyDText className={'font-bold text-[16px]'}>{t('GAS')}</CyDText>
              <CyDText className={'font-medium text-[16px] text-subTextColor'}>{gasWithUSDAppx}</CyDText>
            </CyDView>
            <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'}></CyDView>
            <CyDView className='flex flex-row justify-between'>
              <CyDText className={'font-bold text-[16px]'}>{t('AVAILABLE_BALANCE')}</CyDText>
              <CyDText className={'font-medium text-[16px] text-subTextColor'}>{availableBalance}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

export const RenderTypedTransactionSignModal = ({ dAppInfo, chain }: {dAppInfo: IDAppInfo | undefined, chain: Chain | undefined}) => {
  return (
    <CyDView>
      <CyDView>
        {dAppInfo
          ? <>
        <RenderDAPPInfo dAppInfo={dAppInfo} />
        <Divider />
         </>
          : null}
        { chain
          ? <>
          <RenderNetwork chain={chain}/>
          <Divider />
        </>
          : null
        }
      </CyDView>
    </CyDView>
  );
};
