import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, productsApi, workOrdersApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardPlus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CLIENT_TYPES, APP_NAME } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';

const dashboardCardHover = 'transition-all hover:-translate-y-1 hover:shadow-lg dark:hover:border-white/35 dark:hover:bg-white/[0.03] dark:hover:shadow-[0_10px_30px_rgba(255,255,255,0.14)] motion-reduce:transform-none motion-reduce:transition-none';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: summary, isLoading: a } = useQuery({ queryKey: ['dashboardSummary'], queryFn: dashboardApi.summary });
  const { data: recentMovements, isLoading: b } = useQuery({ queryKey: ['recentMovements'], queryFn: dashboardApi.recentMovements });
  const { data: criticalStock, isLoading: c } = useQuery({ queryKey: ['criticalStock'], queryFn: productsApi.criticalStock });
  const { data: workOrdersData, isLoading: d } = useQuery({ queryKey: ['workOrders', { limit: 5 }], queryFn: () => workOrdersApi.list({ limit: 5 }) });

  if (a || b || c || d) return <LoadingSkeleton variant="dashboard" className="mt-5" />;

  const workOrders = workOrdersData?.data || [];
  const canCreateOrder = user?.role === 'admin' || user?.role === 'manager' || user?.is_authorized_creator;
  const criticalCount = summary?.critical_stock_count || 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Saha & Operasyon Paneli</h1>
          <p className="text-sm text-muted-foreground">{APP_NAME} — iş emirleri, malzeme ve stok takibi</p>
        </div>
        {canCreateOrder && (
          <button
            onClick={() => navigate('/work-orders/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <ClipboardPlus className="h-4 w-4" /> Yeni İş Emri Aç
          </button>
        )}
      </div>

      {/* KPI şeridi */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard title="Açık İş Emri" value={summary?.open_work_orders || 0} className={dashboardCardHover} />
        <StatCard title="Bekleyen Onay" value={summary?.pending_approvals || 0} className={dashboardCardHover} />
        <StatCard title="Kritik Stok" value={criticalCount} className={`${dashboardCardHover} ${criticalCount > 0 ? 'border-red-300' : ''}`} />
        <StatCard title="Ürün Çeşidi" value={summary?.total_products || 0} className={dashboardCardHover} />
        <StatCard title="Stok Değeri" value={formatCurrency(summary?.total_stock_value)} className={dashboardCardHover} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Son iş emirleri — sade liste */}
        <Card className={`${dashboardCardHover} lg:col-span-2`}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Son İş Emirleri</CardTitle>
            <button onClick={() => navigate('/work-orders')} className="rounded text-xs font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              Tümünü Gör
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {workOrders.map((o: any) => (
                <button
                  key={o.id}
                  onClick={() => navigate(`/work-orders/${o.id}`)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-all hover:translate-x-0.5 hover:bg-muted/50 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{o.order_no}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{o.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{CLIENT_TYPES[o.client_type] || o.client_type}</span>
                  <StatusBadge status={o.approval_status} type="approval" />
                  <StatusBadge status={o.status} type="workOrder" />
                </button>
              ))}
              {!workOrders.length && <p className="px-5 py-6 text-center text-sm text-muted-foreground">Henüz iş emri yok.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Son hareketler — daha önce çekilip gösterilmeyen veri */}
        <Card className={dashboardCardHover}>
          <CardHeader><CardTitle>Son Hareketler</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(recentMovements || []).slice(0, 7).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{m.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.created_at ? format(new Date(m.created_at), 'dd MMM HH:mm', { locale: tr }) : '-'}
                    </p>
                  </div>
                  <span className={`shrink-0 font-semibold ${m.movement_type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.movement_type === 'IN' ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kritik stok */}
      {criticalCount > 0 && (
        <Card className={`${dashboardCardHover} border-red-200`}>
          <CardHeader className="flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle>Kritik Stok ({criticalCount})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(criticalStock || []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                  </div>
                  <div className="text-right text-sm">
                    <span className="font-bold text-red-600">{p.current_stock} {p.unit}</span>
                    <span className="ml-2 text-xs text-muted-foreground">Min: {p.min_stock_level}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
