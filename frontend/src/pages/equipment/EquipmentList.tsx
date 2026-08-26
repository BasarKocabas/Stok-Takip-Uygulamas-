import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Plus, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Equipment } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

const STATUS_MAP = {
  available: { label: 'Boşta', color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' },
  in_use: { label: 'Kullanımda', color: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' },
  maintenance: { label: 'Bakımda', color: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' }
};

const OWNERSHIP_MAP = {
  owned: { label: 'Kendi Malı', color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
  rented: { label: 'Kiralık', color: 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20' }
};

export default function EquipmentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['equipment', page, search, status],
    queryFn: () => equipmentApi.list({ 
      page, 
      limit: 10, 
      search, 
      status: status !== 'all' ? status : undefined 
    }),
  });

  const createMutation = useMutation({
    mutationFn: equipmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Ekipman başarıyla eklendi');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Ekipman eklenirken bir hata oluştu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Equipment> }) => equipmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Ekipman başarıyla güncellendi');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Ekipman güncellenirken bir hata oluştu'),
  });

  const handleOpenDialog = (item?: Equipment) => {
    if (item) setEditingItem(item);
    else setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name') as string,
      equipment_type: formData.get('equipment_type') as string,
      ownership: formData.get('ownership') as 'owned' | 'rented',
      status: formData.get('status') as 'available' | 'in_use' | 'maintenance',
      specs: formData.get('specs') as string,
      serial_or_plate_no: formData.get('serial_or_plate_no') as string,
      default_supplier_name: formData.get('default_supplier_name') as string,
      default_rate_unit: formData.get('default_rate_unit') as 'hourly' | 'daily' | 'fixed',
      default_rate_cost: Number(formData.get('default_rate_cost')) || undefined,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ekipmanlar"
        subtitle="Şirket içi ve kiralık ekipmanların listesi ve yönetimi"
        action={isAdmin ? (
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" /> Ekipman Ekle
          </Button>
        ) : undefined}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Ekipman ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          {['all', 'available', 'in_use', 'maintenance'].map((st) => (
            <Button
              key={st}
              variant={status === st ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatus(st); setPage(1); }}
            >
              {st === 'all' ? 'Tümü' : STATUS_MAP[st as keyof typeof STATUS_MAP].label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><LoadingSkeleton /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Sahiplik</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Seri/Plaka No</TableHead>
                      {isAdmin && <TableHead className="w-[100px] text-right">İşlemler</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                          Kayıt bulunamadı.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data.map((item) => (
                        <TableRow 
                          key={item.id}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          onClick={() => navigate(`/equipment/${item.id}`)}
                        >
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.equipment_type}</TableCell>
                          <TableCell>
                            <Badge className={OWNERSHIP_MAP[item.ownership].color} variant="outline">
                              {OWNERSHIP_MAP[item.ownership].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_MAP[item.status].color} variant="outline">
                              {STATUS_MAP[item.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.serial_or_plate_no || '-'}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDialog(item);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {data && data.pagination.pages > 1 && (
                <div className="border-t p-4">
                  <PaginationControls
                    pagination={data.pagination}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Ekipman Düzenle' : 'Yeni Ekipman Ekle'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Ekipman Adı *</Label>
                <Input id="name" name="name" defaultValue={editingItem?.name} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="equipment_type">Ekipman Tipi *</Label>
                <Input id="equipment_type" name="equipment_type" defaultValue={editingItem?.equipment_type} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownership">Sahiplik *</Label>
                <Select name="ownership" defaultValue={editingItem?.ownership || 'owned'} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Kendi Malı</SelectItem>
                    <SelectItem value="rented">Kiralık</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Durum *</Label>
                <Select name="status" defaultValue={editingItem?.status || 'available'} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Boşta</SelectItem>
                    <SelectItem value="in_use">Kullanımda</SelectItem>
                    <SelectItem value="maintenance">Bakımda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="serial_or_plate_no">Seri veya Plaka No</Label>
                <Input id="serial_or_plate_no" name="serial_or_plate_no" defaultValue={editingItem?.serial_or_plate_no} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="specs">Özellikler (Opsiyonel)</Label>
                <Textarea id="specs" name="specs" defaultValue={editingItem?.specs} />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <div className="text-sm font-medium border-b pb-2 mb-2 text-slate-500">Varsayılan Kiralama/Gider Bilgileri</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_supplier_name">Tedarikçi Firma</Label>
                <Input id="default_supplier_name" name="default_supplier_name" defaultValue={editingItem?.default_supplier_name} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default_rate_unit">Birim</Label>
                <Select name="default_rate_unit" defaultValue={editingItem?.default_rate_unit || 'hourly'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Saatlik</SelectItem>
                    <SelectItem value="daily">Günlük</SelectItem>
                    <SelectItem value="fixed">Sabit/Götürü</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default_rate_cost">Birim Fiyatı</Label>
                <Input id="default_rate_cost" name="default_rate_cost" type="number" step="0.01" min="0" defaultValue={editingItem?.default_rate_cost} />
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
