/**
 * Invoice HTML Template Generator
 * Generates consistent invoice HTML for both preview and export
 * with device-independent rendering using inline styles.
 */

import { 
  formatCurrency, 
  formatNum, 
  formatToman, 
  amountToWords, 
  safeNum, 
  currencySymbols 
} from '@/utils/number-format';

/**
 * Letterhead size presets in mm (width x height)
 * For portrait orientation, these will be swapped
 */
export const LETTERHEAD_SIZES = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
  Custom: { width: 297, height: 210 } // Default to A4
};

/**
 * Convert mm to pixels (1mm ≈ 3.78px at 96 DPI)
 * @param {number} mm - Millimeters
 * @returns {number} Pixels
 */
export function mmToPx(mm) {
  return Math.round(mm * 3.78);
}

/**
 * Get letterhead dimensions based on settings
 * @param {object} settings - Letterhead settings
 * @returns {object} { width, height } in pixels
 */
export function getLetterheadDimensions(settings) {
  const size = settings?.letterheadSize || 'A4';
  const orientation = settings?.letterheadOrientation || 'portrait';
  const customWidth = settings?.letterheadWidth || 297;
  const customHeight = settings?.letterheadHeight || 210;
  
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

/**
 * Get CSS styles for invoice content rendering.
 * Single source of truth — used by both preview and export.
 * @param {object} letterheadSettings - Optional letterhead settings
 * @returns {string} CSS string
 */
export function getInvoiceCSS(letterheadSettings = null) {
  // Get dimensions based on letterhead settings
  const dims = letterheadSettings && letterheadSettings.showLetterhead 
    ? getLetterheadDimensions(letterheadSettings) 
    : { width: mmToPx(297), height: mmToPx(210) };
  
  const hasLetterhead = letterheadSettings?.showLetterhead && letterheadSettings?.letterheadImage;
  const scale = letterheadSettings?.letterheadScale || 100;
  
  return `
    .invoice-root {
      background: #fff;
      color: #000;
      font-family: 'IRANSansX', sans-serif;
      font-size: 10.5px;
      line-height: 1.7;
      direction: rtl;
      unicode-bidi: embed;
      text-align: right;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      font-variant-ligatures: common-ligatures;
      width: ${dims.width}px;
      min-height: ${dims.height}px;
      padding: 20px;
      box-sizing: border-box;
      margin: 0 auto;
      position: relative;
      ${hasLetterhead ? `
      background-image: url('${letterheadSettings.letterheadImage}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: ${scale}% auto;
      ` : ''}
    }
    .invoice-root * { box-sizing: border-box; }
    .invoice-root table { width: 100%; border-collapse: collapse; }
    .invoice-root th,
    .invoice-root td {
      border: 1px solid #444;
      padding: 6px 7px;
      text-align: right;
      font-size: 10px;
      vertical-align: middle;
      line-height: 1.4;
    }
    .invoice-root th {
      font-weight: 700;
      font-size: 9.5px;
    }
    .invoice-root .inv-title {
      text-align: center;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: normal;
      margin-bottom: 8px;
      border-bottom: 3px double #444;
      padding-bottom: 6px;
      direction: rtl;
      unicode-bidi: embed;
      font-variant-ligatures: common-ligatures;
    }
    .invoice-root .label {
      font-weight: 600;
      white-space: nowrap;
      width: 1%;
      padding-left: 8px;
    }
    .invoice-root .section-header {
      font-weight: 700;
      font-size: 9.5px;
      padding: 3px 7px;
      border: 1px solid #444;
    }
    .invoice-root .party-box {
      border: 1px solid #444;
      overflow: hidden;
    }
    .invoice-root .party-box-header {
      font-weight: 700;
      font-size: 10.5px;
      padding: 4px 8px;
      border-bottom: 1px solid #444;
    }
    .invoice-root .party-box-body {
      padding: 6px 8px;
    }
    .invoice-root .party-row {
      display: flex;
      gap: 4px;
      margin-bottom: 2px;
    }
    .invoice-root .party-row .label {
      font-weight: 600;
      white-space: nowrap;
      min-width: 80px;
      padding-left: 0;
      width: auto;
    }
    .invoice-root .sign-area {
      margin-top: 20px;
      font-size: 10px;
    }
    .invoice-root ul,
    .invoice-root ol {
      padding-right: 20px;
      padding-left: 0;
      direction: rtl;
    }
    .invoice-root li {
      text-align: right;
    }
    .invoice-root .proforma-content {
      position: relative;
      transform: translate(var(--proforma-x, 0px), var(--proforma-y, 0px)) scale(var(--proforma-scale, 1));
      transform-origin: top right;
      z-index: 2;
    }
  `;
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string
 * @returns {object} RGB object with r, g, b properties
 */
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0,2), 16);
  const g = parseInt(hex.substring(2,4), 16);
  const b = parseInt(hex.substring(4,6), 16);
  return {r, g, b};
}

/**
 * Escape HTML special characters
 * @param {string} s - String to escape
 * @returns {string} Escaped string
 */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

/**
 * Escape HTML and convert newlines to <br>
 * @param {string} s - String to escape
 * @returns {string} Escaped string with newlines converted
 */
function escAndNl(s) {
  return escHtml(s).replace(/\n/g, '<br>');
}

/**
 * Render HTML content (pass through for already-formatted content)
 * @param {string} s - HTML string
 * @returns {string} HTML string
 */
function renderHtml(s) {
  return s || '';
}

/**
 * Calculate item amount after discount
 * @param {object} item - Invoice item
 * @returns {number} Item amount
 */
function calculateAmount(item) {
  const qty = safeNum(item.quantity);
  const price = safeNum(item.unitPrice);
  const gross = qty * price;
  
  const discPct = safeNum(item.discountPercent);
  const discAmt = safeNum(item.discountAmount);
  
  let itemDisc = 0;
  // Apply discount per unit, then multiply by quantity
  if (discPct > 0) {
    itemDisc = price * discPct / 100 * qty;
  } else if (discAmt > 0) {
    itemDisc = discAmt * qty;
  }
  
  return gross - itemDisc;
}

/**
 * Calculate item tax
 * @param {object} item - Invoice item
 * @param {object} inv - Invoice object
 * @returns {number} Item tax amount
 */
function calculateItemTax(item, inv) {
  if (!inv?.vatEnabled) return 0;
  
  const qty = safeNum(item.quantity);
  const price = safeNum(item.unitPrice);
  const gross = qty * price;
  
  const discPct = safeNum(item.discountPercent);
  const discAmt = safeNum(item.discountAmount);
  
  let itemDisc = 0;
  // Apply discount per unit, then multiply by quantity
  if (discPct > 0) {
    itemDisc = price * discPct / 100 * qty;
  } else if (discAmt > 0) {
    itemDisc = discAmt * qty;
  }
  
  const afterDisc = gross - itemDisc;
  const vatPct = safeNum(inv.vatPercent) || 10;
  
  if (inv.priceIncludesVat) {
    return Math.round(afterDisc * vatPct / (100 + vatPct));
  } else {
    return Math.round(afterDisc * vatPct / 100);
  }
}

/**
 * Generate HTML for a party box (seller or buyer)
 * @param {string} title - Party box title
 * @param {object} person - Person object with contact details
 * @param {string} accentColor - Accent color for styling
 * @returns {string} HTML string for party box
 */
function makePartyBox(title, person, accentColor) {
  const sectionHeaderBg = accentColor 
    ? `rgba(${hexToRgb(accentColor).r}, ${hexToRgb(accentColor).g}, ${hexToRgb(accentColor).b}, 0.2)`
    : '#ece7df';
  
  const rows = [
    person.name ? `<div class="party-row"><span class="label">نام:</span><span><strong>${escHtml(person.name)}</strong></span></div>` : '',
    person.address ? `<div class="party-row"><span class="label">آدرس:</span><span>${escAndNl(person.address)}</span></div>` : '',
    person.regNo ? `<div class="party-row"><span class="label">شماره ثبت:</span><span>${escHtml(person.regNo)}</span></div>` : '',
    person.economicCode ? `<div class="party-row"><span class="label">کد اقتصادی:</span><span>${escHtml(person.economicCode)}</span></div>` : '',
    person.nationalId ? `<div class="party-row"><span class="label">شناسه ملی:</span><span>${escHtml(person.nationalId)}</span></div>` : '',
    person.tel ? `<div class="party-row"><span class="label">تلفن:</span><span>${escHtml(person.tel)}</span></div>` : '',
    person.fax ? `<div class="party-row"><span class="label">فکس:</span><span>${escHtml(person.fax)}</span></div>` : '',
    person.postalCode ? `<div class="party-row"><span class="label">کد پستی:</span><span>${escHtml(person.postalCode)}</span></div>` : ''
  ].filter(Boolean).join('');
  
  return `<div class="party-box"><div class="party-box-header" style="background:${sectionHeaderBg}">${title}</div><div class="party-box-body">${rows}</div></div>`;
}

/**
 * Generate HTML for items table rows
 * @param {object} inv - Invoice object
 * @returns {string} HTML string for items table body
 */
function generateItemsHtml(inv) {
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
    
    // Apply discount per unit, then multiply by quantity
    if (discPct > 0) {
      itemDiscount = price * discPct / 100 * qty;
    } else if (discAmt > 0) {
      itemDiscount = discAmt * qty;
    }
    const net = gross - itemDiscount;
    const itemTax = calculateItemTax(item, inv);
    const itemTotal = net + itemTax;
    
    const discText = item.discountPercent > 0 
      ? formatNum(item.discountPercent) + '٪' 
      : (item.discountAmount > 0 ? formatCurrency(item.discountAmount, currency) : '');
    
    html += `
      <tr>
        <td style="text-align:center;width:4%">${formatNum(i+1)}</td>
        <td style="width:35%">${escHtml(item.description)||'—'}</td>
        <td style="text-align:center;width:10%">${formatNum(item.quantity)}</td>
        <td style="text-align:center;width:8%">${escHtml(item.unit)}</td>
        <td style="text-align:center;width:10%">${formatNum(item.unitPrice)}</td>
        <td style="text-align:center;width:10%">${discText}</td>
        ${inv.vatEnabled ? `<td style="text-align:center;font-weight:700;width:10%">${formatNum(itemTax)}</td>` : ''}
        <td style="text-align:center;font-weight:700;width:10%">${formatNum(itemTotal)}</td>
      </tr>
    `;
  });
  
  return html;
}

/**
 * Generate HTML for items table footer with total row
 * @param {object} inv - Invoice object
 * @param {object} inv - Invoice object
 * @returns {string} HTML string for items table footer
 */
function generateItemsFooter(inv) {
  if (!inv?.items || inv.items.length === 0) return '';
  
  const currency = inv.currency || 'IRR';
  
  // Calculate totals
  let subtotal = 0;
  let itemsDiscount = 0;
  
  inv.items.forEach(item => {
    const qty = safeNum(item.quantity);
    const price = safeNum(item.unitPrice);
    const gross = qty * price;
    
    let itemDisc = 0;
    const discPct = safeNum(item.discountPercent);
    const discAmt = safeNum(item.discountAmount);
    
    // Apply discount per unit, then multiply by quantity
    if (discPct > 0) {
      itemDisc = price * discPct / 100 * qty;
    } else if (discAmt > 0) {
      itemDisc = discAmt * qty;
    }
    
    subtotal += gross;
    itemsDiscount += itemDisc;
  });
  
  const afterItemsDisc = subtotal - itemsDiscount;
  const globalDiscPct = safeNum(inv.discountPercent);
  const globalDiscAmt = Math.round(afterItemsDisc * globalDiscPct / 100);
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
  
  const taxCol = inv.vatEnabled ? '<td style="text-align:center;font-weight:bold;width:10%"></td>' : '';
  
  return `
    <tfoot>
      <tr style="background:#f3f4f6;font-weight:bold">
        <td colspan="6" style="text-align:right;padding:8px;font-size:12px;color:#374151">جمع کل اقلام</td>
        ${taxCol}
        <td style="text-align:center;padding:8px;font-size:12px;color:#374151">${formatNum(grandTotal - itemsDiscount)}</td>
      </tr>
    </tfoot>
  `;
}

/**
 * Generate HTML for custom text elements positioned on the letterhead
 * @param {object} inv - Invoice object with customTexts array
 * @returns {string} HTML string for custom text elements
 */
function generateCustomTextsHTML(inv) {
  if (!inv?.customTexts || !Array.isArray(inv.customTexts) || inv.customTexts.length === 0) {
    return '';
  }

  return inv.customTexts.map(item => `
    <div data-custom-text-id="${item.id}" style="position:absolute;left:${item.x}px;top:${item.y}px;font-size:${item.fontSize}px;color:${item.color};font-weight:${item.isBold ? 'bold' : 'normal'};font-style:${item.isItalic ? 'italic' : 'normal'};z-index:10;cursor:move">
      ${escHtml(item.text)}
    </div>
  `).join('');
}

/**
 * Generate complete invoice HTML
 * @param {object} inv - Invoice object
 * @returns {string} Complete HTML string for the invoice
 */
export function generateInvoiceHTML(inv) {
  if (!inv) return '';
  
  // Determine accent color from logo
  const accentColor = inv?.seller.logoColor || '#92400E';
  const sectionHeaderBg = inv?.seller.logoColor 
    ? `rgba(${hexToRgb(accentColor).r}, ${hexToRgb(accentColor).g}, ${hexToRgb(accentColor).b}, 0.1)`
    : '#ece7df';
  
  const currency = inv.currency || 'IRR';
  const currencyLabel = currencySymbols[currency] || currency;
  
  // Calculate all totals
  let subtotal = 0;
  let itemsDiscount = 0;
  
  if (inv.items) {
    inv.items.forEach(item => {
      const qty = safeNum(item.quantity);
      const price = safeNum(item.unitPrice);
      const gross = qty * price;
      
      let itemDisc = 0;
      const discPct = safeNum(item.discountPercent);
      const discAmt = safeNum(item.discountAmount);
      
      // Apply discount per unit, then multiply by quantity
      if (discPct > 0) {
        itemDisc = price * discPct / 100 * qty;
      } else if (discAmt > 0) {
        itemDisc = discAmt * qty;
      }
      
      subtotal += gross;
      itemsDiscount += itemDisc;
    });
  }
  
  const afterItemsDisc = subtotal - itemsDiscount;
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
  
  // Build discount lines
  let discountLine = '';
  if (itemsDiscount > 0) {
    discountLine += `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>تخفیف اقلام</span><span style="color:#DC2626">− ${formatCurrency(itemsDiscount, currency)}</span></div>`;
  }
  if (discPctGlobal > 0) {
    discountLine += `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>تخفیف کلی (${formatNum(discPctGlobal)}٪)</span><span style="color:#DC2626">− ${formatCurrency(globalDiscAmt, currency)}</span></div>`;
  }
  
  // Build VAT line
  let vatLine = '';
  if (inv.vatEnabled) {
    const vatLabel = inv.priceIncludesVat 
      ? `مالیات بر ارزش افزوده (${formatNum(vatPct)}٪) — شامل در قیمت` 
      : `مالیات بر ارزش افزوده (${formatNum(vatPct)}٪)`;
    vatLine = `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${vatLabel}</span><span style="color:#7C3AED">${formatCurrency(vat, currency)}</span></div>`;
  }
  
  // Build other charges line
  let otherLine = '';
  if (other > 0) {
    otherLine = `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>سایر هزینه‌ها</span><span>${formatCurrency(other, currency)}</span></div>`;
  }
  
  // Build toman line
  let tomanLine = '';
  if (inv.showToman) {
    tomanLine = `<div style="display:flex;justify-content:space-between;padding:2px 0;color:#6B7280;margin-top:7px"><span>معادل تومانی</span><span>${formatToman(grandTotal)}</span></div>`;
  }
  
  // Build logo HTML
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
  
  // Build date and validity strings
  const dateStr = escHtml(inv.invoiceDate) + (inv.invoiceTimeEnabled && inv.invoiceTime ? ' — ساعت ' + escHtml(inv.invoiceTime) : '');
  const validStr = escHtml(inv.validityDate) + (inv.validityTimeEnabled && inv.validityTime ? ' — ساعت ' + escHtml(inv.validityTime) : '');
  
  // Build signature HTML
  let sigHtml = '';
  if (inv.seller?.signatureImage) {
    sigHtml = `<img src="${inv.seller.signatureImage}" style="max-height:85px;max-width:200px;object-fit:contain;position:relative;bottom:0;right:0" alt="امضا">`;
  } else {
    sigHtml = `<div style="border-bottom:0px solid #444;width:190px;height:0px;position:absolute;bottom:0;right:0"></div>`;
  }
  
  // Generate items HTML
  const itemsHtml = generateItemsHtml(inv);
  const itemsFooter = generateItemsFooter(inv);
  
  // Generate party boxes
  const sellerBox = makePartyBox('فروشنده', inv.seller, accentColor);
  const buyerBox = makePartyBox('خریدار', inv.buyer, accentColor);
  
  // Build table header based on VAT enabled
  const taxHeader = inv.vatEnabled
    ? `<th style="width:10%;text-align:center;background:${sectionHeaderBg}">جمع عوارض و مالیات (ریال)</th>`
    : '';
  
  // Check if letterhead is enabled
  const hasLetterhead = inv.showLetterhead && inv.letterheadImage;
  
  // Get proforma positioning and scaling values
  const proformaX = inv?.proformaX || 0;
  const proformaY = inv?.proformaY || 0;
  const proformaScale = (inv?.proformaScale || 100) / 100;
  
  // Build the complete HTML with base wrapper for consistent styling
  const content = `
    <style>${getInvoiceCSS(inv)}</style>
    <div class="invoice-root" ${hasLetterhead ? 'data-letterhead="true"' : ''} style="--proforma-x: ${proformaX}px; --proforma-y: ${proformaY}px; --proforma-scale: ${proformaScale};">
    <div class="proforma-content">
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
          <th style="width:35%;text-align:center;background:${sectionHeaderBg}">شرح کالا/خدمات</th>
          <th style="width:10%;text-align:center;background:${sectionHeaderBg}">مقدار</th>
          <th style="width:8%;text-align:center;background:${sectionHeaderBg}">واحد</th>
          <th style="width:10%;text-align:center;background:${sectionHeaderBg}">مبلغ واحد (ریال)</th>
          <th style="width:10%;text-align:center;background:${sectionHeaderBg}">مبلغ تخفیف (ریال)</th>
          ${taxHeader}
          <th style="width:10%;text-align:center;background:${sectionHeaderBg}">جمع کل (ریال)</th>
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
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="text-align:right;position:relative;height:80px;min-width:200px">
          <div style="margin-bottom:4px;margin-right:20px"><strong>مهر و امضای فروشنده</strong></div>
          ${sigHtml}
        </div>
        
        <div style="text-align:left;margin-left:20px"><strong>مهر و امضای خریدار</strong></div>
      </div>
    </div>
    </div>
    ${generateCustomTextsHTML(inv)}
    </div>
  `;
  
  return content;
}

/**
 * Get @page size rule for print/export
 * @param {object} letterheadSettings - Letterhead settings
 * @returns {string} @page CSS rule
 */
function getPageRule(letterheadSettings = null) {
  const size = letterheadSettings?.letterheadSize || 'A4';
  const orientation = letterheadSettings?.letterheadOrientation || 'portrait';
  
  // Map size names to CSS size values
  const sizeMap = {
    A4: 'A4',
    A5: 'A5',
    Letter: 'letter',
    Legal: 'legal'
  };
  
  // For Custom size, use the custom dimensions
  let cssSize = sizeMap[size] || 'A4';
  if (size === 'Custom') {
    const width = letterheadSettings?.letterheadWidth || 297;
    const height = letterheadSettings?.letterheadHeight || 210;
    cssSize = `${width}mm ${height}mm`;
  }
  
  return `size: ${cssSize} ${orientation}; margin: 6mm;`;
}

/**
 * Generate a complete standalone HTML document for export/print.
 * Includes font declarations, invoice CSS, and @page rules.
 * @param {object} inv - Invoice object
 * @returns {string} Complete HTML document string
 */
export function generateExportHTML(inv) {
  const content = generateInvoiceHTML(inv);
  const pageRule = getPageRule(inv);

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>پیش‌فاکتور ${escHtml(inv.invoiceNumber || '')}</title>
  <style>
    @font-face {
      font-family: 'IRANSansX';
      src: url('/fonts/IRANSansX-Regular.woff') format('woff');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'IRANSansX';
      src: url('/fonts/IRANSansX-Bold.woff') format('woff');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'IRANSansX';
      src: url('/fonts/IRANSansX-ExtraBold.woff') format('woff');
      font-weight: 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'IRANSansX';
      src: url('/fonts/IRANSansX-Black.woff') format('woff');
      font-weight: 900;
      font-style: normal;
      font-display: swap;
    }

    @page { ${pageRule} }

    body {
      margin: 0;
      padding: 0;
      background: #fff;
    }

    /* Remove the <style> tag's visibility if it leaks */
    style { display: none; }

    ${getInvoiceCSS(inv)}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}
