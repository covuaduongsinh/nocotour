import { useInfiniteQuery } from '@tanstack/react-query';
import { MessageCircle, Plug } from 'lucide-react';
import { lazy, Suspense, useState, type ReactElement } from 'react';
import { Link, Outlet, useParams, useSearchParams } from 'react-router';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Badge } from '#components/ui/badge';
import { Button } from '#components/ui/button';
import { Card } from '#components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#components/ui/empty';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';
import { Spinner } from '#components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '#components/ui/tabs';
import { useToaster } from '@nocobase/app-client';
import {
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
} from '../../components/crm/api.js';
import {
  RecordDrawerContext,
  useRecordDrawerState,
} from '../../components/crm/record-drawer.js';
import {
  LIST_POLL_MS,
  VIEWS,
  dayIn,
  numberLabel,
  useBusinessZone,
  useConversationsKey,
  useWhatsAppNumbers,
  viewOf,
  type ConversationRow,
  type ConversationView,
  type WhatsAppNumberLabel,
} from '../../components/crm/whatsapp/api.js';
import { MessageSummary } from '../../components/crm/whatsapp/messages.js';
import {
  CrmListFeedback,
  ListFeedbackActions,
} from '../../components/crm/list-feedback.js';
import {
  listStateShowsData,
  queryListState,
} from '../../components/crm/list-state.js';

// The WhatsApp page (/whatsapp): the company numbers' conversations with
// customers, an inbox of two panes as the Mail workspace is — the list on
// the left, the conversation open beside it (/whatsapp/:conversationId,
// its own route, pages/crm-whatsapp/conversation.tsx). Which conversations
// the list shows is its tab and, with two numbers or more, its number, both
// kept in the address (?view=, ?number=). One awaiting a reply (the customer
// wrote last) is marked so. Records named in
// a conversation open in the record drawer over the page (?open=). Kept
// current by asking again every few seconds (LIST_POLL_MS), so it has no
// Refresh. On a phone one pane shows at a time.

const RecordDrawer = lazy(() =>
  import('../crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);

const PAGE = 50;

export default function WhatsAppPage(): ReactElement {
  const { text } = useCrmText();
  const { conversationId } = useParams();
  const [params, setParams] = useSearchParams();
  const view = viewOf(params);
  const numbers = useWhatsAppNumbers();
  // A number no longer there reads as all of them.
  const numberId = numbers.some((n) => n.id === params.get('number'))
    ? (params.get('number') ?? undefined)
    : undefined;
  const { data: meta } = useMetadata();
  const drawer = useRecordDrawerState();
  // Loaded on the first open and kept mounted after, so closing animates.
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (drawer.opened && !drawerLoaded) setDrawerLoaded(true);
  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      {/* On a phone an open conversation has the screen: no page title or
          switches over it, and a narrower margin round it. */}
      <PageContainer
        className={`flex h-full flex-col ${conversationId ? 'max-md:space-y-0 max-md:p-3' : ''}`}
      >
        <div className={conversationId ? 'hidden md:block' : undefined}>
          <PageHeader
            title={toText(text('whatsapp.title'))}
            // The number's connection, for whoever manages the CRM's settings,
            // as the mailbox leads to its accounts.
            // Which number's inbox the page shows, left of it: the page's
            // context, switched rather than filtered.
            actions={
              <>
                <NumberSwitch numbers={numbers} value={numberId} />
                {meta?.settingsAccess ? (
                  <Button
                    variant='outline'
                    nativeButton={false}
                    render={<Link to='/whatsapp/connection' />}
                    aria-label={toText(text('whatsapp.manageConnection'))}
                    title={toText(text('whatsapp.manageConnection'))}
                  >
                    <Plug data-icon='inline-start' />
                    <span className='hidden sm:inline'>
                      {text('whatsapp.manageConnection')}
                    </span>
                  </Button>
                ) : null}
              </>
            }
          />
        </div>
        {/* Both panes scroll on their own: the card takes the height left
            under the header, down to the page's own bottom padding, the
            assistant's dock being hidden here (design: F7). */}
        <Card className='min-h-96 flex-1 basis-0 gap-0 overflow-hidden p-0 md:flex-row'>
          <aside
            className={`${conversationId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-border md:w-80 md:shrink-0 md:border-r`}
          >
            <div className='flex flex-col gap-2 border-b border-border p-3'>
              <Tabs
                value={view}
                onValueChange={(next) =>
                  setParams(
                    (previous) => {
                      const nextParams = new URLSearchParams(previous);
                      nextParams.set('view', String(next));
                      return nextParams;
                    },
                    { replace: true },
                  )
                }
              >
                <TabsList
                  aria-label={toText(text('whatsapp.views.label'))}
                  className='w-full'
                >
                  {VIEWS.map((name) => (
                    <TabsTrigger key={name} value={name}>
                      {text(`whatsapp.views.${name}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <ConversationList
              view={view}
              numberId={numberId}
              showNumber={numbers.length > 1 && !numberId}
              openId={conversationId}
            />
          </aside>
          <section
            className={`${conversationId ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col`}
          >
            {conversationId ? (
              <Outlet />
            ) : (
              <div className='p-6'>
                <Empty className='min-h-48 border border-dashed'>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <MessageCircle />
                    </EmptyMedia>
                    <EmptyTitle>{text('whatsapp.choose')}</EmptyTitle>
                    <EmptyDescription>
                      {text('whatsapp.chooseBody')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </section>
        </Card>
      </PageContainer>
      {drawerLoaded ? (
        <Suspense fallback={null}>
          <RecordDrawer
            target={drawer.opened}
            open={drawer.open}
            close={drawer.close}
          />
        </Suspense>
      ) : null}
    </RecordDrawerContext.Provider>
  );
}

const ALL = '__all__';

// The number whose conversations the page shows (?number=), or all of them;
// a lone number is named without a menu.
function NumberSwitch({
  numbers,
  value,
}: {
  numbers: WhatsAppNumberLabel[];
  value?: string;
}): ReactElement | null {
  const { text } = useCrmText();
  const [, setParams] = useSearchParams();
  if (numbers.length === 0) return null;
  if (numbers.length === 1)
    return (
      <span className='text-sm whitespace-nowrap text-muted-foreground'>
        {numberLabel(numbers[0])}
      </span>
    );
  const items = [
    { value: ALL, label: toText(text('whatsapp.allNumbers')) },
    ...numbers.map((n) => ({ value: n.id, label: numberLabel(n) })),
  ];
  return (
    <Select
      items={items}
      value={value ?? ALL}
      onValueChange={(next) =>
        setParams(
          (previous) => {
            const nextParams = new URLSearchParams(previous);
            if (next && next !== ALL) nextParams.set('number', String(next));
            else nextParams.delete('number');
            return nextParams;
          },
          { replace: true },
        )
      }
    >
      <SelectTrigger
        aria-label={toText(text('whatsapp.numberFilter'))}
        className='w-auto shrink-0 whitespace-nowrap'
      >
        {/* The number whole on one line; on a phone, short of room, it
            drops its name, and the connection button its words. */}
        <SelectValue>
          {(current: string) => {
            const number = numbers.find((n) => n.id === current);
            if (!number) return toText(text('whatsapp.allNumbers'));
            return number.name ? (
              <span>
                <span className='hidden sm:inline'>{number.name} · </span>
                {number.phone}
              </span>
            ) : (
              number.phone
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className='w-auto min-w-(--anchor-width)'>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className='whitespace-nowrap'
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function ConversationList({
  view,
  numberId,
  showNumber,
  openId,
}: {
  view: ConversationView;
  numberId?: string;
  // Each row names its number: two or more, none picked.
  showNumber: boolean;
  openId?: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const zone = useBusinessZone();
  const [params] = useSearchParams();
  const key = useConversationsKey(view, numberId);
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      api<{ data: ConversationRow[]; meta: { total: number } }>(
        `whatsapp/conversations?view=${view}${numberId ? `&numberId=${encodeURIComponent(numberId)}` : ''}&page=${String(pageParam)}&pageSize=${String(PAGE)}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.length * PAGE < last.meta.total ? pages.length + 1 : undefined,
    refetchInterval: LIST_POLL_MS,
    staleTime: 5000,
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  // The conversations' read as the list feedback reads it (list-state.ts):
  // loading, refused or failed it says so in place of the list, with a
  // retry or sign-in under it; a poll that failed keeps the conversations
  // with a line over them. A page further down that failed is not the list
  // failing, and the empty list keeps its own words (EmptyView).
  const state = queryListState(
    { ...query, error: query.isFetchNextPageError ? undefined : query.error },
    rows.length,
    false,
  );
  if (!listStateShowsData(state) && state !== 'empty')
    return (
      <div className='flex flex-col items-center gap-2 p-3'>
        <CrmListFeedback state={state} />
        <ListFeedbackActions
          state={state}
          onRetry={() => void query.refetch()}
          busy={query.isFetching}
        />
      </div>
    );
  if (state === 'empty') return <EmptyView view={view} />;
  // In the CRM's time zone, as the conversation reads (useBusinessZone).
  const timeOf = (at: string | null): string => {
    if (!at) return '';
    const date = new Date(at);
    return dayIn(date, zone) === dayIn(new Date(), zone)
      ? new Intl.DateTimeFormat(language, {
          timeZone: zone,
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      : new Intl.DateTimeFormat(language, {
          timeZone: zone,
          dateStyle: 'medium',
        }).format(date);
  };
  const search = `?view=${view}${numberId ? `&number=${encodeURIComponent(numberId)}` : ''}${params.get('open') ? `&open=${params.get('open') ?? ''}` : ''}`;
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      {query.isFetching && !query.isFetchingNextPage ? (
        <span className='sr-only' role='status'>
          {text('loading')}
        </span>
      ) : null}
      {state === 'refresh-failed' ? (
        <div className='flex flex-col items-center gap-2 px-2 pt-2'>
          <CrmListFeedback state={state} />
          <ListFeedbackActions
            state={state}
            onRetry={() => void query.refetch()}
            busy={query.isFetching}
          />
        </div>
      ) : null}
      <ul className='flex flex-col p-2'>
        {rows.map((row) => {
          const open = row.id === openId;
          const awaiting = row.unreadCount > 0;
          return (
            <li key={row.id}>
              <Link
                to={`/whatsapp/${encodeURIComponent(row.id)}${search}`}
                aria-current={open ? 'page' : undefined}
                className={`flex flex-col gap-1 rounded-md p-2 text-sm transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  open ? 'bg-muted' : ''
                }`}
              >
                <span className='flex min-w-0 items-center gap-2'>
                  <span
                    className={`min-w-0 flex-1 truncate ${
                      awaiting ? 'font-medium' : ''
                    }`}
                    title={row.name}
                  >
                    {row.name}
                  </span>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {timeOf(row.lastMessageAt)}
                  </span>
                </span>
                <span className='flex min-w-0 items-center gap-2 text-muted-foreground'>
                  <span className='min-w-0 flex-1'>
                    {row.last ? (
                      <MessageSummary
                        type={row.last.type}
                        text={row.last.text}
                        caption={row.last.caption}
                      />
                    ) : null}
                  </span>
                  {awaiting ? (
                    <Badge
                      variant='warning'
                      title={toText(
                        text('whatsapp.awaitingCount', {
                          count: row.unreadCount,
                        }),
                      )}
                    >
                      {text('whatsapp.awaiting')}
                    </Badge>
                  ) : null}
                </span>
                {row.state !== 'linked' || (showNumber && row.number) ? (
                  <span className='flex min-w-0 items-center gap-2'>
                    {row.state !== 'linked' ? (
                      <Badge variant='outline'>
                        {text(`whatsapp.state.${row.state}`)}
                      </Badge>
                    ) : null}
                    {showNumber && row.number ? (
                      <span className='min-w-0 truncate text-xs text-muted-foreground'>
                        {row.number.name ?? row.number.phone}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage ? (
        <div className='flex justify-center p-3'>
          <Button
            variant='outline'
            size='sm'
            disabled={query.isFetchingNextPage}
            onClick={() =>
              void query.fetchNextPage().then((result) => {
                if (result.error)
                  toaster.show({
                    type: 'error',
                    title: toText(text('whatsapp.loadMoreFailed')),
                  });
              })
            }
          >
            {query.isFetchingNextPage ? (
              <Spinner data-icon='inline-start' />
            ) : null}
            {text('whatsapp.loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// No conversation in the view: what would appear there, and for the All
// view while no number is connected, how to connect one.
function EmptyView({ view }: { view: ConversationView }): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const configured = meta?.whatsapp?.configured === true;
  const title =
    view === 'unlinked'
      ? 'whatsapp.empty.unlinkedTitle'
      : 'whatsapp.empty.title';
  const body =
    view === 'unlinked'
      ? 'whatsapp.empty.unlinkedBody'
      : configured
        ? 'whatsapp.empty.body'
        : meta?.settingsAccess
          ? 'whatsapp.empty.connect'
          : 'whatsapp.empty.askAdmin';
  return (
    <div className='p-3'>
      <Empty className='min-h-40 border border-dashed p-6 md:p-6'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <MessageCircle />
          </EmptyMedia>
          <EmptyTitle>{text(title)}</EmptyTitle>
          <EmptyDescription>{text(body)}</EmptyDescription>
        </EmptyHeader>
        {view === 'all' && !configured && meta?.settingsAccess ? (
          <EmptyContent>
            <Button
              variant='outline'
              nativeButton={false}
              render={<Link to='/whatsapp/connection' />}
            >
              {text('whatsapp.manageConnection')}
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </div>
  );
}
