/**
   * @format
   * @flow
   */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { ButtonWithImage } from './Share';
import AppImages from '../../../assets/images/appImages';
import ShowPharseModal from '../../components/ShowPharseModal';
import SuccessModal from '../../components/SuccessModal';
import {useGlobalModalContext} from '../../components/v2/GlobalModal';
const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage
} = require('../../styles');

export default function Backup (props) {
  const [isModalVisible, setModalVisible] = useState(false);

  const {showModal, hideModal} = useGlobalModalContext();
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
       <SafeAreaView dynamic>
         <ShowPharseModal
          isModalVisible = {isModalVisible}
          onPress = {() => { setModalVisible(false); }}
          onClipClick = {() => {
            setModalVisible(false);
            setTimeout(() => {
              showModal('state', {type: 'success', title: t('PRIVATE_KEY_MSG'), description: t('PRIVATE_KEY_SUB_MSG'), onSuccess: hideModal, onFailure: hideModal})
            }, 600);
          }}
         />
         <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} pH={40} jC='flex-start'>
         <CText dynamic fF={C.fontsName.FONT_BLACK} fS={30} mT={50} color={Colors.primaryTextColor}>{t('BACK_UP_MYSELF')}</CText>
         <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={16} mT={25} color={Colors.primaryTextColor}>
           {t('BACK_UP_SUB_MSG')}
           </CText>
           <ButtonWithImage mT={41} bG={Colors.whiteColor} vC={Colors.appColor}
           text={t('BACK_UP_MANUALLY')} imageName={AppImages.KEY} isBorder={true} onPress={() => {
             setModalVisible(true);
           }}/>
           <ButtonWithImage mT={30} bG={Colors.whiteColor} vC={Colors.appColor}
           text={t('BACK_UP_ON_ICLOUD')} imageName={AppImages.CLOUD} isBorder={true} onPress={() => {
              showModal('state', {type: 'info', title: t('ICLOUD_PRIVATE'), description: t('PRIVATE_KEY_SUB_MSG'), onSuccess: hideModal, onFailure: hideModal})
           }}/>
           <DynamicImage dynamic dynamicWidth height={300} width={140} resizemode='cover'
           source={AppImages.HOME}/>
           </DynamicView>
       </SafeAreaView>
  );
}
