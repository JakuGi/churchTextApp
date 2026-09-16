// Prepojenie s natívnou aplikáciou pre Android.
// Vo webovom prehliadači tento most neexistuje a aplikácia funguje po starom.

const bridge = typeof window !== 'undefined' ? window.OrganistaNative : undefined;

export const native = bridge || null;
export const isNative = !!bridge;

/** Bezpečné volanie mostu – chyba v natívnej časti nesmie zhodiť rozhranie. */
export function call(method, ...args) {
  if (!bridge || typeof bridge[method] !== 'function') return null;
  try {
    return bridge[method](...args);
  } catch (error) {
    console.warn(`Natívne volanie ${method} zlyhalo:`, error);
    return null;
  }
}
