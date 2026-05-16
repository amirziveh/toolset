<script setup>
import { ref } from 'vue';
import { useInvoiceStore } from '@/stores/invoice';

const store = useInvoiceStore();
const fileInput = ref(null);
const isDragOver = ref(false);

// Handle file selection via input
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  processFile(file);
}

// Handle drop event
function handleDrop(event) {
  event.preventDefault();
  isDragOver.value = false;
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  }
}

// Handle drag over
function handleDragOver(event) {
  event.preventDefault();
  isDragOver.value = true;
}

// Handle drag leave
function handleDragLeave() {
  isDragOver.value = false;
}

// Process the selected file
function processFile(file) {
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('حجم فایل باید کمتر از ۵ مگابایت باشد');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    store.currentInvoice.signatureImage = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Remove signature
function removeSignature() {
  store.currentInvoice.signatureImage = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}
</script>

<template>
  <div>
    <label class="field-label">تصویر امضا / مهر</label>
    <div 
      class="sig-drop-zone flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-200"
      :class="isDragOver ? 'drag-over' : ''"
      @click="fileInput?.click()"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- Placeholder (shown when no signature) -->
      <div v-if="!store.currentInvoice.signatureImage" class="text-center">
        <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2" style="color:var(--muted)"></i>
        <p class="text-sm font-semibold" style="color:var(--muted)">کلیک کنید یا تصویر را بکشید و رها کنید</p>
        <p class="text-xs mt-1" style="color:var(--input-border)">PNG یا JPG</p>
      </div>
      
      <!-- Preview (shown when signature exists) -->
      <div v-else class="text-center">
        <img 
          :src="store.currentInvoice.signatureImage" 
          class="max-h-28 mx-auto rounded" 
          alt="پیش‌نمایش امضا"
        >
        <p class="text-xs mt-2" style="color:var(--muted)">برای جایگزینی کلیک کنید</p>
      </div>
    </div>
    
    <!-- Hidden file input -->
    <input 
      ref="fileInput"
      type="file" 
      accept="image/*" 
      class="hidden" 
      @change="handleFileSelect"
    >
    
    <!-- Remove button -->
    <button 
      v-if="store.currentInvoice.signatureImage"
      @click="removeSignature" 
      class="btn btn-danger btn-sm mt-2"
    >
      <i class="fa-solid fa-trash-can"></i> حذف امضا
    </button>
  </div>
</template>

<style scoped>
.sig-drop-zone {
  border: 2px dashed var(--input-border);
  border-radius: 10px;
}

.sig-drop-zone:hover,
.sig-drop-zone.drag-over {
  border-color: var(--accent);
  background: var(--accent-light);
}
</style>