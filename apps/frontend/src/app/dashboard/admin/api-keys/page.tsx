'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ApiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Copy, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  accountId: string | null;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface NewKeyResponse {
  id: string;
  apiKey: string;
  message: string;
}

export default function ApiKeysAdminPage() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState<NewKeyResponse | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newAccountId, setNewAccountId] = useState('');

  useEffect(() => {
    checkAuth();
    fetchApiKeys();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // TODO: Check if user is superadmin
  };

  const fetchApiKeys = async () => {
    try {
      const data = await ApiClient.get<{ keys: ApiKey[]; count: number }>('/admin/api-keys');
      setApiKeys(data.keys);
    } catch (error) {
      toast.error('Erreur lors du chargement des clés API');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName) {
      toast.error('Le nom est requis');
      return;
    }

    setIsCreating(true);
    try {
      const result = await ApiClient.post<NewKeyResponse>('/admin/api-keys', {
        name: newName,
        accountId: newAccountId || null,
        permissions: ['read'],
      });

      setNewKeyData(result);
      setShowNewKeyDialog(true);
      setNewName('');
      setNewAccountId('');

      // Refresh the list
      fetchApiKeys();
      toast.success('Clé API créée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création de la clé API');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir révoquer la clé "${name}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await ApiClient.delete(`/admin/api-keys/${id}`);
      setApiKeys(apiKeys.map(key =>
        key.id === id ? { ...key, isActive: false, revokedAt: new Date().toISOString() } : key
      ));
      toast.success('Clé API révoquée');
    } catch (error) {
      toast.error('Erreur lors de la révocation');
      console.error(error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copié dans le presse-papier');
    } catch (error) {
      toast.error('Erreur lors de la copie');
      console.error(error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Clés API</h1>
                <p className="text-sm text-gray-600">Gérez les clés d&apos;accès à l&apos;API publique</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Create Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Créer une nouvelle clé API</CardTitle>
            <CardDescription>
              Les clés API permettent d&apos;accéder à l&apos;API publique en lecture seule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la clé *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Production API Key"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountId">Account ID (optionnel)</Label>
                <Input
                  id="accountId"
                  placeholder="Laisser vide pour &apos;default&apos;"
                  value={newAccountId}
                  onChange={(e) => setNewAccountId(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleCreate} disabled={isCreating || !newName}>
                <Key className="mr-2 h-4 w-4" />
                {isCreating ? 'Création...' : 'Créer la clé API'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>Clés API existantes ({apiKeys.length})</CardTitle>
            <CardDescription>
              Les clés révoquées ne peuvent plus être utilisées pour accéder à l&apos;API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Préfixe</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière utilisation</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                        {key.keyPrefix}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {key.accountId || 'default'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.isActive ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Révoquée
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {key.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevoke(key.id, key.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {apiKeys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Aucune clé API créée. Créez votre première clé ci-dessus.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* New Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Clé API créée avec succès
            </DialogTitle>
            <DialogDescription>
              Copiez cette clé maintenant. Elle ne sera plus jamais affichée !
            </DialogDescription>
          </DialogHeader>

          {newKeyData && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Votre clé API</Label>
                <div className="flex gap-2">
                  <Input
                    value={newKeyData.apiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(newKeyData.apiKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-semibold mb-1">Importante : Sauvegardez cette clé maintenant</p>
                    <p>Pour des raisons de sécurité, vous ne pourrez plus voir cette clé. Sauvegardez-la dans un endroit sûr comme un gestionnaire de mots de passe.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Exemple d&apos;utilisation</Label>
                <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 overflow-x-auto">
                  <code className="text-sm font-mono">
                    curl -H &quot;X-API-Key: {newKeyData.apiKey}&quot; \<br/>
                    &nbsp;&nbsp;https://digest-api.grand-shooting.com/api/v1/digests
                  </code>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => {
              setShowNewKeyDialog(false);
              setNewKeyData(null);
            }}>
              J'ai sauvegardé la clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
