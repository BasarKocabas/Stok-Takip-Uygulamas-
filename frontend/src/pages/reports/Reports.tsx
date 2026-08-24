import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CLIENT_TYPES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';

function BarChart({ rows, money }: { rows: { label: string; value: number }[]; money?: boolean }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="space-y-2 mt-4">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-36 truncate text-slate-600 dark:text-slate-300">{r.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded bg-blue-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="w-24 text-right font-mono text-slate-700 dark:text-slate-200">
            {money ? formatCurrency(r.value) : r.value}
          </span>
        </div>
      ))}
      {!rows.length && <p className="text-sm text-slate-500">Veri yok.</p>}
    </div>
  );
}

export default function Reports() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const { data: stockReport, isLoading: isStockLoading } = useQuery({
    queryKey: ['report-stock', start, end],
    queryFn: () => reportsApi.stockMovements({ start_date: start || undefined, end_date: end || undefined }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: clientReport, isLoading: isClientLoading } = useQuery({
    queryKey: ['report-client', start, end],
    queryFn: () => reportsApi.costByClient({ start_date: start || undefined, end_date: end || undefined }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const preset = (days: number) => {
    const s = new Date(); s.setDate(s.getDate() - days);
    setStart(s.toISOString().slice(0, 10));
    setEnd(new Date().toISOString().slice(0, 10));
  };

  const inRows = (Array.isArray(stockReport) ? stockReport : []).filter(r => r.movement_type === 'IN')
    .map(r => ({ label: r.name, value: Number(r.total_quantity) }));
  const outRows = (Array.isArray(stockReport) ? stockReport : []).filter(r => r.movement_type === 'OUT')
    .map(r => ({ label: r.name, value: Number(r.total_quantity) }));

  const exportCsv = (rows: any[], name: string) => {
    if (!rows?.length) return;
    const header = Object.keys(rows[0]).join(';');
    const body = rows.map((r) => Object.values(r).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Raporlar" />

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Stok Hareket Özeti</TabsTrigger>
          <TabsTrigger value="client">Kurum Dağılımı</TabsTrigger>
        </TabsList>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-auto" />
          <span className="text-sm text-slate-500">—</span>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-auto" />
          <Button variant="outline" size="sm" onClick={() => preset(1)}>Günlük</Button>
          <Button variant="outline" size="sm" onClick={() => preset(7)}>Haftalık</Button>
          <Button variant="outline" size="sm" onClick={() => preset(30)}>Aylık</Button>
          <Button variant="outline" size="sm" onClick={() => { setStart(''); setEnd(''); }}>Tümü</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv(stockReport || [], 'stok-raporu')}>Stok CSV</Button>
            <Button variant="outline" size="sm" onClick={() => exportCsv(clientReport || [], 'kurum-raporu')}>Kurum CSV</Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <TabsContent value="stock" className="m-0">
              <h3 className="text-lg font-medium mb-4">Ürün Bazlı Toplam Giriş / Çıkış</h3>
              <h4 className="text-sm font-medium mt-6">Giriş Dağılımı</h4>
              <BarChart rows={inRows} />
              <h4 className="text-sm font-medium mt-6">Çıkış (Tüketim) Dağılımı</h4>
              <BarChart rows={outRows} />
              {isStockLoading ? <LoadingSkeleton /> : (
                <Table className="mt-8">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün Kodu</TableHead>
                      <TableHead>Ürün Adı</TableHead>
                      <TableHead>Hareket Tipi</TableHead>
                      <TableHead className="text-right">Toplam Miktar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(stockReport) ? stockReport : []).map((row: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{row.code}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            row.movement_type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {row.movement_type === 'IN' ? 'Giriş' : 'Çıkış'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold">{row.total_quantity}</TableCell>
                      </TableRow>
                    ))}
                    {!(Array.isArray(stockReport) && stockReport.length) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          Rapor verisi bulunamadı.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="client" className="m-0">
              <h3 className="text-lg font-medium mb-4">Kurum Bazlı İş Emri ve Maliyet Dağılımı</h3>
              <BarChart money rows={(Array.isArray(clientReport) ? clientReport : [])
                .map(r => ({ label: CLIENT_TYPES[r.client_type] ?? r.client_type, value: Number(r.total_cost || 0) }))} />
              {isClientLoading ? <LoadingSkeleton /> : (
                <Table className="mt-8">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kurum Tipi</TableHead>
                      <TableHead className="text-right">İş Emri Sayısı</TableHead>
                      <TableHead className="text-right">Toplam Maliyet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(clientReport) ? clientReport : []).map((row: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{CLIENT_TYPES[row.client_type] ?? row.client_type}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{row.order_count}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900">
                          {formatCurrency(row.total_cost, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!(Array.isArray(clientReport) && clientReport.length) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          Rapor verisi bulunamadı.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
