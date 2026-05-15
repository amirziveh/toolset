/**
 * Composable for localStorage persistence
 */

const INVOICES_KEY = 'domestic_proforma_invoices2';
const DEFAULT_SELLER_KEY = 'domestic_default_seller2';
const DARK_MODE_KEY = 'domestic_dark';

/**
 * Save invoices to localStorage
 * @param {Array} invoices - Array of invoices
 */
export function saveInvoices(invoices) {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error('Failed to save invoices:', e);
  }
}

/**
 * Load invoices from localStorage
 * @returns {Array} - Array of invoices
 */
export function loadInvoices() {
  try {
    const d = localStorage.getItem(INVOICES_KEY);
    return d ? JSON.parse(d) : [];
  } catch (e) {
    console.error('Failed to load invoices:', e);
    return [];
  }
}

/**
 * Save default seller to localStorage
 * @param {Object} seller - Seller object
 */
export function saveDefaultSeller(seller) {
  try {
    localStorage.setItem(DEFAULT_SELLER_KEY, JSON.stringify(seller));
  } catch (e) {
    console.error('Failed to save default seller:', e);
  }
}

/**
 * Load default seller from localStorage
 * @returns {Object|null} - Default seller object or null
 */
export function loadDefaultSeller() {
  try {
    const d = localStorage.getItem(DEFAULT_SELLER_KEY);
    return d ? JSON.parse(d) : null;
  } catch (e) {
    console.error('Failed to load default seller:', e);
    return null;
  }
}

/**
 * Toggle dark mode
 * @param {boolean} isDark - Whether dark mode is enabled
 */
export function setDarkMode(isDark) {
  try {
    localStorage.setItem(DARK_MODE_KEY, isDark ? '1' : '0');
  } catch (e) {
    console.error('Failed to save dark mode:', e);
  }
}

/**
 * Check if dark mode is enabled
 * @returns {boolean}
 */
export function isDarkMode() {
  try {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    console.error('Failed to check dark mode:', e);
    return false;
  }
}

/**
 * Export invoices to JSON file
 * @param {Array} invoices - Array of invoices
 */
export function exportInvoices(invoices) {
  const data = JSON.stringify(invoices, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'proforma_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import invoices from JSON file
 * @param {File} file - JSON file
 * @returns {Promise<number>} - Number of imported invoices
 */
export function importInvoices(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          reject(new Error('Invalid file format'));
          return;
        }
        // Filter valid invoices
        const validInvoices = data.filter(inv => inv.id && inv.invoiceNumber);
        resolve(validInvoices.length);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}