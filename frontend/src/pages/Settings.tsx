import React from 'react';
import { useThemeCustom } from '@/context/ThemeContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme } = useThemeCustom();
  
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Ayarlar" />
      <Card>
        <CardHeader><CardTitle>Görünüm</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Tema</p>
          <div className="flex gap-2">
            <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4 mr-2" /> Açık
            </Button>
            <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4 mr-2" /> Koyu
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Seçim bu cihazda hatırlanır.</p>
        </CardContent>
      </Card>
    </div>
  );
}
