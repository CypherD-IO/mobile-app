import React, { useEffect, useState } from "react";
import { defiProtocolData,PositionDetail,PositionTypeData } from "../../models/defi.interface";
import analytics from '@react-native-firebase/analytics';
import { CyDFastImage, CyDFlatList, CyDImage, CyDSafeAreaView, CyDScrollView, CyDText, CyDTouchView, CyDView } from "../../styles/tailwindStyles";
import { Linking, StyleSheet } from "react-native";
import CyDModalLayout from "../../components/v2/modal";
import AppImages from "../../../assets/images/appImages";
import { getChainLogo, sortDefiPositionDesc } from "../../core/defi";
import { t } from "i18next";
import CyDTokenValue from "../../components/v2/tokenValue";
import CyDTokenAmount from "../../components/v2/tokenAmount";

interface RouteProps {
  route:{
    params:{
        protocol: defiProtocolData
    }
  }
  navigation:{
    goBack: ()=> void
    setOptions: ({title}:{title:string})=>void
    navigate: (screen: string,params?:{}) => void
  }
}
const MAX_CHAIN_COUNT = 3;

const RenderDetail = ({detail,type}:{detail:PositionDetail[];type:string;}) =>{
  return (
    <CyDView>
      {detail.map((token,index)=>{
        return (
          <CyDView className="flex flex-row justify-between my-[8px]" key={`${token.tokenAddress}-${index}`}>
            <CyDView className="flex-1 flex-row justify-start items-center max-w-[50%]">
              <CyDFastImage
              source={{uri:token.logo}}
              className="h-[32px] w-[32px] mr-[10px] rounded-full"
              resizeMode="contain"/>
              <CyDView className="">
                <CyDText className="text-[16px] font-semibold">{token.tokenName}</CyDText>
                <CyDText className="text-[12px] font-normal">{type}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className="flex-1 max-w-[50%] items-end">
              <CyDTokenValue className={'font-bold text-[16px] '}>{token.balanceUSD}</CyDTokenValue>
              <CyDView className="flex-1 flex-row justify-end items-center">
                <CyDTokenAmount className={'font-medium text-[14px] mr-[2px]'}>{token.balanceDecimal}</CyDTokenAmount>
                <CyDText className={'font-medium text-[14px] '}>{token.tokenSymbol}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        );
      })}
    </CyDView>
  );
};
const RenderType = ({type}:{type:PositionTypeData}) =>{
  const holdings = type.holdings;
  return (
    <CyDView className="w-full mb-[20px]">
      <CyDView className="flex flex-row justify-start items-center gap-x-[4px] mb-[4px]">
        <CyDFastImage
        source={type.typeLogo}
        className="h-[18px] w-[18px]"
        resizeMode="contain"
        />
        <CyDText className="font-medium text-[18px]">{type.type}</CyDText>
      </CyDView>
      <CyDView className="w-full border border-sepratorColor rounded-[10px] flex pb-[12px]" >
        {holdings.sort(sortDefiPositionDesc).map((holding,index) =>{
          const pool: string[] = [];
          const details = [];
          holding.details.supply && details.push(holding.details.supply);
          holding.details.borrow && details.push(holding.details.borrow);
          holding.details.rewards && details.push(holding.details.rewards);
          details.forEach(holding => {
            holding?.forEach((token: PositionDetail) => {
              if (!pool.includes(token.tokenSymbol)) {
                pool.push(token.tokenSymbol);
              }
            });
          });
          return (
            <CyDView className="px-[8px] mt-[12px]" key={`${holding.type}-${holding.chain}-${index}`}>
              <CyDView className="flex flex-row justify-start items-center mb-[4px]">
                <CyDFastImage
                source={holding.chainLogo}
                className="h-[14px] w-[14px] mr-[2px] rounded-full"
                resizeMode="contain"
                />
                <CyDText className="font-normal text-[14px]">{holding.chain}</CyDText>
                {!holding.total.isActive && 
                  <CyDView className="ml-[6px] px-[4px] py-[2px] rounded-[6px] bg-redCyD">
                    <CyDText className="font-semibold">{t('Inactive')}</CyDText>
                  </CyDView>}
              </CyDView>
              <CyDView className="p-[10px] rounded-[10px] border border-sepratorColor">
                <CyDView className="flex flex-row justify-between items-start mb-[8px]">
                  <CyDText className="font-normal text-[14px] max-w-[50%]">{pool.join(' + ')}</CyDText>
                  <CyDTokenValue className={'font-bold text-[16px]  max-w-[50%]'}>{holding.total.value}</CyDTokenValue>
                </CyDView>
                {holding.details.supply && holding.details.supply.length>0 && <RenderDetail detail={holding.details.supply} type={t('DEFI_DEPOSIT')}/>}
                {holding.details.borrow && holding.details.borrow.length>0 && 
                  <>
                    <CyDView className="w-full my-[10px] h-[1px] border-t border-sepratorColor rounded-[10px]"/>
                    <RenderDetail detail={holding.details.borrow} type={t('DEFI_BORROW')}/>
                  </>
                }
                {holding.details.rewards && holding.details.rewards.length>0 && 
                  <>
                    <CyDView className="w-full my-[10px] h-[1px] border-t border-sepratorColor rounded-[10px]"/>
                    <RenderDetail detail={holding.details.rewards} type={t('DEFI_REWARD')}/>
                  </>
                }
                
              </CyDView>
            </CyDView>
          );
        })}
      </CyDView>
    </CyDView>
  );
};
export function DEFIOverviewScreen ({route,navigation}:RouteProps){
  const {protocol} = route.params;
  const [imageZoomIn, setImageZoomIn] = useState<boolean>(false);
  const moreChainsCount = protocol.chains.length - MAX_CHAIN_COUNT;
  useEffect(() => {
    void analytics().logEvent('visited_defi_overview_screen'); 
    navigation.setOptions({
      title: protocol.protocolName
    });
  }, [navigation, protocol.protocolName]);

  return <CyDSafeAreaView className="h-full bg-whiteColor">
    <CyDModalLayout setModalVisible={setImageZoomIn} isModalVisible={imageZoomIn} style={styles.modalLayout} animationIn={'zoomIn'} animationInTiming={10} animationOut={'zoomOut'} animationOutTiming={10}>
      <CyDView className={'rounded-t-[20px] relative'}>
        <CyDTouchView onPress={() => setImageZoomIn(false)} className={'z-[50] bg-white'}>
            <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute mt-[10px] right-[10px] '} />
        </CyDTouchView>
        <CyDTouchView onPress={() => setImageZoomIn(false)}><CyDImage className={'w-[100%] h-[90%]'} source={protocol.protocolLogo} /></CyDTouchView>
      </CyDView>
    </CyDModalLayout>
    <CyDScrollView className="w-full h-full px-[12px] mt-[12px]">
        <CyDView className='flex flex-row w-full mb-[30px]'>
          <CyDView
            className='flex-1 flex-row gap-[4px] justify-start items-center'
          >
            <CyDFastImage
              source={protocol.protocolLogo}
              className="h-[40px] w-[40px] rounded-full"
              resizeMode="contain"/> 
              <CyDView className=''>
                <CyDTouchView
                  className='flex-1 flex-row gap-[4px] justify-start items-center'
                  onPress={()=>{
                    void Linking.openURL(protocol.protocolURL);
                  }}
                >
                  <CyDText className='underline font-bold text-[22px]'>{protocol.protocolName}</CyDText>
                  <CyDFastImage
                  source={AppImages.LINK}
                  className="h-[18px] w-[18px]"
                  resizeMode="contain"/> 
                </CyDTouchView>
                <CyDView className='flex-1 flex-row justify-start items-center'>
                  {protocol.chains.slice(0, moreChainsCount === 1 ? 4 : 3).map((chain, index) =>{
                    return (
                      <CyDFastImage
                      key={`${chain}-${index}`}
                        source={getChainLogo(chain)}
                        className="h-[16px] w-[16px] rounded-full"
                        resizeMode="contain"
                      /> );
                  })}
                  {moreChainsCount>1 && 
                  <CyDView className='h-[16px] w-[16px] rounded-full flex justify-center items-center'>
                    <CyDText className="text-[12px] ">
                        {t('PLUS')}{ moreChainsCount}
                    </CyDText>
                    </CyDView>
                  }
                </CyDView>
              </CyDView>
          </CyDView>
          <CyDView className='flex-2 justify-start items-end'>
            <CyDTokenValue className={'text-center font-bold text-[20px]'}>{protocol.total.value}</CyDTokenValue>
            { protocol.total.debt>0 && <CyDTokenValue className={'text-center font-semibold text-[16px] text-warningTextYellow'}>{protocol.total.debt}</CyDTokenValue>}
          </CyDView>
        </CyDView>
          {Object.values(protocol.types).map((type,index) =>{
            return (
              <RenderType type={type} key={`${type.type}-${index}`}/>
            );
          })}
    </CyDScrollView>
  </CyDSafeAreaView>;
    
}
const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
