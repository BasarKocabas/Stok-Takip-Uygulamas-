export const APP_NAME = 'ANSAVA';
export const APP_COMPANY = 'Ansava Mühendislik';

export const WORK_ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
  open: { label: 'Açık', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'Devam Ediyor', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-800' },
};

export const APPROVAL_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Beklemede', color: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
};

export const CLIENT_TYPES: Record<string, string> = {
  izban: 'İZBAN',
  belediye: 'Belediye',
  kurum_ici: 'Kurum İçi',
  diger: 'Diğer',
};

export const MOVEMENT_TYPES: Record<string, { label: string; color: string }> = {
  IN: { label: 'Giriş', color: 'bg-green-100 text-green-800' },
  OUT: { label: 'Çıkış', color: 'bg-red-100 text-red-800' },
};

export const USER_ROLES: Record<string, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  field_worker: 'Saha Personeli',
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

