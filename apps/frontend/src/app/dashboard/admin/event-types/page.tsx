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

interface EventType {
  id: string;
  label: string;
  value: string;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EventTypesAdminPage() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Edit form state
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    checkAuth();
    fetchEventTypes();
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

  const fetchEventTypes = async () => {
    try {
      const data = await ApiClient.get<EventType[]>('/admin/event-types');
      setEventTypes(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des types d\'événements');
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
      const newEventType = await ApiClient.post<EventType>('/admin/event-types', {
        label: newLabel,
        value: newValue,
        description: newDescription || undefined,
        category: newCategory || undefined,
      });

      // Insert the new event type in alphabetical order
      const updatedEventTypes = [...eventTypes, newEventType].sort((a, b) =>
        a.label.localeCompare(b.label)
      );
      setEventTypes(updatedEventTypes);
      setIsAdding(false);
      setNewLabel('');
      setNewValue('');
      setNewDescription('');
      setNewCategory('');
      toast.success('Type d\'événement ajouté avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du type d\'événement');
      console.error(error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editLabel || !editValue) {
      toast.error('Le libellé et la valeur sont requis');
      return;
    }

    try {
      const updated = await ApiClient.put<EventType>(`/admin/event-types/${id}`, {
        label: editLabel,
        value: editValue,
        description: editDescription || undefined,
        category: editCategory || undefined,
      });

      setEventTypes(eventTypes.map(et => et.id === id ? updated : et));
      setEditingId(null);
      toast.success('Type d\'événement mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await ApiClient.put(`/admin/event-types/${id}`, { isActive: !isActive });
      setEventTypes(eventTypes.map(et =>
        et.id === id ? { ...et, isActive: !isActive } : et
      ));
      toast.success(isActive ? 'Type désactivé' : 'Type activé');
    } catch (error) {
      toast.error('Erreur lors de la modification');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type d\'événement ?')) {
      return;
    }

    try {
      await ApiClient.delete(`/admin/event-types/${id}`);
      setEventTypes(eventTypes.filter(et => et.id !== id));
      toast.success('Type d\'événement supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  };

  const startEdit = (eventType: EventType) => {
    setEditingId(eventType.id);
    setEditLabel(eventType.label);
    setEditValue(eventType.value);
    setEditDescription(eventType.description || '');
    setEditCategory(eventType.category || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditValue('');
    setEditDescription('');
    setEditCategory('');
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
                <h1 className="text-xl font-bold">Types d'événements</h1>
                <p className="text-sm text-gray-600">Gérez la liste des types d'événements pour les filtres</p>
              </div>
            </div>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Type
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Liste des Types d'événements</CardTitle>
            <CardDescription>
              Configurez les types d'événements disponibles pour filtrer dans les digests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Valeur (filtre)</TableHead>
                  <TableHead>Catégorie</TableHead>
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
                        placeholder="Ex: Partage de fichier"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        autoFocus
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Ex: file.share"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Catégorie (optionnel)"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
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
                            setNewCategory('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {eventTypes.map((eventType) => (
                  <TableRow key={eventType.id}>
                    {editingId === eventType.id ? (
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
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          {eventType.isActive ? (
                            <span className="text-green-600">Actif</span>
                          ) : (
                            <span className="text-gray-500">Inactif</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleUpdate(eventType.id)}>
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
                        <TableCell className="font-medium">{eventType.label}</TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm">{eventType.value}</code>
                        </TableCell>
                        <TableCell>{eventType.category || '-'}</TableCell>
                        <TableCell>{eventType.description || '-'}</TableCell>
                        <TableCell>
                          <Switch
                            checked={eventType.isActive}
                            onCheckedChange={() => handleToggleActive(eventType.id, eventType.isActive)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(eventType)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(eventType.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}

                {eventTypes.length === 0 && !isAdding && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucun type d'événement configuré. Cliquez sur "Nouveau Type" pour commencer.
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