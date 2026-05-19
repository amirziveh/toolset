import { useInvoiceStore } from '@/stores/invoice';
import { formatCurrency, formatNum, formatToman, amountToWords, safeNum, currencySymbols } from '@/utils/number-format';
import { generateInvoiceHTML, generateExportHTML, getInvoiceCSS, getLetterheadDimensions, mmToPx } from '@/utils/invoiceTemplate';

/**
 * Composable for export functionality (PDF, PNG)
 */
export function useExport() {
  const store = useInvoiceStore();

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (info, success, error)
   */
  const showToast = (message, type) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    // Set background color based on type
    if (type === 'success') {
      toast.style.backgroundColor = '#10B981';
    } else if (type === 'error') {
      toast.style.backgroundColor = '#EF4444';
    } else {
      toast.style.backgroundColor = '#3B82F6';
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  /**
   * Get page dimensions based on letterhead settings
   * @param {object} inv - Invoice object
   * @returns {object} { width, height } in mm
   */
  const getPageDimensions = (inv) => {
    const settings = {
      letterheadSize: inv?.letterheadSize || 'A4',
      letterheadOrientation: inv?.letterheadOrientation || 'landscape',
      letterheadWidth: inv?.letterheadWidth || 297,
      letterheadHeight: inv?.letterheadHeight || 210
    };
    
    const dims = getLetterheadDimensions(settings);
    // Convert pixels back to mm (approximate)
    return {
      width: Math.round(dims.width / 3.78),
      height: Math.round(dims.height / 3.78)
    };
  };

  /**
   * Create a clean off-screen container for export
   * @param {object} inv - Invoice object
   * @returns {HTMLElement} Container element with invoice HTML
   */
  const createExportContainer = (inv) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed; left:-9999px; direction:rtl; font-family:\'IRANSansX\', sans-serif;';
    container.innerHTML = generateInvoiceHTML(inv);
    
    // Only set direction and font-family on elements that don't have explicit styles
    // This preserves position:absolute for signature elements
    container.querySelectorAll('*').forEach(child => {
      if (!child.style.direction) {
        child.style.direction = 'rtl';
      }
      if (!child.style.fontFamily) {
        child.style.fontFamily = "'IRANSansX', sans-serif";
      }
    });
    
    return container;
  };

  /**
   * Export invoice as PNG image
   */
  const exportImage = async () => {
    const html2canvas = (await import('html2canvas')).default;
    
    const inv = store.currentInvoice;
    if (!inv) {
      throw new Error('No invoice data available');
    }

    // Wait for fonts to load
    await document.fonts.ready;

    showToast('در حال تولید تصویر...', 'info');

    try {
      // Create clean off-screen container
      const container = createExportContainer(inv);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        // Allow content to be captured even if it's outside the initial bounds
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
        x: 0,
        y: 0,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      // Clean up
      document.body.removeChild(container);

      const link = document.createElement('a');
      link.download = (inv?.invoiceNumber || 'proforma') + '.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('تصویر ذخیره شد', 'success');
    } catch (err) {
      console.error(err);
      showToast('خطا در تولید تصویر', 'error');
    }
  };

  /**
   * Export invoice as PDF
   */
  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    const inv = store.currentInvoice;
    if (!inv) {
      throw new Error('No invoice data available');
    }

    // Wait for fonts to load
    await document.fonts.ready;

    showToast('در حال تولید PDF...', 'info');

    try {
      // Create clean off-screen container
      const container = createExportContainer(inv);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        // Allow content to be captured even if it's outside the initial bounds
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
        x: 0,
        y: 0,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      // Clean up
      document.body.removeChild(container);

      // Determine PDF format and orientation
      const size = inv?.letterheadSize || 'A4';
      const orientation = inv?.letterheadOrientation || 'landscape';
      
      const pdf = new jsPDF({
        unit: 'mm',
        format: size.toLowerCase(),
        orientation: orientation,
        hotfixes: ["px_scaling"],
        usePureCanvas: true
      });

      const imgWidth = orientation === 'landscape' 
        ? (size === 'A4' ? 297 : size === 'A5' ? 210 : size === 'Letter' ? 279 : size === 'Legal' ? 356 : 297)
        : (size === 'A4' ? 210 : size === 'A5' ? 148 : size === 'Letter' ? 216 : size === 'Legal' ? 216 : 210);
      const pageHeight = orientation === 'landscape'
        ? (size === 'A4' ? 210 : size === 'A5' ? 148 : size === 'Letter' ? 279 : size === 'Legal' ? 216 : 210)
        : (size === 'A4' ? 297 : size === 'A5' ? 210 : size === 'Letter' ? 279 : size === 'Legal' ? 356 : 297);
      
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save((inv?.invoiceNumber || 'proforma') + '.pdf');
      showToast('PDF با موفقیت ذخیره شد', 'success');
    } catch (err) {
      console.error(err);
      showToast('خطا در تولید PDF: ' + err.message, 'error');
    }
  };

  /**
   * Print the invoice
   */
  const printInvoice = () => {
    const inv = store.currentInvoice;
    if (!inv) return;
    
    // Generate export HTML with letterhead support
    const exportHtml = generateExportHTML(inv);
    
    // Open print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('لطفاً از بلوکهای پنجره جلوگیری نشده استفاده کنید', 'error');
      return;
    }
    
    // Write the complete export HTML
    printWindow.document.write(exportHtml);
    printWindow.document.close();
    
    // Print and close
    printWindow.print();
    printWindow.close();
  };

  /**
   * Download invoice as HTML file
   */
  const downloadHTML = () => {
    const inv = store.currentInvoice;
    if (!inv) return;
    
    // Generate export HTML with letterhead support
    const exportHtml = generateExportHTML(inv);
    
    // Create blob and download
    const blob = new Blob([exportHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (inv?.invoiceNumber || 'proforma') + '.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Export invoices to JSON backup
   */
  const exportBackup = () => {
    const invoices = store.savedInvoices;
    const data = JSON.stringify(invoices, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proforma_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Import invoices from JSON backup
   * @param {File} file - JSON file
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   */
  const importBackup = (file, onSuccess, onError) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          throw new Error('Invalid file format');
        }
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
        if (onSuccess) onSuccess(count);
      } catch (err) {
        if (onError) onError(err.message);
      }
    };
    reader.readAsText(file);
  };

  return {
    exportImage,
    exportPDF,
    printInvoice,
    downloadHTML,
    exportBackup,
    importBackup
  };
}
