<script setup>
import { useInvoiceStore } from '@/stores/invoice';
import { generateInvoiceHTML } from '@/utils/invoiceTemplate';
import { nextTick, onMounted, watch, ref, computed, onUnmounted } from 'vue';

const store = useInvoiceStore();

// Ref for scroll-wrapper element
const scrollWrapper = ref(null);

// Track initial touch distance for pinch gesture
const initialTouchDistance = ref(null);

// File input ref for letterhead upload
const letterheadFileInput = ref(null);

// Drag over state for letterhead upload
const isLetterheadDragOver = ref(false);

// Letterhead section open state
const isLetterheadSectionOpen = ref(true);

// Debounce timer for renderPreview
let renderPreviewTimer = null;

// Drag state for proforma content
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);

// State for custom text management
const isCustomTextSectionOpen = ref(false);
const isDraggingCustomText = ref(false);
const draggingCustomTextId = ref(null);
const customTextDragStartX = ref(0);
const customTextDragStartY = ref(0);

// Letterhead size presets in mm (width x height for landscape)
const LETTERHEAD_SIZES = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
  Custom: { width: 297, height: 210 }
};

// Convert mm to pixels (1mm ≈ 3.78px at 96 DPI)
function mmToPx(mm) {
  return Math.round(mm * 3.78);
}

// Get letterhead dimensions based on settings
function getLetterheadDimensions() {
  const inv = store.currentInvoice;
  if (!inv) return { width: mmToPx(210), height: mmToPx(297) };
  
  const size = inv.letterheadSize || 'A4';
  const orientation = inv.letterheadOrientation || 'landscape';
  const customWidth = inv.letterheadWidth || 297;
  const customHeight = inv.letterheadHeight || 210;
  
  let dims = LETTERHEAD_SIZES[size] || LETTERHEAD_SIZES.A4;
  
  // Override with custom dimensions if specified
  if (size === 'Custom') {
    dims = { width: customWidth, height: customHeight };
  }
  
  // Swap for portrait orientation
  if (orientation === 'portrait') {
    dims = { width: dims.height, height: dims.width };
  }
  
  return {
    width: mmToPx(dims.width),
    height: mmToPx(dims.height)
  };
}

// Computed dimensions based on letterhead settings
const letterheadDimensions = computed(() => getLetterheadDimensions());

// Fit scale - calculates how much to scale down to fit viewport
const fitScale = ref(1);

// Zoom state - starts at 1 (true A4 size)
const zoomLevel = ref(1);

// Calculate fit scale based on viewport width
function calculateFitScale() {
  if (typeof window === 'undefined') return;
  const viewportWidth = window.innerWidth;
  const dims = letterheadDimensions.value;
  // fitScale = min(1, (viewportWidth - 40) / width)
  // On desktop (viewport > width): fitScale = 1
  // On mobile (viewport < width): fitScale < 1
  fitScale.value = Math.min(1, (viewportWidth - 40) / dims.width);
}

// Total scale combines fitScale and zoomLevel
const totalScale = computed(() => fitScale.value * zoomLevel.value);

// Convert screen coordinates to unscaled container coordinates
function screenToScaledCoords(clientX, clientY) {
  const zoomWrapper = document.querySelector('.zoom-wrapper');
  if (!zoomWrapper) return { x: clientX, y: clientY };
  
  const rect = zoomWrapper.getBoundingClientRect();
  const x = (clientX - rect.left) / totalScale.value;
  const y = (clientY - rect.top) / totalScale.value;
  return { x, y };
}

// Get current dimensions for container
const currentDimensions = computed(() => {
  const dims = letterheadDimensions.value;
  return {
    width: dims.width * totalScale.value,
    height: dims.height * totalScale.value
  };
});

// Computed transform style for zoom wrapper
const zoomStyle = computed(() => ({
  transform: `scale(${totalScale.value})`,
  transformOrigin: 'top right'
}));

// Zoom methods
function zoomIn() {
  zoomLevel.value = Math.min(3, zoomLevel.value + 0.1);
}

function zoomOut() {
  zoomLevel.value = Math.max(0.3, zoomLevel.value - 0.1);
}

function resetZoom() {
  zoomLevel.value = 1;
}

// Handle window resize
function handleResize() {
  calculateFitScale();
}

// Pinch-to-zoom touch handlers
function handleTouchStart(event) {
  if (event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
    initialTouchDistance.value = distance;
  }
}

function handleTouchMove(event) {
  if (event.touches.length === 2 && initialTouchDistance.value !== null) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const newDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
    const scaleRatio = newDistance / initialTouchDistance.value;
    zoomLevel.value = Math.min(3, Math.max(0.3, zoomLevel.value * scaleRatio));
    initialTouchDistance.value = newDistance;
    event.preventDefault();
  }
}

function handleTouchEnd(event) {
  if (event.touches.length < 2) {
    initialTouchDistance.value = null;
  }
}

// Letterhead upload handlers
function handleLetterheadFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  processLetterheadFile(file);
}

function handleLetterheadDrop(event) {
  event.preventDefault();
  isLetterheadDragOver.value = false;
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processLetterheadFile(file);
  }
}

function handleLetterheadDragOver(event) {
  event.preventDefault();
  isLetterheadDragOver.value = true;
}

function handleLetterheadDragLeave() {
  isLetterheadDragOver.value = false;
}

// Compress image before storing (resize to max 1200px width, quality 0.8)
function compressImage(dataUrl, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height);
        width = maxWidth;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Use JPEG for better compression, or PNG for transparency
      const outputFormat = img.type && img.type.includes('png') ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(outputFormat, quality));
    };
    img.src = dataUrl;
  });
}

async function processLetterheadFile(file) {
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('حجم فایل باید کمتر از ۵ مگابایت باشد');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    // Compress the image before storing
    const compressedDataUrl = await compressImage(e.target.result);
    store.currentInvoice.letterheadImage = compressedDataUrl;
    nextTick(() => renderPreview());
  };
  reader.readAsDataURL(file);
}

function removeLetterhead() {
  store.currentInvoice.letterheadImage = null;
  if (letterheadFileInput.value) {
    letterheadFileInput.value.value = '';
  }
  nextTick(() => renderPreview());
}

// Toggle letterhead section
function toggleLetterheadSection() {
  isLetterheadSectionOpen.value = !isLetterheadSectionOpen.value;
}

// Debounced renderPreview function
function debouncedRenderPreview() {
  if (renderPreviewTimer) {
    clearTimeout(renderPreviewTimer);
  }
  renderPreviewTimer = setTimeout(() => {
    renderPreview();
  }, 150);
}

// Drag handlers for proforma content
function handleProformaDragStart(event) {
  const proformaContent = document.querySelector('#print-area .proforma-content');
  if (!proformaContent) return;
  
  isDragging.value = true;
  const scaled = screenToScaledCoords(event.clientX, event.clientY);
  dragStartX.value = scaled.x - (store.currentInvoice.proformaX || 0);
  dragStartY.value = scaled.y - (store.currentInvoice.proformaY || 0);
  
  document.addEventListener('mousemove', handleProformaDragMove);
  document.addEventListener('mouseup', handleProformaDragEnd);
  event.preventDefault();
}

function handleProformaDragMove(event) {
  if (!isDragging.value) return;
  
  const scaled = screenToScaledCoords(event.clientX, event.clientY);
  const newX = scaled.x - dragStartX.value;
  const newY = scaled.y - dragStartY.value;
  
  store.currentInvoice.proformaX = Math.round(newX);
  store.currentInvoice.proformaY = Math.round(newY);
  
  // Update the CSS custom properties directly for smooth dragging
  const proformaContent = document.querySelector('#print-area .proforma-content');
  if (proformaContent) {
    proformaContent.style.setProperty('--proforma-x', newX + 'px');
    proformaContent.style.setProperty('--proforma-y', newY + 'px');
  }
}

function handleProformaDragEnd() {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleProformaDragMove);
  document.removeEventListener('mouseup', handleProformaDragEnd);
  nextTick(() => renderPreview());
}

// Touch support for mobile
function handleProformaTouchStart(event) {
  if (event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  isDragging.value = true;
  const scaled = screenToScaledCoords(touch.clientX, touch.clientY);
  dragStartX.value = scaled.x - (store.currentInvoice.proformaX || 0);
  dragStartY.value = scaled.y - (store.currentInvoice.proformaY || 0);
  
  document.addEventListener('touchmove', handleProformaTouchMove, { passive: false });
  document.addEventListener('touchend', handleProformaTouchEnd);
  event.preventDefault();
}

function handleProformaTouchMove(event) {
  if (!isDragging.value || event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  const scaled = screenToScaledCoords(touch.clientX, touch.clientY);
  const newX = scaled.x - dragStartX.value;
  const newY = scaled.y - dragStartY.value;
  
  store.currentInvoice.proformaX = Math.round(newX);
  store.currentInvoice.proformaY = Math.round(newY);
  
  const proformaContent = document.querySelector('#print-area .proforma-content');
  if (proformaContent) {
    proformaContent.style.setProperty('--proforma-x', newX + 'px');
    proformaContent.style.setProperty('--proforma-y', newY + 'px');
  }
  
  event.preventDefault();
}

function handleProformaTouchEnd() {
  isDragging.value = false;
  document.removeEventListener('touchmove', handleProformaTouchMove);
  document.removeEventListener('touchend', handleProformaTouchEnd);
  nextTick(() => renderPreview());
}

// Custom text CRUD methods
function addCustomText() {
  store.addCustomText();
  nextTick(() => renderPreview());
}

function removeCustomText(id) {
  store.removeCustomText(id);
  nextTick(() => renderPreview());
}

function updateCustomText(id, updates) {
  store.updateCustomText(id, updates);
  nextTick(() => renderPreview());
}

// Drag handlers for custom texts
function handleCustomTextDragStart(event, item) {
  const element = event.currentTarget;
  if (!element) return;

  isDraggingCustomText.value = true;
  draggingCustomTextId.value = item.id;
  const scaled = screenToScaledCoords(event.clientX, event.clientY);
  customTextDragStartX.value = scaled.x - (item.x || 0);
  customTextDragStartY.value = scaled.y - (item.y || 0);

  document.addEventListener('mousemove', handleCustomTextDragMove);
  document.addEventListener('mouseup', handleCustomTextDragEnd);
  event.preventDefault();
}

function handleCustomTextDragMove(event) {
  if (!isDraggingCustomText.value || draggingCustomTextId.value === null) return;

  const scaled = screenToScaledCoords(event.clientX, event.clientY);
  const newX = scaled.x - customTextDragStartX.value;
  const newY = scaled.y - customTextDragStartY.value;

  store.updateCustomText(draggingCustomTextId.value, { x: Math.round(newX), y: Math.round(newY) });

  // Update element position directly for smooth dragging
  const element = document.querySelector(`[data-custom-text-id="${draggingCustomTextId.value}"]`);
  if (element) {
    element.style.left = newX + 'px';
    element.style.top = newY + 'px';
  }
}

function handleCustomTextDragEnd() {
  isDraggingCustomText.value = false;
  draggingCustomTextId.value = null;
  document.removeEventListener('mousemove', handleCustomTextDragMove);
  document.removeEventListener('mouseup', handleCustomTextDragEnd);
  nextTick(() => renderPreview());
}

// Touch support for custom texts
function handleCustomTextTouchStart(event, item) {
  if (event.touches.length !== 1) return;

  const touch = event.touches[0];
  const element = event.currentTarget;
  if (!element) return;

  isDraggingCustomText.value = true;
  draggingCustomTextId.value = item.id;
  const scaled = screenToScaledCoords(touch.clientX, touch.clientY);
  customTextDragStartX.value = scaled.x - (item.x || 0);
  customTextDragStartY.value = scaled.y - (item.y || 0);

  document.addEventListener('touchmove', handleCustomTextTouchMove, { passive: false });
  document.addEventListener('touchend', handleCustomTextTouchEnd);
  event.preventDefault();
}

function handleCustomTextTouchMove(event) {
  if (!isDraggingCustomText.value || draggingCustomTextId.value === null || event.touches.length !== 1) return;

  const touch = event.touches[0];
  const scaled = screenToScaledCoords(touch.clientX, touch.clientY);
  const newX = scaled.x - customTextDragStartX.value;
  const newY = scaled.y - customTextDragStartY.value;

  store.updateCustomText(draggingCustomTextId.value, { x: Math.round(newX), y: Math.round(newY) });

  const element = document.querySelector(`[data-custom-text-id="${draggingCustomTextId.value}"]`);
  if (element) {
    element.style.left = newX + 'px';
    element.style.top = newY + 'px';
  }

  event.preventDefault();
}

function handleCustomTextTouchEnd() {
  isDraggingCustomText.value = false;
  draggingCustomTextId.value = null;
  document.removeEventListener('touchmove', handleCustomTextTouchMove);
  document.removeEventListener('touchend', handleCustomTextTouchEnd);
  nextTick(() => renderPreview());
}

// Render the preview using the shared template function
function renderPreview() {
  const inv = store.currentInvoice;
  if (!inv) return;
  
  const printArea = document.getElementById('print-area');
  if (!printArea) return;
  
  // Use the same template function as export — styles are self-contained now
  printArea.innerHTML = generateInvoiceHTML(inv);
  
  // Attach drag events to proforma content and custom texts
  nextTick(() => {
    const proformaContent = printArea.querySelector('.proforma-content');
    if (proformaContent) {
      proformaContent.style.cursor = 'move';
      proformaContent.addEventListener('mousedown', handleProformaDragStart);
      proformaContent.addEventListener('touchstart', handleProformaTouchStart, { passive: false });
    }

    // Attach drag events to custom text elements
    if (inv.customTexts && Array.isArray(inv.customTexts)) {
      inv.customTexts.forEach(item => {
        const customTextEl = printArea.querySelector(`[data-custom-text-id="${item.id}"]`);
        if (customTextEl) {
          customTextEl.style.cursor = 'move';
          customTextEl.addEventListener('mousedown', (e) => handleCustomTextDragStart(e, item));
          customTextEl.addEventListener('touchstart', (e) => handleCustomTextTouchStart(e, item), { passive: false });
        }
      });
    }
  });
}

// Lifecycle hooks
onMounted(() => {
  calculateFitScale();
  window.addEventListener('resize', handleResize);
  if (scrollWrapper.value) {
    scrollWrapper.value.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollWrapper.value.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollWrapper.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  }
  // Auto-render on mount
  if (store.currentInvoice) {
    renderPreview();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (scrollWrapper.value) {
    scrollWrapper.value.removeEventListener('touchstart', handleTouchStart);
    scrollWrapper.value.removeEventListener('touchmove', handleTouchMove);
    scrollWrapper.value.removeEventListener('touchend', handleTouchEnd);
  }
  // Clean up drag listeners
  document.removeEventListener('mousemove', handleProformaDragMove);
  document.removeEventListener('mouseup', handleProformaDragEnd);
  document.removeEventListener('touchmove', handleProformaTouchMove);
  document.removeEventListener('touchend', handleProformaTouchEnd);
  if (renderPreviewTimer) {
    clearTimeout(renderPreviewTimer);
  }
});

// Consolidated watcher for letterhead-related changes with debounce
watch(
  () => store.currentInvoice,
  () => {
    if (store.currentInvoice) {
      debouncedRenderPreview();
    }
  },
  { deep: true }
);

// Watch for letterhead image changes
watch(
  () => store.currentInvoice?.letterheadImage,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for letterhead size changes
watch(
  () => store.currentInvoice?.letterheadSize,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for letterhead orientation changes
watch(
  () => store.currentInvoice?.letterheadOrientation,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for letterhead width changes
watch(
  () => store.currentInvoice?.letterheadWidth,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for letterhead height changes
watch(
  () => store.currentInvoice?.letterheadHeight,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for letterhead scale changes
watch(
  () => store.currentInvoice?.letterheadScale,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for showLetterhead changes
watch(
  () => store.currentInvoice?.showLetterhead,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for proforma X position changes
watch(
  () => store.currentInvoice?.proformaX,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for proforma Y position changes
watch(
  () => store.currentInvoice?.proformaY,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for proforma scale changes
watch(
  () => store.currentInvoice?.proformaScale,
  () => {
    debouncedRenderPreview();
  }
);

// Watch for custom texts changes
watch(
  () => store.currentInvoice?.customTexts,
  () => {
    debouncedRenderPreview();
  },
  { deep: true }
);

// Expose renderPreview for parent to call
defineExpose({ renderPreview });
</script>

<template>
  <div class="preview-wrapper">
    <!-- Letterhead Upload Section -->
    <div class="letterhead-section">
      <div class="section-header" @click="toggleLetterheadSection">
        <i class="fa-solid fa-file-lines"></i>
        <span>تنظیمات سربرگ</span>
        <i class="fa-solid fa-chevron-down chevron" :class="{ 'rotated': isLetterheadSectionOpen }"></i>
      </div>
      <div class="section-body" v-show="isLetterheadSectionOpen">
        <!-- Letterhead Upload -->
        <div class="upload-container">
          <label class="field-label">آپلود سربرگ</label>
          <div 
            class="letterhead-drop-zone flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-200"
            :class="isLetterheadDragOver ? 'drag-over' : ''"
            @click="letterheadFileInput?.click()"
            @dragover="handleLetterheadDragOver"
            @dragleave="handleLetterheadDragLeave"
            @drop="handleLetterheadDrop"
          >
            <!-- Placeholder (shown when no letterhead) -->
            <div v-if="!store.currentInvoice.letterheadImage" class="text-center">
              <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2" style="color:var(--muted)"></i>
              <p class="text-sm font-semibold" style="color:var(--muted)">کلیک کنید یا سربرگ را بکشید و رها کنید</p>
              <p class="text-xs mt-1" style="color:var(--input-border)">PNG، JPG یا SVG</p>
            </div>
            
            <!-- Preview (shown when letterhead exists) -->
            <div v-else class="text-center">
              <div class="preview-container">
                <img
                  :src="store.currentInvoice.letterheadImage"
                  class="preview-image"
                  alt="پیش‌نمایش سربرگ"
                >
              </div>
              <p class="text-xs mt-2" style="color:var(--muted)">برای جایگزینی کلیک کنید</p>
            </div>
          </div>
          
          <!-- Hidden file input -->
          <input 
            ref="letterheadFileInput"
            type="file" 
            accept="image/png,image/jpeg,image/svg+xml,image/jpg" 
            class="hidden" 
            @change="handleLetterheadFileSelect"
          >
          
          <!-- Remove button -->
          <button
            v-if="store.currentInvoice.letterheadImage"
            @click="removeLetterhead"
            class="btn btn-danger btn-sm mt-2"
          >
            <i class="fa-solid fa-trash-can"></i> حذف سربرگ
          </button>
        </div>

        <!-- Letterhead Configuration -->
        <div class="config-grid">
          <!-- Show Letterhead Toggle -->
          <div class="input-field">
            <label class="field-label">نمایش سربرگ</label>
            <label class="toggle-switch">
              <input type="checkbox" v-model="store.currentInvoice.showLetterhead" @change="renderPreview">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Letterhead Size -->
          <div class="input-field">
            <label class="field-label">اندازه</label>
            <select v-model="store.currentInvoice.letterheadSize" @change="renderPreview" class="field-input">
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <!-- Orientation -->
          <div class="input-field">
            <label class="field-label">چرخش</label>
            <select v-model="store.currentInvoice.letterheadOrientation" @change="renderPreview" class="field-input">
              <option value="portrait">افقی</option>
              <option value="landscape">عمودی</option>
            </select>
          </div>

          <!-- Scale -->
          <!-- <div class="input-field">
            <label class="field-label">مقیاس: {{ store.currentInvoice.letterheadScale }}%</label>
            <input 
              type="range" 
              min="50" 
              max="200" 
              v-model="store.currentInvoice.letterheadScale" 
              @change="renderPreview"
              class="w-full"
            >
          </div> -->

          <!-- Proforma Scale -->
          <div class="input-field">
            <label class="field-label">مقیاس پیش‌فاکتور: {{ store.currentInvoice.proformaScale }}%</label>
            <input 
              type="range" 
              min="50" 
              max="200" 
              v-model="store.currentInvoice.proformaScale" 
              @change="renderPreview"
              class="w-full"
            >
          </div>
        </div>

        <!-- Custom Size Inputs (visible only when Custom is selected) -->
        <div v-if="store.currentInvoice.letterheadSize === 'Custom'" class="custom-size-grid">
          <div class="input-field">
            <label class="field-label">عرض (mm)</label>
            <input 
              type="number" 
              min="100" 
              max="500" 
              v-model="store.currentInvoice.letterheadWidth" 
              @change="renderPreview"
              class="field-input"
            >
          </div>
          <div class="input-field">
            <label class="field-label">ارتفاع (mm)</label>
            <input 
              type="number" 
              min="100" 
              max="500" 
              v-model="store.currentInvoice.letterheadHeight" 
              @change="renderPreview"
              class="field-input"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Text Section -->
    <div class="letterhead-section">
      <div class="section-header" @click="isCustomTextSectionOpen = !isCustomTextSectionOpen">
        <i class="fa-solid fa-font"></i>
        <span>متن‌های سفارشی</span>
        <i class="fa-solid fa-chevron-down chevron" :class="{ 'rotated': isCustomTextSectionOpen }"></i>
      </div>
      <div class="section-body" v-show="isCustomTextSectionOpen">
        <button @click="addCustomText" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-plus"></i> افزودن متن جدید
        </button>
        <div v-if="store.currentInvoice.customTexts && store.currentInvoice.customTexts.length > 0" class="custom-texts-list">
          <div v-for="item in store.currentInvoice.customTexts" :key="item.id" class="custom-text-item">
            <div class="config-grid">
              <div class="input-field">
                <label class="field-label">متن</label>
                <input type="text" :value="item.text" @input="updateCustomText(item.id, { text: $event.target.value })" class="field-input" placeholder="متن سفارشی">
              </div>
              <!-- <div class="input-field">
                <label class="field-label">موقعیت X</label>
                <input type="number" :value="item.x" @change="updateCustomText(item.id, { x: Number($event.target.value) })" class="field-input">
              </div>
              <div class="input-field">
                <label class="field-label">موقعیت Y</label>
                <input type="number" :value="item.y" @change="updateCustomText(item.id, { y: Number($event.target.value) })" class="field-input">
              </div> -->
              <div class="input-field">
                <label class="field-label">اندازه فونت</label>
                <input type="number" :value="item.fontSize" @change="updateCustomText(item.id, { fontSize: Number($event.target.value) })" class="field-input" min="8" max="72">
              </div>
              <div class="input-field">
                <label class="field-label">رنگ</label>
                <input type="color" :value="item.color" @change="updateCustomText(item.id, { color: $event.target.value })" class="field-input" style="padding:0;height:38px">
              </div>
              <div class="input-field">
                <label class="field-label">ضخیم</label>
                <label class="toggle-switch">
                  <input type="checkbox" :checked="item.isBold" @change="updateCustomText(item.id, { isBold: $event.target.checked })">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="input-field">
                <label class="field-label">ایتالیک</label>
                <label class="toggle-switch">
                  <input type="checkbox" :checked="item.isItalic" @change="updateCustomText(item.id, { isItalic: $event.target.checked })">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <button @click="removeCustomText(item.id)" class="btn btn-danger btn-sm mt-2">
              <i class="fa-solid fa-trash-can"></i> حذف
            </button>
            <hr class="separator">
          </div>
        </div>
        <p v-else class="text-sm mt-2" style="color:var(--muted)">هیچ متن سفارشی اضافه نشده است</p>
      </div>
    </div>

    <!-- Zoom Controls -->
    <div class="zoom-controls">
      <button @click="zoomOut" class="zoom-btn" title="کوچک کردن">−</button>
      <span class="zoom-level">{{ Math.round(totalScale * 100) }}%</span>
      <button @click="zoomIn" class="zoom-btn" title="بزرگ کردن">+</button>
      <button @click="resetZoom" class="zoom-btn reset-btn" title="بازنشانی">↺</button>
    </div>

    <!-- Scrollable outer wrapper for small screens -->
    <div ref="scrollWrapper" class="scroll-wrapper">
      <!-- Zoom Scale Container - provides actual size for scrolling -->
      <div class="zoom-scale-container" :style="{ width: currentDimensions.width + 'px', height: currentDimensions.height + 'px' }">
        <!-- Zoom Wrapper - applies scale transform for preview only -->
        <div class="zoom-wrapper" :style="zoomStyle">
          <!-- A4 Preview Container -->
          <div class="a4-container">
            <div id="print-area" class="invoice-preview" dir="rtl">
              <!-- Preview will be rendered here -->
              <div class="text-center py-8" style="color:var(--muted)">
                <i class="fa-solid fa-file-invoice text-4xl mb-3"></i>
                <p>پیش‌نمایش پیش‌فاکتور آماده است</p>
                <p class="text-xs mt-1">برای مشاهده جزئیات، روی دکمه "نمایش پیش‌نمایش" کلیک کنید</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Preview Wrapper - handles scrolling */
.preview-wrapper {
  position: relative;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
}

/* Letterhead Section */
.letterhead-section {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--card-border);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
}

.section-header:hover {
  background: var(--accent-light);
}

.chevron {
  margin-left: auto;
  transition: transform 0.3s ease;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.section-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Upload Container */
.upload-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.letterhead-drop-zone {
  border: 2px dashed var(--input-border);
  border-radius: 10px;
}

.letterhead-drop-zone:hover,
.letterhead-drop-zone.drag-over {
  border-color: var(--accent);
  background: var(--accent-light);
}

/* Preview Container - constrains preview to 60px max height */
.preview-container {
  max-height: 60px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Preview Image - constrains to 60px height, 140px max width */
.preview-image {
  max-height: 60px;
  max-width: 140px;
  object-fit: contain;
  border-radius: 4px;
}

/* Config Grid */
.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

/* Custom Size Grid */
.custom-size-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--input-border);
  transition: 0.2s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Input Field */
.input-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--fg);
}

.field-input {
  padding: 8px 10px;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  background: var(--card);
  color: var(--fg);
  font-size: 13px;
}

.field-input:focus {
  outline: none;
  border-color: var(--accent);
}

/* Zoom Controls */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--card);
  border-radius: 8px;
  justify-content: center;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--card-border);
  background: var(--card);
  color: var(--accent);
  border-radius: 4px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent);
}

.zoom-btn:hover:not(:disabled) {
  color: var(--accent);
}

.zoom-level {
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
  color: var(--fg);
}

.reset-btn {
  font-size: 16px;
}

/* Scroll wrapper */
.scroll-wrapper {
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  display: flex;
  justify-content: flex-start;
}

/* Zoom Scale Container */
.zoom-scale-container {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

/* Zoom Wrapper */
.zoom-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  transform-origin: top right;
}

/* A4 Container */
.a4-container {
  margin: 0;
  padding: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

/* Print-area container — structural only, no content styling */
.invoice-preview {
  width: 100%;
  height: 100%;
  background: white;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  padding: 0;
}
</style>