<script setup>
import { ref, computed, onMounted } from 'vue';
import { useInvoiceStore } from '@/stores/invoice';
import { formatCurrency, formatNum, currencySymbols, safeNum } from '@/utils/number-format';
import { exportInvoices, importInvoices } from '@/composables/useLocalStorage';

const STORAGE_ORDER_KEY = 'history_column_order';
const STORAGE_WIDTH_KEY = 'history_column_widths';

const sortKey = ref('');
const sortOrder = ref(1);
const dragIndex = ref(null);
const dropIndex = ref(null);
const resizing = ref(null);
const colWidths = ref({});

const defaultColumns = [
  { key: 'index', label: '#', sortable: false, thClass: 'px-2 py-2.5 text-right font-extrabold', tdClass: 'px-2 py-2.5 text-right', minWidth: 40 },
  { key: 'invoiceNumber', label: 'شماره', sortable: true, thClass: 'px-2 py-2.5 text-right font-extrabold sortable-th', tdClass: 'px-2 py-2.5 text-right font-semibold whitespace-nowrap', minWidth: 80 },
  { key: 'createdAt', label: 'تاریخ', sortable: true, thClass: 'px-2 py-2.5 text-right font-extrabold sortable-th', tdClass: 'px-2 py-2.5 text-right whitespace-nowrap', minWidth: 80 },
  { key: 'seller', label: 'فروشنده', sortable: true, thClass: 'px-2 py-2.5 text-right font-extrabold sortable-th', tdClass: 'px-2 py-2.5 text-right truncate', minWidth: 80 },
  { key: 'buyer', label: 'خریدار', sortable: true, thClass: 'px-2 py-2.5 text-right font-extrabold sortable-th', tdClass: 'px-2 py-2.5 text-right truncate', minWidth: 80 },
  { key: 'items', label: 'کالا/خدمات', sortable: false, thClass: 'px-2 py-2.5 text-right font-extrabold', tdClass: 'px-2 py-2.5 text-right truncate', minWidth: 100 },
  { key: 'qty', label: 'تعداد', sortable: true, thClass: 'px-2 py-2.5 text-center font-extrabold sortable-th', tdClass: 'px-2 py-2.5 text-center whitespace-nowrap', minWidth: 60 },
  { key: 'total', label: 'مبلغ کل', sortable: true, thClass: 'px-2 py-2.5 text-left font-extrabold sortable-th', tdClass: 'px-2 py-2.5 text-left whitespace-nowrap', minWidth: 90 },
  { key: 'actions', label: 'عملیات', sortable: false, thClass: 'px-2 py-2.5 text-center font-extrabold', tdClass: 'px-2 py-2.5 text-center', minWidth: 100 },
];

const columns = ref([...defaultColumns]);

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_ORDER_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const validKeys = defaultColumns.map(c => c.key);
      if (Array.isArray(parsed) && parsed.length === validKeys.length && parsed.every(k => validKeys.includes(k))) {
        columns.value = parsed.map(k => defaultColumns.find(c => c.key === k));
      }
    } catch (_) {}
  }
  const savedWidths = localStorage.getItem(STORAGE_WIDTH_KEY);
  if (savedWidths) {
    try {
      const parsed = JSON.parse(savedWidths);
      if (typeof parsed === 'object' && parsed !== null) {
        colWidths.value = parsed;
      }
    } catch (_) {}
  }
});

function saveColumnOrder() {
  localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(columns.value.map(c => c.key)));
}

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

function onDragStart(e, idx) {
  dragIndex.value = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', idx);
}

function onDragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  dropIndex.value = idx;
}

function onDragLeave() {
  dropIndex.value = null;
}

function onDrop(e, idx) {
  e.preventDefault();
  const from = dragIndex.value;
  const to = idx;
  if (from !== null && to !== null && from !== to) {
    const arr = [...columns.value];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    columns.value = arr;
    saveColumnOrder();
  }
  dragIndex.value = null;
  dropIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
  dropIndex.value = null;
}

function startResize(e, key) {
  e.preventDefault();
  e.stopPropagation();
  const th = e.currentTarget.closest('th');
  if (!th) return;
  const startW = th.offsetWidth;
  const startX = e.clientX;
  resizing.value = key;
  function doResize(ev) {
    if (!resizing.value) return;
    const diff = ev.clientX - startX;
    const col = defaultColumns.find(c => c.key === key);
    const minW = col?.minWidth || 40;
    const newW = Math.max(startW + diff, minW);
    colWidths.value = { ...colWidths.value, [key]: newW };
  }
  function stopResize() {
    resizing.value = null;
    localStorage.setItem(STORAGE_WIDTH_KEY, JSON.stringify(colWidths.value));
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
  }
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
}

function colStyle(key) {
  const w = colWidths.value[key];
  const col = defaultColumns.find(c => c.key === key);
  if (w) {
    return { width: w + 'px', minWidth: w + 'px', maxWidth: w + 'px' };
  }
  if (col?.minWidth) {
    return { minWidth: col.minWidth + 'px' };
  }
  return {};
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
    case 'total': {
      const items = inv.items || [];
      const vatEnabled = inv.vatEnabled !== false;
      const vatPct = safeNum(inv.vatPercent) || 10;
      const priceIncludesVat = !!inv.priceIncludesVat;
      return items.reduce((sum, it) => {
        const qty = safeNum(it.quantity);
        const price = safeNum(it.unitPrice);
        const gross = qty * price;
        const discPct = safeNum(it.discountPercent);
        const discAmt = safeNum(it.discountAmount);
        let disc = 0;
        if (discPct > 0) disc = price * discPct / 100 * qty;
        else if (discAmt > 0) disc = discAmt * qty;
        const afterDisc = gross - disc;
        let tax = 0;
        if (vatEnabled) {
          if (priceIncludesVat) tax = Math.round(afterDisc * vatPct / (100 + vatPct));
          else tax = Math.round(afterDisc * vatPct / 100);
        }
        return sum + afterDisc + tax;
      }, 0);
    }
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

function calcTotal(inv) {
  const items = inv?.items;
  if (!items || items.length === 0) return formatNum(0);
  const vatEnabled = inv.vatEnabled !== false;
  const vatPct = safeNum(inv.vatPercent) || 10;
  const priceIncludesVat = !!inv.priceIncludesVat;
  const total = items.reduce((sum, it) => {
    const qty = safeNum(it.quantity);
    const price = safeNum(it.unitPrice);
    const gross = qty * price;
    const discPct = safeNum(it.discountPercent);
    const discAmt = safeNum(it.discountAmount);
    let disc = 0;
    if (discPct > 0) disc = price * discPct / 100 * qty;
    else if (discAmt > 0) disc = discAmt * qty;
    const afterDisc = gross - disc;
    let tax = 0;
    if (vatEnabled) {
      if (priceIncludesVat) {
        tax = Math.round(afterDisc * vatPct / (100 + vatPct));
      } else {
        tax = Math.round(afterDisc * vatPct / 100);
      }
    }
    return sum + afterDisc + tax;
  }, 0);
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
            <th
              v-for="(col, ci) in columns"
              :key="col.key"
              :class="[col.thClass, { 'drag-over': dropIndex === ci && dragIndex !== ci, 'resizing': resizing === col.key }]"
              :style="colStyle(col.key)"
              :draggable="true"
              @dragstart="onDragStart($event, ci)"
              @dragover="onDragOver($event, ci)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, ci)"
              @dragend="onDragEnd"
              @click="col.sortable && setSort(col.key)"
            >
              <span class="drag-handle"><i class="fa-solid fa-grip-lines"></i></span>
              {{ col.label }}
              <i v-if="col.sortable" :class="sortIcon(col.key)"></i>
              <span class="resize-handle" @mousedown="startResize($event, col.key)"></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(inv, i) in filteredInvoices"
            :key="inv.id"
            style="border-bottom:1px solid var(--card-border)"
            class="hover-row"
          >
            <td v-for="col in columns" :key="col.key" :class="col.tdClass" :style="colStyle(col.key)">
              <template v-if="col.key === 'index'">{{ i + 1 }}</template>
              <template v-else-if="col.key === 'invoiceNumber'">
                <span style="color:var(--accent)">{{ inv.invoiceNumber }}</span>
              </template>
              <template v-else-if="col.key === 'createdAt'">{{ formatDate(inv.createdAt) }}</template>
              <template v-else-if="col.key === 'seller'">{{ inv.seller?.name || '—' }}</template>
              <template v-else-if="col.key === 'buyer'">{{ inv.buyer?.name || '—' }}</template>
              <template v-else-if="col.key === 'items'"><span style="color:var(--muted)">{{ getItemsSummary(inv.items) }}</span></template>
              <template v-else-if="col.key === 'qty'">{{ formatNum(getTotalQty(inv.items)) }}</template>
              <template v-else-if="col.key === 'total'">{{ calcTotal(inv) }}</template>
              <template v-else-if="col.key === 'actions'">
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
              </template>
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
.drag-handle {
  cursor: grab;
  margin-left: 6px;
  opacity: 0.4;
  font-size: 0.75rem;
}
th:hover .drag-handle {
  opacity: 0.8;
}
.drag-over {
  outline: 2px dashed var(--accent);
  outline-offset: -2px;
  background: var(--accent-light);
}
th[draggable="true"] {
  cursor: grab;
}
th[draggable="true"]:active {
  cursor: grabbing;
}
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 1;
}
.resize-handle:hover,
th.resizing .resize-handle {
  background: var(--accent);
}
th {
  position: relative;
  user-select: none;
}
th.resizing {
  user-select: none;
}
</style>