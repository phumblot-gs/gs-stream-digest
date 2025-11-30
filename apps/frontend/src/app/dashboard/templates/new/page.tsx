'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ApiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CodeEditor } from '@/components/ui/code-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Save, Eye, Code, FileText, Mail } from 'lucide-react';
import { toast } from 'sonner';

// Template d'exemple pour démarrer
const DEFAULT_SUBJECT = '{{ eventsCount }} nouveau(x) événement(s) - {{ digest.name }}';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f7f7f7; padding: 30px; }
    .event { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .event-type { color: #667eea; font-weight: bold; font-size: 14px; text-transform: uppercase; }
    .event-time { color: #999; font-size: 12px; margin-top: 5px; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
    a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{ digest.name }}</h1>
      <p>Voici votre résumé avec {{ eventsCount }} événement(s)</p>
    </div>

    <div class="content">
      {% if eventsCount > 0 %}
        <h2>📊 Résumé des événements</h2>

        {% for event in events %}
          <div class="event">
            <div class="event-type">{{ event.eventType }}</div>
            <div class="event-time">{{ event.timestamp | formatDate }}</div>

            {% if event.data.file %}
              <p><strong>Fichier :</strong> {{ event.data.file.name }}</p>
              {% if event.data.file.size %}
                <p><strong>Taille :</strong> {{ event.data.file.size | fileSize }}</p>
              {% endif %}
            {% endif %}

            {% if event.data.user %}
              <p><strong>Utilisateur :</strong> {{ event.data.user.name }} ({{ event.data.user.email }})</p>
            {% endif %}

            {% if event.data.comment %}
              <p><strong>Commentaire :</strong> {{ event.data.comment | truncate: 100 }}</p>
            {% endif %}
          </div>
        {% endfor %}
      {% else %}
        <div class="event">
          <p style="text-align: center; color: #999;">Aucun événement pour cette période.</p>
        </div>
      {% endif %}
    </div>

    <div class="footer">
      <p>© 2024 Grand Shooting - Digest automatique</p>
      <p style="font-size: 12px; margin-top: 10px;">
        Vous recevez cet email car vous êtes abonné au digest "{{ digest.name }}"
      </p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_TEXT = `{{ digest.name }}
{{ eventsCount }} nouveau(x) événement(s)

{% for event in events %}
---
Type: {{ event.eventType }}
Date: {{ event.timestamp | formatDate }}
{% if event.data.file %}Fichier: {{ event.data.file.name }}{% endif %}
{% if event.data.user %}Utilisateur: {{ event.data.user.name }}{% endif %}

{% endfor %}

© 2024 Grand Shooting
Vous recevez cet email car vous êtes abonné au digest "{{ digest.name }}"`;

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
    },
    {
      uid: 'evt_002',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      eventType: 'comment.create',
      accountId: 'acc_123',
      source: {
        application: 'gs-casting',
        environment: 'production'
      },
      data: {
        comment: 'Excellent travail sur ce projet ! Les résultats sont impressionnants.',
        user: {
          id: 'usr_789',
          name: 'Jean Martin',
          email: 'jean@example.com'
        }
      }
    },
    {
      uid: 'evt_003',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      eventType: 'task.complete',
      accountId: 'acc_123',
      source: {
        application: 'gs-production',
        environment: 'production'
      },
      data: {
        task: {
          id: 'task_abc',
          title: 'Révision du script final',
          completedBy: 'Pierre Leroy'
        }
      }
    }
  ]
};

export default function NewTemplatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectLiquid, setSubjectLiquid] = useState(DEFAULT_SUBJECT);
  const [bodyHtmlLiquid, setBodyHtmlLiquid] = useState(DEFAULT_HTML);
  const [bodyTextLiquid, setBodyTextLiquid] = useState(DEFAULT_TEXT);
  const [isGlobal, setIsGlobal] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  // Preview state
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    subject?: string;
    html?: string;
    text?: string;
  }>({});

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const response = await ApiClient.post<{
        subject: string;
        bodyHtml: string;
        bodyText: string;
      }>('/templates/preview', {
        subjectLiquid,
        bodyHtmlLiquid,
        bodyTextLiquid,
        previewData: PREVIEW_DATA
      });

      setPreviewSubject(response.subject);
      setPreviewHtml(response.bodyHtml);
      setPreviewText(response.bodyText);
      
      // Clear validation errors on success
      setValidationErrors({});
      
      // Open preview modal
      setIsPreviewOpen(true);

      toast.success('Prévisualisation générée');
    } catch (error: any) {
      console.error('Erreur complète:', error);
      console.error('Détails de l\'erreur:', error.details);
      console.error('Erreur complète (fullError):', error.fullError);
      
      // Handle Liquid validation errors
      if (error.details && typeof error.details === 'object') {
        // Store errors for display in editors
        setValidationErrors({
          subject: error.details.subject,
          html: error.details.html,
          text: error.details.text,
        });
        
        const errorMessages: string[] = [];
        if (error.details.subject) {
          errorMessages.push(`Sujet: ${error.details.subject}`);
        }
        if (error.details.html) {
          errorMessages.push(`HTML: ${error.details.html}`);
        }
        if (error.details.text) {
          errorMessages.push(`Texte: ${error.details.text}`);
        }
        if (errorMessages.length > 0) {
          toast.error(`Erreurs de syntaxe Liquid:\n${errorMessages.join('\n')}`, {
            duration: 15000,
          });
        } else {
          const errorMsg = error.message || error.error || 'Erreur lors de la prévisualisation';
          toast.error(errorMsg, {
            duration: 10000,
          });
        }
      } else {
        setValidationErrors({});
        const errorMsg = error.message || error.error || `Erreur ${error.statusCode || ''}`.trim() || 'Erreur lors de la prévisualisation';
        toast.error(errorMsg, {
          duration: 10000,
        });
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('Le nom du template est requis');
      return;
    }

    if (!subjectLiquid) {
      toast.error('Le sujet est requis');
      return;
    }

    if (!bodyHtmlLiquid) {
      toast.error('Le corps HTML est requis');
      return;
    }

    setIsLoading(true);

    try {
      const templateData = {
        name,
        description,
        subjectLiquid,
        bodyHtmlLiquid,
        bodyTextLiquid,
        isGlobal,
        isDefault,
        previewData: PREVIEW_DATA
      };

      await ApiClient.post('/templates', templateData);
      
      // Clear validation errors on success
      setValidationErrors({});
      
      toast.success('Template créé avec succès !');
      router.push('/dashboard/templates');
    } catch (error: any) {
      console.error('Erreur complète:', error);
      console.error('Détails de l\'erreur:', error.details);
      console.error('Erreur complète (fullError):', error.fullError);
      
      // Handle Liquid validation errors
      if (error.details && typeof error.details === 'object') {
        // Store errors for display in editors
        setValidationErrors({
          subject: error.details.subject,
          html: error.details.html,
          text: error.details.text,
        });
        
        const errorMessages: string[] = [];
        if (error.details.subject) {
          errorMessages.push(`Sujet: ${error.details.subject}`);
        }
        if (error.details.html) {
          errorMessages.push(`HTML: ${error.details.html}`);
        }
        if (error.details.text) {
          errorMessages.push(`Texte: ${error.details.text}`);
        }
        if (errorMessages.length > 0) {
          toast.error(`Erreurs de syntaxe Liquid:\n${errorMessages.join('\n')}`, {
            duration: 15000,
          });
        } else {
          // Fallback: show error message or details
          const errorMsg = error.message || error.error || 'Erreur lors de la création du template';
          toast.error(errorMsg, {
            duration: 10000,
          });
        }
      } else {
        setValidationErrors({});
        // Show the error message with more details
        const errorMsg = error.message || error.error || `Erreur ${error.statusCode || ''}`.trim() || 'Erreur lors de la création du template';
        toast.error(errorMsg, {
          duration: 10000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

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
                <h1 className="text-xl font-bold">Nouveau Template</h1>
                <p className="text-sm text-gray-600">Créez un template d&apos;email personnalisé</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isPreviewing}
            >
              <Eye className="mr-2 h-4 w-4" />
              {isPreviewing ? 'Génération...' : 'Prévisualiser'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Left Column - Form */}
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du template *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Template Hebdomadaire"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Description du template..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="global">Template global</Label>
                        <p className="text-xs text-gray-500">Disponible pour tous les comptes</p>
                      </div>
                      <Switch
                        id="global"
                        checked={isGlobal}
                        onCheckedChange={setIsGlobal}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="default">Template par défaut</Label>
                        <p className="text-xs text-gray-500">Sélectionné automatiquement</p>
                      </div>
                      <Switch
                        id="default"
                        checked={isDefault}
                        onCheckedChange={setIsDefault}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Template Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Contenu du template</CardTitle>
                  <CardDescription>
                    Utilisez la syntaxe Liquid pour les variables dynamiques
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="html">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="subject">
                        <Mail className="mr-2 h-4 w-4" />
                        Sujet
                      </TabsTrigger>
                      <TabsTrigger value="html">
                        <Code className="mr-2 h-4 w-4" />
                        HTML
                      </TabsTrigger>
                      <TabsTrigger value="text">
                        <FileText className="mr-2 h-4 w-4" />
                        Texte
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="subject">
                      <div>
                        <Label htmlFor="subject">Sujet de l'email *</Label>
                        <Input
                          id="subject"
                          value={subjectLiquid}
                          onChange={(e) => setSubjectLiquid(e.target.value)}
                          placeholder="Ex: {{ eventsCount }} nouveaux événements"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Utilisez {`{{ eventsCount }}`} pour le nombre d&apos;événements
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="html">
                      <div>
                        <Label htmlFor="html">Corps HTML *</Label>
                        <CodeEditor
                          value={bodyHtmlLiquid}
                          onChange={setBodyHtmlLiquid}
                          language="html"
                          height="600px"
                          placeholder="Template HTML avec syntaxe Liquid..."
                          error={validationErrors.html}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="text">
                      <div>
                        <Label htmlFor="text">Corps Texte (optionnel)</Label>
                        <CodeEditor
                          value={bodyTextLiquid}
                          onChange={setBodyTextLiquid}
                          language="plaintext"
                          height="600px"
                          placeholder="Version texte brut avec syntaxe Liquid..."
                          error={validationErrors.text}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Création...' : 'Créer le template'}
                </Button>
                <Link href="/dashboard/templates">
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen flex flex-col p-0 m-0 rounded-none">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Aperçu du template</DialogTitle>
            <DialogDescription>
              Prévisualisation du rendu avec des données d&apos;exemple
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6">
            {previewHtml ? (
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Sujet</Label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <p className="text-lg">{previewSubject}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Rendu HTML</Label>
                  <div className="border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full"
                      style={{ height: 'calc(95vh - 200px)', minHeight: '600px', border: 'none' }}
                      title="Email Preview"
                    />
                  </div>
                </div>
                {previewText && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Version texte</Label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                      <pre className="whitespace-pre-wrap font-mono text-sm">{previewText}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Cliquez sur "Prévisualiser" pour voir le rendu</p>
                <p className="text-sm mt-2">Le template sera rendu avec des données d&apos;exemple</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}