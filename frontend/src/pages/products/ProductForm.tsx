import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { UNITS } from '@/lib/constants';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const productSchema = z.object({
  code: z.string().min(1, 'Ürün kodu zorunludur'),
  name: z.string().min(1, 'Ürün adı zorunludur'),
  unit: z.string().min(1, 'Birim seçimi zorunludur'),
  min_stock_level: z.coerce.number().min(0, 'Geçerli bir değer giriniz'),
  initial_cost: z.coerce.number().min(0).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: any; // If provided, we are in edit mode
}

export default function ProductForm({ open, onClose, product }: ProductFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const { data: products } = useQuery({ queryKey: ['products-mini'], queryFn: () => productsApi.list({ limit: 500 }) });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: product?.code || '',
      name: product?.name || '',
      unit: product?.unit || '',
      min_stock_level: product?.min_stock_level || 0,
      initial_cost: 0,
    }
  });

  const suggestCode = () => {
    const nums = (products?.data || [])
      .map((p: any) => (p.code || '').match(/(\d+)\s*$/))
      .filter(Boolean)
      .map((m: any) => parseInt(m[1], 10));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    setValue('code', `PRD-${String(next).padStart(3, '0')}`, { shouldValidate: true });
  };

  const selectedUnit = watch('unit');
  const unitObj = UNITS.find((u) => u.value === selectedUnit);

  const mutation = useMutation({
    mutationFn: (data: ProductFormValues) => {
      if (isEdit) {
        const { initial_cost, ...updatePayload } = data;
        return productsApi.update(product.id, updatePayload);
      }
      return productsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      toast.success(isEdit ? 'Ürün başarıyla güncellendi' : 'Yeni ürün başarıyla eklendi');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Bir hata oluştu');
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="code">Ürün Kodu</Label>
              <Button type="button" variant="ghost" size="sm" onClick={suggestCode}>Öner</Button>
            </div>
            <Input id="code" {...register('code')} className={errors.code ? 'border-red-500' : ''} />
            {errors.code && <span className="text-xs text-red-500">{errors.code.message}</span>}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="name">Ürün Adı</Label>
            <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="unit">Birim</Label>
            <Select 
              value={selectedUnit} 
              onValueChange={(val) => setValue('unit', val, { shouldValidate: true })}
            >
              <SelectTrigger className={errors.unit ? 'border-red-500 w-full' : 'w-full'}>
                <SelectValue placeholder="Birim Seçiniz">
                  {unitObj ? unitObj.label : 'Birim Seçiniz'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {UNITS?.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.unit && <span className="text-xs text-red-500">{errors.unit.message}</span>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="min_stock_level">Min. Stok Seviyesi</Label>
            <Input type="number" step="0.01" id="min_stock_level" {...register('min_stock_level')} />
            {errors.min_stock_level && <span className="text-xs text-red-500">{errors.min_stock_level.message}</span>}
          </div>

          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="initial_cost">İlk Maliyet (₺) - Opsiyonel</Label>
              <Input type="number" step="0.01" id="initial_cost" {...register('initial_cost')} />
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
