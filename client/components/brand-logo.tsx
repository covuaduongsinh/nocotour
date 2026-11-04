import type { ReactElement, SVGProps } from 'react';

/**
 * NocoTour Logo with Tournament & Chess identity for Duong Sinh Chess Academy.
 */
export function NocoCrmLogo(props: SVGProps<SVGSVGElement>): ReactElement {
  return (
    <div className="flex items-center gap-2 font-sans select-none" {...(props as any)}>
      <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
        🏆
      </div>
      <div className="flex items-baseline">
        <span className="font-extrabold text-lg text-foreground tracking-tight">Noco</span>
        <span className="font-light text-lg text-purple-700 ml-0.5 tracking-wide">Tour</span>
        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300">
          Tournaments
        </span>
      </div>
    </div>
  );
}
