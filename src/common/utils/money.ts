export const toMinorUnits = (amount: number): number => {
  return Math.round(amount * 100);
};

export const fromMinorUnits = (amount: number): number => {
  return amount / 100;
};