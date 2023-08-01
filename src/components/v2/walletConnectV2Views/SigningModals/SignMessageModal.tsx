import React from 'react';
import { CyDView } from '../../../../styles/tailwindStyles';
import { Divider, RenderDAPPInfo, RenderMessage, RenderMethod, RenderNetwork } from './SigningModalComponents';
import { IDAppInfo } from '../../../../models/signingModalData.interface';
import { Chain } from '../../../../constants/server';

export const RenderSignMessageModal = ({ dAppInfo, chain, method, messageParams }: {dAppInfo: IDAppInfo | undefined, chain: Chain | undefined, method: string, messageParams: any}) => {
  return (
      <CyDView>
        {dAppInfo
          ? <>
        <RenderDAPPInfo dAppInfo={dAppInfo} />
        <Divider />
         </>
          : null}
        <RenderNetwork chain={chain} />
        <Divider />
        <RenderMethod method={method} />
        <Divider />
        <RenderMessage messageParams={messageParams} method={method} />
      </CyDView>
  );
};
