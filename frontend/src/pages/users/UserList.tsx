import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usersApi, authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { USER_ROLES } from '@/lib/constants';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card } from '@/components/ui/card';

const userCreateSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  role: z.enum(['admin', 'manager', 'field_worker']),
  is_authorized_creator: z.boolean().optional(),
});

type UserCreateValues = z.infer<typeof userCreateSchema>;

export default function UserList() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [editTarget, setEditTarget] = useState<any>(null);
  const [ef, setEf] = useState(''); const [el, setEl] = useState('');
  const [eemail, setEemail] = useState(''); const [erole, setErole] = useState<'admin'|'manager'|'field_worker'>('field_worker');
  const openEdit = (u: any) => {
    const [f = '', ...r] = (u.name || '').split(' ');
    setEf(f); setEl(r.join(' ')); setEemail(u.email || ''); setErole(u.role); setEditTarget(u);
  };
  const editMutation = useMutation({
    mutationFn: () => usersApi.update(editTarget.id, { name: `${ef.trim()} ${el.trim()}`, email: eemail.trim(), role: erole }),
    onSuccess: () => { toast.success('Kullanıcı güncellendi'); setEditTarget(null); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Güncellenemedi'),
  });
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.update(id, { is_active: true }),
    onSuccess: () => { toast.success('Kullanıcı aktife alındı'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Aktife alınamadı'),
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ include_inactive: 'true' }),
  });

  const isAdmin = currentUser?.role === 'admin';

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'field_worker',
      is_authorized_creator: false,
    }
  });

  const selectedRole = watch('role');

  const createMutation = useMutation({
    mutationFn: (data: UserCreateValues) => authApi.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Personel başarıyla oluşturuldu');
      setIsCreateOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Personel oluşturulurken hata oluştu');
    }
  });

  const authMutation = useMutation({
    mutationFn: ({ id, is_authorized }: { id: string, is_authorized: boolean }) => 
      usersApi.update(id, { is_authorized_creator: is_authorized }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Yetki güncellendi');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Güncellenemedi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Kullanıcı pasife alındı');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Silinemedi');
      setDeleteTarget(null);
    }
  });

  const onSubmit = (data: UserCreateValues) => {
    createMutation.mutate(data);
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Personel" 
        action={
          isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Personel
            </Button>
          )
        }
      />

      <Card className="overflow-x-auto rounded-md py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>İş Emri Yetkisi</TableHead>
              <TableHead>Durum</TableHead>
              {isAdmin && <TableHead className="text-right">İşlem</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(Array.isArray(users) ? users : []).map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{USER_ROLES[u.role] ?? u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={Boolean(u.is_authorized_creator)} 
                    disabled={!isAdmin || u.id === currentUser?.id || !u.is_active}
                    onCheckedChange={(checked) => authMutation.mutate({ id: u.id, is_authorized: checked })}
                  />
                </TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge variant="outline" className="text-green-600 bg-green-50">Aktif</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 bg-gray-50">Pasif</Badge>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!u.is_active && <Button size="sm" variant="outline" onClick={() => reactivateMutation.mutate(u.id)}>Aktif Yap</Button>}
                      {u.is_active && u.id !== currentUser?.id && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Düzenle"><Edit className="h-4 w-4" /></Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === currentUser?.id || !u.is_active}
                        title={u.id === currentUser?.id ? 'Kendi hesabınızı silemezsiniz' : 'Pasife Al'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!(Array.isArray(users) ? users.length : 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Kullanıcı bulunamadı</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* User Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Personeli Pasife Al"
        description={`${deleteTarget?.name} isimli personelin hesabı pasife alınacaktır. Emin misiniz?`}
        confirmText="Evet, Pasife Al"
        cancelText="Vazgeç"
        variant="destructive"
      />

      {/* User Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Yeni Personel Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
              {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
              {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" {...register('password')} className={errors.password ? 'border-red-500' : ''} />
              {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Rol</Label>
              <Select 
                value={selectedRole} 
                onValueChange={(val: any) => setValue('role', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Rol Seçiniz">
                    {USER_ROLES[selectedRole] || selectedRole}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Yönetici (Admin)</SelectItem>
                  <SelectItem value="manager">Müdür (Manager)</SelectItem>
                  <SelectItem value="field_worker">Saha Personeli</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>İptal</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* User Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Personel Düzenle</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2"><Label>Ad</Label><Input value={ef} onChange={(e) => setEf(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Soyad</Label><Input value={el} onChange={(e) => setEl(e.target.value)} /></div>
            </div>
            <div className="grid gap-2"><Label>E-posta</Label><Input type="email" value={eemail} onChange={(e) => setEemail(e.target.value)} /></div>
            <div className="grid gap-2">
              <Label>Rol</Label>
              <Select value={erole} onValueChange={(val: any) => setErole(val)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Yönetici (Admin)</SelectItem>
                  <SelectItem value="manager">Müdür (Manager)</SelectItem>
                  <SelectItem value="field_worker">Saha Personeli</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>İptal</Button>
              <Button disabled={!ef.trim() || !el.trim() || !eemail || editMutation.isPending} onClick={() => editMutation.mutate()}>
                {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
