import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { stockApi, productsApi, workOrdersApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PaginationControls } from '@/components/shared/PaginationControls';

const INTEGER_UNITS = ['adet', 'kutu', 'paket', 'takım'];

export default function StockMovements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: movements, isLoading, refetch } = useQuery({
    queryKey: ['movements', type, page],
    queryFn: () => stockApi.list({ movement_type: type !== 'all' ? type : undefined, page, limit: 10 }),
  });
  const { data: products } = useQuery({
    queryKey: ['products-mini'],
    queryFn: () => productsApi.list({ limit: 500 }),
  });
  const { data: workOrders } = useQuery({
    queryKey: ['workOrders-mini'],
    queryFn: () => workOrdersApi.list({ limit: 100 }),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { product_id: '', movement_type: 'IN', quantity: '', notes: '' },
  });

  const selectedProductId = watch('product_id');
  const selectedMovType = watch('movement_type');
  const productList = products?.data || [];
  const selectedProduct = productList.find((p: any) => p.id === selectedProductId);
  const integerUnit = INTEGER_UNITS.includes(selectedProduct?.unit || '');
  const step = integerUnit ? 1 : 0.01;
  const min = integerUnit ? 1 : 0.01;

  const orderNoOf = (id?: string) => (workOrders?.data || []).find((o: any) => o.id === id)?.order_no;

  const onSubmit = async (data: any) => {
    const qty = parseFloat(data.quantity);
    if (!Number.isFinite(qty) || qty <= 0) { toast.error('Geçerli bir miktar giriniz'); return; }
    if (!data.product_id) { toast.error('Lütfen bir ürün seçiniz'); return; }
    if (integerUnit && !Number.isInteger(qty)) {
      toast.error(`${selectedProduct?.unit} birimli ürün için tam sayı giriniz`); return;
    }
    try {
      await stockApi.create({ ...data, quantity: qty });
      toast.success(data.movement_type === 'OUT' ? 'Çıkış talebi onaya gönderildi' : 'Giriş işlemi otomatik onaylandı');
      setIsModalOpen(false);
      reset({ product_id: '', movement_type: 'IN', quantity: '', notes: '' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || 'Hata oluştu');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await stockApi.approve(id);
      toast.success('Hareket onaylandı');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['workOrder'] }); // bağlı emrin Used sütunu tazelensin
      queryClient.invalidateQueries({ queryKey: ['workOrderCosts'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['report-stock'] });
      queryClient.invalidateQueries({ queryKey: ['report-client'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Onaylanırken hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stok Hareketleri"
        action={<Button onClick={() => setIsModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Yeni Hareket</Button>}
      />
      <div className="flex items-center space-x-2 max-w-xs mb-4">
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Hareket Tipi Seç" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Hareketler</SelectItem>
            <SelectItem value="IN">Giriş</SelectItem>
            <SelectItem value="OUT">Çıkış</SelectItem>
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
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>İş Emri</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead>Ekleyen</TableHead>
                <TableHead>Onay</TableHead>
                <TableHead>Onaylayan</TableHead>
                {user?.role === 'admin' && <TableHead className="text-right">İşlem</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movements?.data || []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.created_at ? format(new Date(m.created_at), 'dd MMM yyyy HH:mm', { locale: tr }) : '-'}</TableCell>
                  <TableCell className="font-medium">
                    {m.product_name || '-'}
                    {m.product_code && <span className="text-xs text-muted-foreground block">{m.product_code}</span>}
                  </TableCell>
                  <TableCell>{m.work_order_id ? (orderNoOf(m.work_order_id) || 'Bağlı') : '-'}</TableCell>
                  <TableCell><StatusBadge status={m.movement_type} type="movement" /></TableCell>
                  <TableCell className="text-right font-bold">{m.quantity} {m.product_unit || ''}</TableCell>
                  <TableCell>{m.creator_name || '-'}</TableCell>
                  <TableCell>
                    {m.is_approved ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Onaylandı</span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Beklemede</span>
                    )}
                  </TableCell>
                  <TableCell>{m.is_approved ? (m.approver_name || '-') : '-'}</TableCell>
                  {user?.role === 'admin' && (
                    <TableCell className="text-right">
                      {!m.is_approved && m.movement_type === 'OUT' && (
                        <Button size="sm" onClick={() => handleApprove(m.id)}>Onayla</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!(movements?.data?.length) && (
                <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Hareket bulunamadı.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationControls pagination={movements?.pagination} onPageChange={setPage} />
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Stok Hareketi</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2">
              <Label>Ürün</Label>
              <Select value={selectedProductId || ''} onValueChange={(v) => setValue('product_id', v)} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Ürün Seçin">
                    {selectedProduct ? `${selectedProduct.name} (${selectedProduct.code})` : 'Ürün Seçin'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {productList.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <p className="text-xs text-slate-500">
                  Mevcut stok: <strong className="text-slate-700">{selectedProduct.current_stock} {selectedProduct.unit}</strong>
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Hareket Tipi</Label>
              <Select value={selectedMovType || ''} onValueChange={(v) => setValue('movement_type', v)} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seçiniz">
                    {selectedMovType === 'IN' ? 'Giriş' : selectedMovType === 'OUT' ? 'Çıkış' : 'Seçiniz'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Giriş</SelectItem>
                  <SelectItem value="OUT">Çıkış</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Miktar {selectedProduct ? `(${selectedProduct.unit})` : ''}</Label>
              <Input type="number" step={step} min={min} {...register('quantity')} required />
            </div>
            {selectedMovType === 'OUT' && selectedProduct &&
              parseFloat(watch('quantity') || '0') > Number(selectedProduct.current_stock) && (
                <p className="text-xs text-amber-600">
                  Talep mevcut stoğu aşıyor — admin onayında "Yetersiz stok" kontrolü uygulanacak.
                </p>
              )}
            <div className="grid gap-2">
              <Label>Not</Label>
              <Input {...register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
              <Button type="submit" disabled={isSubmitting}>Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
