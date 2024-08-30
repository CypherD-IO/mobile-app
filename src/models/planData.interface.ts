import { CypherPlanId } from '../constants/enum';
import { IPlanDetails } from './planDetails.interface';

export interface IPlanData {
  default: Record<CypherPlanId, IPlanDetails>;
  custom: object;
}
