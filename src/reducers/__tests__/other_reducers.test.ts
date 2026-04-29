// ── Mocks ──────────────────────────────────────────────────────────────
jest.mock('../../core/asyncStorage', () => ({ setActivities: jest.fn() }));

// ── Imports ────────────────────────────────────────────────────────────
import {
  bridgeReducer,
  bridgeContextInitialState,
  BridgeReducerAction,
  BridgeStatus,
} from '../bridge.reducer';

import {
  ActivityStateReducer,
  ActivityReducerAction,
  initialActivityState,
} from '../activity_reducer';

import {
  walletConnectReducer,
  WalletConnectActions,
  walletConnectInitialState,
} from '../wallet_connect_reducer';

import {
  modalReducer,
  ModalReducerAction,
  modalContextInitialState,
} from '../modalReducer';

// ════════════════════════════════════════════════════════════════════════
// 1. bridgeReducer
// ════════════════════════════════════════════════════════════════════════
describe('bridgeReducer', () => {
  const tokenData = { ETH: [{ symbol: 'USDC' }] };
  const chainData = [{ chainId: 1, name: 'Ethereum' }];

  it('SUCCESS sets status to SUCCESS', () => {
    const next = bridgeReducer(
      bridgeContextInitialState as any,
      {
        type: BridgeReducerAction.SUCCESS,
        payload: { tokenData, chainData },
      } as any,
    );
    expect(next.status).toBe(BridgeStatus.SUCCESS);
  });

  it('SUCCESS sets tokenData from payload', () => {
    const next = bridgeReducer(
      bridgeContextInitialState as any,
      {
        type: BridgeReducerAction.SUCCESS,
        payload: { tokenData, chainData },
      } as any,
    );
    expect(next.tokenData).toBe(tokenData);
  });

  it('SUCCESS sets chainData from payload', () => {
    const next = bridgeReducer(
      bridgeContextInitialState as any,
      {
        type: BridgeReducerAction.SUCCESS,
        payload: { tokenData, chainData },
      } as any,
    );
    expect(next.chainData).toBe(chainData);
  });

  it('FETCHING sets status to FETCHING', () => {
    const populated = {
      ...bridgeContextInitialState,
      status: BridgeStatus.SUCCESS,
      tokenData,
      chainData,
    };
    const next = bridgeReducer(populated as any, {
      type: BridgeReducerAction.FETCHING,
      payload: null,
    });
    expect(next.status).toBe(BridgeStatus.FETCHING);
  });

  it('FETCHING preserves existing tokenData and chainData', () => {
    const populated = {
      ...bridgeContextInitialState,
      status: BridgeStatus.SUCCESS,
      tokenData,
      chainData,
    };
    const next = bridgeReducer(populated as any, {
      type: BridgeReducerAction.FETCHING,
      payload: null,
    });
    expect(next.tokenData).toBe(tokenData);
    expect(next.chainData).toBe(chainData);
  });

  it('ERROR sets status to ERROR', () => {
    const populated = {
      ...bridgeContextInitialState,
      status: BridgeStatus.SUCCESS,
      tokenData,
      chainData,
    };
    const next = bridgeReducer(populated as any, {
      type: BridgeReducerAction.ERROR,
      payload: null,
    });
    expect(next.status).toBe(BridgeStatus.ERROR);
  });

  it('ERROR resets tokenData and chainData to initial empty values', () => {
    const populated = {
      ...bridgeContextInitialState,
      status: BridgeStatus.SUCCESS,
      tokenData,
      chainData,
    };
    const next = bridgeReducer(populated as any, {
      type: BridgeReducerAction.ERROR,
      payload: null,
    });
    expect(next.tokenData).toEqual({});
    expect(next.chainData).toEqual([]);
  });

  it('unknown action returns state unchanged', () => {
    const state = { ...bridgeContextInitialState } as any;
    const next = bridgeReducer(state, { type: 'BOGUS' } as any);
    expect(next).toBe(state);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. ActivityStateReducer
// ════════════════════════════════════════════════════════════════════════
describe('ActivityStateReducer', () => {
  const sampleActivity = {
    id: 'act-1',
    status: 0,
    type: 'send',
    transactionHash: '0xabc',
    amount: '1.0',
  };

  it('LOAD replaces entire state with action.value', () => {
    const loaded = {
      activityObjects: [sampleActivity],
      lastVisited: new Date('2025-01-01'),
    };
    const next = ActivityStateReducer(initialActivityState, {
      type: ActivityReducerAction.LOAD,
      value: loaded,
    });
    expect(next).toEqual(loaded);
  });

  it('POST appends to activityObjects', () => {
    const state = { ...initialActivityState, activityObjects: [] };
    const next = ActivityStateReducer(state, {
      type: ActivityReducerAction.POST,
      value: sampleActivity,
    });
    expect(next.activityObjects).toHaveLength(1);
    expect(next.activityObjects[0]).toBe(sampleActivity);
  });

  it('PATCH updates matching activity by id (status field)', () => {
    const state = {
      activityObjects: [{ ...sampleActivity }],
      lastVisited: new Date(),
    };
    const next = ActivityStateReducer(state, {
      type: ActivityReducerAction.PATCH,
      value: { id: 'act-1', status: 1 },
    });
    expect(next.activityObjects[0].status).toBe(1);
  });

  it('PATCH updates transactionHash on matching activity', () => {
    const state = {
      activityObjects: [{ ...sampleActivity }],
      lastVisited: new Date(),
    };
    const next = ActivityStateReducer(state, {
      type: ActivityReducerAction.PATCH,
      value: { id: 'act-1', transactionHash: '0xnew' },
    });
    expect(next.activityObjects[0].transactionHash).toBe('0xnew');
  });

  it('PATCH updates reason on matching activity', () => {
    const state = {
      activityObjects: [{ ...sampleActivity }],
      lastVisited: new Date(),
    };
    const next = ActivityStateReducer(state, {
      type: ActivityReducerAction.PATCH,
      value: { id: 'act-1', reason: 'gas too low' },
    });
    expect(next.activityObjects[0].reason).toBe('gas too low');
  });

  it('PATCH leaves non-matching activities unchanged', () => {
    const other = {
      id: 'act-2',
      status: 0,
      type: 'swap',
      transactionHash: '0xdef',
      amount: '2.0',
    };
    const state = {
      activityObjects: [{ ...sampleActivity }, { ...other }],
      lastVisited: new Date(),
    };
    const next = ActivityStateReducer(state, {
      type: ActivityReducerAction.PATCH,
      value: { id: 'act-1', status: 1 },
    });
    expect(next.activityObjects[1]).toEqual(other);
  });

  it('DELETE removes activity by id', () => {
    const state = {
      activityObjects: [{ ...sampleActivity }],
      lastVisited: new Date(),
    };
    const next = ActivityStateReducer(state, {
      type: ActivityReducerAction.DELETE,
      value: { id: 'act-1' },
    });
    expect(next.activityObjects).toHaveLength(0);
  });

  it('UPDATEVISITED updates lastVisited', () => {
    const newDate = new Date('2026-06-15');
    const next = ActivityStateReducer(initialActivityState, {
      type: ActivityReducerAction.UPDATEVISITED,
      value: { lastVisited: newDate },
    });
    expect(next.lastVisited).toBe(newDate);
  });

  it('RESET returns a copy of initialActivityState', () => {
    const state = {
      activityObjects: [sampleActivity],
      lastVisited: new Date(),
    };
    const next = ActivityStateReducer(state, {
      type: ActivityReducerAction.RESET,
    });
    expect(next).toEqual(initialActivityState);
    // Should be a new object, not the same reference
    expect(next).not.toBe(initialActivityState);
  });

  it('default action appends action.value to activityObjects', () => {
    const state = { activityObjects: [], lastVisited: new Date() };
    const next = ActivityStateReducer(state, {
      type: 'UNKNOWN_ACTION',
      value: sampleActivity,
    });
    expect(next.activityObjects).toHaveLength(1);
    expect(next.activityObjects[0]).toBe(sampleActivity);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. walletConnectReducer
// ════════════════════════════════════════════════════════════════════════
describe('walletConnectReducer', () => {
  const mockConnector = { id: 'conn-1', uri: 'wc://test' };
  const mockDApp: any = {
    chainId: 1,
    description: 'Test dApp',
    name: 'TestDApp',
    icons: ['https://icon.png'],
    url: 'https://test.com',
  };

  it('ADD_CONNECTOR appends to connectors array', () => {
    const next = walletConnectReducer(walletConnectInitialState, {
      type: WalletConnectActions.ADD_CONNECTOR,
      value: mockConnector,
    });
    expect(next.connectors).toHaveLength(1);
    expect(next.connectors[0]).toBe(mockConnector);
  });

  it('ADD_CONNECTOR sets itemsAdded to true', () => {
    const next = walletConnectReducer(walletConnectInitialState, {
      type: WalletConnectActions.ADD_CONNECTOR,
      value: mockConnector,
    });
    expect(next.itemsAdded).toBe(true);
  });

  it('ADD_DAPP_INFO appends to dAppInfo array and sets itemsAdded true', () => {
    const next = walletConnectReducer(walletConnectInitialState, {
      type: WalletConnectActions.ADD_DAPP_INFO,
      value: mockDApp,
    });
    expect(next.dAppInfo).toHaveLength(1);
    expect(next.dAppInfo[0]).toBe(mockDApp);
    expect(next.itemsAdded).toBe(true);
  });

  it('DELETE_CONNECTOR removes the last connector', () => {
    const state = {
      ...walletConnectInitialState,
      connectors: [mockConnector, { id: 'conn-2' }],
      itemsAdded: true,
    };
    const next = walletConnectReducer(state, {
      type: WalletConnectActions.DELETE_CONNECTOR,
    });
    expect(next.connectors).toHaveLength(1);
    expect(next.connectors[0]).toBe(mockConnector);
  });

  it('RESTORE_SESSION sets dAppInfo and connectors from action.value', () => {
    const connectors = [mockConnector];
    const dAppInfo = [mockDApp];
    const next = walletConnectReducer(walletConnectInitialState, {
      type: WalletConnectActions.RESTORE_SESSION,
      value: { connectors, dAppInfo },
    });
    expect(next.connectors).toBe(connectors);
    expect(next.dAppInfo).toBe(dAppInfo);
    expect(next.itemsAdded).toBe(true);
  });

  it('WALLET_CONNECT_TRIGGER_REFRESH returns a shallow copy of state', () => {
    const state = {
      ...walletConnectInitialState,
      connectors: [mockConnector],
    };
    const next = walletConnectReducer(state, {
      type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH,
    });
    expect(next).toEqual(state);
    expect(next).not.toBe(state);
  });

  it('RESTORE_INITIAL_STATE returns walletConnectInitialState', () => {
    const state = {
      connectors: [mockConnector],
      dAppInfo: [mockDApp],
      itemsAdded: true,
    };
    const next = walletConnectReducer(state, {
      type: WalletConnectActions.RESTORE_INITIAL_STATE,
    });
    expect(next).toEqual(walletConnectInitialState);
  });

  it('RESTORE_INITIAL_STATE returns exact initial state reference', () => {
    const next = walletConnectReducer(
      { connectors: [mockConnector], dAppInfo: [], itemsAdded: true },
      { type: WalletConnectActions.RESTORE_INITIAL_STATE },
    );
    expect(next).toBe(walletConnectInitialState);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. modalReducer
// ════════════════════════════════════════════════════════════════════════
describe('modalReducer', () => {
  const testPayload = {
    params: { amount: 100 },
    resolve: jest.fn(),
    reject: jest.fn(),
  };

  it('UPDATE_PARAMS sets visible and payload for specified modal', () => {
    const next = modalReducer(modalContextInitialState, {
      type: ModalReducerAction.UPDATE_PARAMS,
      value: {
        modal: 'SignTransactionModal',
        visible: true,
        payload: testPayload,
      },
    });
    expect(next.SignTransactionModal.visible).toBe(true);
    expect(next.SignTransactionModal.payload).toBe(testPayload);
  });

  it('UPDATE_PARAMS does not affect other modals in state', () => {
    const next = modalReducer(modalContextInitialState, {
      type: ModalReducerAction.UPDATE_PARAMS,
      value: {
        modal: 'SignTransactionModal',
        visible: true,
        payload: testPayload,
      },
    });
    expect(next.SendTransactionModal).toEqual(
      modalContextInitialState.SendTransactionModal,
    );
    expect(next.ChooseChainModal).toEqual(
      modalContextInitialState.ChooseChainModal,
    );
  });

  it('UPDATE_VISIBILITY sets visible to false and payload to null', () => {
    const openState = {
      ...modalContextInitialState,
      SignTransactionModal: { visible: true, payload: testPayload },
    };
    const next = modalReducer(openState, {
      type: ModalReducerAction.UPDATE_VISIBILITY,
      value: { modal: 'SignTransactionModal' },
    });
    expect(next.SignTransactionModal.visible).toBe(false);
    expect(next.SignTransactionModal.payload).toBeNull();
  });

  it('UPDATE_VISIBILITY does not affect other modals', () => {
    const openState = {
      ...modalContextInitialState,
      SignTransactionModal: { visible: true, payload: testPayload },
      SendTransactionModal: { visible: true, payload: testPayload },
    };
    const next = modalReducer(openState, {
      type: ModalReducerAction.UPDATE_VISIBILITY,
      value: { modal: 'SignTransactionModal' },
    });
    // SendTransactionModal should remain open
    expect(next.SendTransactionModal.visible).toBe(true);
    expect(next.SendTransactionModal.payload).toBe(testPayload);
  });

  it('UPDATE_PARAMS can set visible to false with a payload', () => {
    const next = modalReducer(modalContextInitialState, {
      type: ModalReducerAction.UPDATE_PARAMS,
      value: {
        modal: 'ChooseChainModal',
        visible: false,
        payload: testPayload,
      },
    });
    expect(next.ChooseChainModal.visible).toBe(false);
    expect(next.ChooseChainModal.payload).toBe(testPayload);
  });
});
