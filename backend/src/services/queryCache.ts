export interface CachedQueryEntry {
  answer: string;
  sources: any[];
  timestamp: string;
  hitCount: number;
}

const MAX_CACHE_SIZE = 500;
const cacheStore = new Map<string, CachedQueryEntry>();

function normalizeKey(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function getCachedQuery(question: string): CachedQueryEntry | null {
  const key = normalizeKey(question);
  if (!key) return null;

  const entry = cacheStore.get(key);
  if (entry) {
    entry.hitCount++;
    console.log(`[QueryCache] ⚡ CACHE HIT pour: "${question}" (Hit #${entry.hitCount})`);
    return entry;
  }
  return null;
}

export function setCachedQuery(question: string, answer: string, sources: any[]): void {
  const key = normalizeKey(question);
  if (!key || !answer) return;

  // Evict oldest if max size reached
  if (cacheStore.size >= MAX_CACHE_SIZE) {
    const firstKey = cacheStore.keys().next().value;
    if (firstKey) cacheStore.delete(firstKey);
  }

  cacheStore.set(key, {
    answer,
    sources,
    timestamp: new Date().toISOString(),
    hitCount: 0,
  });

  console.log(`[QueryCache] 💾 Réponse mise en cache pour: "${question}"`);
}

export function clearQueryCache(): void {
  const size = cacheStore.size;
  cacheStore.clear();
  console.log(`[QueryCache] 🧹 Cache réinitialisé (${size} entrée(s) purgée(s)).`);
}

export function getCacheStats() {
  return {
    cachedEntries: cacheStore.size,
    maxSize: MAX_CACHE_SIZE,
  };
}
