import type { ReactElement } from 'react';
import { DemoModeMenu } from '@nocobase/app-plugin-demo-mode/client/menu';
import { TooltipProvider } from '#components/ui/tooltip';

import { AssistantHeaderButton } from '../../components/crm/assistant-header-button.js';
import { UserMenu } from './user-menu.js';

/**
 * The header's right-hand actions, shared by every authenticated page.
 * Application change: the CRM's assistant leads them, reachable from every
 * page, the ones without the floating dock included (assistant-header-button.tsx).
 * The template's appearance button is not among them: the colour mode and
 * theme are in the account menu (appearance-menu.tsx), leaving the phone's
 * header room for the whole brand.
 */
export function HeaderActions(): ReactElement {
  return (
    <TooltipProvider>
      <div className='flex shrink-0 items-center gap-2'>
        {/* Application change: the plugin's standalone demo entry belongs
            before the assistant and account controls. */}
        <DemoModeMenu />
        <AssistantHeaderButton />
        <UserMenu />
      </div>
    </TooltipProvider>
  );
}
