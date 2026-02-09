/**
 * Truncates text to specified max length, including ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum total length including "..."
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '...';
};
