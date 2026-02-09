export const TargetRouterABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'program',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'provider',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'chain',
        type: 'string',
      },
    ],
    name: 'TargetRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'program',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'provider',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'chain',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'target',
        type: 'string',
      },
    ],
    name: 'TargetSet',
    type: 'event',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'program',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'provider',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'chain',
        type: 'string',
      },
    ],
    name: 'removeTarget',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'program',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'provider',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'chain',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'target',
        type: 'string',
      },
    ],
    name: 'setTarget',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'program',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'provider',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'chain',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'target',
            type: 'string',
          }
        ],
        internalType: 'struct CypherTargetRouter.InitialTarget[]',
        name: 'newTargets',
        type: 'tuple[]',
      }
    ],
    name: 'setTargets',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'targets',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
