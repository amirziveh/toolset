import { computed } from 'vue';
import { useInvoiceStore } from '@/stores/invoice';
import { safeNum } from '@/utils/number-format';

/**
 * Composable for invoice calculation logic
 */
export function useInvoiceCalculations() {
  const store = useInvoiceStore();

  // Subtotal before any discounts
  const subtotalBeforeDiscount = computed(() => {
    if (!store.currentInvoice?.items) return 0;
    return store.currentInvoice.items.reduce((sum, item) => {
      return sum + (safeNum(item.quantity) * safeNum(item.unitPrice));
    }, 0);
  });

  // Total item-level discounts
  const totalItemsDiscount = computed(() => {
    if (!store.currentInvoice?.items) return 0;
    return store.currentInvoice.items.reduce((sum, item) => {
      const gross = safeNum(item.quantity) * safeNum(item.unitPrice);
      const discPct = safeNum(item.discountPercent);
      const discAmt = safeNum(item.discountAmount);
      let itemDisc = 0;
      if (discPct > 0) itemDisc = gross * discPct / 100;
      else if (discAmt > 0) itemDisc = discAmt;
      return sum + itemDisc;
    }, 0);
  });

  // VAT amount
  const vatAmount = computed(() => {
    const inv = store.currentInvoice;
    if (!inv?.vatEnabled) return 0;

    const subtotal = subtotalBeforeDiscount.value;
    const itemsDisc = totalItemsDiscount.value;
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
  });

  // Grand total
  const grandTotal = computed(() => {
    const inv = store.currentInvoice;
    if (!inv) return 0;

    const subtotal = subtotalBeforeDiscount.value;
    const itemsDisc = totalItemsDiscount.value;
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
  });

  // Global discount amount
  const globalDiscountAmount = computed(() => {
    const subtotal = subtotalBeforeDiscount.value;
    const itemsDisc = totalItemsDiscount.value;
    const afterItemsDisc = subtotal - itemsDisc;
    const globalDisc = safeNum(store.currentInvoice?.discountPercent);
    return Math.round(afterItemsDisc * globalDisc / 100);
  });

  // Amount after item discounts but before global discount
  const afterItemsDiscount = computed(() => {
    const subtotal = subtotalBeforeDiscount.value;
    const itemsDisc = totalItemsDiscount.value;
    return subtotal - itemsDisc;
  });

  // Amount after global discount
  const afterGlobalDiscount = computed(() => {
    const afterItems = afterItemsDiscount.value;
    const globalDiscAmt = globalDiscountAmount.value;
    return afterItems - globalDiscAmt;
  });

  // Recalculate function
  const recalculate = () => {
    store.recalculate();
  };

  // Update a single item
  const updateItem = (index, updates) => {
    store.updateItem(index, updates);
  };

  return {
    subtotalBeforeDiscount,
    totalItemsDiscount,
    vatAmount,
    grandTotal,
    globalDiscountAmount,
    afterItemsDiscount,
    afterGlobalDiscount,
    recalculate,
    updateItem
  };
}