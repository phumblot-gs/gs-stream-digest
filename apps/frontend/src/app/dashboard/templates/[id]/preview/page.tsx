'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ApiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { DigestTemplate } from '@gs-digest/shared';

// Exemple de données pour la prévisualisation
const PREVIEW_DATA = {
  digest: {
    name: 'Digest Hebdomadaire',
    description: 'Résumé des activités de la semaine'
  },
  eventsCount: 3,
  currentDate: new Date().toISOString(),
  recipientEmail: 'user@example.com',
  events: [
    {
      uid: 'evt_001',
      timestamp: new Date().toISOString(),
      eventType: 'file.share',
      accountId: 'acc_123',
      source: {
        application: 'gs-sourcing',
        environment: 'production'
      },
      data: {
        file: {
          id: 'file_123',
          name: 'Rapport-Q4-2024.pdf',
          size: 2456789
        },
        user: {
          id: 'usr_456',
          name: 'Marie Dupont',
          email: 'marie@example.com'
        }
      }
    }
  ]
};

export default function TemplatePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [template, setTemplate] = useState<DigestTemplate | null>(null);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewText, setPreviewText] = useState('');

  useEffect(() => {
    checkAuth();
    loadTemplate();
  }, [templateId]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }
  };

  const loadTemplate = async () => {
    try {
      const data = await ApiClient.get<DigestTemplate>(`/templates/${templateId}`);
      setTemplate(data);
      // Auto-generate preview when template loads
      if (data) {
        generatePreview(data);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Template introuvable');
        router.push('/dashboard/templates');
      } else {
        toast.error('Erreur lors du chargement du template');
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generatePreview = async (templateData: DigestTemplate) => {
    setIsPreviewing(true);
    try {
      const response = await ApiClient.post<{
        subject: string;
        bodyHtml: string;
        bodyText: string;
      }>('/templates/preview', {
        subjectLiquid: templateData.subjectLiquid,
        bodyHtmlLiquid: templateData.bodyHtmlLiquid,
        bodyTextLiquid: templateData.bodyTextLiquid,
        previewData: PREVIEW_DATA
      });

      setPreviewSubject(response.subject);
      setPreviewHtml(response.bodyHtml);
      setPreviewText(response.bodyText);

      toast.success('Prévisualisation générée');
    } catch (error: any) {
      console.error('Erreur lors de la prévisualisation:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.details) {
        const details = error.response.data.details;
        const errorMessages = Object.values(details).filter(Boolean);
        if (errorMessages.length > 0) {
          toast.error(`Erreur de template: ${errorMessages[0]}`);
        } else {
          toast.error('Erreur lors de la génération de la prévisualisation');
        }
      } else {
        toast.error('Erreur lors de la génération de la prévisualisation');
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/templates">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Aperçu du Template</h1>
                <p className="text-sm text-gray-600">{template.name}</p>
              </div>
            </div>
            <Link href={`/dashboard/templates/${templateId}`}>
              <Button variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isPreviewing ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Génération de la prévisualisation...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Subject Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Sujet de l&apos;email</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <p className="font-semibold">{previewSubject || 'Aucun sujet généré'}</p>
                </div>
              </CardContent>
            </Card>

            {/* HTML Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Contenu HTML</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <div 
                    className="p-6 bg-white"
                    dangerouslySetInnerHTML={{ __html: previewHtml || '<p>Aucun contenu HTML généré</p>' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Text Preview */}
            {previewText && (
              <Card>
                <CardHeader>
                  <CardTitle>Version texte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">{previewText}</pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

