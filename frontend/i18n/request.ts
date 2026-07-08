import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const LOCALES = ['en','id','ar','zh','es','pt','fr','de','ja','ko','ru','tr','hi'] as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('aq_locale')?.value ?? 'en';
  const locale = (LOCALES as readonly string[]).includes(raw) ? raw : 'en';
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default as Record<string, Record<string, string>>,
  };
});
