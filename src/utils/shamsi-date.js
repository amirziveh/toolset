/**
 * Shamsi (Persian calendar) date conversion utilities
 */

/**
 * Convert Gregorian date to Shamsi (Persian) date
 * @param {number} gy - Gregorian year
 * @param {number} gm - Gregorian month (1-12)
 * @param {number} gd - Gregorian day (1-31)
 * @returns {{jy: number, jm: number, jd: number}} - Shamsi year, month, day
 */
export function gregorianToShamsi(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Get today's date in Shamsi format
 * @returns {string} - Shamsi date in YYYY/MM/DD format
 */
export function getTodayShamsi() {
  const d = new Date();
  const s = gregorianToShamsi(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return s.jy + '/' + String(s.jm).padStart(2, '0') + '/' + String(s.jd).padStart(2, '0');
}

/**
 * Get current time in HH:MM format
 * @returns {string} - Current time
 */
export function getCurrentTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/**
 * Add days to a Shamsi date
 * @param {string} dateStr - Shamsi date in YYYY/MM/DD format
 * @param {number} days - Number of days to add
 * @returns {string} - New Shamsi date in YYYY/MM/DD format
 */
export function addShamsiDays(dateStr, days) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let d = parseInt(parts[2], 10);
  
  d += days;
  const monthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  
  while (m <= 12 && d > monthDays[m - 1]) {
    d -= monthDays[m - 1];
    m++;
    if (m > 12) {
      m = 1;
      y++;
      // Update leap year day count
      monthDays[11] = (y % 4 === 3) ? 30 : 29;
    }
  }
  
  return y + '/' + String(m).padStart(2, '0') + '/' + String(d).padStart(2, '0');
}

/**
 * Check if a Shamsi year is a leap year
 * @param {number} year - Shamsi year
 * @returns {boolean}
 */
export function isShamsiLeapYear(year) {
  return year % 4 === 3;
}

/**
 * Get the number of days in a Shamsi month
 * @param {number} year - Shamsi year
 * @param {number} month - Shamsi month (1-12)
 * @returns {number}
 */
export function getDaysInShamsiMonth(year, month) {
  const days = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  if (month === 12 && isShamsiLeapYear(year)) {
    return 30;
  }
  return days[month - 1];
}

/**
 * Format a Shamsi date for display
 * @param {string} dateStr - Shamsi date in YYYY/MM/DD format
 * @returns {string}
 */
export function formatShamsiDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}