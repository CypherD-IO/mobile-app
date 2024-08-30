import React from 'react';
import {
  CyDImage,
  CyDText,
  CyDView,
} from '../../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../../../assets/images/appImages';
// import Video from 'react-native-video';
// import { Dimensions, StyleSheet } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';

// const { width, height } = Dimensions.get('window');

export default function WelcomeSceen1() {
  const { t } = useTranslation();

  return (
    <CyDView className='flex flex-col items-center justify-evenly h-full px-[16px] mt-[40px] bg-black'>
      <CyDView className='flex flex-col justify-center items-center w-full'>
        <CyDImage
          className='w-[314px] h-[269px]'
          source={AppImages.CARD_ONBOARDING_1}
        />
      </CyDView>
      <CyDView className='w-[314px]'>
        <CyDText className='font-bold text-[40px] text-white text-center'>
          {t('Go Global,')}
        </CyDText>
        <CyDText className='font-bold text-[40px] text-white text-center'>
          {t('Pay Local,')}
        </CyDText>
        <CyDText className='font-semibold text-[18px] text-white mt-[12px] text-center'>
          {t(
            'with amazing acceptance, you do the spending, we will do the Converting',
          )}
        </CyDText>
      </CyDView>
    </CyDView>
  );
  // return (
  //   <CyDView
  //     className='flex flex-col justify-evenly h-full'
  //     style={styles.container}>
  //     <Video
  //       source={AppImages.CARD_ONBOARDING_VIDEO}
  //       style={styles.backgroundVideo}
  //       resizeMode='cover'
  //       repeat={true}
  //       paused={false}
  //       muted={true}
  //       controls={false}
  //     />
  //     <LinearGradient
  //       colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
  //       style={styles.gradient}
  //       start={{ x: 0.5, y: 0 }}
  //       end={{ x: 0.5, y: 1 }}>
  //       <CyDView
  //         className='px-[16px] flex-1 item-center justify-between h-full'
  //         style={styles.content}>
  //         <CyDImage
  //           source={AppImages.CARD_ONBOARDING_1}
  //           className='w-[314px] h-[269px]'
  //         />
  //         <CyDText className='font-extrabold text-[40px] text-white text-center font-manrope'>
  //           {t('Go Global,')}
  //         </CyDText>
  //         <CyDText className='font-extrabold text-[40px] text-white text-center'>
  //           {t('Pay Local,')}
  //         </CyDText>
  //         <CyDView className=' flex flex-row justify-center items-center w-full'>
  //           <CyDText className=' text-[18px] text-white text-wrap'>
  //             {t(
  //               'with amazing acceptance,you do the spending, we will do the Converting',
  //             )}
  //           </CyDText>
  //         </CyDView>
  //       </CyDView>
  //     </LinearGradient>
  //     {/* <CyDImage source={AppImages.RC_VIRTUAL} /> */}
  //   </CyDView>
  // );
}

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   backgroundVideo: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     bottom: 0,
//     right: 0,
//     width,
//     height,
//   },
//   gradient: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     bottom: 0,
//     height: height / 2, // Gradient takes up bottom half of the screen
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     // Add padding or adjust layout as needed
//     padding: 20,
//   },
// });
