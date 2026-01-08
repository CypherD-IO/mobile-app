import React, { useContext, useState } from 'react';
import BottomConfirmCosmos from '../../components/BottomConfirmCosmos';
import ChooseChainModalV2 from '../../components/v2/chooseChainModal';
import PushModal from '../../components/PushModal';
import { BrowserModal, ModalContext } from '../../reducers/modalReducer';
import SigningModal from '../../components/v2/walletConnectV2Views/SigningModal';
import { SigningModalPayloadFrom } from '../../constants/enum';
import { ALL_CHAINS, Chain } from '../../constants/server';
import { HdWalletContext } from '../../core/util';
import { useTranslation } from 'react-i18next';

export default function ConfirmationModals() {
  const Cxt = useContext(ModalContext);
  const hdWallet = useContext(HdWalletContext);
  const { t } = useTranslation();

  const { visible: ccmVisible, payload: ccmPayload } =
    Cxt.state[BrowserModal.ChooseChainModal];
  const { visible: stmVisible, payload: stmPayload } =
    Cxt.state[BrowserModal.SignTransactionModal];
  const { visible: pmVisble, payload: pmPayload } =
    Cxt.state[BrowserModal.PushPermissionMoal];
  const { visible: sdtmVisible, payload: sdtmPayload } =
    Cxt.state[BrowserModal.SendTransactionModal];
  const { visible: stCosmosVisible, payload: stCosmosPayload } =
    Cxt.state[BrowserModal.SignTransactionCosmos];

  return (
    <>
      {ccmVisible && (
        <ChooseChainModalV2
          isModalVisible={ccmVisible}
          setModalVisible={() => {}}
          data={ALL_CHAINS}
          title={t('CHOOSE_CHAIN') ?? 'Choose Chain'}
          selectedItem={hdWallet?.state?.selectedChain?.name ?? ''}
          onPress={(item: { item: Chain }) => {
            hdWallet?.dispatch({
              type: 'CHOOSE_CHAIN',
              value: { selectedChain: item.item },
            });
            ccmPayload?.resolve(true);
          }}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
        />
      )}
      {stmVisible && (
        <SigningModal
          payloadFrom={SigningModalPayloadFrom.BROWSER}
          isModalVisible={stmVisible}
          modalPayload={stmPayload}
        />
      )}
      {pmVisble && (
        <PushModal
          isModalVisible={pmVisble}
          modalParams={pmPayload?.params}
          onAllowPress={() => {
            pmPayload?.resolve(true);
          }}
          onDenyPress={() => {
            pmPayload?.resolve(false);
          }}
        />
      )}
      {sdtmVisible && (
        <SigningModal
          payloadFrom={SigningModalPayloadFrom.BROWSER}
          isModalVisible={sdtmVisible}
          modalPayload={sdtmPayload}
        />
      )}
      {stCosmosVisible && (
        <BottomConfirmCosmos
          isModalVisible={true}
          onPayPress={() => {
            stCosmosPayload.resolve(true);
          }}
          onCancelPress={() => {
            stCosmosPayload.resolve(false);
          }}
          payload={stCosmosPayload?.params?.signable}
          chain={stCosmosPayload?.params?.chain}
        />
      )}
    </>
  );
}
