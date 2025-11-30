'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ApiClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Activity, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

interface MonitoringStats {
  period: string;
  runs: {
    total: number;
    completed: number;
    failed: number;
    successRate: number;
    avgExecutionTimeMs: number;
  };
  emails: {
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
  };
}

interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  message?: string;
}

interface ErrorItem {
  id: string;
  type: 'run' | 'email';
  digestId?: string;
  digestName?: string;
  accountId?: string | null;
  timestamp: number | Date;
  error?: string;
  recipient?: string;
  status?: string;
}

interface SuccessItem {
  id: string;
  digestId: string;
  digestName: string;
  accountId?: string | null;
  runAt: number;
  completedAt?: number;
  eventsCount?: number;
  emailsSent?: number;
  durationMs?: number;
  status: string;
}

interface Account {
  accountId: string;
  label: string;
}

export default function MonitoringPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('viewer');
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [successes, setSuccesses] = useState<SuccessItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Filter state
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchAllData();
    }
  }, [userRole, selectedAccount]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // TODO: Fetch actual role from backend
    setUserRole('superadmin');
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchQueueStats(),
        fetchErrors(),
        fetchSuccesses(),
        userRole === 'superadmin' ? fetchAccounts() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const queryParams = selectedAccount !== 'all' ? `?accountId=${selectedAccount}` : '';
      const data = await ApiClient.get<MonitoringStats>(`/monitoring/stats${queryParams}`);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const data = await ApiClient.get<QueueStats>('/monitoring/queue-stats');
      setQueueStats(data);
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const fetchErrors = async () => {
    try {
      const queryParams = selectedAccount !== 'all' ? `?accountId=${selectedAccount}` : '';
      const data = await ApiClient.get<{ errors: ErrorItem[]; count: number }>(`/monitoring/errors${queryParams}`);
      setErrors(data.errors);
    } catch (error) {
      console.error('Error fetching errors:', error);
    }
  };

  const fetchSuccesses = async () => {
    try {
      const queryParams = selectedAccount !== 'all' ? `?accountId=${selectedAccount}` : '';
      const data = await ApiClient.get<{ successes: SuccessItem[]; count: number }>(`/monitoring/successes${queryParams}`);
      setSuccesses(data.successes);
    } catch (error) {
      console.error('Error fetching successes:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await ApiClient.get<{ accounts: Account[]; count: number }>('/monitoring/accounts');
      setAccounts(data.accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const formatTimestamp = (timestamp: number | Date) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
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
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Activity className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Monitoring</h1>
              </div>
            </div>

            {/* Account Filter for Superadmin */}
            {userRole === 'superadmin' && accounts.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Compte:</span>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tous les comptes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les comptes</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.accountId} value={account.accountId}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {/* Queue Stats - Pending Jobs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Jobs en attente</CardDescription>
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <CardTitle className="text-3xl">{queueStats?.pending || 0}</CardTitle>
            </CardHeader>
            {queueStats?.message && (
              <CardContent>
                <p className="text-xs text-muted-foreground">{queueStats.message}</p>
              </CardContent>
            )}
          </Card>

          {/* Run Stats - Completed vs Failed */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Exécutions (30j)</CardDescription>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-3xl">{stats?.runs.total || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>{stats?.runs.completed || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-3 w-3" />
                  <span>{stats?.runs.failed || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Execution Time */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Temps moyen</CardDescription>
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <CardTitle className="text-3xl">
                {formatDuration(stats?.runs.avgExecutionTimeMs)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Par exécution réussie</p>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Taux de succès</CardDescription>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <CardTitle className="text-3xl">{stats?.runs.successRate || 0}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Sur les 30 derniers jours</p>
            </CardContent>
          </Card>
        </div>

        {/* Email Stats Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Statistiques d'emails (30 derniers jours)</CardTitle>
            <CardDescription>Vue d'ensemble des emails envoyés et leur statut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Envoyés</div>
                <div className="text-2xl font-bold">{stats?.emails.sent || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Délivrés</div>
                <div className="text-2xl font-bold text-green-600">{stats?.emails.delivered || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Bounced</div>
                <div className="text-2xl font-bold text-orange-600">{stats?.emails.bounced || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Échecs</div>
                <div className="text-2xl font-bold text-red-600">{stats?.emails.failed || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle>Erreurs récentes</CardTitle>
            </div>
            <CardDescription>20 dernières erreurs (runs échoués et emails bounced/failed)</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                <p>Aucune erreur récente</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Digest</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${
                          error.type === 'run'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {error.type === 'run' ? 'Run' : 'Email'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{error.digestName || 'N/A'}</div>
                          {error.accountId && (
                            <div className="text-xs text-muted-foreground">
                              {error.accountId}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTimestamp(error.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm max-w-md truncate">
                        {error.type === 'email' && error.recipient && (
                          <div className="text-xs text-muted-foreground mb-1">
                            À: {error.recipient}
                          </div>
                        )}
                        <div className="text-red-600">
                          {error.error || error.status || 'Erreur inconnue'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Successes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle>Exécutions réussies récentes</CardTitle>
            </div>
            <CardDescription>20 dernières exécutions réussies</CardDescription>
          </CardHeader>
          <CardContent>
            {successes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Aucune exécution réussie récente</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Digest</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Événements</TableHead>
                    <TableHead>Emails</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {successes.map((success) => (
                    <TableRow key={success.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{success.digestName}</div>
                          {success.accountId && (
                            <div className="text-xs text-muted-foreground">
                              {success.accountId}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTimestamp(success.runAt)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {success.eventsCount || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {success.emailsSent || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(success.durationMs)}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${
                          success.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {success.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
