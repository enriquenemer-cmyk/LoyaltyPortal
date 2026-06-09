'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RawRow = {
  nombre: string;
  razon: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
};

type ParsedRow = RawRow & {
  _index: number;
  _valid: boolean;
  _errors: string[];
};

type ImportResult = {
  index: number;
  nombre: string;
  ok: boolean;
  message: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const REQUIRED_COLS: (keyof RawRow)[] = ['nombre', 'razon', 'descripcion', 'fecha_inicio', 'fecha_fin'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
    .replace(/[áa]/g, 'a').replace(/[éè]/g, 'e').replace(/[íi]/g, 'i')
    .replace(/[óo]/g, 'o').replace(/[úu]/g, 'u')
    .replace(/\s+/g, '_');
}

function parseCSVText(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(normalizeHeader);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ''; });

    const errors: string[] = [];
    REQUIRED_COLS.forEach(col => {
      if (!obj[col] || obj[col].trim() === '') errors.push(col);
    });

    rows.push({
      nombre: obj['nombre'] ?? '',
      razon: obj['razon'] ?? '',
      descripcion: obj['descripcion'] ?? '',
      fecha_inicio: obj['fecha_inicio'] ?? '',
      fecha_fin: obj['fecha_fin'] ?? '',
      _index: i,
      _valid: errors.length === 0,
      _errors: errors,
    });
  }
  return rows;
}

async function parseXLSX(file: File): Promise<ParsedRow[]> {
  try {
    const XLSX = await import('xlsx');
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    return raw.map((r, idx) => {
      const norm: Record<string, string> = {};
      Object.keys(r).forEach(k => { norm[normalizeHeader(k)] = String(r[k]); });

      const errors: string[] = [];
      REQUIRED_COLS.forEach(col => {
        if (!norm[col] || norm[col].trim() === '') errors.push(col);
      });

      return {
        nombre: norm['nombre'] ?? '',
        razon: norm['razon'] ?? '',
        descripcion: norm['descripcion'] ?? '',
        fecha_inicio: norm['fecha_inicio'] ?? '',
        fecha_fin: norm['fecha_fin'] ?? '',
        _index: idx + 1,
        _valid: errors.length === 0,
        _errors: errors,
      };
    });
  } catch {
    return [];
  }
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const TEMPLATE_CSV =
  'nombre,razon,descripcion,fecha_inicio,fecha_fin\n' +
  '2x1 en principales,Por tu visita especial,Disfruta dos principales al precio de uno en cualquier opción del menú.,2026-01-01,2026-12-31\n' +
  'Bebida gratis,Premio de fidelidad,Una bebida de tu elección completamente gratis con la compra de cualquier principal.,2026-01-01,2026-06-30\n';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ImportarPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter(r => r._valid);
  const errorRows = rows.filter(r => !r._valid);
  const previewRows = rows.slice(0, 10);

  // -------------------------------------------------------------------------
  // File handling
  // -------------------------------------------------------------------------
  const handleFile = useCallback(async (file: File) => {
    setParseError('');
    setResults([]);
    setImportProgress(0);
    setFileName(file.name);

    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv');

    if (!isXLSX && !isCSV) {
      setParseError('Solo se aceptan archivos .csv y .xlsx');
      setRows([]);
      return;
    }

    let parsed: ParsedRow[] = [];
    if (isXLSX) {
      parsed = await parseXLSX(file);
      if (parsed.length === 0) {
        setParseError('No se pudo leer el archivo XLSX. Asegúrate de que tenga filas con las columnas requeridas.');
      }
    } else {
      const text = await file.text();
      parsed = parseCSVText(text);
      if (parsed.length === 0) {
        setParseError('El archivo CSV no tiene datos o no pudo ser leído.');
      }
    }
    setRows(parsed);
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------
  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    setImportTotal(validRows.length);
    setResults([]);

    const collected: ImportResult[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const res = await fetch('/api/prizes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: row.nombre,
            reason: row.razon,
            description: row.descripcion,
            start_date: row.fecha_inicio,
            end_date: row.fecha_fin,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          collected.push({ index: row._index, nombre: row.nombre, ok: true, message: data.prize?.id ?? 'ok' });
        } else {
          collected.push({ index: row._index, nombre: row.nombre, ok: false, message: data.error ?? 'Error desconocido' });
        }
      } catch (err) {
        collected.push({ index: row._index, nombre: row.nombre, ok: false, message: 'Error de conexión' });
      }
      setImportProgress(i + 1);
      setResults([...collected]);
    }

    setImporting(false);
  }

  // -------------------------------------------------------------------------
  // Download results CSV
  // -------------------------------------------------------------------------
  function downloadResults() {
    const header = 'fila,nombre,estado,mensaje\n';
    const lines = results.map(r =>
      `${r.index},"${r.nombre}",${r.ok ? 'exitoso' : 'fallido'},"${r.message}"`
    ).join('\n');
    downloadCSV(header + lines, 'resultados-importacion.csv');
  }

  const successCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;
  const showResults = results.length > 0 && !importing;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/generate"
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#E8521A] font-semibold mb-4 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Generar
          </Link>
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 border border-orange-200">
            <span className="w-2 h-2 rounded-full bg-[#E8521A] shrink-0" />
            Importacion masiva
          </div>
          <h1 className="text-3xl font-black text-[#1C1917] tracking-tight border-l-4 border-[#E8521A] pl-4">
            Importar desde CSV / Excel
          </h1>
          <p className="text-stone-500 mt-2 text-sm pl-4">
            Sube un archivo con multiples premios y genéralos en un solo paso.
          </p>
        </div>

        <div className="space-y-6">

          {/* Template download */}
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-bold text-[#1C1917]">Descargar plantilla CSV</p>
              <p className="text-xs text-stone-500 mt-0.5">Columnas: nombre, razon, descripcion, fecha_inicio, fecha_fin</p>
            </div>
            <button
              onClick={() => downloadCSV(TEMPLATE_CSV, 'plantilla-premios.csv')}
              className="flex items-center gap-2 text-sm font-bold text-[#E8521A] bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors px-4 py-2 rounded-xl"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar plantilla
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-12 px-6 text-center ${
              dragOver
                ? 'border-[#E8521A] bg-orange-50'
                : 'border-[#E8E3DC] bg-white hover:border-orange-300 hover:bg-orange-50/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: dragOver ? '#E8521A' : '#FFF0E8' }}>
              <svg className={`w-6 h-6 ${dragOver ? 'text-white' : 'text-[#E8521A]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            {fileName ? (
              <>
                <p className="text-sm font-bold text-[#1C1917]">{fileName}</p>
                <p className="text-xs text-stone-500 mt-1">Haz clic para cambiar el archivo</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-stone-700">Arrastra tu archivo aqui o haz clic</p>
                <p className="text-xs text-stone-500 mt-1">Acepta .csv y .xlsx</p>
              </>
            )}
          </div>

          {parseError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {parseError}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden" style={{ borderTop: '3px solid #E8521A' }}>
              <div className="px-5 py-4 border-b border-[#E8E3DC] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#1C1917]">
                    Vista previa{rows.length > 10 ? ` (primeras 10 de ${rows.length})` : ` (${rows.length} filas)`}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                    {validRows.length} validas
                  </span>
                  {errorRows.length > 0 && (
                    <span className="text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                      {errorRows.length} con errores
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                      {['#', 'Nombre', 'Razon', 'Descripcion', 'Inicio', 'Fin', 'Estado'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-bold text-stone-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map(row => (
                      <tr
                        key={row._index}
                        className={`border-b border-[#E8E3DC] last:border-0 ${!row._valid ? 'bg-red-50' : 'hover:bg-[#FAFAF9]'}`}
                      >
                        <td className="px-3 py-2.5 text-stone-400 font-mono">{row._index}</td>
                        <td className="px-3 py-2.5 font-semibold text-stone-800 max-w-[120px] truncate">
                          {row.nombre || <span className="text-red-400 italic">vacío</span>}
                        </td>
                        <td className="px-3 py-2.5 text-stone-600 max-w-[120px] truncate">
                          {row.razon || <span className="text-red-400 italic">vacío</span>}
                        </td>
                        <td className="px-3 py-2.5 text-stone-600 max-w-[140px] truncate">
                          {row.descripcion || <span className="text-red-400 italic">vacío</span>}
                        </td>
                        <td className="px-3 py-2.5 text-stone-600 whitespace-nowrap font-mono">
                          {row.fecha_inicio || <span className="text-red-400 italic">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-stone-600 whitespace-nowrap font-mono">
                          {row.fecha_fin || <span className="text-red-400 italic">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {row._valid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-[10px] font-bold">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 text-[10px] font-bold" title={`Faltan: ${row._errors.join(', ')}`}>
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {errorRows.length > 0 && (
                <div className="px-5 py-3 bg-red-50 border-t border-red-100 text-xs text-red-700">
                  Las filas en rojo tienen campos obligatorios vacios. Corrigelas en tu archivo y vuelve a subir.
                </div>
              )}
            </div>
          )}

          {/* Import button + progress */}
          {rows.length > 0 && validRows.length > 0 && !showResults && (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5 space-y-4">
              {importing && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-stone-700">
                      Importando {importProgress} de {importTotal}...
                    </span>
                    <span className="text-sm font-bold text-[#E8521A]">
                      {importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-orange-100 rounded-full h-2 overflow-hidden border border-orange-200">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%`,
                        background: 'linear-gradient(90deg,#E8521A,#C2410C)',
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full disabled:opacity-60 text-white font-black py-4 rounded-2xl transition-all text-base flex items-center justify-center gap-2.5"
                style={{ background: 'linear-gradient(135deg,#E8521A,#C2410C)', boxShadow: importing ? 'none' : '0 8px 24px rgba(232,82,26,0.38)' }}
              >
                {importing ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Importando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Importar {validRows.length} {validRows.length === 1 ? 'premio' : 'premios'}
                    {errorRows.length > 0 && ` (${errorRows.length} con errores seran omitidos)`}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Results */}
          {showResults && (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden" style={{ borderTop: `3px solid ${failCount === 0 ? '#059669' : '#E8521A'}` }}>
              <div className="px-5 py-4 border-b border-[#E8E3DC] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#1C1917]">Resultado de la importacion</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    <span className="text-emerald-700 font-bold">{successCount} importados exitosamente</span>
                    {failCount > 0 && (
                      <>, <span className="text-red-600 font-bold">{failCount} fallaron</span></>
                    )}
                  </p>
                </div>
                <button
                  onClick={downloadResults}
                  className="flex items-center gap-2 text-xs font-bold text-[#E8521A] bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors px-3 py-1.5 rounded-xl"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar CSV
                </button>
              </div>

              <div className="divide-y divide-[#E8E3DC] max-h-72 overflow-y-auto">
                {results.map(r => (
                  <div key={r.index} className={`flex items-center gap-3 px-5 py-2.5 ${!r.ok ? 'bg-red-50' : ''}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${r.ok ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {r.ok ? (
                        <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className="text-xs font-semibold text-stone-800 flex-1 truncate">{r.nombre}</span>
                    <span className={`text-xs ${r.ok ? 'text-stone-400 font-mono' : 'text-red-600 font-semibold'} truncate max-w-[140px]`}>
                      {r.ok ? r.message : r.message}
                    </span>
                  </div>
                ))}
              </div>

              {/* Re-import button */}
              <div className="px-5 py-4 border-t border-[#E8E3DC]">
                <button
                  onClick={() => {
                    setRows([]);
                    setFileName('');
                    setResults([]);
                    setImportProgress(0);
                  }}
                  className="text-sm font-bold text-stone-600 hover:text-[#E8521A] transition-colors"
                >
                  + Importar otro archivo
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
