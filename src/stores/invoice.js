import { defineStore } from 'pinia';
import { 
  gregorianToShamsi, 
  getTodayShamsi, 
  getCurrentTime, 
  addShamsiDays 
} from '@/utils/shamsi-date';
import { 
  formatCurrency, 
  formatNum, 
  formatToman, 
  numberToPersianWords, 
  amountToWords, 
  safeNum,
  currencySymbols
} from '@/utils/number-format';

// Unit options for items
export const unitOptions = [
  'عدد', 'کیلوگرم', 'تن', 'متر', 'متر مربع', 'متر مکعب', 
  'لیتر', 'کارتن', 'بسته', 'رول', 'دستگاه', 'جفت', 
  'ساعت', 'خدمت', 'پروژه', 'کیلومتر', 'تن معدنی'
];

// Default invoice state
const defaultInvoice = {
  seller: {
    name: '',
    address: '',
    regNo: '',
    economicCode: '',
    nationalId: '',
    tel: '',
    fax: '',
    logoImage: '',
    logoColor: ''
  },
  buyer: {
    name: '',
    address: '',
    regNo: '',
    economicCode: '',
    nationalId: '',
    postalCode: '',
    tel: ''
  },
  invoiceNumber: '',
  invoiceDate: '',
  invoiceTime: '',
  validityDate: '',
  validityTime: '',
  items: [{
    id: Date.now().toString(),
    description: '',
    unit: 'عدد',
    quantity: 0,
    tolerancePercent: 0,
    toleranceQty: 0,
    unitPrice: 0,
    amount: 0,
    discountPercent: 0,
    discountAmount: 0
  }],
  discountPercent: 0,
  vatEnabled: true,
  vatPercent: 10,
  priceIncludesVat: false,
  otherCharges: 0,
  paymentTerms: '',
  deliveryTerms: '',
  description: '',
  additionalDescription: '',
  signatureImage: '',
  showToman: true,
  currency: 'IRR',
  showSellerNameLogo: true
};

export const useInvoiceStore = defineStore('invoice', {
  state: () => ({
      currentInvoice: JSON.parse(JSON.stringify(defaultInvoice)),
      savedInvoices: [],
      deleteTargetId: null
    }),

  getters: {
    subtotalBeforeDiscount: (state) => {
      if (!state.currentInvoice?.items) return 0;
      return state.currentInvoice.items.reduce((sum, item) => {
        return sum + (safeNum(item.quantity) * safeNum(item.unitPrice));
      }, 0);
    },
    
    totalItemsDiscount: (state) => {
      if (!state.currentInvoice?.items) return 0;
      return state.currentInvoice.items.reduce((sum, item) => {
        const gross = safeNum(item.quantity) * safeNum(item.unitPrice);
        const discPct = safeNum(item.discountPercent);
        const discAmt = safeNum(item.discountAmount);
        let itemDisc = 0;
        if (discPct > 0) itemDisc = gross * discPct / 100;
        else if (discAmt > 0) itemDisc = discAmt;
        return sum + itemDisc;
      }, 0);
    },
    
    // Global discount amount
    globalDiscountAmount: (state) => {
      const subtotal = state.subtotalBeforeDiscount;
      const itemsDisc = state.totalItemsDiscount;
      const afterItemsDisc = subtotal - itemsDisc;
      const globalDisc = safeNum(state.currentInvoice?.discountPercent);
      return Math.round(afterItemsDisc * globalDisc / 100);
    },
    
    // Amount after item discounts but before global discount
    afterItemsDiscount: (state) => {
      const subtotal = state.subtotalBeforeDiscount;
      const itemsDisc = state.totalItemsDiscount;
      return subtotal - itemsDisc;
    },
    
    // Amount after global discount
    afterGlobalDiscount: (state) => {
      const afterItems = state.afterItemsDiscount;
      const globalDiscAmt = state.globalDiscountAmount;
      return afterItems - globalDiscAmt;
    },
    
    grandTotal: (state) => {
      const inv = state.currentInvoice;
      if (!inv) return 0;
      
      const subtotal = state.subtotalBeforeDiscount;
      const itemsDisc = state.totalItemsDiscount;
      const afterItemsDisc = subtotal - itemsDisc;
      const globalDisc = safeNum(inv.discountPercent);
      const globalDiscAmt = Math.round(afterItemsDisc * globalDisc / 100);
      const afterGlobalDisc = afterItemsDisc - globalDiscAmt;
      
      const vatPct = safeNum(inv.vatPercent) || 10;
      let vat = 0;
      if (inv.vatEnabled) {
        if (inv.priceIncludesVat) {
          vat = Math.round(afterGlobalDisc * vatPct / (100 + vatPct));
        } else {
          vat = Math.round(afterGlobalDisc * vatPct / 100);
        }
      }
      
      const other = safeNum(inv.otherCharges);
      let total;
      if (inv.priceIncludesVat) {
        total = afterGlobalDisc + other;
      } else {
        total = afterGlobalDisc + vat + other;
      }
      
      return total;
    },
    
    vatAmount: (state) => {
      const inv = state.currentInvoice;
      if (!inv?.vatEnabled) return 0;
      
      const subtotal = state.subtotalBeforeDiscount;
      const itemsDisc = state.totalItemsDiscount;
      const afterItemsDisc = subtotal - itemsDisc;
      const globalDisc = safeNum(inv.discountPercent);
      const globalDiscAmt = Math.round(afterItemsDisc * globalDisc / 100);
      const afterGlobalDisc = afterItemsDisc - globalDiscAmt;
      
      const vatPct = safeNum(inv.vatPercent) || 10;
      if (inv.priceIncludesVat) {
        return Math.round(afterGlobalDisc * vatPct / (100 + vatPct));
      } else {
        return Math.round(afterGlobalDisc * vatPct / 100);
      }
    }
  },

  actions: {
    // Initialize with a new invoice
    initInvoice() {
      this.currentInvoice = JSON.parse(JSON.stringify(defaultInvoice));
      const ds = this.loadDefaultSeller();
      if (ds) this.currentInvoice.seller = ds;
      const count = this.savedInvoices.length + 1;
      this.currentInvoice.invoiceNumber = 'PF-' + getTodayShamsi().slice(0, 7).replace('/', '') + '-' + String(count).padStart(3, '0');
      this.currentInvoice.invoiceDate = getTodayShamsi();
      this.currentInvoice.invoiceTime = getCurrentTime();
      this.currentInvoice.validityDate = addShamsiDays(getTodayShamsi(), 30);
      this.currentInvoice.validityTime = '';
      // Ensure all items have unique IDs
      this.currentInvoice.items.forEach(item => {
        if (!item.id) {
          item.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        }
      });
    },

    // Recalculate all totals
    recalculate() {
      if (!this.currentInvoice) return;
      
      // Sync form values to state
      const discPct = safeNum(document.getElementById('f-discountPercent')?.value);
      const vatEnabled = document.getElementById('f-vatEnabled')?.checked ?? true;
      const vatPct = safeNum(document.getElementById('f-vatPercent')?.value) || 10;
      const priceIncludesVat = document.getElementById('f-priceIncludesVat')?.checked ?? false;
      const other = safeNum(document.getElementById('f-otherCharges')?.value);
      
      this.currentInvoice.discountPercent = discPct;
      this.currentInvoice.otherCharges = other;
      this.currentInvoice.vatEnabled = vatEnabled;
      this.currentInvoice.vatPercent = vatPct;
      this.currentInvoice.priceIncludesVat = priceIncludesVat;
    },

    // Add a new item
    addItem() {
      if (!this.currentInvoice) return;
      this.currentInvoice.items.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        description: '',
        unit: 'عدد',
        quantity: 0,
        tolerancePercent: 0,
        toleranceQty: 0,
        unitPrice: 0,
        amount: 0,
        discountPercent: 0,
        discountAmount: 0
      });
    },

    // Update item fields
    updateItem(index, updates) {
      if (!this.currentInvoice?.items[index]) return;
      Object.assign(this.currentInvoice.items[index], updates);
    },

    // Remove an item
    removeItem(idx) {
      if (!this.currentInvoice) return;
      if (this.currentInvoice.items.length <= 1) return;
      this.currentInvoice.items.splice(idx, 1);
    },

    // Save to history
    saveToHistory() {
      if (!this.currentInvoice) return;
      const existing = this.savedInvoices.find(inv => inv.id === this.currentInvoice.id);
      if (existing) {
        Object.assign(existing, JSON.parse(JSON.stringify(this.currentInvoice)));
        existing.updatedAt = Date.now();
      } else {
        this.currentInvoice.id = 'pf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.currentInvoice.createdAt = Date.now();
        this.currentInvoice.updatedAt = Date.now();
        this.savedInvoices.unshift(JSON.parse(JSON.stringify(this.currentInvoice)));
      }
      this.saveInvoicesToStorage();
    },

    // Load from history
    loadFromHistory(id) {
      const inv = this.savedInvoices.find(i => i.id === id);
      if (!inv) return null;
      this.currentInvoice = JSON.parse(JSON.stringify(inv));
      return this.currentInvoice;
    },

    // Delete from history
    deleteFromHistory(id) {
      this.savedInvoices = this.savedInvoices.filter(i => i.id !== id);
      this.saveInvoicesToStorage();
    },

    // Export to JSON
    exportToJSON() {
      return JSON.stringify(this.savedInvoices, null, 2);
    },

    // Import from JSON
    importFromJSON(json) {
      try {
        const data = JSON.parse(json);
        if (!Array.isArray(data)) return false;
        let count = 0;
        data.forEach(inv => {
          if (inv.id && inv.invoiceNumber) {
            if (!this.savedInvoices.find(s => s.id === inv.id)) {
              this.savedInvoices.push(inv);
              count++;
            }
          }
        });
        this.saveInvoicesToStorage();
        return count;
      } catch (e) {
        return 0;
      }
    },

    // Toggle theme
    toggleTheme() {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('domestic_dark', '0');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('domestic_dark', '1');
      }
    },

    // Initialize dark mode from storage
    initDarkMode() {
      const saved = localStorage.getItem('domestic_dark');
      if (saved === '1' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    },

    // Save default seller
    saveDefaultSeller() {
      if (!this.currentInvoice?.seller) return;
      localStorage.setItem('domestic_default_seller2', JSON.stringify(this.currentInvoice.seller));
    },

    // Load default seller
    loadDefaultSeller() {
      try {
        const d = localStorage.getItem('domestic_default_seller2');
        return d ? JSON.parse(d) : null;
      } catch (e) {
        return null;
      }
    },

    // Save invoices to localStorage
    saveInvoicesToStorage() {
      try {
        localStorage.setItem('domestic_proforma_invoices2', JSON.stringify(this.savedInvoices));
      } catch (e) {
        console.error('Failed to save invoices:', e);
      }
    },

    // Load invoices from localStorage
    loadSavedInvoices() {
      try {
        const d = localStorage.getItem('domestic_proforma_invoices2');
        this.savedInvoices = d ? JSON.parse(d) : [];
      } catch (e) {
        this.savedInvoices = [];
      }
    },

    // Generate invoice number
    generateInvoiceNumber() {
      const count = this.savedInvoices.length + 1;
      return 'PF-' + getTodayShamsi().slice(0, 7).replace('/', '') + '-' + String(count).padStart(3, '0');
    },

    // Format currency helper
    formatCurrency(n, currency = 'IRR') {
      return formatCurrency(n, currency);
    },

    // Format number helper
    formatNum(n) {
      return formatNum(n);
    },

    // Format toman helper
    formatToman(n) {
      return formatToman(n);
    },

    // Number to words helper
    numberToWords(num) {
      return numberToPersianWords(num);
    },

    // Amount to words helper
    amountToWords(num, currency) {
      return amountToWords(num, currency);
    },

    // Get currency symbol
    getCurrencySymbol(currency) {
      return currencySymbols[currency] || currency;
    },

    // Update additional description
    updateAdditionalDescription(html) {
      if (!this.currentInvoice) return;
      this.currentInvoice.additionalDescription = html;
    }
  }
});