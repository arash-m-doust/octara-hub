export function isRTL(lang: string): boolean {
  return lang === 'fa' || lang === 'ar' || lang === 'he'
}

export function getDirection(lang: string): 'rtl' | 'ltr' {
  return isRTL(lang) ? 'rtl' : 'ltr'
}
