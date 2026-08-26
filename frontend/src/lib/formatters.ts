type CurrencyFormatOptions = Pick<Intl.NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'>;

export function formatCurrency(value: number | string | null | undefined, options: CurrencyFormatOptions = {}) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
    ...options,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('tr-TR');
}
