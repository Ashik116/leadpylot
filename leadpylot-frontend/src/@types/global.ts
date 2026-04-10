export type Meta = {
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
};
export type MultiRes<T> = {
  data: T[];
  meta: Meta;
};
