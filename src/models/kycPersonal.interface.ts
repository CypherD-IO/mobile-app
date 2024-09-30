import { IShippingAddress } from './shippingAddress.interface';

export interface IKycPersonDetail {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  dateOfBirth: string;
  idType: string;
  idNumber: string;
  shippingAddress?: IShippingAddress;
}
