<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useInvoiceStore } from '../stores/invoice';
import { getTodayShamsi, getCurrentTime, addShamsiDays } from '../utils/shamsi-date';
import { formatCurrency, formatNum, formatToman, amountToWords, safeNum, currencySymbols } from '../utils/number-format';
import { useExport } from '../composables/useExport';

// Import components
import SellerForm from '../components/forms/SellerForm.vue';
import BuyerForm from '../components/forms/BuyerForm.vue';
import InvoiceDetailsForm from '../components/forms/InvoiceDetailsForm.vue';
import ItemsTable from '../components/forms/ItemsTable.vue';
import AdditionalDescription from '../components/forms/AdditionalDescription.vue';
import InvoiceSummary from '../components/forms/InvoiceSummary.vue';
import SignatureUpload from '../components/forms/SignatureUpload.vue';
import InvoicePreview from '../components/InvoicePreview.vue';
import HistoryList from '../components/HistoryList.vue';

const router = useRouter();
const route = useRoute();
const store = useInvoiceStore();
const { exportImage, exportPDF, printInvoice } = useExport();

// State
const currentTab = ref(route.query.tab === 'history' ? 'history' : 'form');
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

// Navigate back to dashboard
function goToDashboard() {
  router.push('/dashboard');
}
</script>

<template>
  <div class="app-container">
    <!-- Header -->
    <header class="sticky top-0 z-30 border-b" style="background:var(--card);border-color:var(--card-border)">
      <div class="max-w-[1600px] mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-2 sm:gap-3">
          <button @click="goToDashboard" class="btn btn-secondary btn-sm mr-2">
            <i class="fa-solid fa-arrow-right"></i>
          </button>
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center" style="background:var(--accent)">
            <i class="fa-solid text-white text-xs sm:text-sm"></i>
          </div>
          <div>
            <h1 class="text-sm sm:text-base font-bold leading-tight" style="color:var(--fg)">پیش‌فاکتور</h1>
            <p class="text-xs" style="color:var(--muted)">بازگشت به داشبورد</p>
          </div>
        </div>
        <div class="flex items-center gap-5 sm:gap-8">
          <button @click="newInvoice()" class="btn btn-primary btn-sm mx-1 sm:mx-2">
            <i class="fa-solid fa-plus"></i> <span class="hidden sm:inline">جدید</span>
          </button>
          <button @click="store.saveToHistory()" class="btn btn-secondary btn-sm mx-1 sm:mx-2">
            <i class="fa-solid fa-floppy-disk"></i> <span class="hidden sm:inline">ذخیره</span>
          </button>
          <button @click="toggleDark()" class="btn btn-secondary btn-sm mx-1 sm:mx-2" :title="store.state?.dark ? 'حالت روشن' : 'حالت تاریک'">
            <i :class="store.state?.dark ? 'fa-solid fa-moon' : 'fa-solid fa-sun'"></i>
          </button>
        </div>
      </div>
      <!-- Tab Navigation -->
      <div class="max-w-[1600px] mx-auto px-3 sm:px-4 flex overflow-x-auto" style="border-top:1px solid var(--card-border);-webkit-overflow-scrolling:touch">
        <button 
          :class="['tab-btn', currentTab === 'form' ? 'active' : '']" 
          @click="switchTab('form')"
        >
          <i class="fa-solid ml-1"></i>فرم پیش‌فاکتور
        </button>
        <button 
          :class="['tab-btn', currentTab === 'preview' ? 'active' : '']" 
          @click="switchTab('preview')"
        >
          <i class="fa-solid ml-1"></i>پیش‌نمایش
        </button>
        <button 
          :class="['tab-btn', currentTab === 'history' ? 'active' : '']" 
          @click="switchTab('history')"
        >
          <i class="fa-solid ml-1"></i>تاریخچه
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 px-3 sm:px-4 py-4 sm:py-5 overflow-y-auto">
      <!-- Form Tab -->
      <div v-show="currentTab === 'form'" class="tab-content lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:items-start">
        <!-- Left Column: Input Forms -->
        <div class="space-y-3 sm:space-y-4 lg:col-start-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <SellerForm />
            <BuyerForm />
          </div>
          <InvoiceDetailsForm />
          <ItemsTable />
          <AdditionalDescription />
        </div>
        
        <!-- Right Column: Summary & Signature (Sticky) -->
        <div class="space-y-3 sm:space-y-4 mt-3 sm:mt-4 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4 lg:space-y-4">
          <InvoiceSummary />
          <div class="card">
            <h3 class="font-extrabold text-sm mb-3 flex items-center gap-2" style="color:var(--accent)">
              <i class="fa-solid fa-stamp"></i> امضا و مهر
            </h3>
            <SignatureUpload />
          </div>
        </div>
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
  </div>
</template>

<style scoped>
/* Styles are imported from style.css */
</style>