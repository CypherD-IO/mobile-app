import { DeviceType } from '../constants/enum';
import { DeviceMetadata } from './deviceMetaData.interface';

export interface IIntegrity {
  token: string;
  platform: DeviceType;
  challenge?: string;
  keyId?: string;
  isAssertion?: boolean;
  clientData?: string;
  deviceInfo?: DeviceMetadata;
}
