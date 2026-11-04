import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn, crmZh } from '../../client/locales/crm/index.js';

// A country and its province are picked from lists that narrow as the name
// is typed, and cleared with a button; Taiwan, Hong Kong and Macao are named
// as parts of China, by the CRM's own words rather than the browser's.

const state = vi.hoisted(() => ({ language: 'en-US' }));

vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({
    text: (key: string, values?: Record<string, unknown>): string => {
      const value = key
        .split('.')
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown> | undefined)?.[part],
          state.language === 'zh-CN' ? crmZh : crmEn,
        );
      if (typeof value === 'string') return value;
      return values && 'defaultValue' in values
        ? String(values.defaultValue)
        : key;
    },
    language: state.language,
  }),
  useCrmQuery: (path: string, enabled = true) =>
    enabled && path === 'geography/subdivisions?country=CN'
      ? {
          data: [
            { value: 'CN-32', label: 'Jiangsu' },
            { value: 'CN-33', label: 'Zhejiang' },
            { value: 'CN-44', label: 'Guangdong' },
          ],
        }
      : { data: undefined },
}));

const { CountryChoice, CountryLabel, SubdivisionChoice } =
  await import('../../client/components/crm/geography.js');

const codes = ['CN', 'DE', 'HK', 'MO', 'TW', 'US'];

beforeEach(() => {
  state.language = 'en-US';
});
afterEach(cleanup);

describe('country names', () => {
  it('names Taiwan, Hong Kong and Macao as parts of China', () => {
    const { container } = render(
      <>
        <CountryLabel code='TW' />|<CountryLabel code='HK' />|
        <CountryLabel code='MO' />|<CountryLabel code='DE' />
      </>,
    );
    expect(container.textContent).toBe(
      'Taiwan, China|Hong Kong, China|Macao, China|Germany',
    );
    cleanup();
    state.language = 'zh-CN';
    const { container: zh } = render(
      <>
        <CountryLabel code='TW' />|<CountryLabel code='HK' />|
        <CountryLabel code='MO' />|<CountryLabel code='DE' />
      </>,
    );
    expect(zh.textContent).toBe('中国台湾|中国香港|中国澳门|德国');
  });
});

describe('CountryChoice', () => {
  it('narrows the countries as a name is typed and picks one', async () => {
    const onChange = vi.fn();
    render(
      <CountryChoice
        label='Country'
        value=''
        codes={codes}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Country' });
    await userEvent.type(input, 'chin');
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'China',
      'Hong Kong, China',
      'Macao, China',
      'Taiwan, China',
    ]);
    await userEvent.click(
      screen.getByRole('option', { name: 'Taiwan, China' }),
    );
    expect(onChange).toHaveBeenCalledWith('TW');
  });

  it('shows the chosen country and clears it', async () => {
    const onChange = vi.fn();
    state.language = 'zh-CN';
    render(
      <CountryChoice
        label='Country'
        value='HK'
        codes={codes}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue(
      '中国香港',
    );
    await userEvent.click(screen.getByRole('button', { name: '清除选择' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('SubdivisionChoice', () => {
  it('waits for a country, then searches its provinces', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SubdivisionChoice
        label='Province'
        value=''
        country=''
        onChange={onChange}
      />,
    );
    const empty = screen.getByRole('combobox', { name: 'Province' });
    expect(empty).toBeDisabled();
    expect(empty).toHaveAttribute('placeholder', 'Select a country first');
    rerender(
      <SubdivisionChoice
        label='Province'
        value=''
        country='CN'
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Province' });
    await userEvent.type(input, 'zhe');
    expect(
      (await screen.findAllByRole('option')).map((o) => o.textContent),
    ).toEqual(['Zhejiang']);
    await userEvent.click(screen.getByRole('option', { name: 'Zhejiang' }));
    expect(onChange).toHaveBeenCalledWith('CN-33');
  });
});
