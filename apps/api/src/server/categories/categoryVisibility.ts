export type ListedCategory = {
  id: string;
  code: string;
  label: string;
};

export function filterVisibleCategories<T extends ListedCategory>(
  categories: T[],
  userId: string,
  testeAllowedUserId: string,
): T[] {
  return categories.filter(
    (category) =>
      category.code !== "TESTE" ||
      (testeAllowedUserId.length > 0 && userId === testeAllowedUserId),
  );
}
