// Countries and regions the CRM names itself rather than by the runtime's
// own names (Intl.DisplayNames), by ISO 3166-1 code: Chinese first, English
// second, as the place search labels its matches. The pages' names in every
// language are `regionNames` in client/locales/crm/. No imports.
export const regionNames: Readonly<
  Record<string, readonly [zh: string, en: string]>
> = {
  TW: ['中国台湾', 'Taiwan, China'],
  HK: ['中国香港', 'Hong Kong, China'],
  MO: ['中国澳门', 'Macao, China'],
};
