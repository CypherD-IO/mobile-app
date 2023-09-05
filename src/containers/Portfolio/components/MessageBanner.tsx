import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import HTML from 'react-native-render-html';
import useAxios from '../../../core/HttpRequest';
import { screenTitle } from '../../../constants';
import { isAndroid, isIOS } from '../../../misc/checkers';
import { getBannerId, setBannerId } from '../../../core/asyncStorage';
import { logAnalytics } from '../../../core/analytics';
import * as Sentry from '@sentry/react-native';
import {
  CyDFastImage,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';

interface MessageBannerProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: {}) => void;
    push: (screen: string, params?: {}) => void;
    popToTop: () => void;
  };
  ethAddress: string;
  isFocused: boolean;
}

interface platformData {
  version: string;
  condition: string;
}

enum BannerType {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Success = 'success',
}
interface IBannerData {
  isClosable: boolean;
  startDate?: Date;
  endDate?: Date;
  type: BannerType;
  message: string;
  id: string;
  ios?: platformData;
  andriod?: platformData;
}

export const MessageBanner = ({
  navigation,
  ethAddress,
  isFocused,
}: MessageBannerProps) => {
  const [bannerData, setBannerData] = useState<IBannerData | null>(null);
  const [bannerVisible, setBannerVisible] = useState<boolean>(false);
  const { getWithAuth } = useAxios();

  const getBannerColor = {
    error: '#FCDBE3',
    warning: '#FDF2DF',
    success: '#D9F7ED',
    info: '#E7F0F9',
  };

  const getBannerTextColor = {
    error: '#BC0835',
    warning: '#F25500',
    success: '#00A06A',
    info: '#0E477B',
  };

  const renderersProps = useMemo(() => {
    return {
      a: {
        onPress: (event: any, href: string) => {
          navigation.navigate(screenTitle.GEN_WEBVIEW, {
            url: href,
          });
        },
      },
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      const isBannerLive = (
        fromBannerDate: string | number | Date,
        toBannerDate: string | number | Date
      ) => {
        if (!fromBannerDate && !toBannerDate) {
          return true;
        } else if (fromBannerDate && !toBannerDate) {
          return new Date(fromBannerDate) <= new Date();
        } else if (!fromBannerDate && toBannerDate) {
          return new Date(toBannerDate) >= new Date();
        } else {
          return (
            new Date(fromBannerDate) <= new Date() &&
            new Date(toBannerDate) >= new Date()
          );
        }
      };

      const checkAppVersion = (
        currentVersion: number,
        versionFromData: number,
        condition: string
      ) => {
        if (condition === '>') {
          return currentVersion > versionFromData;
        } else if (condition === '>=') {
          return currentVersion >= versionFromData;
        } else if (condition === '<') {
          return currentVersion < versionFromData;
        } else if (condition === '<=') {
          return currentVersion <= versionFromData;
        } else if (condition === '=') {
          return currentVersion === versionFromData;
        } else {
          const errorObject = {
            checkAppVersionCondition: condition,
            currentVersion,
            versionFromData,
          };
          Sentry.captureException(errorObject);
          return false;
        }
      };

      const getDeviceInfoForBanner = (data: any) => {
        if (data?.android) {
          if (isAndroid()) {
            return checkAppVersion(
              parseFloat(DeviceInfo.getVersion()),
              data.android.version,
              data.android.condition
            );
          } else {
            return false;
          }
        } else if (data?.ios) {
          if (isIOS()) {
            return checkAppVersion(
              parseFloat(DeviceInfo.getVersion()),
              data.ios.version,
              data.ios.condition
            );
          } else {
            return false;
          }
        } else {
          return true;
        }
      };

      getWithAuth(`/v1/configuration/device/banner-info/${ethAddress}`)
        .then((response) => {
          if (!response?.isError) {
            if (response.data.data) {
              const data = response.data.data;
              if (data.isClosable) {
                getBannerId()
                  .then((bannerID) => {
                    setBannerVisible(
                      bannerID !== data.id &&
                        getDeviceInfoForBanner(data) &&
                        isBannerLive(data?.startDate, data?.endDate)
                    );
                  })
                  .catch((error) => {
                    Sentry.captureException(error);
                  });
              } else {
                setBannerVisible(() => {
                  return (
                    getDeviceInfoForBanner(data) &&
                    isBannerLive(data?.startDate, data?.endDate)
                  );
                });
              }
              setBannerData({ ...data });
            } else {
              setBannerVisible(false);
            }
          } else {
            void intercomAnalyticsLog(
              'fetch_banner_info_failed',
              response?.error
            );
            Sentry.captureException(response?.error);
          }
        })
        .catch((error) => {
          Sentry.captureException(error);
        });
    }
  }, [isFocused]);

  const styles = StyleSheet.create({
    bannerBackground: {
      backgroundColor: bannerData?.type
        ? getBannerColor[bannerData?.type]
        : 'black',
    },
    bannerHTMLBase: {
      fontSize: 14,
      fontWeight: '400',
      color: bannerData?.type ? getBannerTextColor[bannerData.type] : 'black',
    },
  });

  return bannerVisible ? (
    <CyDView
      className={'flex flex-row px-[15px] py-[10px]'}
      style={styles.bannerBackground}
    >
      <CyDView
        className={clsx({
          'w-[95%]': bannerData?.isClosable,
          'w-[100%]': !bannerData?.isClosable,
        })}
      >
        <HTML
          contentWidth={bannerData?.isClosable ? 93 : 100}
          baseStyle={styles.bannerHTMLBase}
          renderersProps={renderersProps}
          source={{ html: bannerData ? bannerData.message : '...' }}
        />
      </CyDView>
      {bannerData?.isClosable && (
        <CyDTouchView
          onPress={() => {
            setBannerVisible(false);
            if (bannerData.isClosable) {
              void setBannerId(bannerData.id);
            }
          }}
        >
          <CyDFastImage
            source={AppImages.CLOSE_CIRCLE}
            className='h-[25px] w-[25px]'
            resizeMode='contain'
          />
        </CyDTouchView>
      )}
    </CyDView>
  ) : (
    <CyDView></CyDView>
  );
};
