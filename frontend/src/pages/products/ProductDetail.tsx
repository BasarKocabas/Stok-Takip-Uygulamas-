import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import ProductForm from './ProductForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);

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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Birim Maliyet</TableHead>
                        <TableHead>Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costHistory?.map((cost: any) => (
                        <TableRow key={cost.id}>
                          <TableCell>{cost.effective_date || (cost.created_at ? format(new Date(cost.created_at), 'dd MMM yyyy', { locale: tr }) : '-')}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(cost.unit_cost)}</TableCell>
                          <TableCell>{cost.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {!costHistory?.length && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">Kayıt yok</TableCell>
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
    </div>
  );
}
