<script setup>
import { useInvoiceStore } from '@/stores/invoice';
import { formatCurrency, formatNum, formatToman, amountToWords, safeNum, currencySymbols } from '@/utils/number-format';
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

// Helper functions
function escHtml(s) {
  return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function escAndNl(s) {
  return escHtml(s).replace(/\n/g, '<br>');
}

// For already-formatted HTML content (like from WYSIWYG editor) - pass through
function renderHtml(s) {
  return s || '';
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0,2), 16);
  const g = parseInt(hex.substring(2,4), 16);
  const b = parseInt(hex.substring(4,6), 16);
  return {r, g, b};
}

// Calculate item amount (after discount)
function calculateAmount(item) {
  const qty = safeNum(item.quantity);
  const price = safeNum(item.unitPrice);
  const gross = qty * price;
  
  const discPct = safeNum(item.discountPercent);
  const discAmt = safeNum(item.discountAmount);
  
  let itemDisc = 0;
  if (discPct > 0) {
    itemDisc = gross * discPct / 100;
  } else if (discAmt > 0) {
    itemDisc = discAmt;
  }
  
  return gross - itemDisc;
}

// Calculate item tax/fees
function calculateItemTax(item) {
  const inv = store.currentInvoice;
  if (!inv?.vatEnabled) return 0;
  
  const qty = safeNum(item.quantity);
  const price = safeNum(item.unitPrice);
  const gross = qty * price;
  
  const discPct = safeNum(item.discountPercent);
  const discAmt = safeNum(item.discountAmount);
  
  let itemDisc = 0;
  if (discPct > 0) {
    itemDisc = gross * discPct / 100;
  } else if (discAmt > 0) {
    itemDisc = discAmt;
  }
  
  const afterDisc = gross - itemDisc;
  const vatPct = safeNum(inv.vatPercent) || 10;
  
  if (inv.priceIncludesVat) {
    return Math.round(afterDisc * vatPct / (100 + vatPct));
  } else {
    return Math.round(afterDisc * vatPct / 100);
  }
}

// Calculate item total (amount after discount + tax)
function calculateItemTotal(item) {
  return calculateAmount(item) + calculateItemTax(item);
}

// Calculate total sum of all item totals
function calculateItemsTotal() {
  const inv = store.currentInvoice;
  if (!inv?.items) return 0;
  return inv.items.reduce((sum, item) => {
    return sum + calculateItemTotal(item);
  }, 0);
}

// Generate items HTML for preview
function generateItemsHtml() {
  const inv = store.currentInvoice;
  if (!inv?.items) return '';
  
  const currency = inv.currency || 'IRR';
  let html = '';
  
  inv.items.forEach((item, i) => {
    const qty = safeNum(item.quantity);
    const price = safeNum(item.unitPrice);
    const gross = qty * price;
    
    let itemDiscount = 0;
    const discPct = safeNum(item.discountPercent);
    const discAmt = safeNum(item.discountAmount);
    
    if (discPct > 0) {
      itemDiscount = gross * discPct / 100;
    } else if (discAmt > 0) {
      itemDiscount = discAmt;
    }
    const net = gross - itemDiscount;
    const itemTax = calculateItemTax(item);
    const itemTotal = net + itemTax;
    
    const discText = item.discountPercent > 0 ? formatNum(item.discountPercent) + '٪' : (item.discountAmount > 0 ? formatCurrency(item.discountAmount, currency) : '');
    
    html += `
      <tr>
        <td style="text-align:center;width:4%">${formatNum(i+1)}</td>
        <td style="width:35%">${escHtml(item.description)||'—'}</td>
        <td style="text-align:center;width:10%">${formatNum(item.quantity)}</td>
        <td style="text-align:center;width:8%">${escHtml(item.unit)}</td>
        <td style="text-align:center;width:10%">${formatNum(item.unitPrice)}</td>
        <td style="text-align:center;width:10%">${discText}</td>
        ${inv.vatEnabled ? `<td style="text-align:center;font-weight:700;width:10%">${formatCurrency(itemTax, currency)}</td>` : ''}
        <td style="text-align:center;font-weight:700;width:10%">${formatCurrency(itemTotal, currency)}</td>
      </tr>
    `;
  });
  
  return html;
}

// Generate items table footer with total row
function generateItemsFooter() {
  const inv = store.currentInvoice;
  if (!inv?.items || inv.items.length === 0) return '';
  
  const currency = inv.currency || 'IRR';
  const itemsTotal = calculateItemsTotal();
  const taxCol = inv.vatEnabled ? '<td style="text-align:center;font-weight:bold;width:10%"></td>' : '';
  
  return `
    <tfoot>
      <tr style="background:#f3f4f6;font-weight:bold">
        <td colspan="6" style="text-align:right;padding:8px;font-size:12px;color:#374151">جمع کل اقلام</td>
        ${taxCol}
        <td style="text-align:center;padding:8px;font-size:12px;color:#374151">${formatCurrency(itemsTotal, currency)}</td>
      </tr>
    </tfoot>
  `;
}

// Make party box
function makePartyBox(title, person) {
  const inv = store.currentInvoice;
  const accentColor = inv?.seller.logoColor || '#92400E';
  const sectionHeaderBg = inv?.seller.logoColor ?
    `rgba(${hexToRgb(accentColor).r}, ${hexToRgb(accentColor).g}, ${hexToRgb(accentColor).b}, 0.2)` :
    '#ece7df';
  const rows = [
    person.name?`<div class="party-row"><span class="label">نام:</span><span><strong>${escHtml(person.name)}</strong></span></div>`:'',
    person.address?`<div class="party-row"><span class="label">آدرس:</span><span>${escAndNl(person.address)}</span></div>`:'',
    person.regNo?`<div class="party-row"><span class="label">شماره ثبت:</span><span>${escHtml(person.regNo)}</span></div>`:'',
    person.economicCode?`<div class="party-row"><span class="label">کد اقتصادی:</span><span>${escHtml(person.economicCode)}</span></div>`:'',
    person.nationalId?`<div class="party-row"><span class="label">شناسه ملی:</span><span>${escHtml(person.nationalId)}</span></div>`:'',
    person.tel?`<div class="party-row"><span class="label">تلفن:</span><span>${escHtml(person.tel)}</span></div>`:'',
    person.fax?`<div class="party-row"><span class="label">فکس:</span><span>${escHtml(person.fax)}</span></div>`:'',
    person.postalCode?`<div class="party-row"><span class="label">کد پستی:</span><span>${escHtml(person.postalCode)}</span></div>`:''
  ].filter(Boolean).join('');
  
  return `<div class="party-box"><div class="party-box-header" style="background:${sectionHeaderBg}">${title}</div><div class="party-box-body">${rows}</div></div>`;
}

// Render the full preview
function renderPreview() {
  const inv = store.currentInvoice;
  if (!inv) return;
  
  const printArea = document.getElementById('print-area');
  if (!printArea) return;
  
  printArea.style.direction = 'rtl';
  printArea.style.unicodeBidi = 'embed';
  printArea.style.textAlign = 'right';
  
  // Determine accent color from logo
  const accentColor = inv?.seller.logoColor || '#92400E';
  const sectionHeaderBg = inv?.seller.logoColor ?
      `rgba(${hexToRgb(accentColor).r}, ${hexToRgb(accentColor).g}, ${hexToRgb(accentColor).b}, 0.1)` :
      '#ece7df';
  const currency = inv.currency || 'IRR';
  const currencyLabel = currencySymbols[currency] || currency;
  
  // Calculate all totals for preview
  const totals = store.subtotalBeforeDiscount;
  const itemsDisc = store.totalItemsDiscount;
  const afterItemsDisc = totals - itemsDisc;
  const discPctGlobal = safeNum(inv.discountPercent);
  const globalDiscAmt = Math.round(afterItemsDisc * discPctGlobal / 100);
  const afterGlobalDisc = afterItemsDisc - globalDiscAmt;
  
  const vatPct = safeNum(inv.vatPercent) || 10;
  let vat = 0;
  if (inv.vatEnabled) {
    if (inv.priceIncludesVat) {
      vat = Math.round(afterGlobalDisc * vatPct / (100 + vatPct));
    } else {
      vat = Math.round(afterGlobalDisc * vatPct / 100);
    }
  }
  
  const other = safeNum(inv.otherCharges);
  let grandTotal;
  if (inv.priceIncludesVat) {
    grandTotal = afterGlobalDisc + other;
  } else {
    grandTotal = afterGlobalDisc + vat + other;
  }
  
  // Discount line for global discount
  let discountLine = '';
  if (itemsDisc > 0) {
    discountLine += `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>تخفیف اقلام</span><span style="color:#DC2626">− ${formatCurrency(itemsDisc, currency)}</span></div>`;
  }
  if (discPctGlobal > 0) {
    discountLine += `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>تخفیف کلی (${formatNum(discPctGlobal)}٪)</span><span style="color:#DC2626">− ${formatCurrency(globalDiscAmt, currency)}</span></div>`;
  }
  
  let vatLine = '';
  if (inv.vatEnabled) {
    const vatLabel = inv.priceIncludesVat ? `مالیات بر ارزش افزوده (${formatNum(vatPct)}٪) — شامل در قیمت` : `مالیات بر ارزش افزوده (${formatNum(vatPct)}٪)`;
    vatLine = `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${vatLabel}</span><span style="color:#7C3AED">${formatCurrency(vat, currency)}</span></div>`;
  }
  
  let otherLine = '';
  if (other > 0) {
    otherLine = `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>سایر هزینه‌ها</span><span>${formatCurrency(other, currency)}</span></div>`;
  }
  
  let tomanLine = '';
  if (inv.showToman) {
    tomanLine = `<div style="display:flex;justify-content:space-between;padding:2px 0;color:#6B7280;margin-top:7px"><span>معادل تومانی</span><span>${formatToman(grandTotal)}</span></div>`;
  }
  
  const showSellerName = inv.showSellerNameLogo !== false;
  const sellerName = inv.seller.name || '';
  let logoHtml = '';
  if (inv.seller.logoImage) {
    logoHtml = `<div style="display:flex; align-items:center; gap:8px;">`;
    logoHtml += `<img src="${inv.seller.logoImage}" style="max-height:60px;max-width:140px;object-fit:contain" alt="لوگو">`;
    if (showSellerName && sellerName) {
      logoHtml += `<p style="font-size:10px;font-weight:bold; white-space:nowrap">${escHtml(sellerName)}</p>`;
    }
    logoHtml += `</div>`;
  } else if (showSellerName && sellerName) {
    logoHtml = `<p style="font-size:12px;font-weight:bold">${escHtml(sellerName)}</p>`;
  }
  
  const dateStr = escHtml(inv.invoiceDate) + (inv.invoiceTimeEnabled && inv.invoiceTime ? ' — ساعت ' + escHtml(inv.invoiceTime) : '');
  const validStr = escHtml(inv.validityDate) + (inv.validityTimeEnabled && inv.validityTime ? ' — ساعت ' + escHtml(inv.validityTime) : '');
  
  let sigHtml = '';
  if (inv.seller?.signatureImage) {
    sigHtml = `<img src="${inv.seller.signatureImage}" style="max-height:85px;max-width:200px;object-fit:contain;position:absolute;bottom:0;left:0" alt="امضا">`;
  } else {
    sigHtml = `<div style="border-bottom:0px solid #444;width:190px;height:0px;position:absolute;bottom:0px;left:0"></div>`;
  }
  
  // Generate items HTML
  const itemsHtml = generateItemsHtml();
  const itemsFooter = generateItemsFooter();
  
  // Generate party boxes
  const sellerBox = makePartyBox('فروشنده', inv.seller);
  const buyerBox = makePartyBox('خریدار', inv.buyer);
  
  // Build table header based on VAT enabled
  const taxHeader = inv.vatEnabled ? `<th style="width:10%;text-align:center;background:${sectionHeaderBg}">جمع عوارض و مالیات</th>` : '';
  const taxFooterCol = inv.vatEnabled ? '<td style="text-align:center;font-weight:bold;width:10%"></td>' : '';
  
  printArea.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
      <div style="flex:1">${logoHtml}</div>
      <div style="text-align:center;flex:2;direction:rtl">
        <div class="inv-title" style="direction:rtl;unicode-bidi:embed">پیش فاکتور کالا و خدمات</div>
      </div>
      <div style="flex:1;text-align:left;font-size:9px;color:#666">
        <p style="font-weight:bold;font-size:11px; margin:0">${escHtml(inv.invoiceNumber)}</p>
        <p style="font-size:8px; margin:0">شماره پیش‌فاکتور</p>
      </div>
    </div>

    <table style="margin-bottom:8px;width:100%;table-layout:fixed">
      <tr></tr>
      <tr>
        <td class="label">زمان صدور:</td><td>${dateStr}</td>
        <td class="label">زمان اعتبار:</td><td>${validStr}</td>
      </tr>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      ${sellerBox}
      ${buyerBox}
    </div>

    ${inv.description ? `
        <table style="margin-top:4px;margin-bottom:4px;width:100%;table-layout:fixed">
          <tr><td class="section-header" style="background:${sectionHeaderBg}">شرح و توضیحات</td></tr>
          <tr><td style="white-space:pre-wrap">${escAndNl(inv.description)}</td></tr>
        </table>` : ''}

    <table style="margin-top:6px;width:100%;table-layout:fixed">
      <thead>
        <tr style="background:${sectionHeaderBg}">
                  <th style="width:4%;text-align:center;background:${sectionHeaderBg}">ردیف</th>
                  <th style="width:35%;background:${sectionHeaderBg}">شرح کالا/خدمات</th>
                  <th style="width:10%;text-align:center;background:${sectionHeaderBg}">مقدار</th>
                  <th style="width:8%;text-align:center;background:${sectionHeaderBg}">واحد</th>
                  <th style="width:10%;text-align:center;background:${sectionHeaderBg}">مبلغ واحد</th>
                  <th style="width:10%;text-align:center;background:${sectionHeaderBg}">مبلغ تخفیف</th>
                  ${taxHeader}
                  <th style="width:10%;text-align:center;background:${sectionHeaderBg}">جمع کل</th>
                </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      ${itemsFooter}
    </table>

    ${inv.additionalDescription ? `
        <table style="margin-top:10px;width:100%;table-layout:fixed">
          <tr><td class="section-header" style="background:${sectionHeaderBg}">توضیحات</td></tr>
          <tr><td style="direction:rtl;unicode-bidi:embed;overflow-wrap:break-word;word-break:break-word;padding:8px;text-align:right">${renderHtml(inv.additionalDescription)}</td></tr>
        </table>` : ''}

    ${inv.paymentTerms || inv.deliveryTerms ? `
        <table style="margin-top:8px;width:100%;table-layout:fixed">
          <tr><td class="section-header" colspan="2" style="background:${sectionHeaderBg}">شرایط</td></tr>
          ${inv.paymentTerms ? `<tr><td class="label" style="vertical-align:top;width:30%">شرایط پرداخت:</td><td>${escAndNl(inv.paymentTerms)}</td></tr>` : ''}
          ${inv.deliveryTerms ? `<tr><td class="label" style="vertical-align:top;width:30%">شرایط تحویل:</td><td>${escAndNl(inv.deliveryTerms)}</td></tr>` : ''}
        </table>` : ''}

    <div class="sign-area" style="margin-top:20px;font-size:10px">
      <div style="display:flex;justify-content:space-between">
        <div style="text-align:right;margin-right:40px"><strong>مهر و امضای فروشنده</strong></div>
        <div style="position:relative;height:80px;margin-right:100px;margin-top:15px">${sigHtml}</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;position:relative;min-height:100px">
        <div style="text-align:right;font-size:10px;position:relative;margin-left:40px">
          <div style="text-align:right"><strong>مهر و امضای خریدار</strong></div>
          
        </div>
      </div>
    </div>
  `;
  
  // Force vertical alignment in table cells
  const previewTableCells = printArea.querySelectorAll('th, td');
  previewTableCells.forEach(cell => {
    cell.style.verticalAlign = 'middle';
  });
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
.inv-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--accent);
}

/* RTL list styling for additional description */
:deep(ul),
:deep(ol) {
  padding-right: 20px;
  padding-left: 0;
  direction: rtl;
}

:deep(li) {
  text-align: right;
}

/* Ensure tables in preview have proper RTL */
:deep(table) {
  direction: rtl;
  unicode-bidi: embed;
}

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

/* Scroll wrapper - provides horizontal and vertical scroll on all devices */
.scroll-wrapper {
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  display: flex;
  justify-content: flex-start;
}

/* Zoom Scale Container - provides actual size for scrolling based on zoom level */
.zoom-scale-container {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

/* Zoom Wrapper - applies scale transform for preview only */
.zoom-wrapper {
  width: 1123px;
  height: 794px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  transform-origin: top right;
}

/* A4 Container - fixed landscape dimensions */
.a4-container {
  width: 1123px;
  height: 794px;
  margin: 0;
  padding: 20px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

/* Invoice Preview - fixed A4 landscape dimensions (297mm x 210mm) */
.invoice-preview {
  width: 100%;
  height: 100%;
  background: white;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  direction: rtl;
  padding: 0;
}

/* Content styling inside A4 */
.invoice-preview :deep(*) {
  box-sizing: border-box;
}

/* Tables in preview - fill container width */
.invoice-preview table {
  width: 100%;
  table-layout: fixed;
}
</style>