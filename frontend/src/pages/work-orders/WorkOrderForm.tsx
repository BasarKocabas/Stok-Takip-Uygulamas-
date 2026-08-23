import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workOrdersApi, usersApi } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { CLIENT_TYPES } from '@/lib/constants';

const formSchema = z.object({
  title: z.string().min(1, 'Başlık zorunludur'),
  description: z.string().optional(),
  client_type: z.string().min(1, 'Kurum tipi zorunludur'),
  assigned_to: z.string().uuid().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function WorkOrderForm() {
  const navigate = useNavigate();

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      client_type: '',
      assigned_to: undefined,
    }
  });

  const selectedClientType = watch('client_type');
  const selectedAssignedTo = watch('assigned_to');
  const userList = Array.isArray(users) ? users : [];
  const selectedUser = userList.find((u: any) => u.id === selectedAssignedTo);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: FormValues) => workOrdersApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['recentMovements'] });
      toast.success('İş emri başarıyla oluşturuldu');
      navigate(`/work-orders/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Bir hata oluştu');
    }
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/work-orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader title="Yeni İş Emri" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Başlık</Label>
              <Input id="title" {...register('title')} className={errors.title ? 'border-red-500' : ''} />
              {errors.title && <span className="text-xs text-red-500">{errors.title.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" {...register('description')} rows={4} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client_type">Kurum Tipi</Label>
              <Select 
                value={selectedClientType} 
                onValueChange={(val) => setValue('client_type', val ?? "", { shouldValidate: true })}
              >
                <SelectTrigger className={errors.client_type ? 'border-red-500 w-full' : 'w-full'}>
                  <SelectValue placeholder="Seçiniz...">
                    {CLIENT_TYPES[selectedClientType] || 'Seçiniz...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_type && <span className="text-xs text-red-500">{errors.client_type.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assigned_to">Atanan Personel (Opsiyonel)</Label>
              <Select 
                value={selectedAssignedTo || ''} 
                onValueChange={(val) => setValue('assigned_to', val ? val : undefined)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Personel Seç...">
                    {selectedUser ? selectedUser.name : 'Personel Seç...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/work-orders')}>İptal</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Oluştur
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
