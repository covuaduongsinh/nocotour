import { useDragPan } from '../components/crm/drag-pan.js';
import { AiStateTag } from '../components/crm/ai-state-tag.js';
import {
  isEndOfDay,
  DEFAULT_TIME_ZONE,
} from '../../server/providers/crm/zone-time.js';
import { OpportunityCaptureDialog } from '../components/crm/opportunity-capture.js';
import { CompanyCaptureDialog } from '../components/crm/company-capture.js';
import {
  PAGE_SIZE,
  useCrmScopeKey,
  useRefresh,
} from '../components/crm/api.js';
import { recordTitle } from '../components/crm/lookups.js';
import { editsAll, fieldLabelKey, toText } from '../components/crm/api.js';
import {
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  RecordDrawerContext,
  useRecordDrawerState,
} from '../components/crm/record-drawer.js';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from '@nocobase/i18n/client';
import { type FilterDimension, FilterMenu } from '#components/filter-menu';
import { useUrlSearch } from '#hooks/use-url-search';
import { openOnRowClick } from '../components/crm/row-open.js';
import { MonthPicker } from '../components/crm/month-picker.js';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  Plus,
  Download,
  Upload,
  LayoutList,
  Columns3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  User,
  Factory,
  CalendarClock,
  Clock,
  UserRound,
  Ban,
  CircleCheck,
} from 'lucide-react';
import { Button } from '../components/ui/button.js';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs.js';
import { KindTag } from '../components/crm/kind-tag.js';
import { Badge } from '../components/ui/badge.js';
import { Card, CardContent } from '../components/ui/card.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../components/ui/table.js';
import {
  useCrmApi,
  useCrmText,
  useMetadata,
  type Entity,
  type CrmRecord,
  type ListData,
  type Data,
  useCrmQuery,
  localTime,
} from '../components/crm/api.js';
import {
  CrmFrame,
  ErrorNotice,
  Loading,
  RecordLink,
  Status,
  Value,
} from '../components/crm/common.js';
import { RecordForm } from '../components/crm/form.js';
import { ReasonDialog } from '../components/crm/reasons.js';
import { reasonFor } from '../components/crm/reason-rules.js';
import { ImportDialog } from '../components/crm/import-export.js';
import {
  CaptureTabs,
  LeadCaptureDialog,
} from '../components/crm/lead-capture.js';
import { downloadCsv } from '../components/crm/csv.js';
import { SortableHead } from '../components/crm/sortable-table.js';
import {
  CrmListFeedback,
  ListFeedbackActions,
} from '../components/crm/list-feedback.js';
import {
  listStateShowsData,
  queryListState,
} from '../components/crm/list-state.js';
import { AutoLoadMore } from '../components/crm/auto-load.js';
import { TaskList } from '../components/crm/task-list.js';

// A calendar cell lists this many before asking to show the rest.
const CALENDAR_DAY_LIMIT = 5;
// A list's column header; its band, height and padding are every table's
// (client/styles.css), as the template draws them.
const HEAD = 'text-sm';

// "2026-09" ± n months, staying in the yyyy-mm shape the calendar keys on.
function shiftMonth(month: string, by: number): string {
  const d = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + by, 1),
  );
  return d.toISOString().slice(0, 7);
}

// The choices of whose records a list page shows (the header's segmented
// control); objects not listed have none.
type Scope = 'all' | 'mine' | 'involved';
const scopes: Partial<Record<string, readonly Scope[]>> = {
  students: ['all', 'mine'],
  leads: ['all', 'mine'],
  opportunities: ['all', 'mine'],
  companies: ['all', 'mine'],
  contacts: ['all', 'mine'],
  // An approval is mine whether I asked for it or decide it, a task
  // whether I own it or take part in it.
  approvals: ['all', 'involved'],
  tasks: ['all', 'involved'],
};

// The filter a card on the overview or the reports opens is named as that
// card is, where the metric's own name differs: the same leads are "New
// leads" on the card and in the filter, and each object's stalled records
// are named for the object.
const METRIC_TITLES: Partial<Record<string, string>> = {
  'leads.uncontacted': 'uncontactedCard',
  'leads.stale': 'staleLeads',
  'leads.newThisMonth': 'newLeads',
  'companies.stale': 'staleCompanies',
  'opportunities.stale': 'staleOpportunities',
};
// The records a list opens over itself (those its rows, cards and tasks link
// to, never the row's own), in the detail page's drawer; its code loads only when a record is first
// opened, and stays mounted after, so closing animates.
const RecordDrawer = lazy(() =>
  import('./crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);
function DrawerHost({ children }: { children: ReactNode }): ReactElement {
  const drawer = useRecordDrawerState();
  const [loaded, setLoaded] = useState(false);
  if (drawer.opened && !loaded) setLoaded(true);
  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      {children}
      {loaded && (
        <Suspense fallback={null}>
          <RecordDrawer
            target={drawer.opened}
            open={drawer.open}
            close={drawer.close}
          />
        </Suspense>
      )}
    </RecordDrawerContext.Provider>
  );
}

export default function CrmListPage(): ReactElement {
  const location = useLocation();
  // The path's first segment: on the way to a record page this component
  // can render once more with the new location, and the last segment would
  // then be an id.
  const entity = location.pathname.split('/').filter(Boolean)[0] as Entity;
  return (
    // Its filters live in the address (?search=, ?status=, ?ownerId=…), so
    // a link, a reload or Back opens the list as it was left.
    <EntityList key={entity} entity={entity} />
  );
}
function EntityList({ entity }: { entity: Entity }): ReactElement {
  const navigate = useNavigate();
  const { text, language } = useCrmText();
  const { t } = useTranslation();
  const { data: meta, error: metadataError } = useMetadata();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  // The list's filters, kept in the address: the keyword (?search=, which
  // the global search's "All N" opens with), the menu's conditions, and a
  // statistic card's records (?metric=) or the global search's found ones
  // (?ids=a,b&found=title). A value the list does not offer is ignored.
  const {
    searchParams,
    search,
    inputProps: keywordInput,
    updateParams,
    clear,
  } = useUrlSearch({ param: 'search' });
  const param = (name: string): string => searchParams.get(name) ?? '';
  // Whose records: everyone's or the ones I own; for tasks also the ones
  // I take part in, for approvals the ones I decide.
  // The task and approval lists open on the reader's own (a task owned
  // or taken part in, an approval asked for or decided); every other list
  // on everyone's.
  const [scope, setScope] = useState<Scope>(
    entity === 'tasks' || entity === 'approvals' ? 'involved' : 'all',
  );
  // The task list's tab: what is to do, or what is done or cancelled.
  // Leads and opportunities are worked as funnels, so they open on the
  // board; the rest, tasks too (the calendar beside the list), on the list.
  const [view, setView] = useState(
    ['leads', 'opportunities'].includes(entity) ? 'board' : 'list',
  );
  const [page, setPage] = useState(1);
  // The column the list is sorted by, from a header click; unset, the server
  // lists the newest first.
  const [sort, setSort] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>();
  // Unfiltered on purpose: the title shows how many leads exist, not how
  // many match the current filters. One row is enough to learn the total.
  const totals = useQuery({
    queryKey: [...scopeKey, `${toText(entity)}?pageSize=1`],
    queryFn: () => api<ListData>(`${toText(entity)}?pageSize=1`),
    enabled: entity !== 'tasks',
  });
  // A workspace card opens the list already filtered to its members: the
  // statistics endpoint names them when the page opens with a metric. The
  // global search's found records come in as one, named by the AI (`title`).
  const foundIds = param('ids');
  const metricKey = param('metric');
  const members = useCrmQuery<{ members?: Record<string, string[]> }>(
    `${toText(entity)}/statistics?`,
    Boolean(metricKey) && !foundIds,
  );
  const metricIds = metricKey ? members.data?.members?.[metricKey] : undefined;
  const activeMetric:
    { key: string; ids: string[]; title?: string } | undefined = foundIds
    ? {
        key: 'found',
        ids: foundIds.split(',').filter(Boolean),
        // Plain text from the address, cut as the search cuts it.
        title: param('found').slice(0, 60),
      }
    : metricKey && metricIds
      ? { key: metricKey, ids: metricIds }
      : undefined;
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  // Days the reader has opened past the calendar's per-day cap.
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set(),
  );
  // The day a phone's calendar shows the tasks of; unset, today when
  // the month shown is this one, else its first day.
  const [pickedDay, setPickedDay] = useState<string>();
  // Where a swipe across the phone's calendar started.
  const swipeStartRef = useRef<number | undefined>(undefined);
  // Today's date in the business timezone, the key the calendar cells use.
  // Read once on mount: a page open across midnight is rare enough.
  const [now] = useState(() => new Date());
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: meta?.settings.timeZone ?? DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [form, setForm] = useState<{ id?: string; input: Data }>();
  // New lead with the AI first, when the assistant is on (lead-capture.tsx).
  const [capturing, setCapturing] = useState(false);
  // The pasted text survives a switch to the form and back; closing either
  // dialog drops it.
  const [draft, setDraft] = useState('');
  // New company with the AI: the name and what was added, kept likewise.
  const [companyDraft, setCompanyDraft] = useState({ name: '', note: '' });
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<unknown>();
  const refresh = useRefresh();
  // A card dropped on a closing status waits here until its reason is given;
  // the server refuses the status without one, and rightly so.
  const [invalidating, setInvalidating] = useState<{
    record: CrmRecord;
    stage: string;
  }>();
  const [moving, setMoving] = useState(false);
  // The card being dragged, dimmed in its column while it is in the air.
  const [dragging, setDragging] = useState<string>();
  // The board moved sideways by dragging its empty space.
  const boardPan = useDragPan();
  // The card that just landed in a column, marked for a moment so the eye
  // finds it among the others; the mark clears on its own.
  const [landed, setLanded] = useState<string>();
  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => setLanded(undefined), 2000);
    return () => clearTimeout(timer);
  }, [landed]);
  useEffect(() => {
    const done = (): void => setDragging(undefined);
    window.addEventListener('dragend', done);
    window.addEventListener('drop', done);
    return () => {
      window.removeEventListener('dragend', done);
      window.removeEventListener('drop', done);
    };
  }, []);
  const client = useQueryClient();
  const definition = meta?.definitions[entity];
  const users = meta?.users ?? [];
  const hasField = (key: string): boolean =>
    Boolean(definition?.fields.some((f) => f.key === key));
  const offered = (name: string, values: readonly string[]): string => {
    const value = param(name);
    return values.includes(value) ? value : '';
  };
  const status = offered('status', definition?.statuses ?? []);
  const ownerId = offered(
    'ownerId',
    users.map((u) => u.id),
  );
  const participantId =
    entity === 'tasks'
      ? offered(
          'participantId',
          users.filter((u) => !u.disabled).map((u) => u.id),
        )
      : '';
  const topicOptions =
    definition?.fields.find((f) => f.key === 'topic')?.options ?? [];
  const topic = entity === 'approvals' ? offered('topic', topicOptions) : '';
  const approverId =
    entity === 'approvals'
      ? offered(
          'approverId',
          users.filter((u) => u.canApprove).map((u) => u.id),
        )
      : '';
  const employed = hasField('employed')
    ? offered('employed', ['true', 'false'])
    : '';
  const sourceOptions = meta?.settings.options.source ?? [];
  const source = hasField('source') ? offered('source', sourceOptions) : '';
  const customerType = hasField('customerType')
    ? offered('customerType', ['individual', 'organization'])
    : '';
  const chessLevel = hasField('chessLevel')
    ? offered('chessLevel', ['beginner', 'elementary', 'intermediate', 'advanced', 'master'])
    : '';
  const pipelineType = hasField('pipelineType')
    ? offered('pipelineType', ['tuition', 'merchandise', 'b2b_school'])
    : '';
  const filtering = Boolean(
    search ||
    status ||
    ownerId ||
    source ||
    customerType ||
    chessLevel ||
    pipelineType ||
    employed ||
    topic ||
    approverId ||
    participantId,
  );
  // A changed condition starts again from the first page.
  const filterKey = [
    search,
    status,
    ownerId,
    source,
    customerType,
    chessLevel,
    pipelineType,
    employed,
    topic,
    approverId,
    participantId,
    activeMetric?.key,
  ].join('|');
  const [pagedKey, setPagedKey] = useState(filterKey);
  if (pagedKey !== filterKey) {
    setPagedKey(filterKey);
    setPage(1);
  }
  const setFilter = (name: string, value: string | null): void =>
    updateParams((next) => {
      if (value) next.set(name, value);
      else next.delete(name);
    });
  // A drop moves the card between the two columns' cached pages at once,
  // so it lands where it was dropped before the server has answered; the
  // refresh afterwards makes the columns exact, and a failure reloads them.
  const moveInCache = (record: CrmRecord, stage: string): void => {
    const statusField = definition?.statusField;
    if (!statusField) return;
    const prefix = [...scopeKey, `${toText(entity)}/board`];
    const columns = client.getQueriesData<InfiniteData<ListData>>({
      queryKey: prefix,
    });
    const from = toText(record[statusField]);
    const full =
      columns
        .flatMap(([, data]) => data?.pages.flatMap((p) => p.data) ?? [])
        .find((r) => r.id === record.id) ?? record;
    for (const [queryKey, data] of columns) {
      if (!data) continue;
      const column = toText(queryKey[prefix.length]);
      if (column === from)
        client.setQueryData<InfiniteData<ListData>>(queryKey, {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            data: p.data.filter((r) => r.id !== record.id),
            meta: { ...p.meta, total: Math.max(0, p.meta.total - 1) },
          })),
        });
      else if (column === stage)
        client.setQueryData<InfiniteData<ListData>>(queryKey, {
          ...data,
          pages: data.pages.map((p, i) => ({
            ...p,
            data:
              i === 0 ? [{ ...full, [statusField]: stage }, ...p.data] : p.data,
            meta: { ...p.meta, total: p.meta.total + 1 },
          })),
        });
    }
  };
  const move = async (record: CrmRecord, patch: Data): Promise<void> => {
    setMoving(true);
    setError(undefined);
    const stage = definition?.statusField
      ? patch[definition.statusField]
      : undefined;
    if (typeof stage === 'string') {
      moveInCache(record, stage);
      setLanded(toText(record.id));
    }
    try {
      await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', patch);
      setInvalidating(undefined);
      await refresh();
    } catch (e) {
      setError(e);
      await refresh();
    } finally {
      setMoving(false);
    }
  };
  // A choice this object does not offer (the page kept from another
  // object's) reads as everyone's.
  const whose = scopes[entity]?.includes(scope) ? scope : 'all';
  const params = new URLSearchParams({
    q: search,
    status,
    ownerId: whose === 'mine' ? toText(meta?.userId) : ownerId,
    source,
    customerType,
    chessLevel,
    pipelineType,
    employed,
    topic,
    approverId,
    participantId: entity === 'tasks' ? participantId : '',
    involvedId: whose === 'involved' ? toText(meta?.userId) : '',
    page: toText(page),
    pageSize: String(PAGE_SIZE),
  });
  if (activeMetric) params.set('ids', activeMetric.ids.join(','));
  // Each board column pages its own status through the list endpoint, so it
  // takes the filters without page, size or status.
  const columnParams = new URLSearchParams(params);
  for (const key of ['page', 'pageSize', 'status']) columnParams.delete(key);
  const listParams = new URLSearchParams(params);
  if (sort)
    listParams.set(
      'orderBy',
      sort.direction === 'desc' ? `-${sort.key}` : sort.key,
    );
  // Tasks, unsorted by the reader, come soonest first, those with no time
  // last.
  else if (entity === 'tasks') listParams.set('orderBy', 'dueAt');
  const path = `${toText(entity)}?${listParams.toString()}`;
  const query = useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () => api<ListData>(path),
    // The task list reads its own sections (TaskList).
    enabled: Boolean(definition) && !(entity === 'tasks' && view === 'list'),
    // While the AI works on a row here, look again every few seconds.
    refetchInterval: (q) =>
      Object.values(q.state.data?.meta.ai ?? {}).includes('running')
        ? 5000
        : false,
  });
  // The calendar reads one month from the server, by when tasks
  // happen, with the same filters as the list. The range is widened by a
  // day either side so every business timezone's month is covered; the
  // cells only draw the days they own. Pages are read until the month is
  // complete: a month's tasks are bounded, and a cell needs them all
  // to say how many it hides.
  const monthStart = Date.UTC(
    Number(month.slice(0, 4)),
    Number(month.slice(5)) - 1,
    1,
  );
  const monthEnd = Date.UTC(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    1,
  );
  const calendarParams = new URLSearchParams(params);
  for (const key of ['page', 'pageSize']) calendarParams.delete(key);
  calendarParams.set('dueFrom', new Date(monthStart - 86400000).toISOString());
  calendarParams.set('dueTo', new Date(monthEnd + 86400000).toISOString());
  // The list's largest page; a month of more than 5,000 tasks shows its
  // first 5,000.
  calendarParams.set('pageSize', '100');
  const calendarPath = `${toText(entity)}?${calendarParams.toString()}`;
  const calendar = useQuery({
    queryKey: [...scopeKey, calendarPath],
    queryFn: async () => {
      const all: CrmRecord[] = [];
      for (let page = 1; page <= 50; page++) {
        const result = await api<ListData>(
          `${calendarPath}&page=${toText(page)}`,
        );
        all.push(...result.data);
        if (result.meta.page * result.meta.pageSize >= result.meta.total) break;
      }
      return all;
    },
    enabled: Boolean(definition) && view === 'calendar',
  });
  // The list and the calendar as the template's list feedback reads them
  // (components/crm/list-feedback.tsx): a statistic chip, or another choice
  // of whose records than the page opens on, narrows them as a filter does.
  const defaultScope: Scope =
    entity === 'tasks' || entity === 'approvals' ? 'involved' : 'all';
  const narrowed = filtering || Boolean(activeMetric) || whose !== defaultScope;
  const listState = queryListState(
    query,
    query.data?.data.length ?? 0,
    narrowed,
  );
  const calendarState = queryListState(
    calendar,
    calendar.data?.length ?? 0,
    narrowed,
  );
  const filtered = calendar.data ?? [];
  const calendarTimeZone = meta?.settings.timeZone ?? DEFAULT_TIME_ZONE;
  // The month's tasks by the day they start on in the business time
  // zone, morning first, the way a day is read.
  const byDay = new Map<string, CrmRecord[]>();
  for (const r of [...filtered].sort((a, b) =>
    toText(a.dueAt).localeCompare(toText(b.dueAt)),
  )) {
    if (!r.dueAt) continue;
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: calendarTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(toText(r.dueAt)));
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  const monthDays = Array.from(
    {
      length: new Date(
        Number(month.slice(0, 4)),
        Number(month.slice(5)),
        0,
      ).getDate(),
    },
    (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
  );
  const monthTitle = new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(
    new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1),
    ),
  );
  // Whole weeks for a phone's month: the days before the 1st and after the
  // last come from the neighbouring months, drawn faint.
  const calendarWeeks = (() => {
    const first = Date.UTC(
      Number(month.slice(0, 4)),
      Number(month.slice(5)) - 1,
      1,
    );
    const lead = new Date(first).getUTCDay();
    const cells = Math.ceil((lead + monthDays.length) / 7) * 7;
    return Array.from({ length: cells }, (_, i) => {
      const day = new Date(first + (i - lead) * 86400000)
        .toISOString()
        .slice(0, 10);
      return { day, inMonth: day.startsWith(month) };
    });
  })();
  const shownDay = pickedDay?.startsWith(month)
    ? pickedDay
    : today.startsWith(month)
      ? today
      : `${month}-01`;
  // A task on the calendar: its title, then the clock time and owner,
  // the way the workspace's agenda cards read; the date is the cell's or the
  // heading's; under a phone's month it is a full-size card.
  const calendarCard = (r: CrmRecord, large = false): ReactElement => (
    <div
      key={r.id}
      // The whole card opens the task: its link stretched over it, and it
      // shades under the pointer.
      className={`relative cursor-pointer rounded-lg [&_a]:after:absolute [&_a]:after:inset-0 [&_a]:after:content-[''] ${toText(
        large
          ? 'border border-border bg-card p-3 text-sm shadow-xs transition-[translate,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-hover hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0'
          : // On the hover grey, in the white of the month's grid.
            'bg-hover p-2 text-xs transition-colors hover:bg-muted',
      )} ${
        // Done or cancelled: struck through and faded, marked by its kind,
        // so what is still to do stands out on the day.
        r.status && r.status !== 'open' ? 'opacity-60' : ''
      }`}
    >
      <span
        className={`flex min-w-0 items-center gap-1 ${toText(
          r.status && r.status !== 'open'
            ? 'text-muted-foreground line-through'
            : '',
        )}`}
      >
        {r.status === 'completed' && (
          <CircleCheck className='size-3 shrink-0 text-success' />
        )}
        {r.status === 'cancelled' && <Ban className='size-3 shrink-0' />}
        <RecordLink entity={entity} record={r} />
      </span>
      {/* The time and the owner, a line each. */}
      <p className='mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground'>
        {/* A task due on a date alone has no time to show. */}
        {!isEndOfDay(new Date(toText(r.dueAt)), calendarTimeZone) && (
          <span className='inline-flex items-center gap-1 tabular-nums'>
            <Clock className='size-3 shrink-0' />
            {localTime(r.dueAt, calendarTimeZone)}
          </span>
        )}
        <span className='inline-flex min-w-0 items-center gap-1'>
          <User className='size-3 shrink-0' />
          <span className='truncate'>
            {meta?.users.find((u) => u.id === r.ownerId)?.name}
          </span>
        </span>
      </p>
    </div>
  );
  const writable = Boolean(meta?.permissions[entity]?.create);
  const lookup = query.data?.meta.titles ?? {};
  const read = meta?.permissions[entity]?.read;
  // A lead's name cell carries "name / company", so the company column would
  // repeat it.
  const columns =
    definition?.columns.filter(
      (key) =>
        read &&
        (read.fields === '*' || read.fields.includes(key)) &&
        !(entity === 'leads' && key === 'company'),
    ) ?? [];
  // A header click sorts by its column: numbers and dates start from the
  // largest and latest, the rest from A; a second click reverses it and a
  // third returns to the default order.
  const firstDirection = (key: string): 'asc' | 'desc' => {
    const type = definition?.fields.find((field) => field.key === key)?.type;
    return type === 'number' ||
      type === 'date' ||
      type === 'datetime' ||
      (!type && key.endsWith('At'))
      ? 'desc'
      : 'asc';
  };
  const sortBy = (key: string): void => {
    const first = firstDirection(key);
    setSort(
      sort?.key !== key
        ? { key, direction: first }
        : sort.direction === first
          ? { key, direction: first === 'asc' ? 'desc' : 'asc' }
          : undefined,
    );
    setPage(1);
  };
  const newButton = (
    <>
      {writable && (
        <Button
          variant='contrast'
          onClick={() =>
            // A new lead, opportunity or company starts with the AI while
            // the assistant is on; the form is a tab away.
            (entity === 'leads' ||
              entity === 'opportunities' ||
              entity === 'companies') &&
            meta?.assistant
              ? setCapturing(true)
              : setForm({ input: {} })
          }
        >
          <Plus />
          {text('newRecord', { entity: text(`entity.${toText(entity)}`) })}
        </Button>
      )}
    </>
  );
  // Clear filters: every condition and the statistic card's records gone,
  // whose records back to what the page opens on, the sorting kept.
  const clearFilters = (): void => {
    clear((next) => {
      for (const name of [
        'status',
        'ownerId',
        'source',
        'employed',
        'topic',
        'approverId',
        'participantId',
        'metric',
        'ids',
        'found',
      ])
        next.delete(name);
    });
    setScope(defaultScope);
  };
  if (metadataError)
    return (
      <CrmFrame title={text(`entities.${toText(entity)}`)}>
        <ErrorNotice error={metadataError} />
      </CrmFrame>
    );
  if (!meta || !definition) return <Loading />;
  // The view switch, the task scope, the search toggle and the CSV
  // actions sit in the header beside the create button, not on a row of
  // their own.
  const views: [string, typeof LayoutList][] = [
    ['list', LayoutList],
    ...(['leads', 'companies', 'opportunities'].includes(entity)
      ? [['board', Columns3] as [string, typeof LayoutList]]
      : []),
    ...(entity === 'tasks'
      ? [['calendar', CalendarDays] as [string, typeof LayoutList]]
      : []),
  ];
  const feedbackQuery =
    view === 'calendar'
      ? { state: calendarState, query: calendar }
      : view === 'list' && entity !== 'tasks'
        ? { state: listState, query }
        : undefined;
  const people = (list: typeof users) =>
    list.map((u) => ({ value: u.id, label: u.name }));
  const personSearch = { placeholder: t('listToolbar.searchPeople') };
  const ownerLabel = toText(
    text(entity === 'approvals' ? 'fields.applicant' : 'owner'),
  );
  // The menu's conditions, those this object has; a statistic card's or the
  // global search's records show as a chip of their own.
  const filterDimensions: FilterDimension[] = [
    ...(activeMetric
      ? [
          {
            key: 'metric',
            label: toText(text('showing')),
            options: [],
            value: activeMetric.key,
            valueLabel: toText(
              activeMetric.title !== undefined
                ? text('globalSearch.foundChip', {
                    title: activeMetric.title,
                  })
                : text(
                    METRIC_TITLES[`${toText(entity)}.${activeMetric.key}`] ??
                      activeMetric.key,
                  ),
            ),
            onChange: () =>
              updateParams((next) => {
                for (const name of ['metric', 'ids', 'found'])
                  next.delete(name);
              }),
            chipOnly: true,
          },
        ]
      : []),
    ...(definition.statuses.length
      ? [
          {
            key: 'status',
            label: toText(text('fields.status')),
            options: definition.statuses.map((v) => ({
              value: v,
              label: toText(text(`options.${toText(v)}`)),
            })),
            value: status || null,
            onChange: (value: string | null) => setFilter('status', value),
          },
        ]
      : []),
    {
      key: 'ownerId',
      label: ownerLabel,
      options: people(users),
      value: ownerId || null,
      onChange: (value) => setFilter('ownerId', value),
      search: personSearch,
    },
    ...(entity === 'tasks'
      ? [
          {
            key: 'participantId',
            label: toText(text('fields.internalParticipants')),
            options: people(users.filter((u) => !u.disabled)),
            value: participantId || null,
            onChange: (value: string | null) =>
              setFilter('participantId', value),
            search: personSearch,
          },
        ]
      : []),
    ...(entity === 'approvals'
      ? [
          {
            key: 'topic',
            label: toText(text('fields.topic')),
            options: topicOptions.map((v) => ({
              value: v,
              label: toText(text(`options.${toText(v)}`)),
            })),
            value: topic || null,
            onChange: (value: string | null) => setFilter('topic', value),
          },
          {
            key: 'approverId',
            label: toText(text('fields.approverId')),
            options: people(users.filter((u) => u.canApprove)),
            value: approverId || null,
            onChange: (value: string | null) => setFilter('approverId', value),
            search: personSearch,
          },
        ]
      : []),
    ...(hasField('employed')
      ? [
          {
            key: 'employed',
            label: toText(text('fields.employed')),
            options: [
              { value: 'true', label: toText(text('yes')) },
              { value: 'false', label: toText(text('no')) },
            ],
            value: employed || null,
            onChange: (value: string | null) => setFilter('employed', value),
          },
        ]
      : []),
    ...(hasField('customerType')
      ? [
          {
            key: 'customerType',
            label: toText(text('fields.customerType')),
            options: [
              { value: 'individual', label: toText(text('options.individual')) },
              { value: 'organization', label: toText(text('options.organization')) },
            ],
            value: customerType || null,
            onChange: (value: string | null) => setFilter('customerType', value),
          },
        ]
      : []),
    ...(hasField('chessLevel')
      ? [
          {
            key: 'chessLevel',
            label: toText(text('fields.chessLevel')),
            options: [
              { value: 'beginner', label: toText(text('options.beginner')) },
              { value: 'elementary', label: toText(text('options.elementary')) },
              { value: 'intermediate', label: toText(text('options.intermediate')) },
              { value: 'advanced', label: toText(text('options.advanced')) },
              { value: 'master', label: toText(text('options.master')) },
            ],
            value: chessLevel || null,
            onChange: (value: string | null) => setFilter('chessLevel', value),
          },
        ]
      : []),
    ...(hasField('pipelineType')
      ? [
          {
            key: 'pipelineType',
            label: toText(text('fields.pipelineType')),
            options: [
              { value: 'tuition', label: toText(text('options.tuition')) },
              { value: 'merchandise', label: toText(text('options.merchandise')) },
              { value: 'b2b_school', label: toText(text('options.b2b_school')) },
            ],
            value: pipelineType || null,
            onChange: (value: string | null) => setFilter('pipelineType', value),
          },
        ]
      : []),
    ...(hasField('source')
      ? [
          {
            key: 'source',
            label: toText(text('fields.source')),
            options: sourceOptions.map((v) => ({
              value: v,
              label: toText(text(`options.${toText(v)}`, { defaultValue: v })),
            })),
            value: source || null,
            onChange: (value: string | null) => setFilter('source', value),
          },
        ]
      : []),
  ];
  const toolbar = (
    <>
      {/* The calendar's month, left of the view switch: its own stepper
          rather than <input type="month">, whose native control speaks the
          browser's language, not the app's. On a phone the calendar card
          carries its own. */}
      {entity === 'tasks' && view === 'calendar' && (
        <div className='hidden items-center gap-1 lg:flex'>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={text('previousMonth')}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft />
          </Button>
          {/* The month opens a picker of months, this month among them. */}
          <MonthPicker
            month={month}
            current={today.slice(0, 7)}
            title={monthTitle}
            onChange={setMonth}
          />
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={text('nextMonth')}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
      {/* Whose records: everyone's or the ones I own, and the tasks I take
          part in or the approvals I ask for or decide, for every view alike. */}
      {scopes[entity] && (
        <Tabs
          value={whose}
          onValueChange={(next) => {
            setScope(next as Scope);
            setPage(1);
          }}
        >
          <TabsList aria-label={text('listScope')}>
            {scopes[entity].map((value) => (
              <TabsTrigger key={value} value={value}>
                {text(value === 'all' ? 'team' : value)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {/* A switch with one position says nothing: an object with only the
          list (contacts, approvals) shows none. */}
      {views.length > 1 && (
        // The same segmented control as the task list's tabs, icons alone,
        // each named for screen readers and on hover.
        <Tabs value={view} onValueChange={(next) => setView(String(next))}>
          <TabsList>
            {views.map(([name, Icon]) => (
              <TabsTrigger
                key={name}
                value={name}
                className='px-2'
                aria-label={text(name)}
                title={text(name)}
              >
                <Icon />
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {/* Retry a list or month that failed, or clear filters that leave
          nothing; the task list and the board's columns offer their own. */}
      {feedbackQuery && (
        <ListFeedbackActions
          state={feedbackQuery.state}
          onClear={clearFilters}
          onRetry={() => void feedbackQuery.query.refetch()}
          busy={feedbackQuery.query.isFetching}
        />
      )}
      {/* Tasks are not imported or exported. */}
      {entity !== 'tasks' && (
        <div className='flex gap-2'>
          {writable && (
            <Button
              variant='ghost'
              size='icon'
              aria-label={text('import')}
              title={text('import')}
              onClick={() => setImporting(true)}
            >
              <Upload />
            </Button>
          )}
          {/* Export is a manager's action; the server refuses it otherwise. */}
          {meta?.export && (
            <Button
              variant='ghost'
              size='icon'
              aria-label={text('export')}
              title={text('export')}
              onClick={() => {
                void (async () => {
                  try {
                    const response = await api<{ data: CrmRecord[] }>(
                      `${toText(entity)}/export?${params.toString()}`,
                    );
                    downloadCsv(
                      `${toText(entity)}.csv`,
                      definition?.fields
                        .map((f) => f.key)
                        .filter(
                          (key) =>
                            read &&
                            (read.fields === '*' || read.fields.includes(key)),
                        ) ?? [],
                      response.data,
                    );
                  } catch (e) {
                    setError(e);
                  }
                })();
              }}
            >
              <Download />
            </Button>
          )}
        </div>
      )}
    </>
  );
  return (
    <CrmFrame
      // The board takes the viewport height with each column scrolling on
      // its own, so its horizontal scrollbar stays in view at the bottom
      // rather than below a page-long column.
      fill={view === 'board'}
      // The lead total sits beside the title rather than as a metric card:
      // it is context, not something to act on.
      // Tasks count each tab instead.
      title={
        entity !== 'tasks' && totals.data?.meta.total !== undefined ? (
          <>
            {text(`entities.${toText(entity)}`)}
            <span className='ml-2 align-middle text-base font-normal text-muted-foreground tabular-nums'>
              {toText(totals.data.meta.total)}
            </span>
          </>
        ) : (
          text(`entities.${toText(entity)}`)
        )
      }
      // No line under the heading: the menu and the records say what the page holds.
      actions={
        <>
          {toolbar}
          {/* The filters, then the primary action on the right. The keyword
              is a filter of this list, apart from the global search (⌘K). */}
          <FilterMenu
            dimensions={filterDimensions}
            keyword={{
              applied: search,
              inputProps: keywordInput,
              onClear: () => clear(),
              placeholder: toText(
                text('filterIn', { list: text(`entities.${toText(entity)}`) }),
              ),
            }}
            onClear={clearFilters}
            slashOpens
          />
          {/* How many records the conditions leave. */}
          {narrowed && view === 'list' && entity !== 'tasks' && query.data ? (
            <span className='text-sm text-muted-foreground tabular-nums'>
              {text('matchCount', { count: query.data.meta.total })}
            </span>
          ) : null}
          {newButton}
        </>
      }
      // No list page carries the generic assistant button: the global entry
      // and the record pages' own shortcuts cover it.
    >
      <ErrorNotice error={error} />
      {entity === 'tasks' && view === 'list' ? (
        // Tasks read as a to-do list, not a table; the records they concern
        // open in a drawer over it.
        <DrawerHost>
          <TaskList
            params={params}
            status={status}
            filtered={narrowed}
            onClear={clearFilters}
          />
        </DrawerHost>
      ) : view === 'list' ? (
        // Its rows, or in their place the list's feedback (loading, nothing
        // yet, no results, denied, failed), the create button staying in the
        // header.
        <CrmListFeedback state={listState} empty={text('emptyDescription')}>
          {query.data && (
            <>
              {/* A list's table in the template's frame, as the task list's is;
                the records its rows link to open in a drawer over it. */}
              <DrawerHost>
                <div className='overflow-hidden rounded-lg border'>
                  <Table>
                    {/* A quiet header: small muted words on the hover grey. */}
                    <TableHeader>
                      <TableRow className='border-border hover:bg-transparent'>
                        {columns.map((key) => {
                          const title =
                            key === 'name' && entity === 'leads'
                              ? text('leadTitle')
                              : text(fieldLabelKey(entity, toText(key)));
                          return (
                            <SortableHead
                              className={HEAD}
                              key={key}
                              title={title}
                              direction={sort?.key === key && sort.direction}
                              onClick={() => sortBy(key)}
                            />
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.data.map((record) => (
                        <Fragment key={record.id}>
                          {/* Ruled as the card is framed. */}
                          {/* Its empty space opens the record too. */}
                          <TableRow
                            className='cursor-pointer border-border'
                            onClick={openOnRowClick(
                              `/${entity}/${toText(record.id)}`,
                              (path) => void navigate(path),
                            )}
                          >
                            {columns.map((key) => (
                              <TableCell
                                // Every value, the name included, is cut with an
                                // ellipsis, so a cell never runs over the next one,
                                // which on a phone put two columns' text on top of
                                // each other.
                                className='max-w-72 truncate'
                                key={key}
                              >
                                {key === 'name' ? (
                                  <span className='flex min-w-0 flex-col items-start gap-1'>
                                    {/* The row's own record: its page, outside
                                    the drawer the records it links to open
                                    in. */}
                                    <RecordDrawerContext.Provider
                                      value={undefined}
                                    >
                                      <RecordLink
                                        entity={entity}
                                        record={{
                                          id: record.id,
                                          // A contact's company is its own column
                                          // here, so the link is the bare name.
                                          name:
                                            entity === 'contacts'
                                              ? toText(record.name)
                                              : recordTitle(
                                                  entity,
                                                  record,
                                                  lookup,
                                                ),
                                        }}
                                      />
                                    </RecordDrawerContext.Provider>
                                    {/* Under the name: the AI at work on the
                                  row, or its suggestion waiting, as on
                                  the board. */}
                                    <AiRowMark
                                      state={
                                        query.data.meta.ai?.[toText(record.id)]
                                      }
                                      review={entity === 'approvals'}
                                    />
                                  </span>
                                ) : entity === 'approvals' &&
                                  key === 'topic' ? (
                                  record[key] ? (
                                    <KindTag value={record[key]} />
                                  ) : (
                                    '—'
                                  )
                                ) : key === 'status' &&
                                  entity === 'approvals' &&
                                  record.status === 'pending' &&
                                  record.approverId === meta?.userId ? (
                                  // The reader's own queue, marked as on the page.
                                  <span className='flex flex-wrap items-center gap-2'>
                                    <Status value={record.status} />
                                    <Badge>{text('yourDecision')}</Badge>
                                  </span>
                                ) : (
                                  <Value
                                    record={record}
                                    field={
                                      definition.fields.find(
                                        (f) => f.key === key,
                                      ) ?? {
                                        key,
                                      }
                                    }
                                    lookup={lookup}
                                  />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DrawerHost>
              <div className='flex items-center justify-between text-sm text-muted-foreground'>
                <span>
                  {text('page', {
                    page,
                    pages: Math.max(
                      1,
                      Math.ceil(query.data.meta.total / PAGE_SIZE),
                    ),
                  })}
                </span>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {text('previous')}
                  </Button>
                  <Button
                    variant='outline'
                    disabled={page * PAGE_SIZE >= query.data.meta.total}
                    onClick={() => setPage(page + 1)}
                  >
                    {text('next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CrmListFeedback>
      ) : view === 'board' ? (
        // Moved sideways by its bar, which always shows (scroll-shown), or
        // by holding its empty space and dragging (useDragPan), as a mouse
        // without a sideways wheel needs on a board wider than the page.
        // The records its cards link to open in a drawer over it.
        <DrawerHost>
          <div
            className='scroll-shown -mx-1 -mt-1 flex min-h-0 flex-1 cursor-grab gap-3 overflow-x-auto px-1 pt-1 pb-2 data-[panning]:cursor-grabbing data-[panning]:select-none'
            {...boardPan}
            onPointerCancel={boardPan.onPointerUp}
          >
            {definition?.statuses.map((stage) => (
              <BoardColumn
                key={stage}
                entity={entity}
                stage={stage}
                params={columnParams}
                droppable={stage !== 'converted'}
                onDrop={(dragged) => {
                  // The card is about to be re-rendered in another column, so
                  // its own dragend never reaches the element that started the
                  // drag; the drop is where the dimming ends.
                  setDragging(undefined);
                  if (
                    dragged.status === 'converted' ||
                    dragged[definition.statusField!] === stage ||
                    !(
                      editsAll(meta, entity) || dragged.ownerId === meta?.userId
                    )
                  )
                    return;
                  // Dragging is the whole gesture: the status changes on drop.
                  // A closing status that must carry a reason asks for it first.
                  if (reasonFor(entity, stage))
                    setInvalidating({ record: dragged, stage });
                  else void move(dragged, { [definition.statusField!]: stage });
                }}
                renderCard={(record, titles, ai) => (
                  <Card
                    key={record.id}
                    // Framed as the UI Library kanban's card: rounded-lg, a
                    // faint ring and the lightest shadow, its spacing 3 units;
                    // under the pointer it lifts as the template's cards do, on
                    // the hover grey with a firmer shadow, and its empty space
                    // opens the record as a list row's does.
                    className={`cursor-pointer gap-0 rounded-lg shadow-xs ring-1 ring-foreground/5 dark:ring-border [--card-spacing:--spacing(3)] transition-[opacity,translate,box-shadow,background-color] duration-700 hover:-translate-y-0.5 hover:bg-hover hover:shadow-md hover:duration-150 motion-reduce:hover:translate-y-0 ${toText(
                      dragging === record.id ? 'opacity-40' : '',
                    )} ${toText(
                      landed === record.id
                        ? 'bg-primary/15 ring-2 ring-primary/60'
                        : '',
                    )} ${toText(
                      record.status !== 'converted' &&
                        (editsAll(meta, entity) ||
                          record.ownerId === meta?.userId)
                        ? 'active:cursor-grabbing'
                        : '',
                    )}`}
                    data-board-card=''
                    onClick={openOnRowClick(
                      `/${entity}/${toText(record.id)}`,
                      (path) => void navigate(path),
                    )}
                    draggable={
                      record.status !== 'converted' &&
                      (editsAll(meta, entity) ||
                        record.ownerId === meta?.userId)
                    }
                    onDragEnd={() => setDragging(undefined)}
                    // The card carries what the drop needs, since the target
                    // column does not hold the source column's records.
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      setDragging(toText(record.id));
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          id: record.id,
                          name: record.name,
                          company: record.company,
                          ownerId: record.ownerId,
                          status: record.status,
                          [definition.statusField!]:
                            record[definition.statusField!],
                        }),
                      );
                    }}
                  >
                    <CardContent className='space-y-1.5 px-4'>
                      {/* The card's own record: its page. */}
                      <RecordDrawerContext.Provider value={undefined}>
                        <RecordLink
                          entity={entity}
                          record={{
                            id: record.id,
                            name: recordTitle(entity, record, titles),
                          }}
                          lines={2}
                        />
                      </RecordDrawerContext.Provider>
                      {/* The AI at work on the lead, or its verdict waiting
                        on a decision (on the lead's page and Waiting on me). */}
                      <AiStateTag state={ai} work='followUp' />
                      <div className='space-y-0.5 text-sm text-muted-foreground'>
                        {/* One particular a line, each led by its field's icon
                          on the detail pages, so the card reads without
                          headings. */}
                        <p className='flex items-center gap-1.5'>
                          <UserRound className='size-3.5 shrink-0' />
                          <span className='truncate'>
                            {
                              meta?.users.find((u) => u.id === record.ownerId)
                                ?.name
                            }
                          </span>
                        </p>
                        {entity === 'companies' && Boolean(record.industry) && (
                          <p className='flex items-center gap-1.5'>
                            <Factory className='size-3.5 shrink-0' />
                            <span className='truncate'>
                              <Value
                                record={record}
                                field={{ key: 'industry', type: 'select' }}
                              />
                            </span>
                          </p>
                        )}
                        {/* When it last changed, under the detail pages'
                          icon for it. */}
                        <p className='flex items-center gap-1.5 tabular-nums'>
                          <CalendarClock className='size-3.5 shrink-0' />
                          <Value
                            record={record}
                            field={{ key: 'updatedAt', type: 'datetime' }}
                          />
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            ))}
          </div>
        </DrawerHost>
      ) : calendarState !== 'empty' &&
        calendarState !== 'no-results' &&
        !listStateShowsData(calendarState) ? (
        // A month not read yet, or refused: its feedback in place of the
        // grid. An empty month is still a month, so it keeps its grid.
        <CrmListFeedback state={calendarState} />
      ) : (
        <section className='space-y-4'>
          {calendarState === 'refresh-failed' && (
            <CrmListFeedback state={calendarState} />
          )}
          {/* The month grid needs about 110px a day, which a phone or a tablet
              beside the sidebar does not have: below 1024px the month is a
              grid of dates, and the tasks of the date picked show under
              it. */}
          <div className='space-y-4 lg:hidden'>
            <div
              className='rounded-xl border border-border bg-card p-3 shadow-xs'
              // A sideways swipe turns the month, the way a phone's own
              // calendar does.
              onTouchStart={(event) => {
                swipeStartRef.current = event.touches[0]?.clientX;
              }}
              onTouchEnd={(event) => {
                const from = swipeStartRef.current;
                const to = event.changedTouches[0]?.clientX;
                swipeStartRef.current = undefined;
                if (from === undefined || to === undefined) return;
                if (Math.abs(to - from) > 60)
                  setMonth(shiftMonth(month, to < from ? 1 : -1));
              }}
            >
              <div className='mb-2 flex items-center gap-1 px-1'>
                <span className='flex-1 text-base font-semibold tabular-nums'>
                  {monthTitle}
                </span>
                {!today.startsWith(month) && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 text-xs'
                    onClick={() => {
                      setMonth(today.slice(0, 7));
                      setPickedDay(today);
                    }}
                  >
                    {text('todayButton')}
                  </Button>
                )}
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label={text('previousMonth')}
                  onClick={() => setMonth(shiftMonth(month, -1))}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label={text('nextMonth')}
                  onClick={() => setMonth(shiftMonth(month, 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className='grid grid-cols-7 text-center'>
                {Array.from({ length: 7 }, (_, i) => (
                  <div
                    key={`weekday-${String(i)}`}
                    className={`pb-1 text-xs font-medium ${toText(
                      i === 0 || i === 6
                        ? 'text-muted-foreground/60'
                        : 'text-muted-foreground',
                    )}`}
                  >
                    {new Intl.DateTimeFormat(language, {
                      weekday: 'narrow',
                      timeZone: 'UTC',
                    }).format(new Date(Date.UTC(2026, 8, 6 + i)))}
                  </div>
                ))}
                {calendarWeeks.map(({ day, inMonth }) => {
                  const count = inMonth ? (byDay.get(day)?.length ?? 0) : 0;
                  const isToday = day === today;
                  const picked = inMonth && day === shownDay;
                  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
                  const quiet =
                    !picked &&
                    !isToday &&
                    (day < today || weekday === 0 || weekday === 6);
                  return (
                    <button
                      key={day}
                      type='button'
                      aria-pressed={picked}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`${day}${count ? ` · ${String(count)}` : ''}`}
                      className='flex h-12 flex-col items-center justify-center gap-0.5'
                      onClick={() => {
                        // A neighbouring month's day turns to that month.
                        if (!inMonth) setMonth(day.slice(0, 7));
                        setPickedDay(day);
                      }}
                    >
                      <span
                        className={`flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${toText(
                          picked
                            ? 'bg-primary font-semibold text-primary-foreground'
                            : isToday
                              ? 'font-semibold text-foreground ring-1 ring-foreground/40'
                              : !inMonth
                                ? 'text-muted-foreground/35'
                                : quiet
                                  ? 'text-muted-foreground'
                                  : 'text-foreground',
                        )}`}
                      >
                        {Number(day.slice(8))}
                      </span>
                      {/* Up to three dots for how busy the day is, kept in
                          place on days without, so the rows stay level. */}
                      <span aria-hidden className='flex h-1 gap-0.5'>
                        {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                          <span
                            key={i}
                            className={`size-1 rounded-full ${toText(
                              'bg-primary/50',
                            )}`}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className='space-y-2'>
              <p className='flex items-baseline gap-2 px-1 text-sm font-medium tabular-nums'>
                {shownDay}
                <span className='text-muted-foreground'>
                  {new Intl.DateTimeFormat(language, {
                    weekday: 'short',
                    timeZone: 'UTC',
                  }).format(new Date(`${shownDay}T00:00:00Z`))}
                </span>
                {(byDay.get(shownDay) ?? []).length > 0 && (
                  <span className='ml-auto text-xs font-normal text-muted-foreground'>
                    {text('dayTotal', {
                      count: (byDay.get(shownDay) ?? []).length,
                    })}
                  </span>
                )}
              </p>
              {(byDay.get(shownDay) ?? []).length ? (
                (byDay.get(shownDay) ?? []).map((r) => calendarCard(r, true))
              ) : (
                <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>
                  {text('noTasksOnDay')}
                </p>
              )}
            </div>
          </div>
          <div className='hidden gap-px overflow-hidden rounded-xl border border-border bg-border shadow-xs lg:grid lg:grid-cols-7'>
            {Array.from({ length: 7 }, (_, i) => (
              // The weekdays as a list's header reads: small muted words on
              // the hover grey.
              <div
                key={i + 1}
                className='hidden bg-hover px-3 py-2 text-sm font-medium text-muted-foreground lg:block'
              >
                {new Intl.DateTimeFormat(language, {
                  weekday: 'short',
                  timeZone: 'UTC',
                }).format(new Date(Date.UTC(2026, 8, 6 + i)))}
              </div>
            ))}
            {Array.from(
              {
                length: new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5)) - 1,
                  1,
                ).getDay(),
              },
              (_, i) => (
                <div
                  key={i + 100}
                  aria-hidden
                  className='hidden bg-muted lg:block'
                />
              ),
            )}
            {Array.from(
              {
                length: new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5)),
                  0,
                ).getDate(),
              },
              (_, i) => {
                const day = `${toText(month)}-${toText(toText(i + 1).padStart(2, '0'))}`;
                const items = byDay.get(day) ?? [];
                const isToday = day === today;
                return (
                  <div
                    key={day}
                    className='min-h-36 space-y-2 bg-card p-3'
                    aria-current={isToday ? 'date' : undefined}
                  >
                    {/* Today is the date on a small dark pill, as calendars
                        mark it; the cell itself stays as every other. */}
                    <p
                      className={`flex text-sm font-medium ${toText(
                        isToday ? '' : 'text-muted-foreground',
                      )}`}
                    >
                      <span
                        className={
                          isToday
                            ? 'rounded-full bg-primary px-2 text-primary-foreground'
                            : ''
                        }
                      >
                        {new Intl.DateTimeFormat(language, {
                          month: 'numeric',
                          day: 'numeric',
                          timeZone: 'UTC',
                        }).format(new Date(`${day}T00:00:00Z`))}
                      </span>
                    </p>
                    {/* A cell shows a handful; a busy day reveals the rest
                        on demand rather than stretching the whole row. */}
                    {(expandedDays.has(day)
                      ? items
                      : items.slice(0, CALENDAR_DAY_LIMIT)
                    ).map((r) => calendarCard(r))}
                    {!expandedDays.has(day) &&
                      items.length > CALENDAR_DAY_LIMIT && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 w-full text-xs'
                          onClick={() =>
                            setExpandedDays((all) => new Set(all).add(day))
                          }
                        >
                          {text('loadMore')}
                          <span className='ml-1 tabular-nums text-muted-foreground'>
                            {items.length - CALENDAR_DAY_LIMIT}
                          </span>
                        </Button>
                      )}
                  </div>
                );
              },
            )}
          </div>
        </section>
      )}
      {capturing && entity === 'opportunities' && (
        <OpportunityCaptureDialog
          draft={draft}
          onDraft={setDraft}
          onClose={() => {
            setCapturing(false);
            setDraft('');
          }}
          onForm={() => {
            setCapturing(false);
            setForm({ input: {} });
          }}
        />
      )}
      {capturing && entity === 'companies' && (
        <CompanyCaptureDialog
          draft={companyDraft}
          onDraft={setCompanyDraft}
          onClose={() => {
            setCapturing(false);
            setCompanyDraft({ name: '', note: '' });
          }}
          onForm={() => {
            setCapturing(false);
            // The name typed carries over into the form.
            setForm({
              input: companyDraft.name.trim()
                ? { name: companyDraft.name.trim() }
                : {},
            });
          }}
        />
      )}
      {capturing && entity === 'leads' && (
        <LeadCaptureDialog
          draft={draft}
          onDraft={setDraft}
          onClose={() => {
            setCapturing(false);
            setDraft('');
          }}
          onForm={() => {
            setCapturing(false);
            setForm({ input: {} });
          }}
        />
      )}
      {form && (
        <RecordForm
          entity={entity}
          initial={form.input}
          id={form.id}
          titles={lookup}
          tabs={
            (entity === 'leads' ||
              entity === 'opportunities' ||
              entity === 'companies') &&
            !form.id &&
            meta?.assistant ? (
              <CaptureTabs
                current='form'
                onSwitch={() => {
                  setForm(undefined);
                  setCapturing(true);
                }}
              />
            ) : undefined
          }
          onClose={() => {
            setForm(undefined);
            setDraft('');
            setCompanyDraft({ name: '', note: '' });
          }}
          andThen={
            entity === 'approvals'
              ? {
                  label: text('saveAndSubmit'),
                  run: async (r) => {
                    await api(`approvals/${toText(r.id)}/submit`, 'POST', {
                      comment: '',
                    });
                  },
                }
              : undefined
          }
        />
      )}
      {importing && (
        <ImportDialog entity={entity} onClose={() => setImporting(false)} />
      )}
      {invalidating && definition && (
        <ReasonDialog
          entity={entity}
          stage={invalidating.stage}
          title={recordTitle(entity, invalidating.record, lookup)}
          busy={moving}
          onCancel={() => setInvalidating(undefined)}
          onConfirm={(reasons) =>
            void move(invalidating.record, {
              [definition.statusField!]: invalidating.stage,
              ...reasons,
            })
          }
        />
      )}
    </CrmFrame>
  );
}

// One board column, paging its own status through the list endpoint so the
// board never loads every record. The header count is the server's total for
// the column's filter, not the number of cards loaded so far.
function BoardColumn({
  entity,
  stage,
  params,
  droppable,
  onDrop,
  renderCard,
}: {
  entity: Entity;
  stage: string;
  params: URLSearchParams;
  droppable: boolean;
  onDrop: (dragged: CrmRecord) => void;
  renderCard: (
    record: CrmRecord,
    titles: Record<string, string>,
    ai: 'running' | 'pending' | undefined,
  ) => ReactElement;
}): ReactElement {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const base = new URLSearchParams(params);
  base.set('status', stage);
  base.set('pageSize', String(PAGE_SIZE));
  // Most recently touched first: a card dropped here was just touched, so
  // it stays at the top where it landed, and a column reads as recent work.
  base.set('orderBy', '-updatedAt');
  const query = useInfiniteQuery({
    queryKey: [...scopeKey, `${toText(entity)}/board`, stage, base.toString()],
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams(base);
      p.set('page', String(pageParam));
      return api<ListData>(`${toText(entity)}?${p.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.pageSize < last.meta.total
        ? last.meta.page + 1
        : undefined,
    // While the AI works on a card here, look again every few seconds.
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) =>
        Object.values(p.meta.ai ?? {}).includes('running'),
      )
        ? 5000
        : false,
  });
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const ai = (query.data?.pages ?? []).reduce<
    Record<string, 'running' | 'pending'>
  >((all, p) => ({ ...all, ...p.meta.ai }), {});
  const total = query.data?.pages[0]?.meta.total ?? 0;
  // The column's own read: loading, refused or failed it says so in place of
  // its cards, with a retry under the line; an empty column stays empty,
  // as a stage nothing has reached is part of the board.
  const state = queryListState(query, items.length, false);
  const titles = (query.data?.pages ?? []).reduce<Record<string, string>>(
    (all, p) => ({ ...all, ...p.meta.titles }),
    {},
  );
  // Whether a card is held over this column: counted, because entering a
  // child fires leave on the parent, and the highlight must not flicker.
  const [overCount, setOverCount] = useState(0);
  const over = droppable && overCount > 0;
  return (
    // The columns share the board's width, so a wide screen shows the board
    // whole with roomier cards; each keeps at least its former width (the
    // board scrolls sideways when they do not fit) and at most 24rem. A
    // column has no border of its own, only its tint; a card held over it
    // marks it as a focused field is marked (as the UI Library kanban does),
    // a half-strength line of the ring colour and a faint halo, drawn as a
    // shadow so the column does not shift when it appears.
    <section
      className={`flex max-w-sm min-w-72 flex-1 basis-0 flex-col rounded-xl bg-muted/70 p-3 transition-shadow dark:bg-muted/40 dark:ring-1 dark:ring-border ${toText(
        over
          ? 'shadow-[0_0_0_1px_color-mix(in_oklch,var(--ring)_50%,transparent),0_0_0_3px_color-mix(in_oklch,var(--ring)_20%,transparent)]'
          : '',
      )}`}
      // A non-droppable column (converted, reached only through the
      // conversion flow) never calls preventDefault, so the cursor says no
      // before the user lets go instead of the drop silently doing nothing.
      onDragOver={
        droppable
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          : undefined
      }
      onDragEnter={droppable ? () => setOverCount((n) => n + 1) : undefined}
      onDragLeave={
        droppable ? () => setOverCount((n) => Math.max(0, n - 1)) : undefined
      }
      onDrop={(e) => {
        e.preventDefault();
        setOverCount(0);
        try {
          onDrop(
            JSON.parse(e.dataTransfer.getData('application/json')) as CrmRecord,
          );
        } catch {
          /* not one of our cards */
        }
      }}
    >
      <div className='mb-4 flex shrink-0 items-center justify-between'>
        <Status value={stage} />
        <span className='text-sm tabular-nums text-muted-foreground'>
          {total}
        </span>
      </div>
      {/* The cards scroll inside the column; the padding keeps a landed
          card's ring from being clipped at the edges, and lets the last card
          scroll above the assistant's dock (pb-24). */}
      <div className='-m-1 min-h-0 flex-1 space-y-2 overflow-y-auto p-1 pb-24'>
        {state !== 'empty' && state !== 'ready' && (
          <div className='flex flex-col items-center gap-2'>
            <CrmListFeedback state={state} />
            <ListFeedbackActions
              state={state}
              onRetry={() => void query.refetch()}
              busy={query.isFetching}
            />
          </div>
        )}
        {listStateShowsData(state) &&
          items.map((record) =>
            renderCard(record, titles, ai[toText(record.id)]),
          )}
        <AutoLoadMore
          hasMore={Boolean(query.hasNextPage)}
          loading={query.isFetchingNextPage}
          onLoad={() => void query.fetchNextPage()}
        />
      </div>
    </section>
  );
}

// The AI's state on a list row: following the record up (or, on an
// approval, writing its review), or its suggestion waiting.
function AiRowMark({
  state,
  review,
}: {
  state: 'running' | 'pending' | undefined;
  review: boolean;
}): ReactElement | null {
  return (
    <AiStateTag
      state={state}
      work={review ? 'review' : 'followUp'}
      className='shrink-0'
    />
  );
}
