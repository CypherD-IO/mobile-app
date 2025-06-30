import React, { useState, useMemo } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDTextInput,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import Fuse from 'fuse.js';

interface MerchantRewardListContentProps {
  onMerchantPress?: (merchant: MerchantData) => void;
}

interface MerchantData {
  id: string;
  name: string;
  multiplier: string;
  category: string;
  description?: string;
}

const MerchantRewardListContent: React.FC<MerchantRewardListContentProps> = ({
  onMerchantPress,
}) => {
  const [searchText, setSearchText] = useState<string>('');

  // Dummy merchant data - will be replaced with API call later
  const merchantData: MerchantData[] = [
    {
      id: '1',
      name: 'Uber',
      multiplier: '5.2X',
      category: 'Transportation',
      description: 'Ride sharing and food delivery',
    },
    {
      id: '2',
      name: 'Amazon',
      multiplier: '4.4X',
      category: 'E-commerce',
      description: 'Online shopping and marketplace',
    },
    {
      id: '3',
      name: 'Grab Taxi',
      multiplier: '4X',
      category: 'Transportation',
      description: 'Southeast Asian ride-hailing service',
    },
    {
      id: '4',
      name: 'Walmart',
      multiplier: '4X',
      category: 'Retail',
      description: 'Supermarket and retail chain',
    },
    {
      id: '5',
      name: 'Emmar Realities',
      multiplier: '2.2X',
      category: 'Real Estate',
      description: 'Property development and management',
    },
    {
      id: '6',
      name: 'Trip.com',
      multiplier: '2.4X',
      category: 'Travel',
      description: 'Online travel booking platform',
    },
    {
      id: '7',
      name: 'Lazadda',
      multiplier: '1.2X',
      category: 'E-commerce',
      description: 'Southeast Asian e-commerce platform',
    },
    {
      id: '8',
      name: 'Marriott',
      multiplier: '1.6X',
      category: 'Hospitality',
      description: 'International hotel chain',
    },
    {
      id: '9',
      name: 'Flipkart',
      multiplier: '1.8X',
      category: 'E-commerce',
      description: 'Indian e-commerce marketplace',
    },
    {
      id: '10',
      name: 'Starbucks',
      multiplier: '3.1X',
      category: 'Food & Beverage',
      description: 'Coffee shop chain',
    },
    {
      id: '11',
      name: "McDonald's",
      multiplier: '2.8X',
      category: 'Food & Beverage',
      description: 'Fast food restaurant chain',
    },
    {
      id: '12',
      name: 'Netflix',
      multiplier: '2.5X',
      category: 'Entertainment',
      description: 'Streaming service platform',
    },
  ];

  // Fuzzy search implementation
  const filteredMerchants = useMemo(() => {
    if (!searchText.trim()) {
      return merchantData;
    }

    const fuse = new Fuse(merchantData, {
      keys: ['name', 'category'],
      threshold: 0.3,
      includeScore: true,
    });

    return fuse
      .search(searchText)
      .map(result => result.item)
      .sort(
        (a, b) =>
          parseFloat(b.multiplier.replace('X', '')) -
          parseFloat(a.multiplier.replace('X', '')),
      );
  }, [searchText, merchantData]);

  const handleMerchantPress = (merchant: MerchantData) => {
    console.log('Merchant selected:', merchant);
    onMerchantPress?.(merchant);
  };

  return (
    <CyDView className='flex-1'>
      {/* Search Bar */}
      <CyDView className='px-[12px] py-[12px]'>
        <CyDView className='flex-row items-center border-[1px] border-n40 rounded-[8px] px-[12px] py-[8px]'>
          <CyDMaterialDesignIcons
            name='magnify'
            size={20}
            className='text-n200 mr-2'
          />
          <CyDTextInput
            className='flex-1 text-base400 py-[4px]'
            value={searchText}
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={setSearchText}
            placeholderTextColor={'#6B788E'}
            placeholder='Search Merchants'
          />
          {/* Filters Button */}
          <CyDTouchView className='flex-row items-center ml-2 px-2 py-1'>
            <CyDMaterialDesignIcons
              name='filter-variant'
              size={16}
              className='text-n200 mr-1'
            />
            <CyDText className='text-n200 text-[12px] font-medium'>
              Filters
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-down'
              size={16}
              className='text-n200 ml-1'
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>

      {/* Merchant List */}
      <CyDView className='flex-1 px-[12px]'>
        {filteredMerchants.length > 0 ? (
          filteredMerchants.map((item, index) => (
            <CyDTouchView
              key={item.id}
              className='flex-row items-center justify-between py-4 px-4 border-b border-n40'
              onPress={() => handleMerchantPress(item)}>
              <CyDView className='flex-row items-center flex-1'>
                {/* Merchant Icon */}
                <CyDView className='w-12 h-12 bg-white rounded-full items-center justify-center mr-3'>
                  <CyDMaterialDesignIcons
                    name='store'
                    size={24}
                    className='text-gray-600'
                  />
                </CyDView>

                {/* Merchant Info */}
                <CyDView className='flex-1'>
                  <CyDText className='text-white text-[16px] font-semibold mb-1'>
                    {item.name}
                  </CyDText>
                  <CyDText className='text-n200 text-[12px]'>
                    {item.category}
                  </CyDText>
                  {item.description && (
                    <CyDText
                      className='text-n200 text-[10px] mt-1'
                      numberOfLines={1}>
                      {item.description}
                    </CyDText>
                  )}
                </CyDView>
              </CyDView>

              {/* Reward Multiplier */}
              <CyDView className='items-end'>
                <CyDView className='bg-green400 rounded-full px-3 py-1 mb-1'>
                  <CyDText className='text-white text-[12px] font-bold'>
                    {item.multiplier} Rewards
                  </CyDText>
                </CyDView>
                <CyDMaterialDesignIcons
                  name='chevron-right'
                  size={20}
                  className='text-n200'
                />
              </CyDView>
            </CyDTouchView>
          ))
        ) : (
          <CyDView className='flex-1 items-center justify-center p-4'>
            <CyDMaterialDesignIcons
              name='store-outline'
              size={48}
              className='text-n200 mb-2'
            />
            <CyDText className='text-center text-n200 text-[16px] font-medium'>
              No merchants found
            </CyDText>
            <CyDText className='text-center text-n200 text-[12px] mt-1'>
              Try adjusting your search terms
            </CyDText>
          </CyDView>
        )}
      </CyDView>
    </CyDView>
  );
};

export default MerchantRewardListContent;
