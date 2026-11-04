// The state of one of the CRM's lists, as the template's list feedback reads
// it (client/components/list-feedback.tsx, template 1.0.0-beta.86). The CRM
// reads its lists with TanStack Query, so a query's own snapshot says which
// state a list is in; list-feedback.tsx draws it.
import {
  listStateShowsData,
  resolveListState,
  type ListState,
} from '@nocobase/app-client';

export { listStateShowsData, type ListState };

/** What the list state reads off a TanStack query (or infinite query). */
export interface ListQuery {
  readonly data?: unknown;
  readonly error?: unknown;
  readonly isPending?: boolean;
  readonly isFetching?: boolean;
  readonly isPlaceholderData?: boolean;
}

/**
 * The state of a list read by `query`, with `rows` the records it holds
 * and `filtered` whether the reader narrowed it (a keyword, a filter, a
 * statistic chip), which tells "no results" from "nothing yet".
 */
export function queryListState(
  query: ListQuery,
  rows: number,
  filtered: boolean,
): ListState {
  return resolveListState(
    {
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      isFetching: query.isFetching,
      isPlaceholderData: query.isPlaceholderData,
    },
    rows,
    filtered,
  );
}
