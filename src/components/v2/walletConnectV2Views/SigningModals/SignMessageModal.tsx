import React from 'react';
import { CyDView } from '../../../../styles/tailwindStyles';
import { Divider, RenderDAPPInfo, RenderMessage, RenderMethod, RenderNetwork } from './parts';
import { IDAppInfo } from '../../../../models/signingModalData.interface';
import { Chain } from '../../../../constants/server';

export const RenderSignMessageModal = ({ dAppInfo, chain, method, requestParams }: {dAppInfo: IDAppInfo | undefined, chain: Chain | undefined, method: string, requestParams: any}) => {
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
        <RenderMessage messageParams={requestParams} method={method} />
      </CyDView>
  );
};
