import { useInvoiceStore } from '@/stores/invoice';
import { formatCurrency, formatNum, formatToman, amountToWords, safeNum, currencySymbols } from '@/utils/number-format';

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
   * Export invoice as PNG image
   */
  const exportImage = async () => {
    const html2canvas = (await import('html2canvas')).default;
    
    const element = document.getElementById('print-area');
    if (!element) {
      throw new Error('Print area not found');
    }

    // Wait for fonts to load and add small delay
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 800));

    // Ensure RTL direction
    element.style.direction = 'rtl';
    element.style.unicodeBidi = 'embed';
    element.querySelectorAll('*').forEach(child => {
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(child.tagName)) {
        child.style.direction = 'rtl';
        child.style.unicodeBidi = 'embed';
        child.style.fontFamily = "'Vazirmatn', sans-serif";
      }
    });

    showToast('در حال تولید تصویر...', 'info');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        letterRendering: false,
        allowTaint: true,
        foreignObjectRendering: false,
        onclone: function(clonedDoc) {
          const clonedEl = clonedDoc.getElementById('print-area');
          if (clonedEl) {
            clonedEl.style.direction = 'rtl';
            clonedEl.style.unicodeBidi = 'embed';
            clonedEl.querySelectorAll('*').forEach(child => {
              if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(child.tagName)) {
                child.style.direction = 'rtl';
                child.style.unicodeBidi = 'embed';
                child.style.fontFamily = "'Vazirmatn', sans-serif";
              }
            });
            // Force vertical alignment in cloned table cells
            clonedEl.querySelectorAll('th, td').forEach(cell => {
              cell.style.display = 'table-cell';
              cell.style.verticalAlign = 'middle';
              cell.style.lineHeight = '1';
              cell.style.paddingTop = '10px';
              cell.style.paddingBottom = '10px';
            });
          }
          clonedDoc.documentElement.setAttribute('dir', 'rtl');
          clonedDoc.body.style.direction = 'rtl';
        }
      });

      const link = document.createElement('a');
      link.download = (store.currentInvoice?.invoiceNumber || 'proforma') + '.png';
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
    
    const element = document.getElementById('print-area');
    if (!element) {
      throw new Error('Print area not found');
    }

    // Wait for fonts to load and add small delay
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 800));

    showToast('در حال تولید PDF...', 'info');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        letterRendering: true,
        allowTaint: true,
        foreignObjectRendering: false,
        onclone: function(clonedDoc) {
          const clonedEl = clonedDoc.getElementById('print-area');
          if (clonedEl) {
            clonedEl.style.direction = 'rtl';
            clonedEl.style.unicodeBidi = 'embed';
            clonedEl.querySelectorAll('*').forEach(child => {
              if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(child.tagName)) {
                child.style.direction = 'rtl';
                child.style.unicodeBidi = 'embed';
                child.style.fontFamily = "'Vazirmatn', sans-serif";
              }
            });
            // Force vertical alignment in cloned table cells
            clonedEl.querySelectorAll('th, td').forEach(cell => {
              cell.style.display = 'table-cell';
              cell.style.verticalAlign = 'middle';
              cell.style.lineHeight = '1';
              cell.style.paddingTop = '10px';
              cell.style.paddingBottom = '10px';
            });
          }
          clonedDoc.documentElement.setAttribute('dir', 'rtl');
          clonedDoc.body.style.direction = 'rtl';
        }
      });

      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape',
        hotfixes: ["px_scaling"],
        usePureCanvas: true
      });

      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
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
      
      pdf.save((store.currentInvoice?.invoiceNumber || 'proforma') + '.pdf');
      showToast('PDF با موفقیت ذخیره شد', 'success');
    } catch (err) {
      console.error(err);
      showToast('خطا در تولید PDF: ' + err.message, 'error');
    }
  };

  /**
   * Print the invoice
   * Uses a clone approach to handle the nested DOM structure in Vue
   */
  const printInvoice = () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;
    
    // Create a clone of the print area
    const clone = printArea.cloneNode(true);
    clone.id = 'print-area-clone';
    
    // Add clone to body
    document.body.appendChild(clone);
    
    // Add print-specific style
    const style = document.createElement('style');
    style.id = 'temp-print-style';
    style.textContent = `
      @media print {
        body > *:not(#print-area-clone) { display: none !important; }
        #print-area-clone {
          display: block !important;
          position: static !important;
          width: 100% !important;
        }
        .invoice-preview {
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 1123px !important;
          height: 794px !important;
          max-width: 1123px !important;
        }
        .a4-container {
          padding: 0 !important;
          background: white !important;
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Print
    window.print();
    
    // Clean up after printing
    setTimeout(() => {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      const tempStyle = document.getElementById('temp-print-style');
      if (tempStyle) {
        tempStyle.remove();
      }
    }, 500);
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
    exportBackup,
    importBackup
  };
}
