import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { workOrdersApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { WORK_ORDER_STATUSES, CLIENT_TYPES } from '@/lib/constants';

export default function WorkOrderList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [clientType, setClientType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['workOrders', { search, status, clientType, page }],
    queryFn: () => workOrdersApi.list({ 
      search, 
      status: status !== 'all' ? status : undefined,
      client_type: clientType !== 'all' ? clientType : undefined,
      page,
      limit: 10
    }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workOrdersApi.delete(id),
    onSuccess: () => {
      toast.success('İş emri silindi');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Silinemedi'),
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="İş Emirleri" 
        action={
          (user?.role === 'admin' || user?.role === 'manager' || user?.is_authorized_creator) && (
            <Button onClick={() => navigate('/work-orders/new')}>
              <Plus className="mr-2 h-4 w-4" /> Yeni İş Emri
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İş emri no veya başlık ara..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select 
          value={status} 
          onValueChange={(v) => {
            setStatus(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Durum Seç">
              {status === 'all' ? 'Tüm Durumlar' : (WORK_ORDER_STATUSES[status as keyof typeof WORK_ORDER_STATUSES]?.label || status)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(WORK_ORDER_STATUSES).map(([key, s]) => (
              <SelectItem key={key} value={key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select 
          value={clientType} 
          onValueChange={(v) => {
            setClientType(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Kurum Tipi Seç">
              {clientType === 'all' ? 'Tüm Kurumlar' : (CLIENT_TYPES[clientType as keyof typeof CLIENT_TYPES] || clientType)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kurumlar</SelectItem>
            {Object.entries(CLIENT_TYPES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sipariş No</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead>Kurum</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Onay</TableHead>
                <TableHead>Atanan</TableHead>
                <TableHead>Tarih</TableHead>
                {user?.role === 'admin' && <TableHead className="text-right">İşlem</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(workOrders?.data || []).map((order: any) => (
                <TableRow 
                  key={order.id} 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/work-orders/${order.id}`)}
                >
                  <TableCell className="font-medium font-mono">{order.order_no}</TableCell>
                  <TableCell>{order.title}</TableCell>
                  <TableCell>{CLIENT_TYPES[order.client_type as keyof typeof CLIENT_TYPES] || order.client_type}</TableCell>
                  <TableCell><StatusBadge status={order.status} type="workOrder" /></TableCell>
                  <TableCell><StatusBadge status={order.approval_status} type="approval" /></TableCell>
                  <TableCell>{order.assignee_name || '-'}</TableCell>
                  <TableCell>{order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy', { locale: tr }) : '-'}</TableCell>
                  {user?.role === 'admin' && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(order); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!(workOrders?.data?.length) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    İş emri bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationControls pagination={workOrders?.pagination} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog 
        open={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="İş Emrini Sil" 
        description={`${deleteTarget?.order_no} silinecek (pasife alınır). Emin misiniz?`}
        confirmText="Evet, Sil" 
        cancelText="Vazgeç" 
        variant="destructive" 
      />
    </div>
  );
}
