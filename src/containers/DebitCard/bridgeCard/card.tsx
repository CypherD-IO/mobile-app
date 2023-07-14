import React, { Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from 'react';
import { GlobalContext } from '../../../core/globalContext';
import { screenTitle } from '../../../constants';
import { copyToClipboard } from '../../../core/util';
import { showToast } from '../../utilities/toastUtility';
import { useTranslation } from 'react-i18next';
import { setCardRevealReuseToken, getCardRevealReuseToken } from '../../../core/asyncStorage';
import axios from '../../../core/Http';
import { CyDImage, CyDImageBackground, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import useAxios from '../../../core/HttpRequest';
import { CardProviders } from '../../../constants/enum';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import Carousel from 'react-native-snap-carousel';
import { Dimensions } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import { scale } from 'react-native-size-matters';
import clsx from 'clsx';
import { Card } from '../../../models/card.model';
import { orderBy } from 'lodash';

export default function CardScreen ({ navigation, hideCardDetails, currentCardProvider, setCurrentCardProvider }: {navigation: any, hideCardDetails: boolean, currentCardProvider: string, setCurrentCardProvider: Dispatch<SetStateAction<string>>}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile = globalContext.globalState.cardProfile;
  const webviewRef = useRef();
  const { t } = useTranslation();
  const [userCardDetails, setUserCardDetails] = useState({
    cards: [],
    personId: '',
    currentCardRevealedDetails: {
      cardNumber: 'XXXX XXXX XXXX',
      type: t('VIRTUAL'),
      cvv: 'XXX',
      expiryMonth: 'XX',
      expiryYear: 'XX',
      cardId: ''
    },
    hideCardDetails: true,
    showCVVAndExpiry: false,
    isFetchingCardDetails: false
  });
  const { showModal, hideModal } = useGlobalModalContext();
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const { postWithAuth } = useAxios();
  const currentTimestamp = String(new Date().getTime());

  useEffect(() => {
    const { last4, type } = cardProfile[currentCardProvider].cards[currentCardIndex];
    if (currentCardProvider !== '') {
      setUserCardDetails({
        hideCardDetails: true,
        showCVVAndExpiry: false,
        isFetchingCardDetails: false,
        cards: cardProfile[currentCardProvider].cards,
        personId: cardProfile[currentCardProvider].personId,
        currentCardRevealedDetails: {
          cardNumber: 'XXXX XXXX XXXX ',
          type,
          cvv: 'XXX',
          expiryMonth: 'XX',
          expiryYear: 'XX',
          cardId: ''
        }
      });
    }
  }, [currentCardProvider]);

  // useEffect(() => {
  //   if (!hideCardDetails) {
  //     const { type } = cardProfile.solid.cards[0];
  //     webviewRef.current.postMessage(JSON.stringify({ hideCardDetails: true, type }), '*');
  //   }
  // }, [hideCardDetails]);

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.BRIDGE_CARD_REVEAL_AUTH_SCREEN, { onSuccess: (data: any, cardProvider: CardProviders) => { void sendCardDetails(data, cardProvider); }, currentCardProvider, card: userCardDetails.cards[currentCardIndex], triggerOTPParam: 'verify/show-token', verifyOTPPayload: { isMobile: true } });
  };

  const validateReuseToken = async () => {
    const { currentCardRevealedDetails } = userCardDetails;
    const cardId = userCardDetails.cards[currentCardIndex].cardId;
    setUserCardDetails({ ...userCardDetails, isFetchingCardDetails: true, currentCardRevealedDetails: { ...currentCardRevealedDetails, cardId } });
    const cardRevealReuseToken = await getCardRevealReuseToken(cardId);
    if (cardRevealReuseToken) {
      // webviewRef.current.postMessage(JSON.stringify({ showLoader: true }), '*');
      const verifyReuseTokenUrl = `/v1/cards/${currentCardProvider}/card/${String(cardId)}/verify/reuse-token`;
      const payload = { reuseToken: cardRevealReuseToken };
      try {
        const response = await postWithAuth(verifyReuseTokenUrl, payload);
        if (!response.isError) {
          void sendCardDetails(response.data, currentCardProvider);
        } else {
          verifyWithOTP();
        }
      } catch (e: any) {
        verifyWithOTP();
      }
    } else {
      verifyWithOTP();
    }
  };

  const sendCardDetails = async ({ vaultId, cardId, token, reuseToken }: { vaultId: string, cardId: string, token: string, reuseToken?: string }, cardProvider: string) => {
    const { currentCardRevealedDetails } = userCardDetails;
    setCurrentCardProvider(cardProvider);
    if (reuseToken) {
      await setCardRevealReuseToken(cardId, reuseToken);
    }
    let response;
    if (cardProvider === CardProviders.BRIDGE_CARD) {
      response = await axios.get(vaultId + token);
    } else if (cardProvider === CardProviders.PAYCADDY) {
      response = await axios.post(vaultId, { cardId, isProd: true }, { headers: { Authorization: `Bearer ${token}` } });
    }
    if (response?.data) {
      if (cardProvider === CardProviders.BRIDGE_CARD) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { card_number, cvv, expiry_month, expiry_year } = response.data.data;
        setUserCardDetails({
          ...userCardDetails,
          currentCardRevealedDetails: {
            ...currentCardRevealedDetails,
            cardNumber: card_number.match(/.{1,4}/g).join(' '),
            cvv,
            expiryMonth: expiry_month,
            expiryYear: expiry_year,
            cardId
          },
          hideCardDetails: false,
          showCVVAndExpiry: false,
          isFetchingCardDetails: false
        });
      } else if (cardProvider === CardProviders.PAYCADDY && response?.data.result) {
        const { pan, cvv, expDate } = response.data.result;
        setUserCardDetails({
          ...userCardDetails,
          currentCardRevealedDetails: {
            ...currentCardRevealedDetails,
            cardNumber: pan.match(/.{1,4}/g).join(' '),
            cvv,
            expiryMonth: String(expDate).substring(4, 6),
            expiryYear: String(expDate).substring(0, 4),
            cardId
          },
          hideCardDetails: false,
          showCVVAndExpiry: false,
          isFetchingCardDetails: false
        });
      }
    } else {
      showModal('state', { type: 'error', title: t('UNABLE_TO_REVEAL_CARD_DETAILS'), description: t('CONTACT_CYPHERD_SUPPORT'), onSuccess: hideModal, onFailure: hideModal });
    }
    // webviewRef.current.postMessage(JSON.stringify(cardDetails), '*');
  };

  // const onMessage = async (data: any) => {
  //   const message = data.nativeEvent.data;
  //   if (message === 'fetchSecrets') {
  //     void validateReuseToken();
  //   } else if (message === 'fetchLastFour') {
  //     const { last4, status, type } = cardProfile.solid.cards[0];
  //     const cardDetails = {
  //       lastFourNumbers: last4,
  //       status,
  //       type
  //     };
  //     // webviewRef.current.postMessage(JSON.stringify(cardDetails), '*');
  //   } else if (message === 'showOptions') {
  //     navigation.navigate(screenTitle.BRIDGE_CARD_OPTIONS_SCREEN, { cardId: userCardDetails.cards[0].cardId, status: userCardDetails.cards[0].status });
  //   } else if (message === 'cardNumberCopied') {
  //     showToast(t('CARD_NUMBER_COPY'));
  //   }
  // };

  const copyCardNumber = () => {
    copyToClipboard(userCardDetails.currentCardRevealedDetails.cardNumber);
    showToast(t('CARD_NUMBER_COPY'));
  };

  const toggleCardDetails = () => {
    if (userCardDetails.hideCardDetails) {
      void validateReuseToken();
    } else {
      const { last4, type, cardId } = cardProfile[currentCardProvider].cards[currentCardIndex];
      setUserCardDetails({
        ...userCardDetails,
        currentCardRevealedDetails: {
          cardNumber: 'XXXX XXXX XXXX ' + String(last4) ?? 'XXXX',
          type,
          cvv: 'XXX',
          expiryMonth: 'XX',
          expiryYear: 'XX',
          cardId
        },
        hideCardDetails: true
      });
    }
  };

  const getCardBackgroundLayout = (card: Card) => {
    if (currentCardProvider === CardProviders.BRIDGE_CARD) {
      return 'https://public.cypherd.io/icons/cardLayout.png?t=' + currentTimestamp;
    } else if (currentCardProvider === CardProviders.PAYCADDY && card.type === 'physical') {
      return 'https://public.cypherd.io/icons/masterCardLayoutPhysical.png?t=' + currentTimestamp;
    }
    return 'https://public.cypherd.io/icons/masterCardLayout.png?t=' + currentTimestamp;
  };

  const RenderCVVAndExpiry = ({ card }: {card: Card}) => {
    const { hideCardDetails, showCVVAndExpiry, currentCardRevealedDetails } = userCardDetails;
    const revealCVVAndExpiry = () => {
      setUserCardDetails({
        ...userCardDetails,
        currentCardRevealedDetails: {
          ...currentCardRevealedDetails,
          cardNumber: 'XXXX XXXX XXXX ' + String(cardProfile[currentCardProvider].cards[currentCardIndex].last4).toUpperCase() ?? 'XXXX'
        },
        showCVVAndExpiry: true
      });
    };
    const getCVV = () => {
      if (card.cardId === userCardDetails.currentCardRevealedDetails.cardId && !userCardDetails.hideCardDetails && userCardDetails.showCVVAndExpiry) {
        return userCardDetails.currentCardRevealedDetails.cvv;
      } else {
        return 'XXX';
      }
    };
    const getExpiry = () => {
      const { currentCardRevealedDetails, hideCardDetails, showCVVAndExpiry } = userCardDetails;
      const { expiryMonth, expiryYear } = currentCardRevealedDetails;
      if (card.cardId === currentCardRevealedDetails.cardId && !hideCardDetails && showCVVAndExpiry) {
        return expiryMonth + ' / ' + expiryYear;
      } else {
        return 'XX / XX';
      }
    };
    if (!hideCardDetails && !showCVVAndExpiry && card.cardId === userCardDetails.currentCardRevealedDetails.cardId) {
      return (
        <CyDTouchView className='flex justify-center items-center self-center bg-fadedDarkBackgroundColor p-[10px] rounded-[20px] mb-[15px]' onPress={() => revealCVVAndExpiry()}>
          <CyDText className='text-white text-center font-bold'>{t('SHOW_CVV_EXPIRY')}</CyDText>
        </CyDTouchView>
      );
    }
    return (
      <CyDView className='flex flex-row mb-[10px]'>
          <CyDView className='ml-[10px]'>
            <CyDText className={clsx('font-nunito font-bold text-[12px] mx-[10px]', { 'text-white': card.type !== 'physical' })}>{t('CVV')}</CyDText>
            <CyDText className={clsx('font-nunito font-bold text-[12px] mx-[10px] mt-[5px]', { 'text-white': card.type !== 'physical' })}>{getCVV()}</CyDText>
          </CyDView>
          <CyDView className='flex-1 items-center ml-[-50px]'>
            <CyDText className={clsx('font-nunito font-bold text-[12px] mx-[10px]', { 'text-white': card.type !== 'physical' })}>{t('VALID_THRU')}</CyDText>
            <CyDText className={clsx('font-nunito font-bold text-[12px] mx-[10px] mt-[5px]', { 'text-white': card.type !== 'physical' })}>{getExpiry()}</CyDText>
          </CyDView>
      </CyDView>
    );
  };

  const getCardNumber = (card: Card) => {
    if (card.cardId === userCardDetails.currentCardRevealedDetails.cardId && !userCardDetails.hideCardDetails) {
      return userCardDetails.currentCardRevealedDetails.cardNumber;
    } else {
      return 'XXXX XXXX XXXX ' + String(card.last4).toUpperCase();
    }
  };

  const renderCard = ({ item }: {item: Card}) => {
    const card: Card = item;
    const { isFetchingCardDetails, currentCardRevealedDetails, hideCardDetails } = userCardDetails;
    if (card.type === 'physical' && card.status === 'pendingActivation') {
      return (
        <CyDView className='mb-[10px]'>
          <CyDImageBackground source={{ uri: getCardBackgroundLayout(card) }} className='flex flex-col justify-center h-[200px] w-[300px] border-[1px] border-inputBorderColor rounded-[12px]' resizeMode='stretch'>
            <CyDTouchView onPress={() => navigation.navigate(screenTitle.CARD_ACTIAVTION_SCREEN, { onSuccess: (data: any, cardProvider: CardProviders) => { void sendCardDetails(data, cardProvider); }, currentCardProvider, card })} className='flex flex-row justify-center items-center border-[2px] border-inputBorderColor bg-inputBorderColor mx-[30px] p-[5px] rounded-[10px]'>
              <CyDImage source={AppImages.ACTIVATE_PHYSICAL_CARD} className='h-[30px] w-[30px] mr-[10px]'/>
              <CyDText className='font-nunito font-extrabold'>{t<string>('ACTIVATE_PYHSICAL_CARD')}</CyDText>
            </CyDTouchView>
          </CyDImageBackground>
        </CyDView>
      );
    }
    return (
      <CyDView className='mb-[10px]'>
      <CyDImageBackground source={{ uri: getCardBackgroundLayout(card) }} className={clsx('flex flex-col justify-center h-[200px] w-[300px]', { 'border-[1px] border-inputBorderColor rounded-[12px]': card.type === 'physical' })} resizeMode='stretch'>
        {(isFetchingCardDetails && card.cardId === currentCardRevealedDetails.cardId)
          ? <CyDImage source={{ uri: 'https://public.cypherd.io/icons/details_loading.png' }} className='h-[50px] w-[50px] self-center' resizeMode='contain'></CyDImage>
          : <CyDView className='flex-1 flex-col justify-between'>
          <CyDView>
            <CyDText className={clsx('font-nunito font-bold text-[16px] m-[10px]', { 'text-white': card.type !== 'physical' })}>{card.type.toUpperCase()}</CyDText>
          </CyDView>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView className='flex flex-row items-center'>
              <CyDText className={clsx('font-nunito font-bold text-[16px] m-[10px]', { 'text-white': card.type !== 'physical' })}>{getCardNumber(card)}</CyDText>
              {(!hideCardDetails && currentCardRevealedDetails.cardId === card.cardId) && <CyDTouchView onPress={() => copyCardNumber()}>
                <CyDImage source={{ uri: `https://public.cypherd.io/icons/${card.type === 'physical' ? 'copyBlack.png' : 'copy.png'}` }} className='h-[20px] w-[20px] ml-[5px]' resizeMode='contain'></CyDImage>
              </CyDTouchView>}
            </CyDView>
            <CyDView className='flex flex-row justify-start bg-black border-[1px] border-black p-[5px] rounded-l-[50px] mr-[0.7px]'>
              <CyDTouchView onPress={() => { toggleCardDetails(); }}>
                <CyDImage source={{ uri: `https://public.cypherd.io/icons/${(!hideCardDetails && currentCardRevealedDetails.cardId === card.cardId) ? 'reveal.png' : 'hide.png'}` }} className='h-[21px] w-[21px] ml-[5px] mr-[10px]' resizeMode='contain'></CyDImage>
              </CyDTouchView>
              {card.type === 'physical' && <CyDTouchView onPress={() => navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, { onSuccess: (data: any, cardProvider: CardProviders) => { void sendCardDetails(data, cardProvider); }, currentCardProvider, card })}>
                <CyDImage source={{ uri: 'https://public.cypherd.io/icons/settings_outline.png' }} className='h-[20px] w-[20px] mx-[3px]'></CyDImage>
              </CyDTouchView>}
            </CyDView>
          </CyDView>
          <RenderCVVAndExpiry card={card}/>
        </CyDView>}
      </CyDImageBackground>
    </CyDView>
    );
  };

  const { width } = Dimensions.get('window');
  return (
    <Carousel
      inactiveSlideOpacity={1}
      inactiveSlideScale={0.9}
      data={orderBy(userCardDetails.cards, 'type', 'asc')}
      renderItem={renderCard}
      sliderWidth={width}
      itemWidth={width - 90}
      sliderHeight={300}
      itemHeight={width - 50}
      vertical={false}
      onSnapToItem={(index) => setCurrentCardIndex(index)}
    />
  );

  // return (
  //   <WebView
  //     ref={webviewRef}
  //     mixedContentMode="compatibility"
  //     originWhitelist={['*']}
  //     source={{ html: CARD_HTML_CODE }}
  //     // source={require('./card.html')}
  //     onMessage={onMessage}
  //     javaScriptEnabled={true}
  //     style={{ backgroundColor: Colors.transparent }}
  //   />
  // );
}

// const CARD_HTML_CODE = `<!DOCTYPE html>
// <html>
//   <head>
//       <style>
//         @font-face {
//           font-family: "Nunito-Bold";
//           src: url("https://public.cypherd.io/fonts/Nunito-Bold.ttf") format("truetype");
//           font-weight: 400;
//           }

//           @font-face {
//           font-family: "Nunito-SemiBold";
//           src: url("https://public.cypherd.io/fonts/Nunito-SemiBold.ttf") format("opentype");
//           font-weight: 500;
//           }

//           @font-face {
//           font-family: "Nunito-Regular";
//           src: url("https://public.cypherd.io/fonts/Nunito-Regular.ttf") format("opentype");
//           font-weight: 700;
//         }
//         iframe {
//           height: 50px;
//           width: 100%
//         }
//         #result {
//             background-image: url('https://public.cypherd.io/icons/cardLayout.png');
//             min-height: 510px;
//             background-repeat: no-repeat;
//             width: 100%;
//             background-size: contain;
//             background-position: center;
//             display: flex;
//             flex-direction: column;
//             justify-content: space-between;
//             align-self: center;
//             color: white;
//             padding-left: 120px;
//             filter: none
//         }
//         #card-top {
//             display: flex;
//             flex-direction: column;
//             padding-bottom: 15px;
//         }
//         #card-bottom p, #card-top p {
//             margin: 2px;
//             font-size: 30px;
//         }
//         .card-middle-half {
//             width: 30%;
//         }
//         .card-middle-half label {
//             font-family: 'Nunito-SemiBold';
//             font-size: 30px;
//             padding-bottom: 3px;
//         }
//         .card-type {
//           font-family: 'Nunito-Regular';
//           font-weight: bold;
//           font-size: 50px;
//           margin-top: 50px;
//         }
//         #card-number {
//             font-family: 'Nunito-Bold';
//             font-size: 40px;
//             height: 50px
//         }
//         #last-four {
//             font-family: 'Nunito-Bold';
//             font-size: 40px;
//             height: 50px
//         }
//         #card-middle, #card-bottom {
//             display: flex;
//         }
//         #card-bottom {
//           display: flex;
//           margin-bottom: 50px;
//           height: 95px;
//           justify-content: start;
//         }
//         #exp {
//             display: flex;
//             flex-direction: row;
//             justify-content: start;
//             font-family: 'Nunito-Bold';
//             font-size: 35px;
//             margin-top: 20px;
//         }
//         #exp-month {
//             margin-right: 10px;
//         }
//         #exp-year {
//             margin-left: 10px;
//             position: relative;
//             bottom: 0px;
//         }
//         #cvv{
//           font-family: 'Nunito-Bold';
//           margin-top: 20px;
//           font-size: 35px;
//         }
//         .container{
//           /* padding: 100px */
//           display: flex;
//           flex-direction: row;
//           justify-content: center;
//           align-items: center;
//           background-color: transparent;
//         }
//         .cardNumber{
//           width: 65%
//         }
//         #loading{
//           display: none;
//           position: absolute;
//           top: 35%;
//           left: 45%
//         }
//         #blocked{
//           display: none;
//           position: absolute;
//           top: 30%;
//           left: 38%
//         }
//         .loading-text{
//           color: white;
//           text-align: center;
//           font-size: 40px;
//           margin-top: 1rem;
//           font-family: 'Nunito-Bold';
//         }
//         #options-btn{
//           display: inline;
//           margin-left: 10px;
//           margin-bottom: 8px;
//           position: relative
//         }
//         #separator{
//           position: relative;
//           bottom: 0px;
//         }
//         #copy-btn{
//           display: none;
//           width: 5%;
//           position: relative;
//           left: -50px
//         }
//       </style>
//       <meta name="viewport" content="initial-scale=0, maximum-scale=0">
//   </head>
//   <body>
//     <div class="container">
//       <div id="loading">
//         <img src="https://public.cypherd.io/icons/details_loading.png"/>
//         <div class="loading-text">Loading...</div>
//       </div>
//       <div id="blocked">
//         <img src="https://public.cypherd.io/icons/card-blocked.png"/>
//       </div>
//       <div id="result">
//           <div id="card-top">
//               <label class="card-type"> Virtual </label>
//           </div>
//           <div id="card-middle">
//               <div class="card-middle-half cardNumber">
//                 <span id="card-number">XXXX XXXX XXXX </span><span id="last-four"></span>
//               </div>
//               <div id="copy-btn"></div>
//               <div class="card-middle-half">
//                 <img id="btn" style="display: inline"/>
//                 <img id="options-btn" src="https://public.cypherd.io/icons/settings_outline.png">
//               </div>
//           </div>
//           <div id="card-bottom">
//             <div class="card-middle-half" id="card-bottom-first-half">
//               <label>CVV</label>
//               <div id="cvv">XXX</div>
//             </div>
//             <div class="card-middle-half" id="card-bottom-second-half"">
//               <label>VALID THRU</label>
//               <div id="exp">
//                   <div id="exp-month">XX</div>
//                   <div id="separator">/</div>
//                   <div id="exp-year">XXXX</div>
//               </div>
//             </div>

//           </div>
//       </div>
//     </div>
//     <script>
//       // $(document).ready(function(){
//       //   window.ReactNativeWebView.postMessage('fetchLastFour');
//       // })
//         var lastFourNumbers = ' ';
//         var cardDetailsShown = false;
//         var isSendCard = false;

//         function onMessageReceived(message){
//           let msg = JSON.parse(message.data)
//           if(msg.status){
//             if(msg.status === 'inactive'){
//               document.getElementById('card-number').style.display='none';
//               document.getElementById('last-four').style.display='none';
//               document.getElementById('btn').style.display='none';
//               document.getElementById('options-btn').style='margin-left: 70px';
//               document.getElementById('card-bottom-first-half').style.display='none';
//               document.getElementById('card-bottom-second-half').style.display='none';
//               document.getElementById('blocked').style.display='block';
//             }else if (msg.status='active'){
//               document.getElementById('card-number').style.display='inline';
//               document.getElementById('last-four').style.display='inline';
//               document.getElementById('btn').style.display='inline';
//               document.getElementById('options-btn').style='margin-left: 35px';
//               document.getElementById('card-bottom-first-half').style.display='block';
//               document.getElementById('card-bottom-second-half').style.display='block';
//               document.getElementById('blocked').style.display='none';
//               isSendCard = msg.type==='virtual_send_card';
//               if(isSendCard){
//                 document.getElementById('options-btn').style.display='none';
//               }
//             }
//           }
//           if(msg.cardId && msg.showToken){
//             cardDetailsShown = true;
//             renderCardSecrets(msg.cardId, msg.showToken, msg.orgId, msg.vaultId);
//             showLoader();

//           }
//           else if(msg.lastFourNumbers){
//             lastFourNumbers =  msg.lastFourNumbers;
//             isSendCard = msg.type==='virtual_send_card';
//             if(isSendCard){
//               document.getElementById('options-btn').style.display='none';
//             }
//             document.getElementById('last-four').innerText = msg.lastFourNumbers;
//           }
//           else if(msg.hideCardDetails) {
//             cardDetailsShown = false;
//             isSendCard = msg.type==='virtual_send_card';
//             hideCardDetails();
//           }
//           if(msg.showLoader){
//             showLoader();
//           }
//         }

//         window.addEventListener("message", (message) => {
//           onMessageReceived(message);
//         });

//         document.addEventListener("message", (message) => {
//           onMessageReceived(message);
//         });

//         window.ReactNativeWebView.postMessage('fetchLastFour');

//         function showLoader(){
//           document.getElementById('loading').style.display='block';
//           document.getElementById('card-middle').style.display='none';
//           document.getElementById('card-bottom').style.display='none';
//           //document.getElementById('result').style.filter='blur(3px)'
//         }

//         function hideLoader(){
//           document.getElementById('loading').style.display='none';
//           document.getElementById('card-middle').style.display='flex';
//           document.getElementById('card-bottom').style.display='flex';
//           document.getElementById('result').style.filter='none';
//           document.getElementById('copy-btn').style.display='inline'
//           document.getElementById('btn').src='https://public.cypherd.io/icons/reveal.png';
//           document.getElementById('btn').style='padding-bottom: 10px';
//           if(isSendCard){
//             document.getElementById('options-btn').style.display='none';
//           }
//         }

//         /**
//         * verygoodvault script load
//         */
//         function addVgsScript(orgId, callback) {
//             var vgsScript = document.createElement('script');
//             vgsScript.id = 'vgs-script';
//             vgsScript.src = 'https://js.verygoodvault.com/vgs-show/2.0.0/show.js'
//             vgsScript.type = 'text/javascript';
//             if(callback)
//             vgsScript.onload = callback;
//             document.head.append(vgsScript);
//         }

//         function renderCardSecrets(receivedCardId, receivedShowToken, receivedOrgId, receivedVaultId){
//             var orgId = receivedOrgId;
//             var vaultId = receivedVaultId;
//             var cardId = receivedCardId;
//             var showToken = receivedShowToken;

//             if(orgId !== '' && vaultId !== '' && cardId && cardId !== '' && showToken && showToken !== '') {
//               document.getElementById('separator').style.left = "-55px";
//               document.getElementById('exp-year').style.left = "-50px";
//                 addVgsScript(orgId, function() {
//                     var show = window.VGSShow.create(vaultId);
//                     var headers = {'sd-show-token' : showToken}

//                     /**
//                      * card number
//                      */
//                     const cardNoiframe = show.request({
//                         name: 'cardNoIframe',
//                         method: 'GET',
//                         headers,
//                         path: '/v1/card/'+cardId+'/show',
//                         jsonPathSelector: 'cardNumber',
//                         serializers: [show.SERIALIZERS.replace('(\\\\d{4})(\\\\d{4})(\\\\d{4})(\\\\d{4})', '$1 $2 $3 $4')],
//                         htmlWrapper: 'text'
//                     });
//                     // window.ReactNativeWebView.postMessage(cardNoiframe);
//                     document.getElementById('card-number').replaceChildren();
//                     document.getElementById('last-four').replaceChildren();
//                     cardNoiframe.render('#card-number', { '@font-face': {
//                       'font-family': 'Nunito-Bold',
//                       'font-style': 'normal',
//                       'font-weight': '900',
//                       'font-display': 'swap',
//                       'src': 'url("https://public.cypherd.io/fonts/Nunito-Bold.ttf") format("truetype");',
//                       'unicode-range': 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'
//                     }, 'color': 'white', 'font-size': '40px', 'font-family': 'Nunito-Bold', 'display': 'block', 'overflow': 'hidden'});

//                     cardNoiframe.on('revealSuccess', function() {
//                       hideLoader();
//                     });

//                     const copyButton = show.copyFrom(cardNoiframe, { text: ' ', serializers: [show.SERIALIZERS.replace(' ', '')] }, (status) => {
//                       if (status === 'success') {
//                         window.ReactNativeWebView.postMessage('cardNumberCopied');
//                       }
//                   });
//                   document.getElementById('copy-btn').replaceChildren();
//                   copyButton.render('#copy-btn', {
//                     '@font-face': {
//                       'font-family': 'Nunito-Bold',
//                       'font-style': 'normal',
//                       'font-weight': '900',
//                       'font-display': 'swap',
//                       'src': 'url("https://public.cypherd.io/fonts/Nunito-Bold.ttf") format("truetype");',
//                       'unicode-range': 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'
//                     }, 'color': 'white', 'font-size': '40px', 'font-family': 'Nunito-Bold', 'display': 'inline', 'overflow': 'hidden', 'background-image': 'url(https://public.cypherd.io/icons/copy.png)',
//                     'background-repeat': 'no-repeat',
//                     'background-size': 'contain',
//                     'width': '50px',
//                   });

//                     /**
//                      * cvv
//                      */
//                     const cvvIframe = show.request({
//                         name: 'cvvIframe',
//                         method: 'GET',
//                         headers,
//                         path: '/v1/card/'+cardId+'/show',
//                         jsonPathSelector: 'cvv'
//                     });
//                     document.getElementById('cvv').replaceChildren();
//                     cvvIframe.render('#cvv', { '@font-face': {
//                       'font-family': 'Nunito-Bold',
//                       'font-style': 'normal',
//                       'font-weight': '900',
//                       'font-display': 'swap',
//                       'src': 'url("https://public.cypherd.io/fonts/Nunito-Bold.ttf") format("truetype");',
//                       'unicode-range': 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'
//                     }, 'color': 'white', 'display': 'block', 'font-family': 'Nunito-Bold', 'font-size': '35px'});

//                     /**
//                      * expiryMonth
//                      */
//                       const expiryMonthIframe = show.request({
//                         name: 'expiryMonthIframe',
//                         method: 'GET',
//                         headers,
//                         path: '/v1/card/'+cardId+'/show',
//                         jsonPathSelector: 'expiryMonth',
//                         htmlWrapper: 'text'
//                     });
//                     document.getElementById('exp-month').replaceChildren();
//                     expiryMonthIframe.render('#exp-month', {'@font-face': {
//                       'font-family': 'Nunito-Bold',
//                       'font-style': 'normal',
//                       'font-weight': '900',
//                       'font-display': 'swap',
//                       'src': 'url("https://public.cypherd.io/fonts/Nunito-Bold.ttf") format("truetype");',
//                       'unicode-range': 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'
//                     }, 'color': 'white', 'display': 'inline', 'font-family': 'Nunito-Bold', 'font-size': '35px', 'margin-right': '0px'});

//                     /**
//                      * expiryYear
//                      */
//                       const expiryYearIframe = show.request({
//                         name: 'expiryYearIframe',
//                         method: 'GET',
//                         headers,
//                         path: '/v1/card/'+cardId+'/show',
//                         jsonPathSelector: 'expiryYear'
//                     });
//                     document.getElementById('exp-year').replaceChildren();
//                     expiryYearIframe.render('#exp-year', { '@font-face': {
//                       'font-family': 'Nunito-Bold',
//                       'font-style': 'normal',
//                       'font-weight': '900',
//                       'font-display': 'swap',
//                       'src': 'url("https://public.cypherd.io/fonts/Nunito-Bold.ttf") format("truetype");',
//                       'unicode-range': 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'
//                     }, 'color': 'white', 'display': 'inline', 'font-family': 'Nunito-Bold', 'font-size': '35px'});

//                     document.getElementById('show-token').value = "";
//                 });

//             }
//         }

//         function hideCardDetails(){
//           document.getElementById('options-btn').style.top = "-10px"
//           document.getElementById('btn').src='https://public.cypherd.io/icons/hide.png'
//           document.getElementById('copy-btn').style.display='none'
//           document.getElementById('card-number').innerText = 'XXXX XXXX XXXX '
//           document.getElementById('last-four').innerText = lastFourNumbers;
//           document.getElementById('cvv').innerText = 'XXX'
//           document.getElementById('exp-month').innerText = 'XX'
//           document.getElementById('exp-year').innerText = 'XXXX'
//           document.getElementById('separator').style.left = "0px";
//           document.getElementById('exp-year').style.left = "0px";
//           if(isSendCard){
//             document.getElementById('options-btn').style.display='none';
//           }
//         }

//         function toggleCardSecrets() {
//           if(!cardDetailsShown){
//             window.ReactNativeWebView.postMessage('fetchSecrets');
//           }else{
//             hideCardDetails();
//           }
//           cardDetailsShown=!cardDetailsShown
//         }

//         function showOptions(){
//           window.ReactNativeWebView.postMessage('showOptions');
//         }

//         document.getElementById('btn').src='https://public.cypherd.io/icons/hide.png'
//         document.getElementById('btn').addEventListener('click', toggleCardSecrets);
//         document.getElementById('options-btn').addEventListener('click', showOptions);
//     </script>
//   </body>
// </html>
// `;
