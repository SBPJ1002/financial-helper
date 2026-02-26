// ============================================================
// utils.ts
// Funções utilitárias para o motor de classificação
// ============================================================

/**
 * Fuzzy match entre duas strings usando distância de Levenshtein normalizada.
 * Retorna true se a similaridade >= threshold.
 */
export function fuzzyMatch(a: string, b: string, threshold = 0.8): boolean {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();

  if (normA === normB) return true;

  // Shortcut: se uma string contém a outra inteira
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const similarity = 1 - levenshteinDistance(normA, normB) / Math.max(normA.length, normB.length);
  return similarity >= threshold;
}

/**
 * Calcula a distância de Levenshtein entre duas strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Agrupa itens de um array por uma chave extraída de cada item
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) || [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

/**
 * Remove acentos de uma string (útil pra normalização de busca)
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
