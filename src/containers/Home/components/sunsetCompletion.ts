import { formatWindDownDate } from '../../../constants/winddown';

/**
 * Whether the "You're all set" completion overlay should be visible: sunset
 * active, every winddown step complete, and not dismissed this session.
 */
export const shouldShowCompletion = (
  isSunsetEnabled: boolean,
  completed: number,
  total: number,
  dismissed: boolean,
): boolean =>
  isSunsetEnabled && total > 0 && completed === total && !dismissed;

/** "What happens next" checklist, with the shutdown date interpolated. */
export const buildCompletionChecklist = (shutdownIso: string): string[] => {
  const shutdown = formatWindDownDate(shutdownIso, 'short');
  return [
    'Your wallet stays self-custodial — yours forever.',
    `We’ll email your final statement on ${shutdown}.`,
  ];
};
