export const APP_NAME = 'ANSAVA';
export const APP_COMPANY = 'Ansava Mühendislik';

export const WORK_ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-slate-200' },
  open: { label: 'Açık', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  in_progress: { label: 'Devam Ediyor', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
};

export const APPROVAL_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Beklemede', color: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
  approved: { label: 'Onaylandı', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
};

export const CLIENT_TYPES: Record<string, string> = {
  izban: 'İZBAN',
  belediye: 'Belediye',
  kurum_ici: 'Kurum İçi',
  diger: 'Diğer',
};

export const MOVEMENT_TYPES: Record<string, { label: string; color: string }> = {
  IN: { label: 'Giriş', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  OUT: { label: 'Çıkış', color: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
};

export const USER_ROLES: Record<string, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  field_worker: 'Saha Personeli',
};

export const EQUIPMENT_STATUSES: Record<string, { label: string; color: string }> = {
  available: { label: 'Boşta', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  in_use: { label: 'Kullanımda', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  maintenance: { label: 'Bakımda', color: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
};

export const OWNERSHIP_TYPES: Record<string, { label: string; color: string }> = {
  owned: { label: 'Kendi Malı', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  rented: { label: 'Kiralık', color: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
};

export const RATE_UNITS: Record<string, string> = {
  hourly: 'Saatlik',
  daily: 'Günlük',
  fixed: 'Sabit',
};

export const UNITS = [
  { value: 'adet', label: 'Adet' },
  { value: 'kg', label: 'Kg' },
  { value: 'metre', label: 'Metre' },
  { value: 'litre', label: 'Litre' },
  { value: 'kutu', label: 'Kutu' },
  { value: 'paket', label: 'Paket' },
  { value: 'ton', label: 'Ton' },
  { value: 'takım', label: 'Takım' },
];

// Derived lookup maps for StatusBadge and other components
const deriveMap = (source: Record<string, { label: string; color: string }>, key: 'label' | 'color') =>
  Object.fromEntries(Object.entries(source).map(([k, v]) => [k, v[key]]));

export const WORK_ORDER_STATUS_COLORS: Record<string, string> = deriveMap(WORK_ORDER_STATUSES, 'color');
export const WORK_ORDER_STATUS_LABELS: Record<string, string> = deriveMap(WORK_ORDER_STATUSES, 'label');
export const APPROVAL_STATUS_COLORS: Record<string, string> = deriveMap(APPROVAL_STATUSES, 'color');
export const APPROVAL_STATUS_LABELS: Record<string, string> = deriveMap(APPROVAL_STATUSES, 'label');
export const MOVEMENT_TYPE_COLORS: Record<string, string> = deriveMap(MOVEMENT_TYPES, 'color');
export const MOVEMENT_TYPE_LABELS: Record<string, string> = deriveMap(MOVEMENT_TYPES, 'label');
