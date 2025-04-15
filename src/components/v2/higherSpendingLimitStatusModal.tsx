import React from 'react';
import {
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import Button from './button';
import { ButtonType, HigherSpendingLimitStatus } from '../../constants/enum';
import clsx from 'clsx';

interface BaseStatusConfig {
  bgColor: string;
  dotColor: string;
  text: string;
  textColor: string;
}

interface StatusConfigType {
  pending: BaseStatusConfig & { message: string };
  approved: BaseStatusConfig & { getMessage: (cardLast4: string) => string };
  rejected: BaseStatusConfig & { message: string };
}

const STATUS_CONFIG: StatusConfigType = {
  pending: {
    bgColor: 'bg-n20',
    dotColor: 'bg-n200',
    textColor: 'text-n200',
    text: 'Pending',
    message:
      "We're on it! Just hang tight for about 15 minutes while we get your request sorted.",
  },
  approved: {
    bgColor: 'bg-green20',
    dotColor: 'bg-green350',
    textColor: 'text-green350',
    text: 'Approved',
    getMessage: (cardLast4: string) =>
      `You're all set! You've just unlocked a higher limit with the Cypher card, Physical ** ${cardLast4}!`,
  },
  rejected: {
    bgColor: 'bg-red20',
    dotColor: 'bg-red200',
    textColor: 'text-red200',
    text: 'Rejected',
    message:
      "Hey there! We can't upgrade your spending limit request right now. Just reach out to support, for more info.",
  },
};

interface Props {
  status: HigherSpendingLimitStatus;
  cardLast4: string;
  onClose: () => void;
  onContactSupport: () => void;
}

function isApprovedStatus(
  config: StatusConfigType[keyof StatusConfigType],
): config is BaseStatusConfig & { getMessage: (cardLast4: string) => string } {
  return 'getMessage' in config;
}

export default function HigherSpendingLimitStatusView({
  status,
  cardLast4,
  onClose,
  onContactSupport,
}: Props) {
  const statusConfig = STATUS_CONFIG[status];
  const message = isApprovedStatus(statusConfig)
    ? statusConfig.getMessage(cardLast4)
    : statusConfig.message;

  return (
    <CyDView className='bg-n0 rounded-[10px] p-[16px] mb-[16px]'>
      <CyDView className='flex flex-row items-center justify-between mb-[16px]'>
        <CyDText className='text-[18px]'>Higher Spending limit</CyDText>
        <CyDView
          className={`ml-[12px] py-[6px] px-[12px] rounded-full ${statusConfig.bgColor} flex flex-row items-center`}>
          <CyDView
            className={`w-[10px] h-[10px] rounded-full ${statusConfig.dotColor} mr-[6px]`}
          />
          <CyDText
            className={`text-[12px] ${statusConfig.textColor} font-medium `}>
            {statusConfig.text}
          </CyDText>
        </CyDView>
      </CyDView>

      <CyDText className='text-[14px] text-n200 mb-[12px]'>{message}</CyDText>

      <CyDView
        className={`flex flex-row ${status === 'approved' ? 'justify-center' : 'justify-end'} gap-x-[12px]`}>
        {status !== 'pending' && (
          <Button
            type={ButtonType.GREY_FILL}
            title='Close message'
            onPress={onClose}
            paddingY={6}
            style={clsx(
              status === 'approved' ? undefined : 'flex-1',
              'rounded-[15px] px-[12px]',
            )}
            titleStyle={'text-[14px] font-medium'}
          />
        )}
        {status === 'rejected' && (
          <Button
            type={ButtonType.PRIMARY}
            title='Contact Support'
            onPress={onContactSupport}
            paddingY={6}
            titleStyle={'text-[14px] font-medium'}
            style='flex-1 rounded-[15px] px-[12px]'
          />
        )}
      </CyDView>
    </CyDView>
  );
}
