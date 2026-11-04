import { useTranslation } from '@nocobase/i18n/client';
import { FunnelIcon, XIcon } from 'lucide-react';
import {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#components/ui/dropdown-menu';

/** One thing a list filters by, such as a lead's status. */
export interface FilterDimension {
  readonly key: string;
  readonly label: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  /** The value applied, or null. */
  readonly value: string | null;
  /** The applied value's label when it is not among `options` (a record set opened from elsewhere). */
  readonly valueLabel?: string;
  readonly onChange: (value: string | null) => void;
  /**
   * A search box at the top of the values, for a long list (people). With `onChange` the caller narrows the values as
   * it is typed (on the server); without, the menu narrows the loaded ones by their labels.
   */
  readonly search?: {
    readonly placeholder: string;
    readonly value?: string;
    readonly onChange?: (value: string) => void;
  };
  /** Applied from somewhere else (a statistic card, the global search): shown as a chip but not offered in the menu. */
  readonly chipOnly?: boolean;
}

/** The list's own keyword, typed in a box at the top of the menu and shown as a chip once applied. */
export interface FilterKeyword {
  /** The term in effect, for the chip. */
  readonly applied: string;
  /** Spread onto the box (useUrlSearch's `inputProps`), which runs ahead of the URL while typing. */
  readonly inputProps: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onKeyDown' | 'placeholder'
  >;
  readonly onClear: () => void;
  readonly placeholder: string;
}

// Typed letters stay in a box inside the menu rather than moving the menu's highlight; Escape and the arrows still
// reach the menu.
function keepTyping(event: KeyboardEvent<HTMLInputElement>): void {
  // The down arrow goes on to the first entry under the box.
  if (event.key === 'ArrowDown') {
    const item = event.currentTarget
      .closest('[role="menu"]')
      ?.querySelector<HTMLElement>('[role^="menuitem"]');
    if (item) {
      event.preventDefault();
      event.stopPropagation();
      item.focus();
    }
    return;
  }
  if (!['Escape', 'ArrowUp', 'Tab'].includes(event.key))
    event.stopPropagation();
}

/**
 * A list's filters as a menu, like Linear's: a Filters button opens the things the list filters by, each opening
 * its values beside it. The applied filters follow the button as chips, each with a button that removes it; the menu
 * ends with Clear filters while any is applied. With a `keyword`, the menu starts with the list's search box, which
 * `/` opens when `slashOpens` is set (⌘K staying the global search).
 */
export function FilterMenu({
  dimensions,
  keyword,
  onClear,
  slashOpens = false,
}: {
  readonly dimensions: readonly FilterDimension[];
  readonly keyword?: FilterKeyword;
  readonly onClear: () => void;
  readonly slashOpens?: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const keywordRef = useRef<HTMLInputElement>(null);
  const applied = dimensions.filter((dimension) => dimension.value);
  // The effects below follow whether there is a box, not the props object
  // each render passes anew.
  const hasKeyword = Boolean(keyword);
  const count = applied.length + (keyword?.applied ? 1 : 0);
  const label = count
    ? t('listToolbar.filtersApplied', { count })
    : t('listToolbar.filters');

  // `/` brings the search box up, as in Linear and GitHub, unless the reader is typing or a dialog is open.
  useEffect(() => {
    if (!slashOpens || !hasKeyword) return;
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest('input,textarea,select,[contenteditable="true"]') ||
        document.querySelector('[role="dialog"]')
      )
        return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [slashOpens, hasKeyword]);

  // The menu opens with the caret in the search box, once the menu has placed its own focus.
  useEffect(() => {
    if (!open || !hasKeyword) return;
    const frame = requestAnimationFrame(() => keywordRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, hasKeyword]);

  const offered = dimensions.filter((dimension) => !dimension.chipOnly);
  return (
    <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            // The funnel alone, as the header's other icon buttons (import,
            // export) are, named for screen readers and on hover.
            <Button
              variant='ghost'
              size='icon'
              className='aria-expanded:bg-muted'
              aria-label={label}
              title={label}
            />
          }
        >
          <FunnelIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-56'>
          {keyword ? (
            <div className='-mx-1 -mt-1 mb-1 border-b p-1.5'>
              <Input
                ref={keywordRef}
                {...keyword.inputProps}
                onKeyDown={(event) => {
                  // Enter takes the term and closes the menu, the list showing what it leaves.
                  if (event.key === 'Enter') setOpen(false);
                  else keepTyping(event);
                }}
                placeholder={keyword.placeholder}
                aria-label={keyword.placeholder}
                className='h-7'
              />
            </div>
          ) : null}
          <DropdownMenuGroup>
            {offered.map((dimension) => (
              <FilterSubmenu key={dimension.key} dimension={dimension} />
            ))}
          </DropdownMenuGroup>
          {count ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClear}>
                {t('listToolbar.clear')}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {keyword?.applied ? (
        <FilterChip
          label={t('listToolbar.keyword')}
          value={keyword.applied}
          onRemove={keyword.onClear}
        />
      ) : null}
      {applied.map((dimension) => (
        <FilterChip
          key={dimension.key}
          label={dimension.label}
          value={
            dimension.options.find((option) => option.value === dimension.value)
              ?.label ??
            dimension.valueLabel ??
            ''
          }
          onRemove={() => dimension.onChange(null)}
        />
      ))}
    </div>
  );
}

function FilterSubmenu({
  dimension,
}: {
  readonly dimension: FilterDimension;
}): ReactElement {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState('');
  const search = dimension.search;
  const remote = Boolean(search?.onChange);
  const query = remote ? (search?.value ?? '') : localQuery;
  const needle = query.trim().toLocaleLowerCase();
  const options =
    search && !remote && needle
      ? dimension.options.filter((option) =>
          option.label.toLocaleLowerCase().includes(needle),
        )
      : dimension.options;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{dimension.label}</DropdownMenuSubTrigger>
      {/* As wide as its longest value (a person's full name), up to a limit past which a value wraps. */}
      <DropdownMenuSubContent className='max-h-72 w-max max-w-80 min-w-44 overflow-y-auto'>
        {search ? (
          <div className='sticky -top-1 z-10 -mx-1 -mt-1 mb-1 border-b bg-popover p-1.5'>
            <Input
              value={query}
              onChange={(event) =>
                remote
                  ? search.onChange?.(event.target.value)
                  : setLocalQuery(event.target.value)
              }
              onKeyDown={keepTyping}
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              className='h-7'
            />
          </div>
        ) : null}
        {search && options.length === 0 ? (
          <p className='px-2 py-1.5 text-sm text-muted-foreground'>
            {t('listToolbar.noMatches')}
          </p>
        ) : null}
        <DropdownMenuRadioGroup
          value={dimension.value ?? ''}
          onValueChange={(value: string) => dimension.onChange(value || null)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function FilterChip({
  label,
  value,
  onRemove,
}: {
  readonly label: string;
  readonly value: string;
  readonly onRemove: () => void;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <span className='flex h-6 max-w-48 min-w-0 items-center gap-1 rounded-md bg-muted pr-0.5 pl-2 text-xs'>
      <span className='shrink-0 text-muted-foreground'>{label}</span>
      <span className='truncate font-medium' title={value}>
        {value}
      </span>
      <Button
        variant='ghost'
        size='icon-xs'
        className='size-5 text-muted-foreground'
        aria-label={t('listToolbar.removeFilter', { name: label })}
        onClick={onRemove}
      >
        <XIcon className='size-3' />
      </Button>
    </span>
  );
}
