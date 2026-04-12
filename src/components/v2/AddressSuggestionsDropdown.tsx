import React from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import {
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

import type { GoogleAutocompleteSuggestion } from '../../hooks/useGoogleAddressAutocomplete';

interface AddressSuggestionsDropdownProps {
  suggestions: GoogleAutocompleteSuggestion[];
  loading: boolean;
  loadFailed: boolean;
  onSelect: (suggestion: GoogleAutocompleteSuggestion) => void;
}

export default function AddressSuggestionsDropdown({
  suggestions,
  loading,
  loadFailed,
  onSelect,
}: AddressSuggestionsDropdownProps) {
  return (
    <CyDView className='bg-n0 rounded-[12px] border border-n40 mt-[4px] overflow-hidden shadow-md'>
      {loading ? (
        <CyDView className='px-[16px] py-[14px] items-center'>
          <ActivityIndicator size='small' color='#999' />
        </CyDView>
      ) : (
        <>
          {suggestions.length > 0 && (
            <ScrollView
              style={{ maxHeight: 200 }}
              keyboardShouldPersistTaps='handled'
              nestedScrollEnabled>
              {suggestions.map((suggestion, index) => {
                const mainText =
                  suggestion.placePrediction?.structuredFormat?.mainText
                    ?.text ||
                  suggestion.placePrediction?.text?.text ||
                  '';
                const secondaryText =
                  suggestion.placePrediction?.structuredFormat?.secondaryText
                    ?.text || '';
                const key =
                  suggestion.placePrediction?.placeId ||
                  suggestion.placePrediction?.text?.text ||
                  mainText;

                return (
                  <CyDTouchView
                    key={key}
                    className={`px-[16px] py-[12px] ${
                      index < suggestions.length - 1
                        ? 'border-b border-n30'
                        : ''
                    }`}
                    onPress={() => onSelect(suggestion)}>
                    <CyDText className='text-[14px] font-semibold text-base400'>
                      {mainText}
                    </CyDText>
                    {secondaryText ? (
                      <CyDText className='text-[12px] text-n200 mt-[2px]'>
                        {secondaryText}
                      </CyDText>
                    ) : null}
                  </CyDTouchView>
                );
              })}
            </ScrollView>
          )}

          {!loading && !loadFailed && suggestions.length === 0 && (
            <CyDView className='px-[16px] py-[12px]'>
              <CyDText className='text-[13px] text-n200'>
                No matching addresses found
              </CyDText>
            </CyDView>
          )}

          {loadFailed && (
            <CyDView className='px-[16px] py-[12px]'>
              <CyDText className='text-[13px] text-n200'>
                Address suggestions unavailable
              </CyDText>
            </CyDView>
          )}
        </>
      )}

    </CyDView>
  );
}
