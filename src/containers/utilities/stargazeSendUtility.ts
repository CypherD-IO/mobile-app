export const isStargazeAddress = (address: string): boolean => {
  if (address) {
    return (address.substring(0, 5) === 'stars' && address.length === 44);
  }
  return false;
};
