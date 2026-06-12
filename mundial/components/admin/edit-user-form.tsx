'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Props {
  user: { id: string; name: string; telegramChatId: string | null; hasTelegramToken: boolean; active: boolean; favoriteTeam: string | null };
}

export function EditUserForm({ user }: Props) {
  const { toast } = useToast();
  const router    = useRouter();

  const [name, setName]           = useState(user.name);
  const [chatId, setChatId]       = useState(user.telegramChatId ?? '');
  const [tgToken, setTgToken]     = useState('');
  const [resetPw, setResetPw]     = useState('');
  const [delConfirm, setDelConfirm] = useState(false);
  const [loading, setLoading]     = useState(false);

  async function patch(data: Record<string, unknown>, successMsg: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (res.ok) { toast({ title: successMsg }); router.refresh(); }
    else { toast({ title: 'Error', variant: 'destructive' }); }
  }

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) {
      toast({ title: '🗑️ Usuario eliminado' });
      router.push('/admin/users');
    } else {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Editar usuario</CardTitle></CardHeader>
      <CardContent className="space-y-4">

        {/* ── Datos principales ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Telegram Chat ID</Label>
            <Input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="123456789" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telegram Bot Token</Label>
          <Input value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder={user.hasTelegramToken ? '(configurado — deja vacío para no cambiar)' : '1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ'} type="password" />
          <p className="text-xs text-muted-foreground">Token del bot propio del usuario (creado con @BotFather)</p>
        </div>
        <Button size="sm" onClick={() => patch({ name, telegramChatId: chatId || null, ...(tgToken ? { telegramToken: tgToken } : {}) }, '✅ Usuario actualizado')} disabled={loading}>
          Guardar cambios
        </Button>

        {/* ── Reset contraseña ── */}
        <div className="border-t pt-4 space-y-2">
          <Label className="text-xs font-semibold">Resetear contraseña</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Nueva contraseña (mín. 8 caracteres)"
              value={resetPw}
              onChange={e => setResetPw(e.target.value)}
              minLength={8}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={loading || resetPw.length < 8}
              onClick={() => { patch({ newPassword: resetPw }, '✅ Contraseña reseteada'); setResetPw(''); }}
            >
              Resetear
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">El usuario tendrá que cambiarla al iniciar sesión.</p>
        </div>

        {/* ── Acciones ── */}
        <div className="flex gap-2 pt-2 border-t flex-wrap">
          {user.favoriteTeam && (
            <Button variant="outline" size="sm" onClick={() => patch({ resetFavorite: true }, '✅ Equipo favorito reseteado')} disabled={loading}>
              Resetear equipo ({user.favoriteTeam})
            </Button>
          )}
          <Button
            variant={user.active ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => patch({ active: !user.active }, user.active ? 'Usuario desactivado' : '✅ Usuario activado')}
            disabled={loading}
          >
            {user.active ? 'Desactivar' : 'Activar'}
          </Button>
        </div>

        {/* ── Eliminar usuario ── */}
        <div className="border-t pt-4">
          {!delConfirm ? (
            <Button variant="destructive" size="sm" onClick={() => setDelConfirm(true)} disabled={loading}>
              Eliminar usuario
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-destructive font-medium">¿Seguro? Esto es irreversible.</span>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>Confirmar</Button>
              <Button size="sm" variant="outline" onClick={() => setDelConfirm(false)}>Cancelar</Button>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
