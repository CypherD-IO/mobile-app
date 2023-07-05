import React, { useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { AppButton, ButtonWithOutImage } from '../containers/Auth/Share';

const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage,
  ModalView
} = require('../styles');

export default function CopytoKeyModal (props) {
  const { isModalVisible, onPress, onClipClick } = props;
  const { t } = useTranslation();

  const DATA = [
    {
      id: '0',
      title: 'taste'
    },
    {
      id: '1',
      title: 'furry'
    },
    {
      id: '2',
      title: 'garment'
    },
    {
      id: '3',
      title: 'blush'
    },
    {
      id: '4',
      title: 'tortoise'
    },
    {
      id: '5',
      title: 'buddy'
    },
    {
      id: '6',
      title: 'taste'
    },
    {
      id: '7',
      title: 'furry'
    },
    {
      id: '8',
      title: 'garment'
    },
    {
      id: '9',
      title: 'blush'
    },
    {
      id: '10',
      title: 'tortoise'
    },
    {
      id: '11',
      title: 'buddy'
    }
  ];

  const renderItem = (item, index) => {
    return (
          <DynamicView dynamic dynamicWidth width={60} fD='row' jC='flex-start' mT={10}>
            <CText dynamic tA='left' fF={C.fontsName.FONT_BOLD} fS={14} color={Colors.subTextColor}>{item.index + 1}</CText>
            <CText dynamic tA='left' mL={8} fF={C.fontsName.FONT_BOLD} fS={16} color={Colors.secondaryTextColor}>{item.item.title}</CText>
            </DynamicView>
    );
  };

  return (
          <Modal isVisible={isModalVisible}
          onBackdropPress={() => { onPress(); }}
          onRequestClose={() => { onPress(); }}
          >
            <DynamicView dynamic dynamicWidth width={100} jC='center'>
            <ModalView dynamic dynamicWidth dynamicHeight height={55} width={90} bGC = {Colors.whiteColor} bR={30} >
            <DynamicImage dynamic source={AppImages.LOCK} width={60} height={60} mT={-20}/>
            <CText dynamic fF={C.fontsName.FONT_BLACK} fS={18} mT={20} color={Colors.primaryTextColor}>{t('COPY_PRIVATE_MSG')}</CText>
            {/* <FlatList
              data={DATA}
              numColumns={2}
              renderItem={(item,index) => renderItem(item,index)}
              style={{width:'75%',height:'100%',marginTop:20}}
            /> */}
            <ButtonWithOutImage sentry-label='show-seed-phrase' mT={10} wT ={80} bG={Colors.appColor} vC={Colors.appColor} mB ={40}
               text={t('COPY_TO_CLIPBOARD')} isBorder={false} onPress={() => {
                 onClipClick();
               }}/>
            </ModalView>
            </DynamicView>
          </Modal>
  );
}
