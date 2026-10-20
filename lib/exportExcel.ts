'use client';

// Exporta un arreglo de filas (objetos planos) a un archivo .xlsx real,
// descargado directo en el navegador — sin backend, usando la librería
// `xlsx` que ya estaba instalada. Reutilizable desde cualquier reporte.
export async function exportToExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
