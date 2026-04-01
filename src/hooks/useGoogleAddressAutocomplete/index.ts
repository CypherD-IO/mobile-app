import { useCallback, useEffect, useRef, useState } from 'react';
import Config from 'react-native-config';
import useAxios from '../../core/HttpRequest';

const GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT =
  'https://places.googleapis.com/v1/places:autocomplete';
const GOOGLE_ADDRESS_VALIDATION_ENDPOINT =
  'https://addressvalidation.googleapis.com/v1:validateAddress';
const GOOGLE_PLACES_API_KEY: string =
  (Config.GOOGLE_ADDRESS_VALIDATION_API_KEY as string) ?? '';
const DEBOUNCE_MS = 250;
const MIN_INPUT_LENGTH = 3;

export interface GoogleAutocompleteSuggestion {
  placePrediction?: {
    place?: string;
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
}

interface GooglePlacesAutocompleteResponse {
  suggestions?: GoogleAutocompleteSuggestion[];
}

interface GooglePlaceDetailsAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface GooglePostalAddress {
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
}

interface GooglePlaceDetailsResponse {
  postalAddress?: GooglePostalAddress;
  addressComponents?: GooglePlaceDetailsAddressComponent[];
}

export interface AutofilledAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

const getGoogleRegionCode = (iso2: string) =>
  iso2.toUpperCase() === 'GB' ? 'uk' : iso2.toLowerCase();

const createGoogleSessionToken = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function buildAddressFromPlaceDetails(
  placeDetails: GooglePlaceDetailsResponse,
  fallback: AutofilledAddress,
): AutofilledAddress {
  const postalAddress = placeDetails.postalAddress;
  const addressLines = postalAddress?.addressLines ?? [];
  let line1 = addressLines[0]?.trim() || fallback.line1;
  let line2 = addressLines.slice(1).join(', ').trim() || fallback.line2;
  let city = postalAddress?.locality?.trim() || fallback.city;
  let state = postalAddress?.administrativeArea?.trim() || fallback.state;
  let postalCode = postalAddress?.postalCode?.trim() || fallback.postalCode;
  let streetNumber = '';
  let route = '';

  for (const component of placeDetails.addressComponents ?? []) {
    const componentType = component.types?.[0];
    const longText = component.longText?.trim() ?? '';
    const shortText = component.shortText?.trim() ?? '';

    switch (componentType) {
      case 'street_number':
        streetNumber = longText || shortText;
        break;
      case 'route':
        route = shortText || longText;
        break;
      case 'subpremise':
        line2 = line2 || longText || shortText;
        break;
      case 'postal_code':
        postalCode = longText || shortText || postalCode;
        break;
      case 'postal_code_suffix':
        if (postalCode) {
          postalCode = `${postalCode}-${longText || shortText}`;
        }
        break;
      case 'locality':
        city = longText || shortText || city;
        break;
      case 'postal_town':
        if (!city) {
          city = longText || shortText || city;
        }
        break;
      case 'administrative_area_level_1':
        state = shortText || longText || state;
        break;
    }
  }

  if (streetNumber || route) {
    line1 = `${streetNumber} ${route}`.trim();
  }

  return { line1, line2, city, state, postalCode };
}

interface UseGoogleAddressAutocompleteProps {
  countryIso2: string;
  addressLine1: string;
  enabled?: boolean;
}

export default function useGoogleAddressAutocomplete({
  countryIso2,
  addressLine1,
  enabled = true,
}: UseGoogleAddressAutocompleteProps) {
  const { getFromOtherSource, postToOtherSource } = useAxios();
  const [suggestions, setSuggestions] = useState<
    GoogleAutocompleteSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const requestIdRef = useRef(0);
  const sessionTokenRef = useRef('');
  const countryRef = useRef(countryIso2);

  useEffect(() => {
    countryRef.current = countryIso2;
  }, [countryIso2]);

  useEffect(() => {
    setSuggestions([]);
    setShowSuggestions(false);
    setLoadFailed(false);
    sessionTokenRef.current = '';
  }, [countryIso2]);

  useEffect(() => {
    if (!enabled || !showSuggestions || !countryIso2 || !GOOGLE_PLACES_API_KEY) {
      return;
    }

    const trimmedInput = addressLine1.trim();
    if (trimmedInput.length < MIN_INPUT_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      if (!trimmedInput) {
        sessionTokenRef.current = '';
      }
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadFailed(false);

    const regionCode = getGoogleRegionCode(countryRef.current);
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = createGoogleSessionToken();
    }

    const debounceId = setTimeout(() => {
      void postToOtherSource(
        GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT,
        {
          includeQueryPredictions: false,
          includedRegionCodes: [regionCode],
          input: trimmedInput,
          inputOffset: trimmedInput.length,
          regionCode,
          sessionToken: sessionTokenRef.current,
        },
        undefined,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask':
              'suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat',
          },
        },
      ).then(response => {
        if (requestId !== requestIdRef.current) return;

        setLoading(false);
        if (response.isError) {
          setSuggestions([]);
          setLoadFailed(true);
          return;
        }

        const data = response.data as GooglePlacesAutocompleteResponse;
        setSuggestions(data.suggestions ?? []);
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceId);
  }, [addressLine1, countryIso2, enabled, showSuggestions]);

  const selectSuggestion = useCallback(
    async (
      suggestion: GoogleAutocompleteSuggestion,
      currentAddress: AutofilledAddress,
    ): Promise<AutofilledAddress | null> => {
      const placeResourceName = suggestion.placePrediction?.place;
      if (!placeResourceName || !GOOGLE_PLACES_API_KEY) return null;

      setLoading(true);
      setLoadFailed(false);

      const response = await getFromOtherSource(
        `https://places.googleapis.com/v1/${placeResourceName}`,
        undefined,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask':
              'postalAddress,addressComponents,formattedAddress',
          },
        },
      );

      setLoading(false);

      if (response.isError) {
        setLoadFailed(true);
        return null;
      }

      const address = buildAddressFromPlaceDetails(
        response.data as GooglePlaceDetailsResponse,
        currentAddress,
      );

      setSuggestions([]);
      setShowSuggestions(false);
      sessionTokenRef.current = '';

      return address;
    },
    [],
  );

  const openSuggestions = useCallback(() => {
    if (addressLine1.trim().length >= MIN_INPUT_LENGTH) {
      setShowSuggestions(true);
    }
  }, [addressLine1]);

  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  const validateStateWithGoogle = useCallback(
    async (address: AutofilledAddress): Promise<boolean> => {
      if (!GOOGLE_PLACES_API_KEY) return true;

      try {
        const response = await postToOtherSource(
          `${GOOGLE_ADDRESS_VALIDATION_ENDPOINT}?key=${GOOGLE_PLACES_API_KEY}`,
          {
            address: {
              regionCode: countryRef.current,
              addressLines: [address.line1, address.line2].filter(Boolean),
              locality: address.city,
              administrativeArea: address.state,
              postalCode: address.postalCode,
            },
          },
          undefined,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            },
          },
        );

        if (response.isError) return true;

        const googleState =
          response.data?.result?.address?.postalAddress?.administrativeArea
            ?.trim() ?? '';

        if (
          !googleState ||
          googleState.toLowerCase() === address.state.trim().toLowerCase()
        ) {
          return true;
        }

        return false;
      } catch {
        return true;
      }
    },
    [],
  );

  const isAvailable = Boolean(GOOGLE_PLACES_API_KEY);

  return {
    suggestions,
    showSuggestions,
    loading,
    loadFailed,
    isAvailable,
    selectSuggestion,
    validateStateWithGoogle,
    openSuggestions,
    closeSuggestions,
    setShowSuggestions,
  };
}
