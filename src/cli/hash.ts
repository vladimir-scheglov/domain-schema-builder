/**
 * Быстрый не-криптографический хэш (FNV-1a-подобный).
 * Используется для сравнения содержимого DSL-файла
 * и пропуска перегенерации, если ничего не изменилось.
 */
export function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}
