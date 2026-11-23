export function PrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @media screen {
        .report-container {
          min-height: 297mm;
        }
        .print-a4 { width: 210mm; }
        .print-a4-landscape { width: 297mm; min-height: 210mm; }
        .print-letter { width: 8.5in; min-height: 11in; }
        .print-legal { width: 8.5in; min-height: 14in; }
        .print-thermal { width: 80mm; min-height: auto; }
      }
      
      @media print {
        @page {
          margin: 10mm;
        }
        @page :first {
          margin-top: 0;
        }
        body {
          margin: 0;
          padding: 0;
          background: white;
          color: black;
          font-size: 10pt;
        }
        .report-container {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        .no-print {
          display: none !important;
        }
        .page-break-before {
          page-break-before: always;
          break-before: page;
        }
        .page-break-after {
          page-break-after: always;
          break-after: page;
        }
        .avoid-break-inside {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Repeating table headers */
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
      }
    `}} />
  );
}
