// Updated: 2026-03-19T10:22:15 - 类目筛选支持包含所有子孙类目

export type CategoryRef = {
  id: string;
  parentId: string | null;
};

export function collectCategoryScopeIds(
  allCategories: CategoryRef[],
  rootCategoryId: string,
): string[] {
  const childrenByParentId = new Map<string, string[]>();
  const existingIds = new Set<string>();

  for (const category of allCategories) {
    existingIds.add(category.id);
    if (!category.parentId) continue;
    const current = childrenByParentId.get(category.parentId) ?? [];
    current.push(category.id);
    childrenByParentId.set(category.parentId, current);
  }

  if (!existingIds.has(rootCategoryId)) {
    return [rootCategoryId];
  }

  const visited = new Set<string>();
  const queue: string[] = [rootCategoryId];
  const scope: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    scope.push(currentId);

    const children = childrenByParentId.get(currentId) ?? [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return scope;
}
