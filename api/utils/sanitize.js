// Утилиты для санитизации данных
// Исправляет битые Unicode символы (сломанные emoji, суррогатные пары)

/**
 * Удаляет невалидные Unicode суррогатные пары из строки
 * Исправляет ошибку "no low surrogate in string"
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  // Регулярка для поиска одиночных суррогатов (без пары)
  // High surrogate: \uD800-\uDBFF
  // Low surrogate: \uDC00-\uDFFF

  // Удаляем одиночные high surrogates (без low surrogate после них)
  // Удаляем одиночные low surrogates (без high surrogate перед ними)
  return str
    // Удаляем high surrogate без следующего low surrogate
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    // Удаляем low surrogate без предшествующего high surrogate
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    // Удаляем другие проблемные символы (null bytes, etc)
    .replace(/\u0000/g, '')
    // Заменяем неразрывные пробелы на обычные
    .replace(/\u00A0/g, ' ');
}

/**
 * Рекурсивно санитизирует объект (все строковые поля)
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeObject(obj[key]);
    }
    return result;
  }

  return obj;
}

/**
 * Санитизирует JSON строку
 */
export function sanitizeJSON(jsonString) {
  if (typeof jsonString !== 'string') return jsonString;

  try {
    const parsed = JSON.parse(jsonString);
    const sanitized = sanitizeObject(parsed);
    return JSON.stringify(sanitized);
  } catch {
    // Если не парсится как JSON, санитизируем как строку
    return sanitizeString(jsonString);
  }
}

/**
 * Безопасный JSON.stringify с санитизацией
 */
export function safeStringify(obj) {
  const sanitized = sanitizeObject(obj);
  return JSON.stringify(sanitized);
}

/**
 * Безопасный JSON.parse с санитизацией входной строки
 */
export function safeParse(str) {
  if (typeof str !== 'string') return str;

  const sanitized = sanitizeString(str);
  return JSON.parse(sanitized);
}
