import type { ReactElement } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { XIcon } from 'lucide-react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../ui/combobox.js';
import { InputGroupAddon, InputGroupButton } from '../ui/input-group.js';
import { useCrmQuery, useCrmText } from './api.js';

interface Subdivision {
  value: string;
  label: string;
}

// Country names come from the browser's own locale data, so no country name
// list is bundled or translated by hand; the few the CRM names otherwise
// (Taiwan, China) are `regionNames` in the locale files, read first.
function useCountryLabel(): (code: string) => string {
  const { text, language } = useCrmText();
  return (code: string): string => {
    const own = code ? text(`regionNames.${code}`, { defaultValue: '' }) : '';
    if (own) return own;
    try {
      return (
        new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code
      );
    } catch {
      return code;
    }
  };
}

function useSubdivisions(country: string): Subdivision[] | undefined {
  const { data } = useCrmQuery<Subdivision[]>(
    `geography/subdivisions?country=${encodeURIComponent(country)}`,
    Boolean(country),
  );
  return data;
}

export function CountryLabel({ code }: { code: string }): ReactElement {
  const countryLabel = useCountryLabel();
  return <>{countryLabel(code)}</>;
}

export function SubdivisionLabel({
  country,
  code,
}: {
  country: string;
  code: string;
}): ReactElement {
  const data = useSubdivisions(country);
  return <>{data?.find((s) => s.value === code)?.label ?? code}</>;
}

// A place picked from a list that narrows as its name is typed: some 250
// countries, or a country's provinces, too many to scroll. Cleared with its
// clear button, which hands back ''.
function PlaceChoice({
  value,
  choices,
  onChange,
  label,
  placeholder,
  disabled,
  onOpenChange,
}: {
  value: string;
  choices: Subdivision[];
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  // A value the list does not have (yet, or from before the codes) shows as
  // itself.
  const chosen = value
    ? (choices.find((choice) => choice.value === value) ?? {
        value,
        label: value,
      })
    : null;
  return (
    <Combobox
      items={choices}
      value={chosen}
      disabled={disabled}
      onValueChange={(item: Subdivision | null) => onChange(item?.value ?? '')}
      onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}
      itemToStringLabel={(item: Subdivision) => item.label}
      isItemEqualToValue={(item: Subdivision, current: Subdivision) =>
        item.value === current.value
      }
    >
      <ComboboxInput
        className='w-full min-w-32'
        aria-label={label}
        placeholder={placeholder}
        disabled={disabled}
      >
        {/* The primitive's own clear button (showClear) has no name to be
            told by, so it is drawn here with one. */}
        {value && !disabled ? (
          <InputGroupAddon align='inline-end'>
            <ComboboxPrimitive.Clear
              data-slot='combobox-clear'
              aria-label={text('clearChoice')}
              render={<InputGroupButton variant='ghost' size='icon-xs' />}
            >
              <XIcon className='pointer-events-none' />
            </ComboboxPrimitive.Clear>
          </InputGroupAddon>
        ) : null}
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>{text('noChoiceMatch')}</ComboboxEmpty>
        <ComboboxList>
          {(item: Subdivision) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function CountryChoice({
  value,
  codes,
  onChange,
  label,
  onOpenChange,
}: {
  value: string;
  codes: string[];
  onChange: (value: string) => void;
  label: string;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const countryLabel = useCountryLabel();
  const choices = codes
    .map((code) => ({ value: code, label: countryLabel(code) }))
    .sort((left, right) => left.label.localeCompare(right.label, language));
  return (
    <PlaceChoice
      label={label}
      value={value}
      onChange={onChange}
      choices={choices}
      placeholder={text('choose')}
      onOpenChange={onOpenChange}
    />
  );
}

export function SubdivisionChoice({
  value,
  country,
  onChange,
  label,
  onOpenChange,
}: {
  value: string;
  country: string;
  onChange: (value: string) => void;
  label: string;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  const data = useSubdivisions(country);
  return (
    <PlaceChoice
      // A new country's list starts with nothing typed in it.
      key={country}
      label={label}
      value={value}
      onChange={onChange}
      choices={country ? (data ?? []) : []}
      disabled={!country}
      placeholder={text(country ? 'choose' : 'selectCountryFirst')}
      onOpenChange={onOpenChange}
    />
  );
}
