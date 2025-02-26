import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../core/globalContext';
import useCardUtilities from '../hooks/useCardUtilities';
import { CardProviders, GlobalContextType } from '../constants/enum';
import { CardProfile } from '../models/cardProfile.model';
import { CyDView } from '../styles/tailwindComponents';
import SwitchView from './v2/switchView';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { screenTitle } from '../constants';

export default function CardProviderSwitch() {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const provider = cardProfile?.provider ?? CardProviders.REAP_CARD;
  const { hasBothProviders } = useCardUtilities();
  const [twoProviders, setTwoProviders] = useState(false);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

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
        className={'w-full'}
        index={provider === CardProviders.REAP_CARD ? 0 : 1}
        setIndexChange={(index: number) => {
          onSwitchProviders(index);
        }}
        fontSize={'14px'}
      />
    </CyDView>
  ) : (
    <></>
  );
}
