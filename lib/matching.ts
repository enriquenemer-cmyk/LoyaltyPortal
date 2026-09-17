// Motor de conciliación bancaria: empareja compras a proveedores (facturas)
// contra movimientos bancarios reales, usando coincidencia de nombre (tokens +
// similitud de texto) y de importe con tolerancia. Determinista, sin IA ni
// costo — ideal para revisión humana asistida.

function stripAccents(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

export function normalizeText(s: string | null | undefined): string {
  return stripAccents((s ?? '').toLowerCase()).trim();
}

const STOPWORDS_EMPRESA = new Set([
  'sl', 'sa', 'sau', 'slu', 'sae', 'sociedad', 'anonima', 'limitada',
  's.l.', 's.a.', 's.l', 's.a', 'de', 'del', 'la', 'el', 'y', 'sas', 'ltda', 'cia', 'inc',
]);

function tokens(text: string): string[] {
  const norm = normalizeText(text);
  return norm
    .split(/\s+/)
    .map((t) => t.replace(/^[,.()|]+|[,.()|]+$/g, ''))
    .filter((t) => t.length >= 3);
}

// Ratio de similitud tipo Ratcliff/Obershelp (equivalente a difflib.SequenceMatcher.ratio()):
// 2 * (caracteres en bloques comunes) / (longitud total de ambas cadenas).
function findLongestMatch(a: string, b: string, aLo: number, aHi: number, bLo: number, bHi: number): [number, number, number] {
  let bestI = aLo, bestJ = bLo, bestSize = 0;
  let j2len = new Map<number, number>();
  for (let i = aLo; i < aHi; i++) {
    const newJ2len = new Map<number, number>();
    for (let j = bLo; j < bHi; j++) {
      if (a[i] === b[j]) {
        const k = (j2len.get(j - 1) ?? 0) + 1;
        newJ2len.set(j, k);
        if (k > bestSize) {
          bestI = i - k + 1;
          bestJ = j - k + 1;
          bestSize = k;
        }
      }
    }
    j2len = newJ2len;
  }
  return [bestI, bestJ, bestSize];
}

function matchingBlocksSize(a: string, b: string, aLo: number, aHi: number, bLo: number, bHi: number): number {
  const [i, j, k] = findLongestMatch(a, b, aLo, aHi, bLo, bHi);
  if (k === 0) return 0;
  let total = k;
  if (aLo < i && bLo < j) total += matchingBlocksSize(a, b, aLo, i, bLo, j);
  if (i + k < aHi && j + k < bHi) total += matchingBlocksSize(a, b, i + k, aHi, j + k, bHi);
  return total;
}

function sequenceRatio(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const matches = matchingBlocksSize(a, b, 0, a.length, 0, b.length);
  return (2 * matches) / (a.length + b.length);
}

/**
 * Compara el proveedor/concepto de una compra contra el texto libre de un
 * movimiento bancario. Exige al menos 2 tokens distintivos cuando el nombre
 * tiene 2 o más (no solo 1 de N) para evitar falsos positivos por una sola
 * palabra genérica compartida entre proveedores del mismo rubro.
 */
export function nombreMatch(proveedor: string | null | undefined, textoObjetivo: string | null | undefined): boolean {
  if (!proveedor || !textoObjetivo) return false;
  const tokensP = tokens(proveedor).filter((t) => !STOPWORDS_EMPRESA.has(t.replace(/\.$/, '')));
  if (tokensP.length === 0) return false;
  const normObjetivo = normalizeText(textoObjetivo);
  const hits = tokensP.filter((t) => normObjetivo.includes(t)).length;
  const umbralHits = tokensP.length === 1 ? 1 : 2;
  if (hits >= umbralHits) return true;
  return sequenceRatio(normalizeText(proveedor), normObjetivo) >= 0.6;
}

const IMPORTE_TOLERANCIA = 0.02;

export function valorMatch(a: number | null | undefined, b: number | null | undefined, tolerancia = IMPORTE_TOLERANCIA): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return Math.abs(Math.abs(a) - Math.abs(b)) <= tolerancia;
}

export type LineaFactura = { id: string; proveedor?: string | null; concepto?: string | null; importe?: number | null };
export type LineaMovimiento = { id: string; texto_completo?: string | null; importe?: number | null };

export type ResultadoCruce = {
  coincide_proveedor: boolean;
  coincide_nombre: boolean;
  coincide_valor: boolean;
  num_coincidencias: number;
  cumple_regla: boolean;
};

export function evaluarCruce(lineaFactura: LineaFactura, lineaMovimiento: LineaMovimiento): ResultadoCruce {
  const coincideProveedor = nombreMatch(lineaFactura.proveedor, lineaMovimiento.texto_completo);
  const coincideNombre = nombreMatch(lineaFactura.concepto, lineaMovimiento.texto_completo);
  const coincideValor = valorMatch(lineaFactura.importe, lineaMovimiento.importe);
  const total = [coincideProveedor, coincideNombre, coincideValor].filter(Boolean).length;
  // El importe es obligatorio: que coincida el nombre sin que cuadre el
  // dinero no es un cruce válido.
  const cumpleRegla = coincideValor && (coincideProveedor || coincideNombre);
  return {
    coincide_proveedor: coincideProveedor,
    coincide_nombre: coincideNombre,
    coincide_valor: coincideValor,
    num_coincidencias: total,
    cumple_regla: cumpleRegla,
  };
}

export function formatearMoneda(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return Math.abs(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

/** Busca el movimiento más parecido a una factura aunque no cumpla la regla
 * de cruce, para poder explicar por qué NO cruzó. */
export function mejorCandidato(lineaFactura: LineaFactura, lineasMovimiento: LineaMovimiento[]): { movimiento: LineaMovimiento | null; resultado: ResultadoCruce | null } {
  let mejor: LineaMovimiento | null = null;
  let mejorResultado: ResultadoCruce | null = null;
  for (const lm of lineasMovimiento) {
    const resultado = evaluarCruce(lineaFactura, lm);
    if (!mejorResultado || resultado.num_coincidencias > mejorResultado.num_coincidencias) {
      mejor = lm;
      mejorResultado = resultado;
    }
  }
  return { movimiento: mejor, resultado: mejorResultado };
}

export function explicarResultado(factura: LineaFactura, movimiento: LineaMovimiento | null, resultado: ResultadoCruce | null): string {
  if (!resultado || !movimiento) {
    return 'No hay ningún movimiento bancario registrado con el que compararla todavía.';
  }
  const ok: string[] = [];
  const falla: string[] = [];

  if (resultado.coincide_valor) {
    ok.push(`el importe coincide (${formatearMoneda(factura.importe)})`);
  } else if (factura.importe != null && movimiento.importe != null) {
    const diff = Math.abs(Math.abs(factura.importe) - Math.abs(movimiento.importe));
    falla.push(
      `el importe no coincide (compra ${formatearMoneda(factura.importe)} frente a movimiento ${formatearMoneda(Math.abs(movimiento.importe))}, diferencia de ${formatearMoneda(diff)})`
    );
  } else {
    falla.push('no se puede comparar el importe (falta en uno de los dos)');
  }

  if (resultado.coincide_proveedor || resultado.coincide_nombre) {
    ok.push('el nombre del proveedor aparece en el texto del movimiento');
  } else {
    falla.push('el nombre del proveedor no aparece en el texto del movimiento');
  }

  if (resultado.cumple_regla) {
    return 'Cruza porque ' + ok.join(' y ') + '.';
  }
  let razon = 'No cruza: ' + falla.join('; ') + '.';
  if (ok.length) razon += ' (sí coincide: ' + ok.join(', ') + ').';
  return razon;
}

export type Sugerencia = ResultadoCruce & { linea_factura_id: string; linea_movimiento_id: string };

/**
 * Empareja facturas con movimientos bancarios. Construye todos los pares que
 * cumplen la regla de cruce (no solo "el mejor candidato de cada factura") y
 * los asigna en orden de mejor puntuación, saltando un par en cuanto una de
 * sus dos líneas ya quedó usada por otro par mejor. Esto importa cuando el
 * mismo proveedor emite varias facturas por el mismo importe exacto: si cada
 * factura solo se compara contra "su candidato preferido", varias quedarían
 * sin cruzar aunque hubiera otros movimientos igual de válidos disponibles.
 */
export function sugerirCruces(lineasFactura: LineaFactura[], lineasMovimiento: LineaMovimiento[]): Sugerencia[] {
  const pares: Sugerencia[] = [];
  for (const lf of lineasFactura) {
    for (const lm of lineasMovimiento) {
      const resultado = evaluarCruce(lf, lm);
      if (resultado.cumple_regla) {
        pares.push({ ...resultado, linea_factura_id: lf.id, linea_movimiento_id: lm.id });
      }
    }
  }
  pares.sort((a, b) => b.num_coincidencias - a.num_coincidencias);

  const facturasUsadas = new Set<string>();
  const movimientosUsados = new Set<string>();
  const sugerencias: Sugerencia[] = [];
  for (const par of pares) {
    if (facturasUsadas.has(par.linea_factura_id) || movimientosUsados.has(par.linea_movimiento_id)) continue;
    facturasUsadas.add(par.linea_factura_id);
    movimientosUsados.add(par.linea_movimiento_id);
    sugerencias.push(par);
  }
  return sugerencias;
}
