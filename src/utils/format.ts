/** Einheitliche Euro-Formatierung — überall gleich, mit Tausendertrennung */
export function formatEuro(amount: number): string {
  return `€${Math.round(amount).toLocaleString()}`;
}
