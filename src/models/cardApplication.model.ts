export interface CardApplication {
  country: string
  dialCode: string
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  flag: string
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  dateOfBirth: string
  idNumber: string
}

export interface ICountry {
  name: string;
  dialCode: string;
  flag: string;
  Iso2: string;
  Iso3: string;
  currency: string;
}

export interface IState {
  id: number;
  name: string;
  country_id: number;
  country_code: string;
  country_name: string;
  state_code: string;
  type: string | null;
  latitude: string | null;
  longitude: string | null;
}
