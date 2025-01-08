import { DeviceType } from '../constants/enum';

export interface IIntegrity {
  integrityToken: string;
  challenge?: string;
  platform: DeviceType;
  keyId?: string;
}
