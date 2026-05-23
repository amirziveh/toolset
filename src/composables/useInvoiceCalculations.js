import { computed } from 'vue';
import { useInvoiceStore } from '@/stores/invoice';
import { safeNum } from '@/utils/number-format';

/**
 * Composable for invoice calculation logic
 */
export function useInvoiceCalculations() {
  const store = useInvoiceStore();

  // Subtotal before any discounts (from store)
  const subtotalBeforeDiscount = computed(() => {
    return store.subtotalBeforeDiscount;
  });

  // Total item-level discounts (from store)
  const totalItemsDiscount = computed(() => {
    return store.totalItemsDiscount;
  });

  // VAT amount (from store - now calculated as sum of item taxes)
  const vatAmount = computed(() => {
    return store.vatAmount;
  });

  // Grand total (from store - now calculated from itemsTotal + otherCharges)
  const grandTotal = computed(() => {
    return store.grandTotal;
  });

  // Global discount amount (from store)
  const globalDiscountAmount = computed(() => {
    return store.globalDiscountAmount;
  });

  // Amount after item discounts but before global discount (from store)
  const afterItemsDiscount = computed(() => {
    return store.afterItemsDiscount;
  });

  // Amount after global discount (from store)
  const afterGlobalDiscount = computed(() => {
    return store.afterGlobalDiscount;
  });

  // Items total (sum of all item totals from the totals column)
  const itemsTotal = computed(() => {
    return store.itemsTotal;
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
    itemsTotal,
    recalculate,
    updateItem
  };
}