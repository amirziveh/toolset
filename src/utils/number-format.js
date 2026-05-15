/**
 * Number formatting utilities for Persian/Farsi
 */

// Currency symbols mapping
export const currencySymbols = {
  'IRR': 'ریال',
  'USD': 'دلار',
  'EUR': 'یورو',
  'GBP': 'پوند',
  'AED': 'درهم',
  'TRY': 'لیر'
};

/**
 * Format currency with locale-specific formatting
 * @param {number} n - The number to format
 * @param {string} currency - Currency code (default: 'IRR')
 * @returns {string}
 */
export function formatCurrency(n, currency = 'IRR') {
  n = Number(n) || 0;
  const sym = currencySymbols[currency] || currency;
  return n.toLocaleString('fa-IR') + ' ' + sym;
}

/**
 * Format number with Persian locale (comma separation)
 * @param {number} n - The number to format
 * @returns {string}
 */
export function formatNum(n) {
  n = Number(n) || 0;
  return n.toLocaleString('fa-IR');
}

/**
 * Format number as Toman (divide by 10)
 * @param {number} n - The number in Rial
 * @returns {string}
 */
export function formatToman(n) {
  return Number(Math.round(n / 10)).toLocaleString('fa-IR') + ' تومان';
}

/**
 * Convert number to Persian words
 * @param {number} num - The number to convert
 * @returns {string}
 */
export function numberToPersianWords(num) {
  if (num === 0) return 'صفر';
  
  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  
  function c3(n) {
    if (n === 0) return '';
    let r = '';
    if (n >= 100) {
      r += sadgan[Math.floor(n / 100)];
      n %= 100;
      if (n > 0) r += ' و ';
    }
    if (n >= 20) {
      r += dahgan[Math.floor(n / 10)];
      n %= 10;
      if (n > 0) r += ' و ';
    }
    if (n > 0 && n < 20) r += yekan[n];
    return r;
  }
  
  num = Math.floor(Math.abs(num));
  let result = '';
  
  if (num >= 1000000000) {
    result += c3(Math.floor(num / 1000000000)) + ' میلیارد';
    num %= 1000000000;
  }
  if (num >= 1000000) {
    result += (result ? ' و ' : '') + c3(Math.floor(num / 1000000)) + ' میلیون';
    num %= 1000000;
  }
  if (num >= 1000) {
    result += (result ? ' و ' : '') + c3(Math.floor(num / 1000)) + ' هزار';
    num %= 1000;
  }
  if (num > 0) {
    result += (result ? ' و ' : '') + c3(num);
  }
  
  return result + ' ریال';
}

/**
 * Convert amount to words in the specified currency
 * @param {number} num - The amount
 * @param {string} currency - Currency code
 * @returns {string}
 */
export function amountToWords(num, currency) {
  num = safeNum(num);
  if (currency === 'IRR') {
    return numberToPersianWords(num);
  } else {
    const sym = currencySymbols[currency] || currency;
    return Number(num).toLocaleString('fa-IR') + ' ' + sym;
  }
}

/**
 * Safely convert value to number
 * @param {any} val - Value to convert
 * @returns {number}
 */
export function safeNum(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Escape HTML special characters
 * @param {string} s - String to escape
 * @returns {string}
 */
export function escHtml(s) {
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

/**
 * Escape HTML and convert newlines to <br>
 * @param {string} s - String to escape
 * @returns {string}
 */
export function escAndNl(s) {
  return escHtml(s).replace(/\n/g, '<br>');
}