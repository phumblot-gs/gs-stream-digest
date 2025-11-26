'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ApiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileText, Play, Pause, Edit2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Digest {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isPaused?: boolean;
  schedule?: string;
  lastCheckAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateWithDigests {
  template: {
    id: string;
    name: string;
    description?: string;
    isGlobal: boolean;
    isDefault: boolean;
  };
  digests: Digest[];
  count: number;
}

export default function TemplateDigestsPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<TemplateWithDigests | null>(null);

  useEffect(() => {
    checkAuth();
    fetchDigests();
  }, [templateId]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
    }
  };

  const fetchDigests = async () => {
    try {
      const response = await ApiClient.get<TemplateWithDigests>(`/templates/${templateId}/digests`);
      setData(response);
    } catch (error) {
      toast.error('Erreur lors du chargement des digests');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSchedule = (schedule?: string) => {
    if (!schedule) return 'Aucune planification';

    // Parse cron expression to human readable format
    const parts = schedule.split(' ');
    if (parts.length === 5) {
      const [minute, hour, dayMonth, month, dayWeek] = parts;

      if (hour === '*') return 'Toutes les heures';
      if (dayMonth === '1' && hour !== '*') return `Le 1er du mois à ${hour}h`;
      if (dayWeek === '1' && hour !== '*') return `Chaque lundi à ${hour}h`;
      if (dayWeek === '5' && hour !== '*') return `Chaque vendredi à ${hour}h`;
      if (hour !== '*') return `Tous les jours à ${hour}h`;
    }

    return schedule;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Template introuvable</p>
          <Link href="/dashboard/templates">
            <Button className="mt-4">Retour aux templates</Button>
          </Link>
        </div>
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
              <Link href="/dashboard/templates">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Digests utilisant ce template</h1>
                <p className="text-sm text-gray-600">
                  Template : {data.template.name}
                  {data.template.isGlobal && (
                    <Badge variant="outline" className="ml-2 text-xs">Global</Badge>
                  )}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {data.count} digest{data.count > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {data.digests.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun digest n'utilise ce template</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Ce template n'est actuellement utilisé par aucun digest.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/dashboard/digests/new">
                  <Button>Créer un digest</Button>
                </Link>
                <Link href="/dashboard/templates">
                  <Button variant="outline">Retour aux templates</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Liste des digests</CardTitle>
              <CardDescription>
                Tous les digests qui utilisent le template "{data.template.name}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Planification</TableHead>
                    <TableHead>Dernière exécution</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.digests.map((digest) => (
                    <TableRow key={digest.id}>
                      <TableCell className="font-medium">{digest.name}</TableCell>
                      <TableCell>{digest.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-sm">{formatSchedule(digest.schedule)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {digest.lastCheckAt
                          ? new Date(digest.lastCheckAt).toLocaleDateString('fr-FR')
                          : 'Jamais'
                        }
                      </TableCell>
                      <TableCell>
                        {digest.isActive && !digest.isPaused ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <Play className="mr-1 h-3 w-3" />
                            Actif
                          </Badge>
                        ) : digest.isPaused ? (
                          <Badge variant="secondary">
                            <Pause className="mr-1 h-3 w-3" />
                            En pause
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Pause className="mr-1 h-3 w-3" />
                            Inactif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/digests/${digest.id}`}>
                          <Button size="sm" variant="outline">
                            <Edit2 className="mr-1 h-3 w-3" />
                            Modifier
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        {data.digests.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Pour supprimer ce template, vous devez d'abord modifier tous les digests listés ci-dessus
                pour qu'ils utilisent un autre template. Une fois qu'aucun digest n'utilisera plus ce template,
                vous pourrez le supprimer depuis la page des templates.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}