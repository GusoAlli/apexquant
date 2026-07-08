import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['en','id','ar','zh','es','pt','fr','de','ja','ko','ru','tr','hi'];

export async function POST(req: NextRequest) {
  const body = await req.json() as { locale?: string };
  const locale = body.locale;
  if (!locale || !LOCALES.includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('aq_locale', locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });
  return res;
}
