// The CRM's lists answer with the template's list feedback
// (client/components/list-feedback.tsx, template 1.0.0-beta.86): one short
// line with its icon for loading, empty, no results, access denied, an
// expired session or a failed read, and the stale-data line over rows kept
// from a refresh that failed. Their state comes from list-state.ts; this
// adds the CRM's frame around the states without rows.
import type { ReactElement, ReactNode } from 'react';

import { ListFeedback } from '#components/list-feedback';
import { listStateShowsData, type ListState } from './list-state.js';

export { ListFeedbackActions } from '#components/list-feedback';

/**
 * A list's rows, or, in their place, its feedback in the CRM's dashed card
 * (as the empty list was drawn before). `empty` is the CRM's own line under
 * "No data yet", shown only for a list empty without filters.
 */
export function CrmListFeedback({
  state,
  empty,
  children,
}: {
  readonly state: ListState;
  readonly empty?: ReactNode;
  readonly children?: ReactNode;
}): ReactElement {
  if (listStateShowsData(state))
    return <ListFeedback state={state}>{children}</ListFeedback>;
  return (
    <div className='rounded-xl border border-dashed'>
      <ListFeedback state={state} empty={empty} />
    </div>
  );
}
