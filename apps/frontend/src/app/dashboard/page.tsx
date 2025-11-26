'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ApiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Mail, Clock, Settings, Play, Pause, Edit, Trash2, BarChart, FileText, ChevronDown, Building, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Digest {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  isActive: boolean;
  isPaused: boolean;
  recipients: string[];
  lastCheckAt?: string;
  createdAt: string;
  recentRuns?: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('viewer');
  const [digests, setDigests] = useState<Digest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDigests();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);
    // TODO: Fetch actual role from backend
    // For now, we'll set superadmin for testing
    setUserRole('superadmin');
  };

  const fetchDigests = async () => {
    try {
      const data = await ApiClient.get<{ digests: Digest[] }>('/digests');
      setDigests(data.digests);
    } catch (error) {
      toast.error('Erreur lors du chargement des digests');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePause = async (digestId: string, isPaused: boolean) => {
    try {
      await ApiClient.put(`/digests/${digestId}`, { isPaused: !isPaused });
      toast.success(isPaused ? 'Digest activé' : 'Digest mis en pause');
      fetchDigests();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleSendNow = async (digestId: string) => {
    try {
      await ApiClient.post(`/digests/${digestId}/send`);
      toast.success('Envoi immédiat déclenché');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const handleDelete = async (digestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce digest ?')) return;

    try {
      await ApiClient.delete(`/digests/${digestId}`);
      toast.success('Digest supprimé');
      fetchDigests();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatSchedule = (schedule: string) => {
    // Parse cron expression to human readable
    if (schedule === '0 * * * *') return 'Toutes les heures';
    if (schedule === '0 */6 * * *') return 'Toutes les 6 heures';
    if (schedule.includes('0 9 * * *')) return 'Tous les jours à 9h';
    return schedule;
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
              <Mail className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">GS Stream Digest</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/templates">
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Templates
                </Button>
              </Link>

              {userRole === 'superadmin' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Admin
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Administration</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/admin/applications" className="cursor-pointer">
                        <Building className="mr-2 h-4 w-4" />
                        Applications
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/admin/event-types" className="cursor-pointer">
                        <Calendar className="mr-2 h-4 w-4" />
                        Types d'événements
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/monitoring" className="cursor-pointer">
                        <BarChart className="mr-2 h-4 w-4" />
                        Monitoring
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button variant="outline" onClick={() => {
                const supabase = createClient();
                supabase.auth.signOut();
                router.push('/');
              }}>
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Bienvenue {user?.email} !
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez vos digests d'événements depuis ce tableau de bord.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total des digests</CardDescription>
              <CardTitle className="text-3xl">{digests.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Digests actifs</CardDescription>
              <CardTitle className="text-3xl">
                {digests.filter(d => d.isActive && !d.isPaused).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Emails envoyés (24h)</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Prochaine exécution</CardDescription>
              <CardTitle className="text-lg">Dans 2h</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Digests Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Mes Digests</h3>
            <Link href="/dashboard/digests/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Digest
              </Button>
            </Link>
          </div>

          {digests.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun digest créé</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Créez votre premier digest pour commencer à recevoir des emails récapitulatifs.
                </p>
                <Link href="/dashboard/digests/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer mon premier digest
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {digests.map((digest) => (
                <Card key={digest.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{digest.name}</CardTitle>
                        <CardDescription>{digest.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {digest.isPaused ? (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            En pause
                          </span>
                        ) : digest.isActive ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Actif
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            Inactif
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="mr-2 h-4 w-4" />
                        {formatSchedule(digest.schedule)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="mr-2 h-4 w-4" />
                        {digest.recipients.length} destinataire(s)
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePause(digest.id, digest.isPaused)}
                      >
                        {digest.isPaused ? (
                          <>
                            <Play className="mr-1 h-3 w-3" />
                            Reprendre
                          </>
                        ) : (
                          <>
                            <Pause className="mr-1 h-3 w-3" />
                            Pause
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNow(digest.id)}
                      >
                        Envoyer maintenant
                      </Button>
                      <Link href={`/dashboard/digests/${digest.id}`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(digest.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}