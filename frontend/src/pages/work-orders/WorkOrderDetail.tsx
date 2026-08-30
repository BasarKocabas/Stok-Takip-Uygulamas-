import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersApi, reportsApi, productsApi, usersApi, equipmentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, X, FileText, Wrench, HardHat, DollarSign, Plus, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { WORK_ORDER_STATUSES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';

const INTEGER_UNITS = ['adet', 'kutu', 'paket', 'takım'];

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [materialOpen, setMaterialOpen] = useState(false);
  const [laborOpen, setLaborOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'item' | 'labor' | 'equipment' | 'equipment_assignment'; id: string; label: string } | null>(null);

  const [isEquipAssignOpen, setIsEquipAssignOpen] = useState(false);
  const [equipAssignForm, setEquipAssignForm] = useState({
    equipment_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    supplier_name: '',
    rate_unit: 'daily',
    quantity_units: '',
    cost: '',
    notes: '',
  });

  const { data: equipmentList } = useQuery({
    queryKey: ['equipment-mini'],
    queryFn: () => equipmentApi.mini(),
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ['workOrder', id],
    queryFn: () => workOrdersApi.get(id as string),
    enabled: !!id,
  });
  const { data: costs } = useQuery({
    queryKey: ['workOrderCosts', id],
    queryFn: () => reportsApi.workOrderCosts(id as string),
    enabled: !!id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['workOrder', id] });
    queryClient.invalidateQueries({ queryKey: ['workOrderCosts', id] });
    queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    queryClient.invalidateQueries({ queryKey: ['movements'] });
  };

  const approveMutation = useMutation({
    mutationFn: (approve: boolean) => approve ? workOrdersApi.approve(id as string) : workOrdersApi.reject(id as string),
    onSuccess: () => { invalidateAll(); toast.success('Onay durumu güncellendi'); },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => workOrdersApi.update(id as string, { status: status as any }),
    onSuccess: () => { invalidateAll(); toast.success('Durum güncellendi'); },
  });

  // Malzeme talebini onayla (admin/müdür) — talep edilen miktarıyla
  const approveItemMutation = useMutation({
    mutationFn: (itemId: string) => {
      const item = order?.items?.find((i: any) => i.id === itemId);
      return workOrdersApi.updateItem(id as string, itemId, { approved_quantity: Number(item?.requested_quantity ?? 0) });
    },
    onSuccess: () => { invalidateAll(); toast.success('Malzeme talebi onaylandı'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Onaylanamadı'),
  });

  const deleteMutation = useMutation({
    mutationFn: (t: { kind: 'item' | 'labor' | 'equipment' | 'equipment_assignment'; id: string }) => {
      if (t.kind === 'item') return workOrdersApi.deleteItem(id as string, t.id);
      if (t.kind === 'labor') return workOrdersApi.deleteLabor(id as string, t.id);
      if (t.kind === 'equipment_assignment') return workOrdersApi.deleteEquipmentAssignment(id as string, t.id);
      return workOrdersApi.deleteEquipment(id as string, t.id);
    },
    onSuccess: () => { invalidateAll(); toast.success('Kayıt silindi'); setDeleteTarget(null); },
    onError: (e: any) => { toast.error(e.response?.data?.error || 'Silinemedi'); setDeleteTarget(null); },
  });

  const addEquipAssignMutation = useMutation({
    mutationFn: (data: any) => workOrdersApi.addEquipmentAssignment(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', id] });
      setIsEquipAssignOpen(false);
      resetEquipAssignForm();
      toast.success('Ekipman ataması oluşturuldu');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Ekipman ataması oluşturulamadı'),
  });

  const returnEquipAssignMutation = useMutation({
    mutationFn: ({ assignmentId, end_date }: { assignmentId: string; end_date: string }) =>
      workOrdersApi.updateEquipmentAssignment(id as string, assignmentId, { end_date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', id] });
      toast.success('Ekipman iade edildi');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Ekipman iade edilemedi'),
  });

  const deleteEquipAssignMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      workOrdersApi.deleteEquipmentAssignment(id as string, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', id] });
      toast.success('Ekipman ataması silindi');
    },
    onError: () => toast.error('Ekipman ataması silinemedi'),
  });

  const resetEquipAssignForm = () => {
    setEquipAssignForm({
      equipment_id: '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      supplier_name: '',
      rate_unit: 'daily',
      quantity_units: '',
      cost: '',
      notes: '',
    });
  };

  const handleEquipSelect = (equipId: string) => {
    const eq = equipmentList?.find((e: any) => e.id === equipId);
    setEquipAssignForm(prev => ({
      ...prev,
      equipment_id: equipId,
      supplier_name: eq?.default_supplier_name || '',
      rate_unit: eq?.default_rate_unit || 'daily',
      cost: eq?.default_rate_cost ? String(eq.default_rate_cost) : '',
    }));
  };

  const handleEquipAssignSubmit = () => {
    const data: any = {
      equipment_id: equipAssignForm.equipment_id,
      start_date: equipAssignForm.start_date,
      rate_unit: equipAssignForm.rate_unit,
      cost: Number(equipAssignForm.cost) || 0,
    };
    if (equipAssignForm.end_date) data.end_date = equipAssignForm.end_date;
    if (equipAssignForm.supplier_name) data.supplier_name = equipAssignForm.supplier_name;
    if (equipAssignForm.quantity_units) data.quantity_units = Number(equipAssignForm.quantity_units);
    if (equipAssignForm.notes) data.notes = equipAssignForm.notes;
    addEquipAssignMutation.mutate(data);
  };

  const RATE_UNIT_LABELS: Record<string, string> = {
    hourly: 'Saatlik',
    daily: 'Günlük',
    fixed: 'Sabit',
  };

  if (isLoading) return <LoadingSkeleton variant="detail" />;
  if (!order) return <div>İş emri bulunamadı</div>;

  const isAdmin = user?.role === 'admin';
  const canApproveItems = isAdmin || user?.role === 'manager';
  const canWrite =
    isAdmin || user?.role === 'manager' ||
    order.created_by === user?.id || order.assigned_to === user?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/work-orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader title={`${order.order_no} - ${order.title}`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle>Detaylar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Açıklama</p>
                <p className="text-sm">{order.description || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Kurum Tipi</p><p className="font-medium">{order.client_type}</p></div>
                {order.external_ref && (
                  <div>
                    <p className="text-sm text-muted-foreground">Kurum Referans No</p>
                    <p className="font-mono font-medium">{order.external_ref}</p>
                  </div>
                )}
                <div><p className="text-sm text-muted-foreground">Oluşturan</p><p className="font-medium">{order.creator_name || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Atanan</p><p className="font-medium">{order.assignee_name || 'Atanmadı'}</p></div>
                <div><p className="text-sm text-muted-foreground">Tarih</p><p className="font-medium">{order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy', { locale: tr }) : '-'}</p></div>
              </div>
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Onay Durumu</span>
                  <StatusBadge status={order.approval_status} type="approval" />
                </div>
                {isAdmin && order.approval_status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => approveMutation.mutate(false)}>
                      <X className="mr-1.5 h-4 w-4 text-red-500" /> Reddet
                    </Button>
                    <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approveMutation.mutate(true)}>
                      <Check className="mr-1.5 h-4 w-4" /> Onayla
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">İş Emri Durumu</span>
                  {(isAdmin || user?.role === 'manager') ? (
                    <Select value={order.status} onValueChange={(val) => statusMutation.mutate((val ?? "draft") as any)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue>{(WORK_ORDER_STATUSES as any)[order.status]?.label ?? order.status}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(WORK_ORDER_STATUSES).map(([key, item]) => (
                          <SelectItem key={key} value={key}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge status={order.status} type="workOrder" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="materials" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="materials"><FileText className="w-4 h-4 mr-2 hidden sm:block" /> Malzemeler</TabsTrigger>
              <TabsTrigger value="labor"><Wrench className="w-4 h-4 mr-2 hidden sm:block" /> İşçilik</TabsTrigger>
              <TabsTrigger value="equipment"><HardHat className="w-4 h-4 mr-2 hidden sm:block" /> Ekipman</TabsTrigger>
              <TabsTrigger value="cost"><DollarSign className="w-4 h-4 mr-2 hidden sm:block" /> Maliyet</TabsTrigger>
            </TabsList>
            <Card className="mt-4 border-t-0 rounded-tl-none rounded-tr-none">
              <CardContent className="pt-6">
                <TabsContent value="materials" className="m-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-lg">Talep Edilen Malzemeler</h3>
                    {canWrite && (
                      <Button size="sm" onClick={() => setMaterialOpen(true)}><Plus className="w-4 h-4 mr-2" /> Malzeme Ekle</Button>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead className="text-right">Talep</TableHead>
                        <TableHead className="text-right">Onaylanan</TableHead>
                        <TableHead className="text-right">Kullanılan</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items?.map((item: any) => {
                        const isApproved = item.approved_quantity != null;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.product_name || '-'}</TableCell>
                            <TableCell className="text-right">{item.requested_quantity} {item.product_unit || ''}</TableCell>
                            <TableCell className="text-right">{isApproved ? `${item.approved_quantity} ${item.product_unit || ''}` : '-'}</TableCell>
                            <TableCell className="text-right">{item.used_quantity ?? '0'} {item.product_unit || ''}</TableCell>
                            <TableCell>
                              <StatusBadge status={isApproved ? 'approved' : 'pending'} type="approval" />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {!isApproved && canApproveItems && (
                                  <Button size="sm" variant="outline" title="Talep edilen miktarıyla onayla"
                                    onClick={() => approveItemMutation.mutate(item.id)}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                {canWrite && (
                                  <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" title="Kaydı sil"
                                    onClick={() => setDeleteTarget({ kind: 'item', id: item.id, label: item.product_name || 'Malzeme' })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!order.items?.length && (
                        <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Malzeme kaydı bulunamadı</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Talep onayı buradan yapılır; resmî stok düşüşü Stok Hareketleri sayfasındaki çıkış onayıyla gerçekleşir.
                  </p>
                </TabsContent>

                <TabsContent value="labor" className="m-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-lg">İşçilik Kayıtları</h3>
                    {canWrite && (
                      <Button size="sm" onClick={() => setLaborOpen(true)}><Plus className="w-4 h-4 mr-2" /> İşçilik Ekle</Button>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personel</TableHead><TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Saat</TableHead>
                        <TableHead className="text-right">Birim Ücret</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.labor_logs?.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.user_name || '-'}</TableCell>
                          <TableCell>{log.date ? format(new Date(log.date), 'dd MMM yyyy', { locale: tr }) : '-'}</TableCell>
                          <TableCell className="text-right">{log.hours_worked} {log.rate_unit === 'daily' ? 'gün' : 'sa'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(log.hourly_rate)}</TableCell>
                          <TableCell className="text-right">
                            {canWrite && (
                              <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50"
                                onClick={() => setDeleteTarget({ kind: 'labor', id: log.id, label: log.user_name || 'İşçilik' })}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!order.labor_logs?.length && (
                        <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Henüz işçilik kaydı bulunmuyor</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="equipment" className="m-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-lg">Ekipman Atamaları</h3>
                    {canWrite && (
                      <Button size="sm" onClick={() => setIsEquipAssignOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Ekipman Ata
                      </Button>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ekipman</TableHead>
                        <TableHead>Başlangıç</TableHead>
                        <TableHead>Bitiş</TableHead>
                        <TableHead>Tedarikçi</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead className="text-right">Maliyet</TableHead>
                        <TableHead className="text-center">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.equipment_assignments?.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className="font-medium">{a.equipment_name}</div>
                            <span className="text-xs text-muted-foreground">{a.equipment_type}</span>
                          </TableCell>
                          <TableCell>{a.start_date ? format(new Date(a.start_date), 'dd MMM yyyy', { locale: tr }) : '-'}</TableCell>
                          <TableCell>
                            {a.end_date ? format(new Date(a.end_date), 'dd MMM yyyy', { locale: tr }) : <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Aktif</Badge>}
                          </TableCell>
                          <TableCell>{a.supplier_name || '-'}</TableCell>
                          <TableCell>{RATE_UNIT_LABELS[a.rate_unit] || a.rate_unit}{a.quantity_units ? ` (${a.quantity_units})` : ''}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(a.cost)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              {!a.end_date && canWrite && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="İade Et"
                                  onClick={() => returnEquipAssignMutation.mutate({
                                    assignmentId: a.id,
                                    end_date: new Date().toISOString().slice(0, 10),
                                  })}
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              )}
                              {canWrite && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-red-50"
                                  title="Sil"
                                  onClick={() => setDeleteTarget({ kind: 'equipment_assignment', id: a.id, label: a.equipment_name || 'Atama' })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!order.equipment_assignments?.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Ekipman ataması yok</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {(order.equipment_assignments?.length ?? 0) > 0 && (
                    <div className="mt-4 text-right">
                      <span className="text-sm text-muted-foreground">Toplam Ekipman Maliyeti: </span>
                      <span className="font-bold">{formatCurrency(order.equipment_assignments?.reduce((sum: number, a: any) => sum + Number(a.cost || 0), 0) || 0)}</span>
                    </div>
                  )}

                  {(order.equipment_logs?.length || 0) > 0 && (
                    <div className="mt-10">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Eski Ekipman Kayıtları</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ekipman Tipi</TableHead><TableHead>Özellikler</TableHead><TableHead>Tarih</TableHead>
                            <TableHead className="text-right">Kira / Maliyet</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.equipment_logs?.map((eq: any) => (
                            <TableRow key={eq.id}>
                              <TableCell className="font-medium">{eq.equipment_type}</TableCell>
                              <TableCell>{eq.specs || eq.description || '-'}</TableCell>
                              <TableCell>{eq.date ? format(new Date(eq.date), 'dd MMM yyyy', { locale: tr }) : '-'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(eq.rental_cost)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="cost" className="m-0">
                  <h3 className="font-medium text-lg mb-4">Maliyet Özeti</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b"><span>Malzeme Maliyeti</span><span className="font-medium">{formatCurrency(costs?.material_cost)}</span></div>
                    <div className="flex justify-between py-2 border-b"><span>İşçilik Maliyeti</span><span className="font-medium">{formatCurrency(costs?.labor_cost)}</span></div>
                    <div className="flex justify-between py-2 border-b"><span>Ekipman Maliyeti</span><span className="font-medium">{formatCurrency(costs?.equipment_cost)}</span></div>
                    <div className="flex justify-between py-2 font-bold text-lg"><span>Toplam Maliyet</span><span>{formatCurrency(costs?.total_cost)}</span></div>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>

      <AddMaterialDialog orderId={id as string} open={materialOpen} onClose={() => setMaterialOpen(false)} />
      <AddLaborDialog orderId={id as string} open={laborOpen} onClose={() => setLaborOpen(false)} />
      <AddEquipmentDialog orderId={id as string} open={equipmentOpen} onClose={() => setEquipmentOpen(false)} />
      
      <Dialog open={isEquipAssignOpen} onOpenChange={setIsEquipAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ekipman Ata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ekipman *</Label>
              <Select value={equipAssignForm.equipment_id} onValueChange={(v) => handleEquipSelect(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Ekipman seçin">
                    {equipAssignForm.equipment_id 
                      ? equipmentList?.find((eq: any) => eq.id === equipAssignForm.equipment_id)?.name 
                      : 'Ekipman seçin'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {equipmentList?.map((eq: any) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name} {eq.status !== 'available' ? `(Ö${eq.status === 'in_use' ? 'Kullanımda' : 'Bakımda'})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi *</Label>
                <Input type="date" value={equipAssignForm.start_date}
                  onChange={e => setEquipAssignForm({...equipAssignForm, start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input type="date" value={equipAssignForm.end_date}
                  onChange={e => setEquipAssignForm({...equipAssignForm, end_date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tedarikçi</Label>
              <Input value={equipAssignForm.supplier_name}
                onChange={e => setEquipAssignForm({...equipAssignForm, supplier_name: e.target.value})}
                placeholder="Tedarikçi adı" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fiyat Birimi *</Label>
                <Select value={equipAssignForm.rate_unit}
                  onValueChange={v => setEquipAssignForm({...equipAssignForm, rate_unit: v || "daily"})}>
                  <SelectTrigger>
                    <SelectValue>
                      {equipAssignForm.rate_unit === 'hourly' ? 'Saatlik' : equipAssignForm.rate_unit === 'daily' ? 'Günlük' : 'Sabit'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Saatlik</SelectItem>
                    <SelectItem value="daily">Günlük</SelectItem>
                    <SelectItem value="fixed">Sabit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{equipAssignForm.rate_unit === 'fixed' ? 'Miktar (ops)' : 'Saat/Gün Sayısı'}</Label>
                <Input type="number" value={equipAssignForm.quantity_units}
                  onChange={e => setEquipAssignForm({...equipAssignForm, quantity_units: e.target.value})}
                  placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Maliyet (₺) *</Label>
                <Input type="number" step="0.01" value={equipAssignForm.cost}
                  onChange={e => setEquipAssignForm({...equipAssignForm, cost: e.target.value})}
                  placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Textarea value={equipAssignForm.notes}
                onChange={e => setEquipAssignForm({...equipAssignForm, notes: e.target.value})}
                placeholder="İsteğe bağlı" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEquipAssignOpen(false)}>Vazgeç</Button>
            <Button onClick={handleEquipAssignSubmit}
              disabled={!equipAssignForm.equipment_id || !equipAssignForm.start_date || !equipAssignForm.cost || addEquipAssignMutation.isPending}>
              Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Kaydı Sil"
        description={`${deleteTarget?.label} kaydı silinecek. Emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="destructive"
      />
    </div>
  );
}

function AddMaterialDialog({ orderId, open, onClose }: { orderId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: products } = useQuery({ queryKey: ['products-mini'], queryFn: () => productsApi.list({ limit: 500 }) });
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const productList = products?.data || [];
  const selectedProduct = productList.find((p: any) => p.id === productId);
  const integerUnit = INTEGER_UNITS.includes(selectedProduct?.unit || '');
  const step = integerUnit ? 1 : 0.01;
  const min = integerUnit ? 1 : 0.01;
  const mutation = useMutation({
    mutationFn: () => workOrdersApi.addItem(orderId, { product_id: productId, requested_quantity: Number(qty) }),
    onSuccess: () => {
      toast.success('Malzeme talebi eklendi');
      queryClient.invalidateQueries({ queryKey: ['workOrder', orderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrderCosts', orderId] });
      onClose(); setProductId(''); setQty('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Eklenemedi'),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Malzeme Talebi Ekle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Ürün</Label>
            <Select value={productId} onValueChange={(v) => setProductId(v ?? "")}>
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
              <p className="text-xs text-slate-500">Mevcut stok: <strong>{selectedProduct.current_stock} {selectedProduct.unit}</strong></p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Talep Miktarı {selectedProduct ? `(${selectedProduct.unit})` : ''}</Label>
            <Input type="number" step={step} min={min} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button disabled={!productId || !qty || mutation.isPending} onClick={() => mutation.mutate()}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddLaborDialog({ orderId, open, onClose }: { orderId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });
  const [userId, setUserId] = useState('');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [rateUnit, setRateUnit] = useState<'hourly' | 'daily'>('hourly');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const userList = Array.isArray(users) ? users : [];
  const selectedUser = userList.find((u: any) => u.id === userId);
  const mutation = useMutation({
    mutationFn: () => workOrdersApi.addLabor(orderId, { user_id: userId, hours_worked: Number(hours), hourly_rate: Number(rate), date, rate_unit: rateUnit }),
    onSuccess: () => {
      toast.success('İşçilik kaydı eklendi');
      queryClient.invalidateQueries({ queryKey: ['workOrder', orderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrderCosts', orderId] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Eklenemedi'),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>İşçilik Kaydı Ekle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Personel</Label>
            <Select value={userId} onValueChange={(v) => setUserId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Personel Seç">
                  {selectedUser ? selectedUser.name : 'Personel Seç'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {userList.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Ücret Birimi</Label>
            <Select value={rateUnit} onValueChange={(v) => setRateUnit((v as 'hourly' | 'daily') ?? 'hourly')}>
              <SelectTrigger className="w-full">
                <SelectValue>{rateUnit === 'hourly' ? 'Saatlik' : 'Günlük'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Saatlik</SelectItem>
                <SelectItem value="daily">Günlük</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2"><Label>{rateUnit === 'daily' ? 'Gün' : 'Saat'}</Label><Input type="number" step={0.5} min={0.5} value={hours} onChange={(e) => setHours(e.target.value)} /></div>
            <div className="grid gap-2"><Label>{rateUnit === 'daily' ? '₺ / Gün' : '₺ / Saat'}</Label><Input type="number" step={0.01} min={0} value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          </div>
          <div className="grid gap-2"><Label>Tarih</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button disabled={!userId || !hours || !rate || mutation.isPending} onClick={() => mutation.mutate()}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEquipmentDialog({ orderId, open, onClose }: { orderId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('');
  const [specs, setSpecs] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const mutation = useMutation({
    mutationFn: () => workOrdersApi.addEquipment(orderId, { equipment_type: type, specs: specs || undefined, rental_cost: Number(cost || 0), date }),
    onSuccess: () => {
      toast.success('Ekipman kaydı eklendi');
      queryClient.invalidateQueries({ queryKey: ['workOrder', orderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrderCosts', orderId] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Eklenemedi'),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ekipman Kaydı Ekle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2"><Label>Ekipman Tipi</Label><Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Örn: Ekskavatör, Vinç (80V+400 ayrı)" /></div>
          <div className="grid gap-2"><Label>Özellikler (specs)</Label><Input value={specs} onChange={(e) => setSpecs(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2"><Label>Kira ₺</Label><Input type="number" step={0.01} min={0} value={cost} onChange={(e) => setCost(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Tarih</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button disabled={!type || mutation.isPending} onClick={() => mutation.mutate()}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
