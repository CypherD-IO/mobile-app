import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../core/globalContext';
import useCardUtilities from '../hooks/useCardUtilities';
import { CardProviders, GlobalContextType } from '../constants/enum';
import { CardProfile } from '../models/cardProfile.model';
import { CyDView } from '../styles/tailwindStyles';
import SwitchView from './v2/switchView';
import { useNavigation } from '@react-navigation/native';
import { screenTitle } from '../constants';
import useAxios from '../core/HttpRequest';

export default function CardProviderSwitch() {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const provider = cardProfile?.provider;
  const { hasBothProviders } = useCardUtilities();
  const [twoProviders, setTwoProviders] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    void setTwoProviders(hasBothProviders(cardProfile));
  }, []);

  const onSwitchProviders = (index: number) => {
    const tempProfile = cardProfile;
    if (index) {
      tempProfile.provider = CardProviders.PAYCADDY;
    } else {
      tempProfile.provider = CardProviders.REAP_CARD;
    }
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: tempProfile,
    });
    navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
  };

  return twoProviders ? (
    <CyDView className='flex items-center'>
      <SwitchView
        titles={['New Card', 'Legacy Card']}
        index={provider === CardProviders.REAP_CARD ? 0 : 1}
        setIndexChange={(index: number) => {
          onSwitchProviders(index);
        }}
      />
    </CyDView>
  ) : (
    <></>
  );
}
