import React, { useContext } from 'react';
import BottomConfirm from '../../components/BottomConfirm';
import BottomConfirmCosmos from '../../components/BottomConfirmCosmos';
import BottomModal from '../../components/BottomModal';
import { ChooseChainModal } from '../../components/ChooseChainModal';
import PushModal from '../../components/PushModal';
import { BrowserModal, ModalContext } from '../../reducers/modalReducer';

export default function ConfirmationModals () {
  const Cxt = useContext(ModalContext);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { visible: ccmVisible, payload: ccmPayload } = Cxt.state[BrowserModal.ChooseChainModal];
  const { visible: stmVisible, payload: stmPayload } = Cxt.state[BrowserModal.SignTransactionModal];
  const { visible: pmVisble, payload: pmPayload } = Cxt.state[BrowserModal.PushPermissionMoal];
  const { visible: sdtmVisible, payload: sdtmPayload } = Cxt.state[BrowserModal.SendTransactionModal];
  const { visible: stCosmosVisible, payload: stCosmosPayload } = Cxt.state[BrowserModal.SignTransactionCosmos];

  return (
    <>
      {ccmVisible && <ChooseChainModal
        isModalVisible={ccmVisible}
        onPress={() => {
          ccmPayload?.resolve(true);
        }}
        where={'BROWSER'}
      />}
      {stmVisible && <BottomModal
        isModalVisible={stmVisible}
        signMessage={stmPayload?.params?.signMessage}
        signMessageTitle={stmPayload?.params?.signMessageTitle}
        onSignPress={() => {
          stmPayload?.resolve(true);
        }}
        onCancelPress={() => {
          stmPayload?.resolve(false);
        }}
      />}
      {pmVisble && <PushModal
        isModalVisible={pmVisble}
        modalParams={pmPayload?.params}
        onAllowPress={() => {
          pmPayload?.resolve(true);
        }}
        onDenyPress={() => {
          pmPayload?.resolve(false);
        }}
      />}
      {sdtmVisible && <BottomConfirm
        isModalVisible={sdtmVisible}
        modalParams={sdtmPayload?.params}
        onPayPress={() => {
          sdtmPayload?.resolve(true);
        }}
        onCancelPress={() => {
          sdtmPayload?.resolve(false);
        }}
      />}
      {stCosmosVisible && <BottomConfirmCosmos
        isModalVisible={true}
        onPayPress={() => {
          stCosmosPayload.resolve(true);
        }}
        onCancelPress={() => {
          stCosmosPayload.resolve(false);
        }}
        payload={stCosmosPayload?.params?.signable}
        chain={stCosmosPayload?.params?.chain}
      />}
    </>
  );
}
