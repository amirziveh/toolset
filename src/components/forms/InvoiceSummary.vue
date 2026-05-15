<script setup>
import { useInvoiceStore } from '@/stores/invoice';
import { formatCurrency, formatNum, formatToman, amountToWords, safeNum, currencySymbols } from '@/utils/number-format';

const store = useInvoiceStore();

// Get currency symbol
function getCurrencySymbol(currency) {
  return currencySymbols[currency] || currency;
}
</script>

<template>
  <div class="card">
    <h3 class="font-extrabold text-sm mb-3 flex items-center gap-2" style="color:var(--accent)">
      <i class="fa-solid fa-calculator"></i> جمع‌بندی
    </h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="space-y-2">
        <div class="total-row" style="background:var(--input-bg)">
          <span>جمع کل اقلام (قبل از تخفیف)</span>
          <span class="font-bold" style="color:var(--accent)">
            {{ formatCurrency(store.subtotalBeforeDiscount, store.currentInvoice.currency) }}
          </span>
        </div>
        
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-sm font-semibold whitespace-nowrap">تخفیف کلی (درصد)</label>
          <input 
            id="f-discountPercent" 
            type="number" 
            min="0" 
            max="100" 
            step="0.1" 
            class="input-field ltr" 
            style="width:65px" 
            :value="store.currentInvoice.discountPercent"
            @input="store.recalculate()"
          >
          <span class="text-sm">درصد</span>
          <span class="text-sm font-bold" style="color:#DC2626">
            = {{ formatCurrency(store.globalDiscountAmount, store.currentInvoice.currency) }}
          </span>
        </div>
        
        <div class="total-row" style="background:var(--input-bg)">
          <span>مبلغ پس از تخفیف کلی</span>
          <span class="font-bold">
            {{ formatCurrency(store.afterGlobalDiscount, store.currentInvoice.currency) }}
          </span>
        </div>

        <!-- VAT Section -->
        <div class="p-3 rounded-lg" style="background:var(--input-bg)">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  id="f-vatEnabled" 
                  :checked="store.currentInvoice.vatEnabled"
                  @change="store.recalculate()"
                >
                <span class="toggle-slider"></span>
              </label>
              <span class="text-sm font-semibold">مالیات بر ارزش افزوده</span>
            </div>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <label class="text-xs whitespace-nowrap">درصد:</label>
            <input 
              id="f-vatPercent" 
              type="number" 
              min="0" 
              max="100" 
              step="0.1" 
              class="input-field ltr" 
              style="width:65px" 
              :value="store.currentInvoice.vatPercent"
              @input="store.recalculate()"
            >
            <span class="text-xs">٪</span>
          </div>
          <div class="flex items-center gap-2">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                id="f-priceIncludesVat" 
                :checked="store.currentInvoice.priceIncludesVat"
                @change="store.recalculate()"
              >
              <span class="toggle-slider"></span>
            </label>
            <span class="text-xs">قیمت‌ها شامل مالیات است</span>
          </div>
          <div class="mt-2 flex justify-between">
            <span class="text-xs font-semibold">مبلغ مالیات:</span>
            <span class="text-sm font-bold" style="color:#7C3AED">
              {{ formatCurrency(store.vatAmount, store.currentInvoice.currency) }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-sm font-semibold whitespace-nowrap">سایر هزینه‌ها</label>
          <input 
            id="f-otherCharges" 
            type="number" 
            min="0" 
            class="input-field ltr" 
            style="width:120px" 
            :value="store.currentInvoice.otherCharges"
            @input="store.recalculate()"
          >
          <span class="text-sm" id="other-charges-currency">
            {{ getCurrencySymbol(store.currentInvoice.currency) }}
          </span>
        </div>
        
        <div class="total-row highlight">
          <span>جمع کل</span>
          <span class="text-sm">{{ formatCurrency(store.grandTotal, store.currentInvoice.currency) }}</span>
        </div>
      </div>
      <div class="space-y-3">
        <div>
          <label class="field-label">واحد پول</label>
          <select 
            id="f-currency" 
            class="input-field" 
            :value="store.currentInvoice.currency"
            @change="store.recalculate()"
          >
            <option value="IRR">ریال ایران</option>
            <option value="USD">دلار آمریکا</option>
            <option value="EUR">یورو</option>
            <option value="GBP">پوند انگلیس</option>
            <option value="AED">درهم امارات</option>
            <option value="TRY">لیر ترکیه</option>
          </select>
        </div>
        <div class="p-3 rounded-lg" style="background:var(--input-bg)">
          <label class="field-label">مبلغ به حروف</label>
          <p class="text-sm font-bold mt-1" style="color:var(--accent)">
            {{ amountToWords(store.grandTotal, store.currentInvoice.currency) }}
          </p>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg" style="background:var(--input-bg)">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              id="f-showToman" 
              :checked="store.currentInvoice.showToman"
              @change="store.recalculate()"
            >
            <span class="toggle-slider"></span>
          </label>
          <div>
            <p class="text-sm font-semibold">نمایش معادل تومانی</p>
            <p v-if="store.currentInvoice.showToman" class="text-xs" style="color:var(--muted)">
              {{ formatToman(store.grandTotal) }}
            </p>
          </div>
        </div>
        <div class="p-3 rounded-lg" style="background:var(--input-bg)">
          <div class="flex justify-between">
            <span class="text-xs font-semibold">جمع تخفیف‌های اقلام:</span>
            <span class="text-sm font-bold" style="color:#DC2626">
              {{ formatCurrency(store.totalItemsDiscount, store.currentInvoice.currency) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .5rem .75rem;
  border-radius: 8px;
  font-size: .85rem;
}

.total-row.highlight {
  background: var(--accent);
  color: #fff;
  font-weight: 800;
  font-size: 1rem;
}

.toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;
  cursor: pointer;
  display: inline-block;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--input-border);
  border-radius: 11px;
  transition: .3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  right: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: .3s;
}

.toggle-switch input:checked+.toggle-slider {
  background: var(--accent);
}

.toggle-switch input:checked+.toggle-slider::before {
  transform: translateX(-18px);
}
</style>