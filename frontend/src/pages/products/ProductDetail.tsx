import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import ProductForm from './ProductForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<any>(null);
  const [costForm, setCostForm] = useState({ unit_cost: '', effective_date: '', notes: '' });

  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const addCostMutation = useMutation({
    mutationFn: (data: { unit_cost: number; effective_date: string; notes?: string }) =>
      productsApi.addCost(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['productCostHistory', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setIsCostDialogOpen(false);
      setCostForm({ unit_cost: '', effective_date: '', notes: '' });
      toast.success('Maliyet kaydı eklendi');
    },
    onError: () => toast.error('Maliyet kaydı eklenemedi'),
  });

  const updateCostMutation = useMutation({
    mutationFn: ({ costId, data }: { costId: string; data: { unit_cost: number; effective_date: string; notes?: string } }) =>
      productsApi.updateCost(id as string, costId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['productCostHistory', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setIsCostDialogOpen(false);
      setEditingCost(null);
      setCostForm({ unit_cost: '', effective_date: '', notes: '' });
      toast.success('Maliyet kaydı güncellendi');
    },
    onError: () => toast.error('Maliyet kaydı güncellenemedi'),
  });

  const openAddCost = () => {
    setEditingCost(null);
    setCostForm({ unit_cost: '', effective_date: new Date().toISOString().slice(0, 10), notes: '' });
    setIsCostDialogOpen(true);
  };

  const openEditCost = (cost: any) => {
    setEditingCost(cost);
    setCostForm({
      unit_cost: String(cost.unit_cost),
      effective_date: cost.effective_date || '',
      notes: cost.notes || '',
    });
    setIsCostDialogOpen(true);
  };

  const handleCostSubmit = () => {
    const data = {
      unit_cost: Number(costForm.unit_cost),
      effective_date: costForm.effective_date,
      notes: costForm.notes || undefined,
    };
    if (editingCost) {
      updateCostMutation.mutate({ costId: editingCost.id, data });
    } else {
      addCostMutation.mutate(data);
    }
  };

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id as string),
    enabled: !!id,
  });

  const { data: costHistory } = useQuery({
    queryKey: ['productCostHistory', id],
    queryFn: () => productsApi.getCostHistory(id as string),
    enabled: !!id,
  });

  const { data: movements } = useQuery({
    queryKey: ['productMovements', id],
    queryFn: () => productsApi.getMovements(id as string),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSkeleton variant="detail" />;
  if (!product) return <div>Ürün bulunamadı</div>;

  const isCritical = product.current_stock < product.min_stock_level;

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-start gap-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title={product.name} 
          subtitle={product.code}
          action={
            <Button onClick={() => setIsEditOpen(true)} variant="outline" className="sm:ml-5">
              <Edit className="mr-2 h-4 w-4" /> Düzenle
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Ürün Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Mevcut Stok</p>
              <p className={`text-2xl font-bold ${isCritical ? 'text-destructive' : ''}`}>
                {product.current_stock} {product.unit}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Min. Stok Seviyesi</p>
              <p className="font-medium">{product.min_stock_level} {product.unit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Güncel Birim Maliyet</p>
              <p className="font-medium">
                {formatCurrency((costHistory?.[0]?.unit_cost) || (product?.cost_history?.[0]?.unit_cost))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <Tabs defaultValue="movements" className="w-full">
            <CardHeader className="pb-0">
              <TabsList>
                <TabsTrigger value="movements">Stok Hareketleri</TabsTrigger>
                <TabsTrigger value="costs">Maliyet Geçmişi</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="movements">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>İşlem Tipi</TableHead>
                        <TableHead className="text-right">Miktar</TableHead>
                        <TableHead>Kullanıcı</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements?.map((mov: any) => (
                        <TableRow key={mov.id}>
                          <TableCell>{mov.created_at ? format(new Date(mov.created_at), 'dd MMM yyyy HH:mm', { locale: tr }) : '-'}</TableCell>
                          <TableCell><StatusBadge status={mov.movement_type || mov.type} type="movement" /></TableCell>
                          <TableCell className="text-right font-medium">
                            {(mov.movement_type || mov.type) === 'IN' ? '+' : '-'}{mov.quantity}
                          </TableCell>
                          <TableCell>{mov.creator_name || mov.created_by?.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {!movements?.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">Kayıt yok</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="costs">
                {isAdmin && (
                  <div className="flex justify-end mb-4">
                    <Button size="sm" onClick={openAddCost}>
                      <Plus className="mr-2 h-4 w-4" /> Yeni Maliyet Ekle
                    </Button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Birim Maliyet</TableHead>
                        <TableHead>Not</TableHead>
                        {isAdmin && <TableHead className="w-10"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costHistory?.map((cost: any, index: number) => (
                        <TableRow key={cost.id}>
                          <TableCell>{cost.effective_date || (cost.created_at ? format(new Date(cost.created_at), 'dd MMM yyyy', { locale: tr }) : '-')}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(cost.unit_cost)}</TableCell>
                          <TableCell>{cost.notes || '-'}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              {index === 0 && (
                                <Button variant="ghost" size="icon" onClick={() => openEditCost(cost)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {!costHistory?.length && (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-4">Kayıt yok</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {isEditOpen && (
        <ProductForm 
          open={isEditOpen} 
          onClose={() => setIsEditOpen(false)}
          product={product}
        />
      )}

      <Dialog open={isCostDialogOpen} onOpenChange={setIsCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCost ? 'Maliyet Kaydını Düzenle' : 'Yeni Maliyet Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Birim Maliyet (₺)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.unit_cost}
                onChange={(e) => setCostForm({ ...costForm, unit_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Geçerlilik Tarihi</Label>
              <Input
                type="date"
                value={costForm.effective_date}
                onChange={(e) => setCostForm({ ...costForm, effective_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Textarea
                value={costForm.notes}
                onChange={(e) => setCostForm({ ...costForm, notes: e.target.value })}
                placeholder="İsteğe bağlı"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCostDialogOpen(false)}>Vazgeç</Button>
            <Button
              onClick={handleCostSubmit}
              disabled={!costForm.unit_cost || !costForm.effective_date || addCostMutation.isPending || updateCostMutation.isPending}
            >
              {editingCost ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
