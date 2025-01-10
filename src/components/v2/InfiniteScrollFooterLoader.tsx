import React from 'react';
import { CyDLottieView, CyDView } from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { StyleProp, ViewStyle } from 'react-native';

interface InfiniteScrollFooterLoaderProps {
  refreshing: boolean;
  style: StyleProp<ViewStyle>;
}

const InfiniteScrollFooterLoader = ({
  style = { height: 40 },
  refreshing,
}: InfiniteScrollFooterLoaderProps) => {
  if (refreshing) {
    return (
      <CyDView className={'flex items-center justify-between'}>
        <CyDLottieView
          source={AppImages.LOADER_TRANSPARENT}
          autoPlay
          loop
          style={style}
        />
      </CyDView>
    );
  } else {
    return <></>;
  }
};

export default InfiniteScrollFooterLoader;
