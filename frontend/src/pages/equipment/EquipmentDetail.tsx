import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Pencil } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';

const STATUS_MAP = {
  available: { label: 'Boşta', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  in_use: { label: 'Kullanımda', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  maintenance: { label: 'Bakımda', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
};

const OWNERSHIP_MAP = {
  owned: { label: 'Kendi Malı', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  rented: { label: 'Kiralık', color: 'bg-violet-500/10 text-violet-500 border-violet-500/20' }
};

const UNIT_MAP = {
  hourly: 'Saatlik',
  daily: 'Günlük',
  fixed: 'Sabit'
};

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-6"><LoadingSkeleton /></div>;
  if (!equipment) return <div className="p-6">Ekipman bulunamadı</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/equipment')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={equipment.name}
          subtitle={`${equipment.equipment_type} - ${equipment.serial_or_plate_no || 'Seri No Yok'}`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Details */}
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Ekipman Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-slate-500">Durum</span>
                <Badge className={STATUS_MAP[equipment.status].color} variant="outline">
                  {STATUS_MAP[equipment.status].label}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-slate-500">Sahiplik</span>
                <Badge className={OWNERSHIP_MAP[equipment.ownership].color} variant="outline">
                  {OWNERSHIP_MAP[equipment.ownership].label}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-slate-500">Ekipman Tipi</span>
                <span className="font-medium">{equipment.equipment_type}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-slate-500">Seri/Plaka No</span>
                <span className="font-medium">{equipment.serial_or_plate_no || '-'}</span>
              </div>
              {equipment.specs && (
                <div className="py-2 border-b">
                  <span className="text-slate-500 block mb-1">Özellikler</span>
                  <p className="font-medium whitespace-pre-wrap">{equipment.specs}</p>
                </div>
              )}
              {equipment.default_supplier_name && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">Varsayılan Tedarikçi</span>
                  <span className="font-medium">{equipment.default_supplier_name}</span>
                </div>
              )}
              {equipment.default_rate_cost && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Varsayılan Birim Fiyat</span>
                  <span className="font-medium">
                    {formatCurrency(equipment.default_rate_cost)} / {UNIT_MAP[equipment.default_rate_unit as keyof typeof UNIT_MAP] || equipment.default_rate_unit}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-800 dark:text-blue-300">Toplam Maliyet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(equipment.total_cost || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Assignments */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>İş Emri Kullanım Geçmişi</CardTitle>
              <CardDescription>Bu ekipmanın atandığı tüm iş emirleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İş Emri</TableHead>
                      <TableHead>Başlangıç</TableHead>
                      <TableHead>Bitiş</TableHead>
                      <TableHead>Tedarikçi</TableHead>
                      <TableHead>Birim</TableHead>
                      <TableHead className="text-right">Maliyet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!equipment.assignments || equipment.assignments.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                          Henüz hiçbir iş emrinde kullanılmamış.
                        </TableCell>
                      </TableRow>
                    ) : (
                      equipment.assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            <Link to={`/work-orders/${assignment.work_order_id}`} className="text-blue-600 hover:underline">
                              {assignment.order_no}
                            </Link>
                          </TableCell>
                          <TableCell>{formatDate(assignment.start_date)}</TableCell>
                          <TableCell>
                            {assignment.end_date ? (
                              formatDate(assignment.end_date)
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Aktif</Badge>
                            )}
                          </TableCell>
                          <TableCell>{assignment.supplier_name || '-'}</TableCell>
                          <TableCell>
                            {UNIT_MAP[assignment.rate_unit as keyof typeof UNIT_MAP] || assignment.rate_unit} 
                            {assignment.quantity_units ? ` (${assignment.quantity_units})` : ''}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(assignment.cost)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
