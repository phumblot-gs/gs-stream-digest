'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ApiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Edit, Trash2, Eye, Copy, Globe, FileStack, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DigestTemplate } from '@gs-digest/shared';

interface Template {
  id: string;
  name: string;
  description?: string;
  isGlobal: boolean;
  isDefault: boolean;
  accountId?: string;
  createdAt: string;
  updatedAt: string;
  digestCount?: number;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);
  };

  const fetchTemplates = async () => {
    try {
      const data = await ApiClient.get<Template[]>('/templates');
      setTemplates(data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des templates');
      console.error(error);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;

    try {
      await ApiClient.delete(`/templates/${templateId}`);
      toast.success('Template supprimé');
      fetchTemplates();
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Template already deleted, just refresh the list
        toast.info('Ce template n\'existe plus');
        fetchTemplates();
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      // Fetch full template details
      const fullTemplate = await ApiClient.get<DigestTemplate>(`/templates/${templateId}`);

      // Create a copy
      const newTemplate = {
        name: `${template.name} (Copie)`,
        description: template.description,
        subjectLiquid: fullTemplate.subjectLiquid,
        bodyHtmlLiquid: fullTemplate.bodyHtmlLiquid,
        bodyTextLiquid: fullTemplate.bodyTextLiquid,
        isGlobal: false,
      };

      await ApiClient.post('/templates', newTemplate);
      toast.success('Template dupliqué avec succès');
      fetchTemplates();
    } catch (error) {
      toast.error('Erreur lors de la duplication');
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
                <Button variant="ghost" size="sm">
                  ← Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Templates d&apos;Email</h1>
                <p className="text-sm text-gray-600">Gérez vos templates de digest</p>
              </div>
            </div>
            <Link href="/dashboard/templates/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Template
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total des templates</CardDescription>
              <CardTitle className="text-2xl">{templates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Templates globaux</CardDescription>
              <CardTitle className="text-2xl">
                {templates.filter(t => t.isGlobal).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Templates personnalisés</CardDescription>
              <CardTitle className="text-2xl">
                {templates.filter(t => !t.isGlobal).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun template disponible</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Créez votre premier template pour personnaliser vos digests.
              </p>
              <Link href="/dashboard/templates/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un template
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {template.description || 'Pas de description'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Par défaut
                        </Badge>
                      )}
                      {template.isGlobal && (
                        <Badge variant="outline" className="text-xs">
                          <Globe className="mr-1 h-3 w-3" />
                          Global
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Digest count indicator */}
                  <div className="mb-3">
                    <Link
                      href={`/dashboard/templates/${template.id}/digests`}
                      className="inline-flex items-center gap-1 text-sm hover:underline"
                    >
                      <FileStack className="h-4 w-4" />
                      <span className={(template.digestCount ?? 0) === 0 ? 'text-gray-500' : 'text-blue-600'}>
                        {(template.digestCount ?? 0) === 0
                          ? 'Non utilisé'
                          : `Utilisé par ${template.digestCount} digest${template.digestCount! > 1 ? 's' : ''}`}
                      </span>
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/templates/${template.id}/preview`}>
                      <Button size="sm" variant="outline">
                        <Eye className="mr-1 h-3 w-3" />
                        Aperçu
                      </Button>
                    </Link>

                    {/* Show edit button only for non-global templates OR global templates with 0 usage */}
                    {(!template.isGlobal || template.digestCount === 0) && (
                      <>
                        {!template.isGlobal && (
                          <Link href={`/dashboard/templates/${template.id}`}>
                            <Button size="sm" variant="outline">
                              <Edit className="mr-1 h-3 w-3" />
                              Modifier
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(template.id)}
                          className={template.digestCount === 0 ? '' : 'opacity-50 cursor-not-allowed'}
                          disabled={template.digestCount !== 0}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicate(template.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                    Créé le {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Template Examples */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Variables disponibles</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Variables de contexte</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><code className="bg-gray-100 px-1">{'{{ digest.name }}'}</code> - Nom du digest</li>
                    <li><code className="bg-gray-100 px-1">{'{{ eventsCount }}'}</code> - Nombre d&apos;événements</li>
                    <li><code className="bg-gray-100 px-1">{'{{ events }}'}</code> - Liste des événements</li>
                    <li><code className="bg-gray-100 px-1">{'{{ currentDate }}'}</code> - Date actuelle</li>
                    <li><code className="bg-gray-100 px-1">{'{{ recipientEmail }}'}</code> - Email du destinataire</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Filtres Liquid</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><code className="bg-gray-100 px-1">{'{{ date | formatDate }}'}</code> - Format date</li>
                    <li><code className="bg-gray-100 px-1">{'{{ size | fileSize }}'}</code> - Format taille fichier</li>
                    <li><code className="bg-gray-100 px-1">{'{{ text | truncate: 50 }}'}</code> - Tronquer texte</li>
                    <li><code className="bg-gray-100 px-1">{'{{ text | capitalize }}'}</code> - Majuscule</li>
                    <li><code className="bg-gray-100 px-1">{'{{ array | size }}'}</code> - Taille tableau</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h3 className="font-semibold mb-2">Exemple de boucle sur les événements</h3>
                <pre className="text-xs overflow-x-auto">
{`{% for event in events %}
  <div class="event">
    <h3>{{ event.eventType }}</h3>
    <p>{{ event.timestamp | formatDate }}</p>
    {% if event.data.file %}
      <p>Fichier: {{ event.data.file.name }}</p>
    {% endif %}
  </div>
{% endfor %}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}