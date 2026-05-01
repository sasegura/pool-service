export const removeUndefinedFields = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;

export const getIsoTime = (value?: string) => {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
};
