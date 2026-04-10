import { useCallback, useEffect, useRef, useState } from 'react';
import useAxios from '../../core/HttpRequest';
import { subdivisionsEquivalent } from '../../utils/subdivisionNormalization';

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
  const { getWithAuth, postWithAuth } = useAxios();
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
    if (!enabled || !showSuggestions || !countryIso2) {
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
      void postWithAuth('/v1/cards/address/autocomplete', {
        input: trimmedInput,
        regionCode,
        sessionToken: sessionTokenRef.current,
      }).then(response => {
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
      if (!placeResourceName) return null;

      setLoading(true);
      setLoadFailed(false);

      const response = await getWithAuth(
        `/v1/cards/address/place-details?placeResourceName=${encodeURIComponent(
          placeResourceName,
        )}`,
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
      try {
        const response = await postWithAuth('/v1/cards/address/validate', {
          regionCode: countryRef.current,
          addressLines: [address.line1, address.line2].filter(Boolean),
          locality: address.city,
          administrativeArea: address.state,
          postalCode: address.postalCode,
        });

        if (response.isError) return true;

        const googleState =
          response.data?.result?.address?.postalAddress?.administrativeArea?.trim() ??
          '';

        if (
          !googleState ||
          subdivisionsEquivalent(
            countryRef.current,
            googleState,
            address.state,
          )
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

  return {
    suggestions,
    showSuggestions,
    loading,
    loadFailed,
    isAvailable: true,
    selectSuggestion,
    validateStateWithGoogle,
    openSuggestions,
    closeSuggestions,
    setShowSuggestions,
  };
}
