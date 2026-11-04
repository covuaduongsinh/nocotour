import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { UserMenu } from '../../client/layouts/components/user-menu.js';

const state = vi.hoisted(() => ({
  theme: 'light',
  preset: 'compact',
  setTheme: vi.fn(),
  setPreset: vi.fn(),
}));
vi.mock('@nocobase/app-plugin-authentication/client', () => ({
  useAuthentication: () => ({
    client: { signOut: vi.fn() },
    session: { user: { name: 'Test user' } },
    refresh: vi.fn(),
  }),
}));
vi.mock('@nocobase/app-plugin-authentication/client/actions', () => ({
  useAuthenticationErrorResolver: () => vi.fn(),
}));
vi.mock('@nocobase/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('../../client/layouts/components/language-switcher.js', () => ({
  LanguageSwitcher: () => null,
}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: state.theme, setTheme: state.setTheme }),
}));
vi.mock('../../client/theme/theme-context.js', () => ({
  useThemePreset: () => ({ preset: state.preset, setPreset: state.setPreset }),
}));

beforeEach(() => {
  state.theme = 'light';
  state.preset = 'compact';
  state.setTheme.mockReset();
  state.setPreset.mockReset();
});

// The colour mode and the theme are chosen from the account menu, the
// header having no palette button of its own.
it('changes the colour mode and the theme from the account menu', async () => {
  render(
    <MemoryRouter initialEntries={['/leads']}>
      <UserMenu />
    </MemoryRouter>,
  );
  screen.getByRole('button', { name: 'Open account menu' }).focus();
  await userEvent.keyboard('{Enter}');
  const appearance = await screen.findByRole('menuitem', {
    name: /Appearance/u,
  });
  expect(appearance.textContent).toContain('Light');
  await userEvent.click(appearance);
  expect(
    (await screen.findByRole('menuitemradio', { name: 'Light' })).getAttribute(
      'aria-checked',
    ),
  ).toBe('true');
  await userEvent.click(screen.getByRole('menuitemradio', { name: 'Dark' }));
  expect(state.setTheme).toHaveBeenCalledWith('dark');
  await userEvent.click(screen.getByRole('menuitemradio', { name: 'Default' }));
  expect(state.setPreset).toHaveBeenCalledWith('default');
});
