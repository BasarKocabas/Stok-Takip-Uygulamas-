import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PaginationControls } from '@/components/shared/PaginationControls';
import ProductForm from './ProductForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ProductList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', searchQuery, page],
    queryFn: () => productsApi.list({ search: searchQuery, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Ürünler" 
        action={
          user?.role === 'admin' && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Ürün
            </Button>
          )
        }
      />

      <div className="flex items-center space-x-2 max-w-sm mb-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Ürün ara..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-4">
          {/* Mobile View */}
          <div className="space-y-3 md:hidden">
            {(products?.data || []).map((product: any) => {
              const isCritical = product.current_stock < product.min_stock_level;
              return (
                <Card 
                  key={product.id} 
                  className={`cursor-pointer transition-shadow hover:shadow-md ${isCritical ? 'border-l-[3px] border-l-red-500' : ''}`}
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-base">{product.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{product.code}</p>
                      </div>
                      <Badge variant="outline" className={product.is_active ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'dark:bg-white/10 dark:text-slate-200'}>
                        {product.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-sm border-t pt-2">
                      <div>
                        <span className="text-muted-foreground">Stok: </span>
                        <span className={`font-bold ${isCritical ? 'text-red-600' : ''}`}>
                          {product.current_stock} {product.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Min: </span>
                        <span>{product.min_stock_level} {product.unit}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <PaginationControls pagination={products?.pagination} onPageChange={setPage} />
          </div>

          {/* Desktop Table View */}
          <Card className="hidden overflow-x-auto rounded-md py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün Kodu</TableHead>
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead className="text-right">Mevcut Stok</TableHead>
                  <TableHead className="text-right">Kritik Seviye</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products?.data || []).map((product: any) => {
                  const isCritical = product.current_stock < product.min_stock_level;
                  return (
                    <TableRow 
                      key={product.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <TableCell className={`font-medium font-mono ${isCritical ? 'border-l-[3px] border-l-red-500' : ''}`}>{product.code}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className={`text-right font-bold ${isCritical ? 'text-red-600' : ''}`}>
                        {product.current_stock}
                      </TableCell>
                      <TableCell className="text-right">{product.min_stock_level}</TableCell>
                      <TableCell>
                        {product.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="dark:bg-white/10 dark:text-slate-200">Pasif</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!(products?.data?.length) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Ürün bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <PaginationControls pagination={products?.pagination} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {isFormOpen && (
        <ProductForm 
          open={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}
