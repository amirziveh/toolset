<script setup>
import { ref, computed } from 'vue';
import { useInvoiceStore } from '@/stores/invoice';
import { formatCurrency, formatNum, currencySymbols } from '@/utils/number-format';

const emit = defineEmits(['load-invoice', 'request-delete']);

const store = useInvoiceStore();
const searchQuery = ref('');

// Filter invoices based on search
const filteredInvoices = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return store.savedInvoices.filter(inv => {
    const num = (inv.invoiceNumber || '').toLowerCase();
    const buyer = (inv.buyer?.name || '').toLowerCase();
    return num.includes(query) || buyer.includes(query);
  });
});

// Format date
function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fa-IR');
}

// Load invoice
function loadInvoice(id) {
  store.loadFromHistory(id);
  // Emit event to switch tab
  emit('load-invoice');
}

// Duplicate invoice
function duplicateInvoice(id) {
  const inv = store.savedInvoices.find(i => i.id === id);
  if (!inv) return;
  
  const dup = JSON.parse(JSON.stringify(inv));
  dup.id = 'pf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  dup.invoiceNumber = inv.invoiceNumber + '-کپی';
  dup.createdAt = Date.now();
  dup.updatedAt = Date.now();
  
  store.savedInvoices.unshift(dup);
  store.saveInvoicesToStorage();
}

// Request delete
function requestDelete(id) {
  // Emit event to show delete modal, passing the id
  emit('request-delete', id);
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h2 class="font-extrabold text-lg">پیش‌فاکتورهای ذخیره‌شده</h2>
      <div class="flex gap-2">
        <button @click="store.exportToJSON()" class="btn btn-secondary btn-sm">
          <i class="fa-solid fa-download"></i> خروجی
        </button>
        <label class="btn btn-secondary btn-sm cursor-pointer">
          <i class="fa-solid fa-upload"></i> ورودی
          <input 
            type="file" 
            accept=".json" 
            class="hidden" 
            @change="store.importFromJSON($event)"
          >
        </label>
      </div>
    </div>
    
    <div class="mb-4">
      <input 
        v-model="searchQuery"
        class="input-field" 
        placeholder="جستجو بر اساس شماره یا نام خریدار..."
      >
    </div>
    
    <div v-if="filteredInvoices.length === 0" class="card text-center py-12">
      <i class="fa-solid fa-folder-open text-4xl mb-3" style="color:var(--muted)"></i>
      <p style="color:var(--muted)">
        {{ searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز پیش‌فاکتوری ذخیره نشده' }}
      </p>
    </div>
    
    <div class="space-y-3">
      <div 
        v-for="inv in filteredInvoices" 
        :key="inv.id"
        class="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="font-extrabold" style="color:var(--accent)">
              {{ inv.invoiceNumber }}
            </span>
            <span class="text-xs px-2 py-0.5 rounded-full" style="background:var(--accent-light);color:var(--accent)">
              {{ formatDate(inv.createdAt) }}
            </span>
            <span class="text-xs px-2 py-0.5 rounded-full" style="background:var(--input-bg);color:var(--muted)">
              {{ currencySymbols[inv.currency] || inv.currency }}
            </span>
          </div>
          <p class="text-sm font-semibold truncate">
            {{ inv.buyer?.name || 'بدون نام' }}
          </p>
          <p class="text-xs" style="color:var(--muted)">
            {{ inv.items ? inv.items.length : 0 }} قلم &middot; 
            {{ formatCurrency(
              inv.items ? inv.items.reduce((s, it) => s + Number(it.amount || 0), 0) : 0,
              inv.currency
            ) }}
          </p>
        </div>
        <div class="flex gap-2 flex-shrink-0 w-full sm:w-auto">
          <button 
            @click="loadInvoice(inv.id)" 
            class="btn btn-primary btn-sm flex-1 sm:flex-none justify-center"
          >
            <i class="fa-solid fa-folder-open"></i>
            <span class="sm:hidden">بارگذاری</span>
          </button>
          <button 
            @click="duplicateInvoice(inv.id)" 
            class="btn btn-secondary btn-sm"
          >
            <i class="fa-solid fa-copy"></i>
          </button>
          <button 
            @click="requestDelete(inv.id)" 
            class="btn btn-danger btn-sm"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>