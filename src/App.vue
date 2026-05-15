<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { useInvoiceStore } from './stores/invoice';
import { getTodayShamsi, getCurrentTime, addShamsiDays } from './utils/shamsi-date';
import { formatCurrency, formatNum, formatToman, amountToWords, safeNum, currencySymbols } from './utils/number-format';
import { useExport } from './composables/useExport';

// Import components
import SellerForm from './components/forms/SellerForm.vue';
import BuyerForm from './components/forms/BuyerForm.vue';
import InvoiceDetailsForm from './components/forms/InvoiceDetailsForm.vue';
import ItemsTable from './components/forms/ItemsTable.vue';
import AdditionalDescription from './components/forms/AdditionalDescription.vue';
import InvoiceSummary from './components/forms/InvoiceSummary.vue';
import InvoicePreview from './components/InvoicePreview.vue';
import HistoryList from './components/HistoryList.vue';

const store = useInvoiceStore();
const { exportImage, exportPDF, printInvoice } = useExport();

// State
const currentTab = ref('form');
const deleteTargetId = ref(null);
const showDeleteModal = ref(false);
const previewRef = ref(null);

// Initialize on mount
onMounted(() => {
  store.initDarkMode();
  store.loadSavedInvoices();
  store.initInvoice();
});

// Switch tab
function switchTab(name) {
  currentTab.value = name;
  if (name === 'preview') {
    nextTick(() => {
      if (previewRef.value && previewRef.value.renderPreview) {
        previewRef.value.renderPreview();
      }
    });
  }
}

// Toggle dark mode
function toggleDark() {
  store.toggleTheme();
}

// New invoice
function newInvoice() {
  store.initInvoice();
  switchTab('form');
}

// Export as PNG
async function handleExportImage() {
  try {
    await exportImage();
  } catch (e) {
    alert('خطا در صادر کردن تصویر: ' + e.message);
  }
}

// Export as PDF
async function handleExportPDF() {
  try {
    await exportPDF();
  } catch (e) {
    alert('خطا در صادر کردن PDF: ' + e.message);
  }
}

// Print
function handlePrint() {
  if (previewRef.value && previewRef.value.renderPreview) {
    previewRef.value.renderPreview();
  }
  nextTick(() => printInvoice());
}

// Request delete
function requestDelete(id) {
  deleteTargetId.value = id;
  showDeleteModal.value = true;
}

// Confirm delete
function confirmDelete() {
  if (deleteTargetId.value) {
    store.deleteFromHistory(deleteTargetId.value);
    deleteTargetId.value = null;
  }
  showDeleteModal.value = false;
}

// Close delete modal
function closeDeleteModal() {
  showDeleteModal.value = false;
  deleteTargetId.value = null;
}

// Load invoice from history
function loadInvoice(id) {
  store.loadFromHistory(id);
  switchTab('form');
}
</script>

<template>
  <div class="app-container">
    <!-- Header -->
    <header class="sticky top-0 z-30 border-b" style="background:var(--card);border-color:var(--card-border)">
      <div class="max-w-[1600px] mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center" style="background:var(--accent)">
            <i class="fa-solid fa-file-invoice text-white text-xs sm:text-sm"></i>
          </div>
          <div>
            <h1 class="text-sm sm:text-base font-extrabold leading-tight" style="color:var(--fg)">پیش‌فاکتور داخلی</h1>
            <p class="text-[9px] sm:text-[10px] hidden xs:block" style="color:var(--muted)">صدور پیش‌فاکتور حرفه‌ای برای بازار ایران</p>
          </div>
        </div>
        <div class="flex items-center gap-1 sm:gap-1.5">
          <button @click="newInvoice()" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-plus"></i> <span class="hidden sm:inline">جدید</span>
          </button>
          <button @click="store.saveToHistory()" class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-floppy-disk"></i> <span class="hidden sm:inline">ذخیره</span>
          </button>
          <button @click="toggleDark()" class="btn btn-secondary btn-sm" :title="store.state?.dark ? 'حالت روشن' : 'حالت تاریک'">
                      <i :class="store.state?.dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
                    </button>
                  </div>
      </div>
      <!-- Tab Navigation -->
      <div class="max-w-[1600px] mx-auto px-3 sm:px-4 flex overflow-x-auto" style="border-top:1px solid var(--card-border);-webkit-overflow-scrolling:touch">
        <button 
          :class="['tab-btn', currentTab === 'form' ? 'active' : '']" 
          @click="switchTab('form')"
        >
          <i class="fa-solid fa-pen-to-square ml-1"></i>فرم پیش‌فاکتور
        </button>
        <button 
          :class="['tab-btn', currentTab === 'preview' ? 'active' : '']" 
          @click="switchTab('preview')"
        >
          <i class="fa-solid fa-eye ml-1"></i>پیش‌نمایش
        </button>
        <button 
          :class="['tab-btn', currentTab === 'history' ? 'active' : '']" 
          @click="switchTab('history')"
        >
          <i class="fa-solid fa-clock-rotate-left ml-1"></i>تاریخچه
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 px-3 sm:px-4 py-4 sm:py-5 overflow-y-auto">
      <!-- Form Tab -->
      <div v-show="currentTab === 'form'" class="tab-content">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <!-- Seller -->
          <SellerForm />
          <!-- Buyer -->
          <BuyerForm />
        </div>

        <!-- Invoice Details -->
        <InvoiceDetailsForm class="mb-3 sm:mb-4" />

        <!-- Items -->
        <ItemsTable class="mb-3 sm:mb-4" />

        <!-- Additional Description -->
        <AdditionalDescription class="mb-3 sm:mb-4" />

        <!-- Summary -->
        <InvoiceSummary />
      </div>

      <!-- Preview Tab -->
      <div v-show="currentTab === 'preview'" class="tab-content">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 class="font-extrabold text-lg">پیش‌نمایش پیش‌فاکتور</h2>
          <div class="flex gap-2">
            <button @click="handleExportImage" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-image"></i> <span>تصویر</span>
            </button>
            <button @click="handleExportPDF" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-file-pdf"></i> <span>PDF</span>
            </button>
            <button @click="handlePrint" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-print"></i> <span>چاپ</span>
            </button>
          </div>
        </div>
        <div class="overflow-x-auto rounded-lg">
          <InvoicePreview ref="previewRef" />
        </div>
      </div>

      <!-- History Tab -->
      <div v-show="currentTab === 'history'" class="tab-content">
        <HistoryList 
          @load-invoice="loadInvoice" 
          @request-delete="requestDelete"
        />
      </div>
    </main>
  </div>

  <!-- Delete Modal -->
  <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,.5)">
    <div class="card max-w-sm mx-4">
      <h3 class="font-extrabold mb-2">تایید حذف</h3>
      <p class="text-sm mb-4" style="color:var(--muted)">آیا از حذف این پیش‌فاکتور اطمینان دارید؟</p>
      <div class="flex gap-2 justify-end">
        <button @click="closeDeleteModal" class="btn btn-secondary btn-sm">انصراف</button>
        <button @click="confirmDelete" class="btn btn-danger btn-sm">حذف</button>
      </div>
    </div>
      </div>
    </template>

<style scoped>
/* Styles are imported from style.css */
</style>
