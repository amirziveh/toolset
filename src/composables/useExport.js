import { useInvoiceStore } from '@/stores/invoice';
import { formatCurrency, formatNum, formatToman, amountToWords, safeNum, currencySymbols } from '@/utils/number-format';
import { generateInvoiceHTML } from '@/utils/invoiceTemplate';

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
      // Create clean off-screen container with A4 dimensions
      const container = createExportContainer(inv);
      container.style.width = '1123px';
      container.style.height = '794px';
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
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
      // Create clean off-screen container with A4 dimensions
      const container = createExportContainer(inv);
      container.style.width = '1123px';
      container.style.height = '794px';
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Clean up
      document.body.removeChild(container);

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
    
    // Generate HTML using the template function
    const invoiceHtml = generateInvoiceHTML(inv);
    
    // Open print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('لطفاً از بلوکهای پنجره جلوگیری نشده استفاده کنید', 'error');
      return;
    }
    
    // Write HTML with IRANSansX font
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>پیش فاکتور</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; font-family: 'IRANSansX', sans-serif; direction: rtl; }
            .invoice-preview { width: 1123px; height: 794px; margin: 0; box-shadow: none; }
            .a4-container { padding: 0; background: white; }
          }
        </style>
      </head>
      <body style="font-family: 'IRANSansX', sans-serif; direction: rtl;">
        <div class="invoice-preview a4-container">
          ${invoiceHtml}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Print and close
    printWindow.print();
    printWindow.close();
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
