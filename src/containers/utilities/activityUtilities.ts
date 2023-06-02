export const genId = () => {
  return (new Date().getTime()).toString() + Math.floor(Math.random() * 1000);
};
