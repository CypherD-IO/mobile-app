import { useSunset } from '../../../store/sunsetStore';
import {
  resolveWindDownDates,
  WindDownDates,
} from '../../../constants/winddown';

/**
 * Effective wind-down milestone dates: the API config from `useSunset()`, falling
 * back to the hardcoded defaults until the wind-down API has responded.
 */
export const useWindDownDates = (): WindDownDates =>
  resolveWindDownDates(useSunset().config);
