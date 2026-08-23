import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { USER_ROLES } from '@/lib/constants';
import { toast } from 'sonner';
import { Mail, Shield, Calendar, Edit, KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [editPass, setEditPass] = useState('');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');

  const openEdit = () => {
    const [f = '', ...rest] = (user?.name || '').split(' ');
    setFirstName(f); setLastName(rest.join(' '));
    setEmail(user?.email || ''); setEditPass('');
    setEditOpen(true);
  };
  const openPass = () => { setCurPass(''); setNewPass(''); setNewPass2(''); setPassOpen(true); };

  const profileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({
      first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), current_password: editPass,
    }),
    onSuccess: async () => { toast.success('Profil güncellendi'); setEditOpen(false); await refreshUser(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Güncellenemedi'),
  });
  const passMutation = useMutation({
    mutationFn: () => authApi.changePassword({ current_password: curPass, new_password: newPass }),
    onSuccess: () => { toast.success('Şifre değiştirildi'); setPassOpen(false); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Şifre değiştirilemedi'),
  });
  const submitPass = () => {
    if (newPass !== newPass2) { toast.error('Yeni şifreler eşleşmiyor'); return; }
    passMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Profilim" action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}><Edit className="mr-2 h-4 w-4" /> Bilgilerimi Düzenle</Button>
          <Button variant="outline" onClick={openPass}><KeyRound className="mr-2 h-4 w-4" /> Şifre Değiştir</Button>
        </div>
      } />
      <Card>
        <CardHeader><CardTitle>Kullanıcı Bilgileri</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
            <div className="h-16 w-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{USER_ROLES[user?.role || 'field_worker']}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 border p-3 rounded-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> E-posta</div>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1 border p-3 rounded-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Shield className="h-4 w-4" /> Rol / Yetki</div>
              <p className="font-medium">{USER_ROLES[user?.role || 'field_worker']}{user?.is_authorized_creator ? ' • İş emri açabilir' : ''}</p>
            </div>
            <div className="space-y-1 border p-3 rounded-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> Kayıt Tarihi</div>
              <p className="font-medium">{user?.created_at ? format(new Date(user.created_at), 'dd MMMM yyyy', { locale: tr }) : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bilgilerimi Düzenle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2"><Label>Ad</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Soyad</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
            </div>
            <div className="grid gap-2"><Label>E-posta</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Mevcut Şifre (zorunlu)</Label><Input type="password" value={editPass} onChange={(e) => setEditPass(e.target.value)} /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>İptal</Button>
            <Button disabled={!firstName.trim() || !lastName.trim() || !email || !editPass || profileMutation.isPending}
              onClick={() => profileMutation.mutate()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Şifre Değiştir</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2"><Label>Mevcut Şifre</Label><Input type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Yeni Şifre</Label><Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Yeni Şifre (tekrar)</Label><Input type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPassOpen(false)}>İptal</Button>
            <Button disabled={!curPass || !newPass || passMutation.isPending} onClick={submitPass}>Değiştir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
