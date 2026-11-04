import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmEn } from '../../client/locales/crm/index.js';
import enUS from '../../client/locales/en-US.js';

// A CRM list's filters (client/pages/crm-list.tsx): a Filters menu in the
// header with its keyword box, the applied conditions following it as
// chips, all kept in the address.

function lookup(
  root: unknown,
  key: string,
  options?: Record<string, unknown>,
): string {
  let value: unknown = root;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== 'string')
    return typeof options?.defaultValue === 'string'
      ? options.defaultValue
      : key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options?.[name] ?? ''),
  );
}

const state = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('@nocobase/i18n/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/i18n/client')>()),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      lookup(enUS, key, options),
    i18n: { language: 'en-US' },
  }),
}));
vi.mock('@nocobase/app-plugin-authorization/client', () => ({
  useCan: () => ({ can: true, isPending: false, error: undefined }),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const person = (id: string, name: string) => ({
    id,
    name,
    roles: ['sales-representative'],
    disabled: false,
    canApprove: false,
  });
  const metadata = {
    userId: 'rep',
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [person('rep', 'Mia Chen'), person('lee', 'Lee Park')],
    permissions: {
      contacts: { read: { fields: '*' }, create: true },
    },
    export: false,
  };
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => () => Promise.resolve(),
    useCrmScopeKey: () => ['crm', 'rep', 'en-US'],
    useMetadata: () => ({ data: metadata }),
    // Asked through the test's API, as the hook asks the application's.
    useCrmQuery: (path: string, enabled = true) =>
      useQuery({
        queryKey: ['crm', path],
        queryFn: () =>
          (state.api(path) as Promise<{ data: unknown }>).then((r) => r.data),
        enabled,
      }),
    useCrmText: () => ({
      text: (key: string, options?: Record<string, unknown>) =>
        lookup(crmEn, key, options),
      language: 'en-US',
    }),
  };
});

const { default: CrmListPage } = await import('../../client/pages/crm-list.js');

const contact = {
  id: 'c1',
  name: 'Ana Souza',
  ownerId: 'rep',
  employed: true,
};

function Location() {
  const location = useLocation();
  return <output data-testid='location'>{location.search}</output>;
}

function renderList(path: string): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path='/contacts'
            element={
              <>
                <CrmListPage />
                <Location />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// The list's own reads, by the query they sent.
function listQueries(): URLSearchParams[] {
  return state.api.mock.calls
    .map(([path]) => String(path))
    .filter((path) => path.startsWith('contacts?') && path.includes('page='))
    .map((path) => new URLSearchParams(path.split('?')[1]));
}
const lastQuery = (): URLSearchParams => listQueries().at(-1)!;

const filtersButton = (count = 0) =>
  screen.getByRole('button', {
    name: count
      ? enUS.listToolbar.filtersApplied.replace('{{count}}', String(count))
      : enUS.listToolbar.filters,
  });
const removeButton = (name: string) =>
  screen.getByRole('button', {
    name: enUS.listToolbar.removeFilter.replace('{{name}}', name),
  });

beforeEach(() => {
  state.api.mockReset();
  state.api.mockImplementation(async () => ({
    data: [contact],
    meta: { total: 1, page: 1, pageSize: 20, titles: {}, names: {} },
  }));
});

describe('a CRM list’s filters', () => {
  it('applies a condition from the menu, and its chip removes it', async () => {
    renderList('/contacts');
    expect(await screen.findByText('Ana Souza')).toBeTruthy();
    // Beside the create button in the header, no row of fields above the
    // list.
    const create = screen.getByRole('button', {
      name: crmEn.newRecord.replace('{{entity}}', crmEn.entity.contacts),
    });
    expect(filtersButton().compareDocumentPosition(create)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByRole('combobox')).toBe(null);
    // The funnel alone, named by its label and on hover.
    expect(filtersButton().textContent).toBe('');
    expect(filtersButton().getAttribute('title')).toBe(
      enUS.listToolbar.filters,
    );

    await userEvent.click(filtersButton());
    await userEvent.click(
      await screen.findByRole('menuitem', { name: crmEn.owner }),
    );
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Lee Park' }),
    );
    await waitFor(() => expect(lastQuery().get('ownerId')).toBe('lee'));
    expect(screen.getByTestId('location').textContent).toContain('ownerId=lee');

    await userEvent.click(removeButton(crmEn.owner));
    await waitFor(() => expect(lastQuery().get('ownerId')).toBe(''));
    expect(screen.getByTestId('location').textContent).not.toContain('ownerId');
    expect(filtersButton()).toBeTruthy();
  });

  it('reads its conditions from the address, ignoring values it does not offer, and clears them', async () => {
    renderList(
      '/contacts?employed=false&search=acme&ownerId=ghost&source=nowhere',
    );
    await waitFor(() => expect(lastQuery().get('employed')).toBe('false'));
    expect(lastQuery().get('q')).toBe('acme');
    expect(lastQuery().get('ownerId')).toBe('');
    expect(lastQuery().get('source')).toBe('');
    // The keyword and the employment state, as chips.
    expect(removeButton(enUS.listToolbar.keyword)).toBeTruthy();
    expect(removeButton(crmEn.fields.employed)).toBeTruthy();
    expect(screen.getByText('acme')).toBeTruthy();

    await userEvent.click(filtersButton(2));
    // The menu starts with the keyword's box, the term in it.
    expect(
      await screen.findByRole('textbox', {
        name: crmEn.filterIn.replace('{{list}}', crmEn.entities.contacts),
      }),
    ).toHaveProperty('value', 'acme');
    await userEvent.click(
      await screen.findByRole('menuitem', { name: enUS.listToolbar.clear }),
    );
    await waitFor(() => {
      expect(lastQuery().get('employed')).toBe('');
      expect(lastQuery().get('q')).toBe('');
    });
    expect(screen.getByTestId('location').textContent).toBe('');
  });

  it('shows the global search’s found records as a chip of their own', async () => {
    renderList('/contacts?ids=c1,c2&found=Brazil%20buyers');
    await waitFor(() => expect(lastQuery().get('ids')).toBe('c1,c2'));
    expect(
      screen.getByText(
        crmEn.globalSearch.foundChip.replace('{{title}}', 'Brazil buyers'),
      ),
    ).toBeTruthy();
    await userEvent.click(removeButton(crmEn.showing));
    await waitFor(() => expect(lastQuery().get('ids')).toBe(null));
    expect(screen.getByTestId('location').textContent).toBe('');
  });
});
