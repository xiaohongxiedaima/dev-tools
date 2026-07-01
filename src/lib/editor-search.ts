export type EditorSearchDirection = "next" | "previous";

export type EditorSearchRange = {
  from: number;
  to: number;
};

export function findEditorMatch(
  content: string,
  query: string,
  selection?: EditorSearchRange,
  direction: EditorSearchDirection = "next",
): EditorSearchRange | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  const normalizedContent = content.toLowerCase();

  if (direction === "previous") {
    const startIndex = selection ? selection.from - 1 : normalizedContent.length - 1;
    const previousIndex = startIndex >= 0 ? normalizedContent.lastIndexOf(normalizedQuery, startIndex) : -1;
    if (previousIndex >= 0) {
      return { from: previousIndex, to: previousIndex + normalizedQuery.length };
    }

    const wrappedIndex = normalizedContent.lastIndexOf(normalizedQuery);
    return wrappedIndex >= 0 ? { from: wrappedIndex, to: wrappedIndex + normalizedQuery.length } : null;
  }

  const startIndex = selection ? selection.to : 0;
  const nextIndex = normalizedContent.indexOf(normalizedQuery, startIndex);
  if (nextIndex >= 0) {
    return { from: nextIndex, to: nextIndex + normalizedQuery.length };
  }

  const wrappedIndex = normalizedContent.indexOf(normalizedQuery);
  return wrappedIndex >= 0 ? { from: wrappedIndex, to: wrappedIndex + normalizedQuery.length } : null;
}
