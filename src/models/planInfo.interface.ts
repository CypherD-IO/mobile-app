import { CypherPlanId } from '../constants/enum';

export interface PlanHistoryEntry {
  planId: CypherPlanId;
  timestamp: number; // Unix timestamp when the plan change occurred
  reason: 'upgrade' | 'downgrade' | 'renewal' | 'manual' | 'extension';
  triggeredBy: 'user' | 'system' | 'admin'; // Who initiated the change
  fdTicketId?: string; // Associated Freshdesk ticket ID for audit trail
  amountCharged?: number; // Amount charged for this plan change (if applicable)
  notes?: string; // Additional context or reason details
}

/**
 * Scheduler task IDs for plan expiration management
 * Used to cancel scheduled tasks when user manually renews or upgrades plan
 */
export interface SchedulerTaskIds {
  reminder2Weeks?: string; // Task ID for 50-week reminder (2 weeks before expiry)
  reminder1Week?: string; // Task ID for 51-week reminder (1 week before expiry)
  reminder1Day?: string; // Task ID for 1 day before expiry notification
  finalDowngrade?: string; // Task ID for plan expiration/downgrade (52/63 weeks)
  balanceCheckRetry?: string; // Task ID for grace period downgrade
  gracePeriod1Day?: string; // Task ID for 1 day before grace period ends notification
}

export interface PlanInfo {
  planId: CypherPlanId;
  updatedOn: number;
  expiresOn?: number;
  /**
   * Auto renewal setting - when false, plan will be downgraded on expiry without notifications or grace period
   * Defaults to true for backward compatibility
   */
  autoRenewal?: boolean;
  /**
   * Complete history of all plan changes for this user
   * Ordered from oldest to newest (chronological order)
   * Replaces the old previousPlanId field for comprehensive tracking
   */
  planHistory?: PlanHistoryEntry[];
  /**
   * Scheduler task IDs for plan expiration management
   * Used to cancel scheduled tasks when user manually renews or upgrades plan
   */
  schedulerTaskIds?: SchedulerTaskIds;
}
