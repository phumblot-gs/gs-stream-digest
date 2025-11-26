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
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Application {
  id: string;
  label: string;
  value: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ApplicationsAdminPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit form state
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    checkAuth();
    fetchApplications();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // TODO: Check if user is superadmin
    // For now, we continue
  };

  const fetchApplications = async () => {
    try {
      const data = await ApiClient.get<Application[]>('/admin/applications');
      setApplications(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des applications');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newLabel || !newValue) {
      toast.error('Le libellé et la valeur sont requis');
      return;
    }

    try {
      const newApp = await ApiClient.post<Application>('/admin/applications', {
        label: newLabel,
        value: newValue,
        description: newDescription || undefined,
      });

      // Insert the new app in alphabetical order
      const updatedApps = [...applications, newApp].sort((a, b) =>
        a.label.localeCompare(b.label)
      );
      setApplications(updatedApps);
      setIsAdding(false);
      setNewLabel('');
      setNewValue('');
      setNewDescription('');
      toast.success('Application ajoutée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de l\'application');
      console.error(error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editLabel || !editValue) {
      toast.error('Le libellé et la valeur sont requis');
      return;
    }

    try {
      const updated = await ApiClient.put<Application>(`/admin/applications/${id}`, {
        label: editLabel,
        value: editValue,
        description: editDescription || undefined,
      });

      setApplications(applications.map(app => app.id === id ? updated : app));
      setEditingId(null);
      toast.success('Application mise à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await ApiClient.put(`/admin/applications/${id}`, { isActive: !isActive });
      setApplications(applications.map(app =>
        app.id === id ? { ...app, isActive: !isActive } : app
      ));
      toast.success(isActive ? 'Application désactivée' : 'Application activée');
    } catch (error) {
      toast.error('Erreur lors de la modification');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette application ?')) {
      return;
    }

    try {
      await ApiClient.delete(`/admin/applications/${id}`);
      setApplications(applications.filter(app => app.id !== id));
      toast.success('Application supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  };

  const startEdit = (app: Application) => {
    setEditingId(app.id);
    setEditLabel(app.label);
    setEditValue(app.value);
    setEditDescription(app.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditValue('');
    setEditDescription('');
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
                <h1 className="text-xl font-bold">Applications</h1>
                <p className="text-sm text-gray-600">Gérez la liste des applications pour les filtres</p>
              </div>
            </div>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Application
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Liste des Applications</CardTitle>
            <CardDescription>
              Configurez les applications disponibles pour filtrer les événements dans les digests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Valeur (filtre)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isAdding && (
                  <TableRow>
                    <TableCell>
                      <Input
                        placeholder="Ex: GS Sourcing"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        autoFocus
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Ex: sourcing"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Description (optionnel)"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">Nouveau</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={handleAdd}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsAdding(false);
                            setNewLabel('');
                            setNewValue('');
                            setNewDescription('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {applications.map((app) => (
                  <TableRow key={app.id}>
                    {editingId === app.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            autoFocus
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          {app.isActive ? (
                            <span className="text-green-600">Actif</span>
                          ) : (
                            <span className="text-gray-500">Inactif</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleUpdate(app.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{app.label}</TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm">{app.value}</code>
                        </TableCell>
                        <TableCell>{app.description || '-'}</TableCell>
                        <TableCell>
                          <Switch
                            checked={app.isActive}
                            onCheckedChange={() => handleToggleActive(app.id, app.isActive)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(app)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(app.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}

                {applications.length === 0 && !isAdding && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Aucune application configurée. Cliquez sur "Nouvelle Application" pour commencer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}