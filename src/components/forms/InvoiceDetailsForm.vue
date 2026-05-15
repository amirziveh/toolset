<script setup>
import { useInvoiceStore } from '@/stores/invoice';
import { getTodayShamsi, getCurrentTime, addShamsiDays } from '@/utils/shamsi-date';

const store = useInvoiceStore();

// Initialize dates on mount
const initDates = () => {
  if (!store.currentInvoice.invoiceDate) {
    store.currentInvoice.invoiceDate = getTodayShamsi();
  }
  if (!store.currentInvoice.invoiceTime) {
    store.currentInvoice.invoiceTime = getCurrentTime();
  }
  if (!store.currentInvoice.validityDate) {
    store.currentInvoice.validityDate = addShamsiDays(getTodayShamsi(), 30);
  }
};

initDates();
</script>

<template>
  <div class="card">
    <h3 class="font-extrabold text-sm mb-3 flex items-center gap-2" style="color:var(--accent)">
      <i class="fa-solid fa-hashtag"></i> جزئیات پیش‌فاکتور
    </h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="field-label">شماره پیش‌فاکتور</label>
        <input 
          v-model="store.currentInvoice.invoiceNumber" 
          class="input-field ltr" 
          placeholder="PF-1403-001"
        >
      </div>
      <div>
        <label class="field-label">تاریخ و ساعت صدور</label>
        <div class="flex gap-1.5">
          <input 
            v-model="store.currentInvoice.invoiceDate" 
            class="input-field ltr flex-1 min-w-[130px]"
          >
          <input 
            v-model="store.currentInvoice.invoiceTime" 
            type="time" 
            class="input-field ltr w-28 flex-shrink-0"
          >
        </div>
      </div>
      <div>
        <label class="field-label">تاریخ و ساعت اعتبار</label>
        <div class="flex gap-1.5">
          <input 
            v-model="store.currentInvoice.validityDate" 
            class="input-field ltr flex-1 min-w-[130px]"
          >
          <input 
            v-model="store.currentInvoice.validityTime" 
            type="time" 
            class="input-field ltr w-28 flex-shrink-0"
          >
        </div>
      </div>
    </div>
  </div>
</template>