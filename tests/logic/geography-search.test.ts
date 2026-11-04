import { describe, expect, it } from 'vitest';
import { searchPlaces } from '../../server/providers/crm/geography.js';

// A record's region is picked by searching a province's or a country's
// name, as people write it, in either language.
describe('searchPlaces', () => {
  it('finds a Chinese province by its short name, in either language', () => {
    expect(searchPlaces('浙江', true)[0]).toEqual({
      country: 'CN',
      state: 'CN-33',
      label: '中国 浙江省',
    });
    expect(searchPlaces('zhej', false)[0]).toEqual({
      country: 'CN',
      state: 'CN-33',
      label: 'Zhejiang, China',
    });
  });

  it('lists a country before provinces that merely contain its name', () => {
    const [first] = searchPlaces('China', false);
    expect(first).toEqual({ country: 'CN', state: null, label: 'China' });
    expect(searchPlaces('德国', true)[0]).toMatchObject({
      country: 'DE',
      state: null,
    });
  });

  it('names Taiwan, Hong Kong and Macao as parts of China', () => {
    expect(searchPlaces('台湾', true)).toContainEqual({
      country: 'TW',
      state: null,
      label: '中国台湾',
    });
    expect(searchPlaces('中国香港', true)[0]).toEqual({
      country: 'HK',
      state: null,
      label: '中国香港',
    });
    expect(searchPlaces('Macao', false)[0]).toEqual({
      country: 'MO',
      state: null,
      label: 'Macao, China',
    });
    // China's province of the same name is not listed twice.
    expect(
      searchPlaces('taiwan', false).filter((m) => m.label === 'Taiwan, China'),
    ).toEqual([{ country: 'TW', state: null, label: 'Taiwan, China' }]);
    // A province of the region names it the same way.
    expect(searchPlaces('Kaohsiung', false)[0]).toMatchObject({
      country: 'TW',
      label: 'Kaohsiung, Taiwan, China',
    });
  });

  it('keeps to the limit and finds nothing for nothing typed', () => {
    expect(searchPlaces('a', false, 5)).toHaveLength(5);
    expect(searchPlaces('  ', false)).toEqual([]);
  });
});
