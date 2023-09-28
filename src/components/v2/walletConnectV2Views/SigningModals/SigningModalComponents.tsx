import React from 'react';
import { CyDFastImage, CyDScrollView, CyDText, CyDView } from '../../../../styles/tailwindStyles';
import { Chain } from '../../../../constants/server';
import { EIP155_SIGNING_METHODS } from '../../../../constants/EIP155Data';
import Web3 from 'web3';
import { t } from 'i18next';
import { IDAppInfo } from '../../../../models/signingModalData.interface';
import EmptyView from '../../../EmptyView';
import AppImages from '../../../../../assets/images/appImages';
import { DecodedResponseTypes } from '../../../../constants/enum';
const RenderDAPPInfo = ({ dAppInfo }: { dAppInfo: IDAppInfo }) => {
  return (
    <CyDView className='flex flex-row items-center mt-[12px] border-[1px] rounded-[12px] border-fadedGrey'>
      <CyDView className='flex flex-row rounded-r-[20px] self-center px-[10px]'>
        <CyDFastImage
          className={'h-[35px] w-[35px] rounded-[50px]'}
          source={{ uri: dAppInfo.logo }}
          resizeMode='contain'
        />
      </CyDView>
      <CyDView className={'flex flex-row'}>
        <CyDView className='flex flex-row w-full justify-between items-center rounded-r-[20px] py-[15px] pr-[20px]'>
          <CyDView className='ml-[10px]'>
            <CyDView className={'flex flex-row items-center align-center'}>
              <CyDText className={'font-extrabold text-[16px]'}>{dAppInfo.name}</CyDText>
            </CyDView>
            <CyDView className={'flex flex-row items-center align-center'}>
              <CyDText className={'text-[14px]'}>{dAppInfo.url}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

const RenderNetwork = ({ chain }: { chain: Chain | undefined }) => {
  if (!chain) {
    return <></>;
  }
  return (
    <CyDView>
      <CyDView>
        <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{t<string>('NETWORK_INIT_CAPS')}</CyDText>
      </CyDView>
      <CyDView>
        <CyDView className={'flex flex-row items-center'}>
          <CyDFastImage source={chain.logo_url} className={'h-[24px] w-[24px]'} />
          <CyDText className={'text-[16px] ml-[6px]'}>{chain.name}</CyDText>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

const RenderMethod = ({ method }: { method: string }) => {
  return (
    <CyDView>
      <CyDView>
        <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{t('METHOD')}</CyDText>
      </CyDView>
      <CyDView>
        <CyDView>
          <CyDText className={'text-[16px] ml-[6px]'}>{method}</CyDText>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

const RenderMessage = ({ method, messageParams }: { method: string, messageParams: string }) => {
  let message = '';
  if (method === EIP155_SIGNING_METHODS.PERSONAL_SIGN) {
    message = Web3.utils.hexToUtf8(messageParams[0]);
  } else if (method === EIP155_SIGNING_METHODS.ETH_SIGN) {
    message = Web3.utils.hexToUtf8(messageParams[1]);
  } else if (method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA || method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3 || method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4) {
    message = JSON.stringify(JSON.parse(messageParams[1]), null, 2);
  }
  return (
    <CyDView>
      <CyDView>
        <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{t('MESSAGE')}</CyDText>
      </CyDView>
      <CyDScrollView className={'my-[5px] border-[1px] border-sepratorColor bg-infoTextBackground rounded-[6px]'}>
        <CyDView className={'p-[10px]'}>
          <CyDText className={'text-[15px] ml-[6px]'}>{message}</CyDText>
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
};

const Divider = () => {
  return (
    <CyDView className={'h-[1px] bg-sepratorColor mt-[14px] mb-[8px]'} />
  );
};

const Loader = () => {
  return (
    <CyDView className='flex justify-center items-center'>
      <EmptyView
        text={`${t('LOADING_DATA')}...`}
        image={AppImages.LOADING_IMAGE}
        buyVisible={false}
        marginTop={50}
        isLottie={true}
      />
    </CyDView>
  );
};

const RenderTitle = ({ method, sendType }: { method: string, sendType: string }) => {
  let title = method;
  if (method === EIP155_SIGNING_METHODS.PERSONAL_SIGN || method === EIP155_SIGNING_METHODS.ETH_SIGN) {
    title = t<string>('SIGN_MESSAGE');
  } else if (method === EIP155_SIGNING_METHODS.ETH_SEND_RAW_TRANSACTION || method === EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION || method === EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION) {
    if (sendType) {
      switch (sendType) {
        case DecodedResponseTypes.SEND:
          title = t<string>('SEND_TOKENS');
          break;
        case DecodedResponseTypes.CALL:
          title = t<string>('SWAP_TOKENS');
          break;
        case DecodedResponseTypes.APPROVE:
          title = t<string>('APPROVE_TOKEN');
          break;
        default:
          title = t<string>('APPROVE_TRANSACTION');
      }
    } else {
      title = ''; // When the decoding hasn't happened yet.
    }
  } else if (method.includes(EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA)) {
    title = t<string>('APPROVE_TYPED_TRANSACTION');
  }

  return (
    <CyDView className={'flex flex-row justify-center'}>
      <CyDText className={'text-[22px] font-extrabold mt-[14px] mb-[10px]'}>{title}</CyDText>
    </CyDView>
  );
};

export { RenderDAPPInfo, RenderTitle, RenderNetwork, RenderMethod, RenderMessage, Divider, Loader };
