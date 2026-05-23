<script setup>
import { useInvoiceStore } from '@/stores/invoice';
import { unitOptions } from '@/stores/invoice';
import { safeNum, formatCurrency } from '@/utils/number-format';
import { computed } from 'vue';

const store = useInvoiceStore();

// Add item
function addItem() {
  store.addItem();
}

// Remove item
function removeItem(index) {
  store.removeItem(index);
}

// Update item field
function updateItem(index, field, value) {
  store.updateItem(index, { [field]: value });
}

// Calculate item amount (after discount)
function calculateAmount(item) {
  const qty = safeNum(item.quantity);
  const price = safeNum(item.unitPrice);
  const gross = qty * price;
  
  const discPct = safeNum(item.discountPercent);
  const discAmt = safeNum(item.discountAmount);
  
  let itemDisc = 0;
  // Apply discount per unit, then multiply by quantity
  if (discPct > 0) {
    itemDisc = price * discPct / 100 * qty;
  } else if (discAmt > 0) {
    itemDisc = discAmt * qty;
  }
  
  return gross - itemDisc;
}

// Calculate item tax/fees
function calculateItemTax(item) {
  const inv = store.currentInvoice;
  if (!inv?.vatEnabled) return 0;
  
  const qty = safeNum(item.quantity);
  const price = safeNum(item.unitPrice);
  const gross = qty * price;
  
  const discPct = safeNum(item.discountPercent);
  const discAmt = safeNum(item.discountAmount);
  
  let itemDisc = 0;
  // Apply discount per unit, then multiply by quantity
  if (discPct > 0) {
    itemDisc = price * discPct / 100 * qty;
  } else if (discAmt > 0) {
    itemDisc = discAmt * qty;
  }
  
  const afterDisc = gross - itemDisc;
  const vatPct = safeNum(inv.vatPercent) || 10;
  
  if (inv.priceIncludesVat) {
    return Math.round(afterDisc * vatPct / (100 + vatPct));
  } else {
    return Math.round(afterDisc * vatPct / 100);
  }
}

// Calculate item total (amount after discount + tax)
function calculateItemTotal(item) {
  return calculateAmount(item) + calculateItemTax(item);
}

// Total sum of all item totals - use store's calculation for consistency
const itemsTotal = computed(() => {
  return store.itemsTotal;
});
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-extrabold text-sm flex items-center gap-2" style="color:var(--accent)">
        <i class="fa-solid fa-table-list"></i> اقلام کالا/خدمات
      </h3>
      <button @click="addItem" class="btn btn-primary btn-sm">
        <i class="fa-solid fa-plus"></i> افزودن ردیف
      </button>
    </div>
    <div class="items-responsive overflow-x-auto">
      <table class="w-full text-sm" style="min-width:880px">
        <thead>
          <tr style="background:var(--accent-light);border-bottom:2px solid var(--card-border)">
            <th class="p-2 text-center text-xs font-bold" style="color:var(--accent);width:30px">ردیف</th>
            <th class="p-2 text-right text-xs font-bold" style="color:var(--accent);width:200px">شرح کالا/خدمات</th>
            <th class="p-2 text-center text-xs font-bold" style="color:var(--accent);width:70px">مقدار</th>
            <th class="p-2 text-center text-xs font-bold" style="color:var(--accent);width:80px">واحد</th>
            <th class="p-2 text-center text-xs font-bold" style="color:var(--accent);width:110px">مبلغ واحد</th>
            <th class="p-2 text-center text-xs font-bold" style="color:var(--accent);width:110px">مبلغ تخفیف</th>
            <th v-if="store.currentInvoice.vatEnabled" class="p-2 text-center text-xs font-bold" style="color:var(--accent);width:115px">جمع عوارض و مالیات</th>
            <th class="p-2 text-center text-xs font-bold" style="color:var(--accent);width:30px"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in store.currentInvoice.items"
            :key="item.id"
            style="border-bottom:1px solid var(--card-border)"
          >
            <td data-label="ردیف" class="p-1.5 text-center font-bold text-xs" style="color:var(--muted)">
              {{ formatNum(index + 1) }}
            </td>
            <td data-label="شرح" class="p-1">
              <input
                :value="item.description"
                @input="store.updateItem(index, { description: $event.target.value })"
                class="input-field item-desc"
                placeholder="شرح کالا/خدمات"
              >
            </td>
            <td data-label="مقدار" class="p-1">
              <input
                type="number"
                min="0"
                step="0.01"
                :value="item.quantity"
                @input="store.updateItem(index, { quantity: parseFloat($event.target.value) || 0 })"
                class="input-field ltr text-center item-qty"
              >
            </td>
            <td data-label="واحد" class="p-1">
              <select
                :value="item.unit"
                @change="store.updateItem(index, { unit: $event.target.value })"
                class="input-field item-unit"
              >
                <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </td>
            <td data-label="مبلغ واحد" class="p-1">
              <input
                type="number"
                min="0"
                step="1"
                :value="item.unitPrice"
                @input="store.updateItem(index, { unitPrice: parseFloat($event.target.value) || 0 })"
                class="input-field ltr text-center item-price"
              >
            </td>
            <td data-label="مبلغ تخفیف" class="p-1">
              <input
                type="number"
                min="0"
                step="1"
                :value="item.discountAmount"
                @input="store.updateItem(index, { discountAmount: parseFloat($event.target.value) || 0 })"
                class="input-field ltr text-center item-disc-amt"
              >
            </td>
            <td v-if="store.currentInvoice.vatEnabled" data-label="جمع عوارض و مالیات" class="p-1.5 text-center font-bold text-xs" style="color:var(--accent)">
              {{ formatCurrency(calculateItemTax(item), store.currentInvoice.currency) }}
            </td>
            <td data-label="" class="p-1 text-center">
              <button 
                @click="removeItem(index)" 
                class="text-red-500 hover:text-red-700 transition-colors p-1" 
                title="حذف"
              >
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:var(--accent-light);border-top:2px solid var(--card-border);font-weight:bold">
            <td colspan="6" class="p-2 text-right text-sm" style="color:var(--accent)">جمع کل اقلام</td>
            <td v-if="store.currentInvoice.vatEnabled" class="p-2 text-center text-sm" style="color:var(--accent)">
              {{ formatCurrency(itemsTotal, store.currentInvoice.currency) }}
            </td>
            <td class="p-2 text-center text-sm" style="color:var(--accent)"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script>
function formatNum(n) {
  n = Number(n) || 0;
  return n.toLocaleString('fa-IR');
}
</script>