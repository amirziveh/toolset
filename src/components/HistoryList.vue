<script setup>
import { ref, computed } from 'vue';
import { useInvoiceStore } from '@/stores/invoice';
import { formatCurrency, formatNum, currencySymbols } from '@/utils/number-format';
import { exportInvoices, importInvoices } from '@/composables/useLocalStorage';

const sortKey = ref('');
const sortOrder = ref(1); // 1 = asc, -1 = desc

function setSort(key) {
  if (sortKey.value === key) {
    sortOrder.value *= -1;
  } else {
    sortKey.value = key;
    sortOrder.value = 1;
  }
}

function sortIcon(key) {
  if (sortKey.value !== key) return 'fa-solid fa-sort';
  return sortOrder.value === 1 ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
}

const emit = defineEmits(['load-invoice', 'request-delete']);

const store = useInvoiceStore();
const searchQuery = ref('');

function getTotalQty(items) {
  if (!items || items.length === 0) return 0;
  return items.reduce((s, it) => s + Number(it.quantity || 0), 0);
}

function getSortValue(inv, key) {
  switch (key) {
    case 'invoiceNumber': return (inv.invoiceNumber || '').toLowerCase();
    case 'createdAt': return inv.createdAt || 0;
    case 'seller': return (inv.seller?.name || '').toLowerCase();
    case 'buyer': return (inv.buyer?.name || '').toLowerCase();
    case 'qty': return getTotalQty(inv.items);
    case 'total': return (inv.items || []).reduce((s, it) => s + Number(it.amount || 0), 0);
    default: return '';
  }
}

const sortedInvoices = computed(() => {
  let list = [...store.savedInvoices];
  if (sortKey.value) {
    list.sort((a, b) => {
      const va = getSortValue(a, sortKey.value);
      const vb = getSortValue(b, sortKey.value);
      if (typeof va === 'number') return (va - vb) * sortOrder.value;
      return String(va).localeCompare(String(vb)) * sortOrder.value;
    });
  }
  return list;
});

const filteredInvoices = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return sortedInvoices.value.filter(inv => {
    const num = (inv.invoiceNumber || '').toLowerCase();
    const buyer = (inv.buyer?.name || '').toLowerCase();
    const seller = (inv.seller?.name || '').toLowerCase();
    return num.includes(query) || buyer.includes(query) || seller.includes(query);
  });
});

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fa-IR');
}

function getItemsSummary(items) {
  if (!items || items.length === 0) return '—';
  return items
    .filter(it => it.description)
    .map(it => it.description)
    .join('، ');
}

function calcTotal(items, currency) {
  if (!items) return formatNum(0);
  const total = items.reduce((s, it) => s + Number(it.amount || 0), 0);
  return formatNum(total);
}

function loadInvoice(id) {
  store.loadFromHistory(id);
  emit('load-invoice');
}

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

function requestDelete(id) {
  emit('request-delete', id);
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!Array.isArray(parsed)) throw new Error('Invalid format');
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
    let count = 0;
    data.forEach(inv => {
      if (inv.id && inv.invoiceNumber) {
        if (!store.savedInvoices.find(s => s.id === inv.id)) {
          store.savedInvoices.push(inv);
          count++;
        }
      }
    });
    store.saveInvoicesToStorage();
    if (count > 0) {
      alert(`${count} پیش‌فاکتور با موفقیت وارد شد`);
    } else {
      alert('هیچ پیش‌فاکتور جدیدی یافت نشد');
    }
  } catch (e) {
    alert('خطا در وارد کردن فایل: ' + e.message);
  }
  event.target.value = '';
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h2 class="font-extrabold text-lg">پیش‌فاکتورهای ذخیره‌شده</h2>
      <div class="flex gap-2">
        <button @click="exportInvoices(store.savedInvoices)" class="btn btn-secondary btn-sm">
          <i class="fa-solid fa-download"></i> خروجی
        </button>
        <label class="btn btn-secondary btn-sm cursor-pointer">
          <i class="fa-solid fa-upload"></i> ورودی
          <input
            type="file"
            accept=".json"
            class="hidden"
            @change="handleImport($event)"
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

    <div v-else class="overflow-x-auto rounded-lg" style="border:1px solid var(--card-border)">
      <table class="w-full text-sm hist-table" style="border-collapse:collapse">
        <thead>
          <tr style="background:var(--input-bg);border-bottom:2px solid var(--card-border)">
            <th class="px-2 py-2.5 text-right font-extrabold">#</th>
            <th class="px-2 py-2.5 text-right font-extrabold sortable-th" @click="setSort('invoiceNumber')">
              شماره <i :class="sortIcon('invoiceNumber')"></i>
            </th>
            <th class="px-2 py-2.5 text-right font-extrabold sortable-th" @click="setSort('createdAt')">
              تاریخ <i :class="sortIcon('createdAt')"></i>
            </th>
            <th class="px-2 py-2.5 text-right font-extrabold sortable-th" @click="setSort('seller')">
              فروشنده <i :class="sortIcon('seller')"></i>
            </th>
            <th class="px-2 py-2.5 text-right font-extrabold sortable-th" @click="setSort('buyer')">
              خریدار <i :class="sortIcon('buyer')"></i>
            </th>
            <th class="px-2 py-2.5 text-right font-extrabold">کالا/خدمات</th>
            <th class="px-2 py-2.5 text-center font-extrabold sortable-th" @click="setSort('qty')">
              تعداد <i :class="sortIcon('qty')"></i>
            </th>
            <th class="px-2 py-2.5 text-left font-extrabold sortable-th" @click="setSort('total')">
              مبلغ کل <i :class="sortIcon('total')"></i>
            </th>
            <th class="px-2 py-2.5 text-center font-extrabold">عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(inv, i) in filteredInvoices"
            :key="inv.id"
            style="border-bottom:1px solid var(--card-border)"
            class="hover-row"
          >
            <td class="px-2 py-2.5 text-right" style="color:var(--muted)">{{ i + 1 }}</td>
            <td class="px-2 py-2.5 text-right font-semibold whitespace-nowrap" style="color:var(--accent)">
              {{ inv.invoiceNumber }}
            </td>
            <td class="px-2 py-2.5 text-right whitespace-nowrap">{{ formatDate(inv.createdAt) }}</td>
            <td class="px-2 py-2.5 text-right truncate max-w-[100px]">{{ inv.seller?.name || '—' }}</td>
            <td class="px-2 py-2.5 text-right truncate max-w-[100px]">{{ inv.buyer?.name || '—' }}</td>
            <td class="px-2 py-2.5 text-right truncate max-w-[150px]" style="color:var(--muted)">
              {{ getItemsSummary(inv.items) }}
            </td>
            <td class="px-2 py-2.5 text-center whitespace-nowrap">
              {{ formatNum(getTotalQty(inv.items)) }}
            </td>
            <td class="px-2 py-2.5 text-left whitespace-nowrap">
              {{ calcTotal(inv.items, inv.currency) }}
            </td>
            <td class="px-2 py-2.5 text-center">
              <div class="flex gap-1 justify-center">
                <button @click="loadInvoice(inv.id)" class="btn btn-primary btn-xs" title="بارگذاری">
                  <i class="fa-solid fa-folder-open"></i>
                </button>
                <button @click="duplicateInvoice(inv.id)" class="btn btn-secondary btn-xs" title="کپی">
                  <i class="fa-solid fa-copy"></i>
                </button>
                <button @click="requestDelete(inv.id)" class="btn btn-danger btn-xs" title="حذف">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.hover-row:hover {
  background: var(--accent-light);
}
.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
.hist-table th,
.hist-table td {
  border: 1px solid var(--card-border);
}
.sortable-th {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.sortable-th:hover {
  opacity: 0.8;
}
.sortable-th i {
  margin-right: 4px;
  font-size: 0.7rem;
}
</style>