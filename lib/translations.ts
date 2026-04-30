import uz from '@/locales/uz.json';
import ru from '@/locales/ru.json';
import en from '@/locales/en.json';
import kr from '@/locales/kr.json';

export type Language = 'uz' | 'ru' | 'en' | 'kr';

type LangMap = Record<Language, string>;

export type Translations = Record<string, LangMap>;

const ALL_LANG: Language[] = ['uz', 'ru', 'en', 'kr'];

function buildTranslations(): Translations {
  const keys = new Set<string>([
    ...Object.keys(uz),
    ...Object.keys(ru),
    ...Object.keys(en),
    ...Object.keys(kr),
  ]);
  const out: Translations = {};
  const Uz = uz as Record<string, string>;
  const Ru = ru as Record<string, string>;
  const En = en as Record<string, string>;
  const Kr = kr as Record<string, string>;
  for (const key of Array.from(keys)) {
    out[key] = {
      uz: Uz[key] ?? En[key] ?? key,
      ru: Ru[key] ?? Uz[key] ?? key,
      en: En[key] ?? Uz[key] ?? key,
      kr: Kr[key] ?? Uz[key] ?? key,
    };
  }
  return out;
}

export const translations: Translations = buildTranslations();

export function isValidLanguage(code: string | null | undefined): code is Language {
  return code != null && (ALL_LANG as string[]).includes(code);
}

export function t(key: string, lang: Language = 'uz'): string {
  return translations[key]?.[lang] || key;
}
