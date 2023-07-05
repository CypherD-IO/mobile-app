// https://www.npmjs.com/package/outliers

/**
 * @param  {number[]} arr
 * @returns number[] in sorted format
 */
export function removeOutliers (arr: number[]): number[] {
  arr = arr.sort((a, b) => {
    return a - b;
  });
  const oldArr = [...arr];
  const outliers = calc(arr);
  const newArray = oldArr.filter((value) => {
    return !outliers.includes(value);
  });
  return newArray;
}

export function outliers (arr: number[]): number[] {
  arr = arr.sort((a, b) => {
    return a - b;
  });
  return calc(arr);
}

/**
 * Calculate the outliers
 *
 * @param {Array} arr
 * @param {String} key (optional)
 * @return {Array} outliers
 */
function calc (arr: number[]): number[] {
  arr = arr.slice(0);
  arr = arr.sort(function (a, b) {
    return a - b;
  });
  const len = arr.length;
  const middle = median(arr);
  const range = iqr(arr);
  const outliers: number[] = [];
  for (let i = 0; i < len; i++) {
    Math.abs(arr[i] - middle) > range && outliers.push(arr[i]);
  }
  return outliers;
}

/**
 * Find the median
 *
 * @param {Array} arr
 * @return {Number}
 */
function median (arr: number[]): number {
  const len = arr.length;
  const half = ~~(len / 2);

  return len % 2 ? arr[half] : (arr[half - 1] + arr[half]) / 2;
}

/**
 * Find the range
 *
 * @param {Array} arr
 * @return {Number}
 */

function iqr (arr: number[]): number {
  const len = arr.length;
  const q1 = median(arr.slice(0, ~~(len / 2)));
  const q3 = median(arr.slice(Math.ceil(len / 2)));
  const g = 1.5;
  return (q3 - q1) * g;
}
