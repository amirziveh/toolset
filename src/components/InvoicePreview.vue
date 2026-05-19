<script setup>
import { useInvoiceStore } from '@/stores/invoice';
import { generateInvoiceHTML } from '@/utils/invoiceTemplate';
import { nextTick, onMounted, watch, ref, computed, onUnmounted } from 'vue';

const store = useInvoiceStore();

// Ref for scroll-wrapper element
const scrollWrapper = ref(null);

// Track initial touch distance for pinch gesture
const initialTouchDistance = ref(null);

// A4 horizontal dimensions (297mm x 210mm = 1123px x 794px)
const A4_WIDTH = 1123;
const A4_HEIGHT = 794;

// Fit scale - calculates how much to scale down to fit viewport
const fitScale = ref(1);

// Zoom state - starts at 1 (true A4 size)
const zoomLevel = ref(1);

// Calculate fit scale based on viewport width
function calculateFitScale() {
  if (typeof window === 'undefined') return;
  const viewportWidth = window.innerWidth;
  // fitScale = min(1, (viewportWidth - 40) / 1123)
  // On desktop (viewport > 1123px): fitScale = 1
  // On mobile (viewport < 1123px): fitScale < 1
  fitScale.value = Math.min(1, (viewportWidth - 40) / A4_WIDTH);
}

// Total scale combines fitScale and zoomLevel
const totalScale = computed(() => fitScale.value * zoomLevel.value);

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

// Lifecycle hooks
onMounted(() => {
  calculateFitScale();
  window.addEventListener('resize', handleResize);
  if (scrollWrapper.value) {
    scrollWrapper.value.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollWrapper.value.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollWrapper.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (scrollWrapper.value) {
    scrollWrapper.value.removeEventListener('touchstart', handleTouchStart);
    scrollWrapper.value.removeEventListener('touchmove', handleTouchMove);
    scrollWrapper.value.removeEventListener('touchend', handleTouchEnd);
  }
});

// Render the preview using the shared template function
function renderPreview() {
  const inv = store.currentInvoice;
  if (!inv) return;
  
  const printArea = document.getElementById('print-area');
  if (!printArea) return;
  
  // Use the same template function as export — styles are self-contained now
  printArea.innerHTML = generateInvoiceHTML(inv);
}

// Auto-render on mount and when invoice changes
onMounted(() => {
  if (store.currentInvoice) {
    renderPreview();
  }
});

watch(() => store.currentInvoice, () => {
  if (store.currentInvoice) {
    nextTick(() => renderPreview());
  }
}, { deep: true });

// Expose renderPreview for parent to call
defineExpose({ renderPreview });
</script>

<template>
  <div class="preview-wrapper">
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
      <div class="zoom-scale-container" :style="{ width: A4_WIDTH * totalScale + 'px', height: A4_HEIGHT * totalScale + 'px' }">
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
  width: 1123px;
  height: 794px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  transform-origin: top right;
}

/* A4 Container */
.a4-container {
  width: 1123px;
  height: 794px;
  margin: 0;
  padding: 0;           /* ← changed: no padding, .invoice-root handles it */
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