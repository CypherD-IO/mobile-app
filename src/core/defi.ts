/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
import AppImages from '../../assets/images/appImages';
import {
  CHAIN_ARBITRUM,
  CHAIN_AVALANCHE,
  CHAIN_BASE,
  CHAIN_BSC,
  CHAIN_COREUM,
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_INJECTIVE,
  CHAIN_NOBLE,
  CHAIN_OPTIMISM,
  CHAIN_OSMOSIS,
  CHAIN_POLYGON,
  CHAIN_ZKSYNC_ERA,
  ChainBackendNames,
} from '../constants/server';

import {
  ChainPositionData,
  DeFiFilter,
  DeFiPositionTypes,
  DefiAllocation,
  DefiData,
  DefiPositonTypes,
  Position,
  PositionTypeData,
  Protocol,
  defiProtocolData,
  protocolOptionType,
} from '../models/defi.interface';

export function getChainLogo(chainName: ChainBackendNames) {
  switch (chainName) {
    case ChainBackendNames.ETH:
      return CHAIN_ETH.logo_url;
    case ChainBackendNames.ARBITRUM:
      return CHAIN_ARBITRUM.logo_url;
    case ChainBackendNames.AVALANCHE:
      return CHAIN_AVALANCHE.logo_url;
    case ChainBackendNames.BASE:
      return CHAIN_BASE.logo_url;
    case ChainBackendNames.BSC:
      return CHAIN_BSC.logo_url;
    case ChainBackendNames.COSMOS:
      return CHAIN_COSMOS.logo_url;
    case ChainBackendNames.NOBLE:
      return CHAIN_NOBLE.logo_url;
    case ChainBackendNames.COREUM:
      return CHAIN_COREUM.logo_url;
    case ChainBackendNames.INJECTIVE:
      return CHAIN_INJECTIVE.logo_url;
    case ChainBackendNames.OPTIMISM:
      return CHAIN_OPTIMISM.logo_url;
    case ChainBackendNames.OSMOSIS:
      return CHAIN_OSMOSIS.logo_url;
    case ChainBackendNames.POLYGON:
      return CHAIN_POLYGON.logo_url;
    case ChainBackendNames.ZKSYNC_ERA:
      return CHAIN_ZKSYNC_ERA.logo_url;
    default:
      return AppImages.UNKNOWN_TXN_TOKEN;
  }
}

export function getPositionDetails(
  type: DeFiPositionTypes,
): [{ uri: string }, string] {
  switch (type) {
    case DefiPositonTypes.LIQUIDITY:
      return [AppImages.DEFI_LIQUIDITY, 'Liquidity Provision'];
    case DefiPositonTypes.STAKING:
      return [AppImages.DEFI_STAKING, 'Staking'];
    case DefiPositonTypes.YEILD:
      return [AppImages.DEFI_YEILD, 'Yeild'];
    case DefiPositonTypes.FARMING:
      return [AppImages.DEFI_FARMING, 'Farming'];
    case DefiPositonTypes.LENDING:
      return [AppImages.DEFI_LENDING, 'Lending'];
    case DefiPositonTypes.DEPOSIT:
      return [AppImages.DEFI_DEPOSIT, 'Deposit'];
    case DefiPositonTypes.LEVRAGED_FARMING:
      return [AppImages.DEFI_LEVERAGED_FARMING, 'Levraged Farming'];
    case DefiPositonTypes.OTHERS:
      return [AppImages.DEFI_OTHERS, 'Others'];
    case DefiPositonTypes.LOCKED:
      return [AppImages.DEFI_LOCKED, 'Locked'];
    case DefiPositonTypes.REWARDS:
      return [AppImages.DEFI_REWARDS, 'Rewards'];
    case DefiPositonTypes.VESTING:
      return [AppImages.DEFI_VESTING, 'Vesting'];
    case DefiPositonTypes.NFT_STAKING:
      return [AppImages.DEFI_NFT_STAKING, 'NFT Staking'];
    case DefiPositonTypes.AIRDROP:
      return [AppImages.DEFI_AIRDROP, 'Airdrop'];
    default:
      return [AppImages.DEFI_AIRDROP, 'Unknown'];
  }
}

export function parseDefiData(
  rawProtocolsData: Protocol[],
  filters: DeFiFilter,
): {
  defiData: DefiData;
  chainAllocation: DefiAllocation[];
  typeAllocation: DefiAllocation[];
  defiOptionsData: protocolOptionType[];
} {
  const parsedProtocolData: DefiData = {
    total: {
      supply: 0,
      debt: 0,
      value: 0,
      claimable: 0,
    },
    TotalLending: 0,
    totalStaked: 0,
    totalYield: 0,
    totalLiquidity: 0,
    totalFarming: 0,
    protocols: {},
  };
  const chainAllocation: DefiAllocation[] = [];
  const typeAllocation: DefiAllocation[] = [];
  const protocolOptionsData: protocolOptionType[] = [];
  rawProtocolsData.forEach(protocol => {
    const protocolName: string = protocol.name;
    const chainName: ChainBackendNames = protocol.chain as ChainBackendNames;

    if (
      protocolName in parsedProtocolData.protocols &&
      [ChainBackendNames.ALL, chainName].includes(filters.chain)
    ) {
      protocol.positions.forEach(position => {
        if (
          (filters.positionTypes.length === 0 ||
            filters.positionTypes.includes(position.type)) &&
          (!filters.activePositionsOnly ||
            (filters.activePositionsOnly && position.total.isActive))
        ) {
          if (
            !parsedProtocolData.protocols[protocolName].chains.includes(
              chainName,
            )
          )
            parsedProtocolData.protocols[protocolName].chains.push(chainName);

          if (position.details.rewards) {
            position.details.rewards.forEach(reward => {
              parsedProtocolData.total.claimable += reward.balanceUSD;
              parsedProtocolData.protocols[protocol.name].total.claimable +=
                reward.balanceUSD;
            });
          }

          const chainIndex = chainAllocation.findIndex(
            chain => chain.name === chainName,
          );
          if (chainIndex !== -1) {
            chainAllocation[chainIndex].balance += position.total.value;
          } else {
            chainAllocation.push({
              name: chainName,
              balance: position.total.value,
              value: 0,
              logo: getChainLogo(chainName),
            });
          }

          parsedProtocolData.total.supply += position.total.supply;
          parsedProtocolData.total.debt += position.total.debt;
          parsedProtocolData.total.value += position.total.value;

          parsedProtocolData.protocols[protocolName].total.supply +=
            position.total.supply;
          parsedProtocolData.protocols[protocolName].total.debt +=
            position.total.debt;
          parsedProtocolData.protocols[protocolName].total.value +=
            position.total.value;

          const type = position.type;
          const [typeLogo, typeName] = getPositionDetails(type);
          const typeIndex = typeAllocation.findIndex(
            item => item.name === typeName,
          );
          if (typeIndex !== -1) {
            typeAllocation[typeIndex].balance += position.total.value;
          } else {
            typeAllocation.push({
              name: typeName,
              balance: position.total.value,
              value: 0,
              logo: typeLogo,
            });
          }
          if (type in parsedProtocolData.protocols[protocolName].types) {
            parsedProtocolData.protocols[protocolName].types[
              position.type
            ].total.supply += position.total.supply;
            parsedProtocolData.protocols[protocolName].types[
              position.type
            ].total.debt += position.total.debt;
            parsedProtocolData.protocols[protocolName].types[
              position.type
            ].total.value += position.total.value;

            parsedProtocolData.protocols[protocolName].types[
              type
            ].holdings.push({
              chain: chainName,
              chainLogo: getChainLogo(chainName),
              ...position,
            });
          } else {
            const [typeLogo, typeName] = getPositionDetails(type);
            parsedProtocolData.protocols[protocolName].types[type] = {
              value: type,
              type: typeName,
              typeLogo,
              total: {
                supply: position.total.supply,
                debt: position.total.debt,
                value: position.total.value,
              },
              holdings: [
                {
                  chain: chainName,
                  chainLogo: getChainLogo(chainName),
                  ...position,
                },
              ],
            };
          }
        }
      });
    } else {
      if (
        (filters.protocols.length === 0 ||
          filters.protocols.includes(protocolName)) &&
        [ChainBackendNames.ALL, chainName].includes(filters.chain)
      ) {
        protocolOptionsData.push({
          logo: { uri: protocol.logo },
          label: protocolName,
          value: protocolName,
        });
        const tempProtocolData: defiProtocolData = {
          chains: [],
          protocolName: protocol.name,
          protocolURL: protocol.url,
          protocolLogo: { uri: protocol.logo },
          total: {
            supply: 0,
            debt: 0,
            value: 0,
            claimable: 0,
          },
          types: {} as Record<DefiPositonTypes, PositionTypeData>,
        };
        protocol.positions.forEach(position => {
          if (
            (filters.positionTypes.length === 0 ||
              filters.positionTypes.includes(position.type)) &&
            (!filters.activePositionsOnly ||
              (filters.activePositionsOnly && position.total.isActive))
          ) {
            if (!tempProtocolData.chains.includes(chainName))
              tempProtocolData.chains.push(chainName);

            if (position.details.rewards) {
              position.details.rewards.forEach(reward => {
                parsedProtocolData.total.claimable += reward.balanceUSD;
                tempProtocolData.total.claimable += reward.balanceUSD;
              });
            }
            const index = chainAllocation.findIndex(
              chain => chain.name === chainName,
            );
            if (index !== -1) {
              chainAllocation[index].balance += position.total.value;
            } else {
              chainAllocation.push({
                name: chainName,
                balance: position.total.value,
                value: 0,
                logo: getChainLogo(chainName),
              });
            }

            parsedProtocolData.total.supply += position.total.supply;
            parsedProtocolData.total.debt += position.total.debt;
            parsedProtocolData.total.value += position.total.value;

            tempProtocolData.total.supply += position.total.supply;
            tempProtocolData.total.debt += position.total.debt;
            tempProtocolData.total.value += position.total.value;

            const type = position.type;
            const [typeLogo, typeName] = getPositionDetails(type);
            const typeIndex = typeAllocation.findIndex(
              item => item.name === typeName,
            );
            if (typeIndex !== -1) {
              typeAllocation[typeIndex].balance += position.total.value;
            } else {
              typeAllocation.push({
                name: typeName,
                balance: position.total.value,
                value: 0,
                logo: typeLogo,
              });
            }
            if (type in tempProtocolData.types) {
              tempProtocolData.types[position.type].total.supply +=
                position.total.supply;
              tempProtocolData.types[position.type].total.debt +=
                position.total.debt;
              tempProtocolData.types[position.type].total.value +=
                position.total.value;
              tempProtocolData.types[type].holdings.push({
                chain: chainName,
                chainLogo: getChainLogo(chainName),
                ...position,
              });
            } else {
              const [typeLogo, typeName] = getPositionDetails(type);

              tempProtocolData.types[type] = {
                value: type,
                type: typeName,
                typeLogo,
                total: {
                  supply: position.total.supply,
                  debt: position.total.debt,
                  value: position.total.value,
                },
                holdings: [
                  {
                    chain: chainName,
                    chainLogo: getChainLogo(chainName),
                    ...position,
                  },
                ],
              };
            }
          }
        });
        parsedProtocolData.protocols[protocolName] = tempProtocolData;
      }
    }
    if (
      parsedProtocolData.protocols[protocolName] &&
      parsedProtocolData.protocols[protocolName].total.supply === 0 &&
      parsedProtocolData.protocols[protocolName].total.debt === 0 &&
      parsedProtocolData.protocols[protocolName].total.value === 0 &&
      parsedProtocolData.protocols[protocolName].total.claimable === 0
    ) {
      delete parsedProtocolData.protocols[protocolName];
    }
  });
  return {
    defiData: parsedProtocolData,
    defiOptionsData: protocolOptionsData.sort(sortProtocols),
    chainAllocation,
    typeAllocation,
  };
}

export function sortDefiProtocolDesc(
  protocolA: defiProtocolData,
  protocolB: defiProtocolData,
) {
  if (protocolA.total.value < protocolB.total.value) {
    return 1;
  } else if (protocolA.total.value > protocolB.total.value) {
    return -1;
  }
  return 0;
}

export function sortDefiChainsDesc(
  chainA: ChainPositionData,
  chainB: ChainPositionData,
) {
  if (chainA.total.value < chainB.total.value) {
    return 1;
  } else if (chainA.total.value > chainB.total.value) {
    return -1;
  }
  return 0;
}

export function sortDefiPositionDesc(positionA: Position, positionB: Position) {
  if (positionA.total.value < positionB.total.value) {
    return 1;
  } else if (positionA.total.value > positionB.total.value) {
    return -1;
  }
  return 0;
}

export function sortDefiAllocation(
  dataA: DefiAllocation,
  dataB: DefiAllocation,
) {
  if (dataA.balance < dataB.balance) {
    return 1;
  } else if (dataA.balance > dataB.balance) {
    return -1;
  }
  return 0;
}

export function sortProtocols(
  protocolA: protocolOptionType,
  protocolB: protocolOptionType,
) {
  if (
    protocolA.label.toLocaleLowerCase() < protocolB.label.toLocaleLowerCase()
  ) {
    return -1;
  } else if (
    protocolA.label.toLocaleLowerCase() > protocolB.label.toLocaleLowerCase()
  ) {
    return 1;
  }
  return 0;
}
