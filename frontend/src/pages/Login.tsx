import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Giriş yapılırken bir hata oluştu. Lütfen bilgilerinizi kontrol ediniz.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-white shadow-2xl p-4 sm:p-6">
        <CardHeader className="text-center space-y-6 pb-6">
          <div className="mx-auto w-80 flex items-center justify-center">
            <img 
              src="/izbeton-logo.png"
              alt="İzbeton"
              className="h-32 w-full object-contain"
              onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="flex flex-col items-center justify-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Stok Takip Sistemi
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-2">
              <span>Made by</span>
              <div className="flex items-center gap-1.5 ml-1">
                <img 
                  src="/ansava-logo-01.png" 
                  alt="İZBETON"
                  className="h-8 w-auto object-contain translate-y-0.5"
                  onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-950/80 border-red-800 text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@izbeton.com.tr"
                {...register('email')}
                className={`h-11 ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">Şifre</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                className={`h-11 ${errors.password ? 'border-red-500' : ''}`}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold mt-4" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Giriş Yap
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
