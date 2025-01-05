import {
  CyDFlatList,
  CyDImage,
  CydMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../styles/tailwindStyles';
import React, { ReactElement } from 'react';
import clsx from 'clsx';
import AppImages from '../../../assets/images/appImages';
import LottieView from 'lottie-react-native';

interface props {
  header?: ReactElement;
  footer?: ReactElement;
  fillIndex: number;
  data: string[];
  error: boolean;
}

interface timeLineItem {
  item: string;
  index: number;
}

export default function Timeline({
  header,
  footer,
  fillIndex,
  data,
  error,
}: props) {
  const renderTimeLine = ({ item, index }: timeLineItem) => {
    return (
      <CyDView className={'flex flex-col'}>
        <CyDView className={'flex flex-row items-center'}>
          <CyDView
            className={clsx(
              'w-[28px] h-[28px]  rounded-full flex flex-row items-center justify-center',
              {
                'bg-[#FFDE59]': index > fillIndex,
                'bg-[#61C9A8]': index <= fillIndex,
              },
            )}>
            {index <= fillIndex && (
              <CyDImage
                className={'w-[14px] h-[10px]'}
                source={AppImages.CORRECT}
                style={{ tintColor: 'black' }}
              />
            )}
            {index === fillIndex + 1 && fillIndex !== 3 && !error && (
              <CyDView>
                <LottieView
                  source={AppImages.LOADING_SPINNER}
                  autoPlay
                  loop
                  style={{ height: 14 }}
                />
              </CyDView>
            )}
            {error && index > fillIndex && (
              <CydMaterialDesignIcons
                name={'close'}
                size={24}
                className='text-base400'
              />
            )}
          </CyDView>
          <CyDView>
            <CyDText
              className={'font-[#434343] font-semibold  text-[18px] ml-[16px]'}>
              {item}
            </CyDText>
            {/* <CyDText */}
            {/*  className={"font-[#434343]  text-[16px] ml-[16px]"} */}
            {/* > */}
            {/*  {item} */}
            {/* </CyDText> */}
          </CyDView>
        </CyDView>

        {index < data.length - 1 && (
          <CyDView
            className={clsx('w-[3px] h-[35px]  rounded-full ml-[12px]', {
              'bg-[#F3F3F3]': index >= fillIndex,
              'bg-[#808080]': index < fillIndex,
            })}
          />
        )}
      </CyDView>
    );
  };
  return (
    <CyDView>
      <CyDFlatList
        ListHeaderComponent={() => {
          return header != null ? header : <></>;
        }}
        ListFooterComponent={() => {
          return footer != null ? footer : <></>;
        }}
        data={data}
        renderItem={renderTimeLine}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      />
    </CyDView>
  );
}
