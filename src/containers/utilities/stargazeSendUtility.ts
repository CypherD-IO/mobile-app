export const isStargazeAddress = (address: string): boolean => {
	return (address.substring(0, 5) === 'stars' && address.length === 44);
};
  