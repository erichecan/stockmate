// Updated: 2026-03-19T10:22:25 - 覆盖类目筛选范围（含子孙类目）

import { collectCategoryScopeIds } from './category-scope.util';

describe('collectCategoryScopeIds', () => {
  it('includes root and all descendants', () => {
    const categories = [
      { id: 'root', parentId: null },
      { id: 'child-a', parentId: 'root' },
      { id: 'child-b', parentId: 'root' },
      { id: 'grand-a', parentId: 'child-a' },
      { id: 'other-root', parentId: null },
    ];

    const scope = collectCategoryScopeIds(categories, 'root');

    expect(scope).toEqual(['root', 'child-a', 'child-b', 'grand-a']);
  });

  it('returns only input id when root not found', () => {
    const categories = [{ id: 'a', parentId: null }];

    const scope = collectCategoryScopeIds(categories, 'unknown');

    expect(scope).toEqual(['unknown']);
  });
});
