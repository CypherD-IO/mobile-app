import React, { useContext } from 'react';
import BottomConfirmCosmos from '../../components/BottomConfirmCosmos';
import { ChooseChainModal } from '../../components/ChooseChainModal';
import PushModal from '../../components/PushModal';
import { BrowserModal, ModalContext } from '../../reducers/modalReducer';
import SigningModal from '../../components/v2/walletConnectV2Views/SigningModal';
import { SigningModalPayloadFrom } from '../../constants/enum';

export default function ConfirmationModals() {
  const Cxt = useContext(ModalContext);

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
        <ChooseChainModal
          isModalVisible={ccmVisible}
          onPress={() => {
            ccmPayload?.resolve(true);
          }}
          where={'BROWSER'}
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
