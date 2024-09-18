import { ActivityType } from '../reducers/activity_reducer';

export interface MigrationData {
  requestId: string;
  title: string;
  description: string;
  bgImageURI: string;
  redirectURI: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
  startDate: string;
  endDate: string;
  amount: number;
  batchId: string;
  createdAt: number;
  isCompleteMigration: false;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'PENDING' | 'DELAYED';
  type: ActivityType.MIGRATE_FUND;
  isClosable: boolean;
}
