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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, X, Mail, Clock, Filter, Users, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleEditor } from '@/components/ui/schedule-editor';

// Dynamic lists will be fetched from the API
interface EventType {
  id: string;
  label: string;
  value: string;
  description?: string;
  category?: string;
  isActive: boolean;
}

interface Application {
  id: string;
  label: string;
  value: string;
  description?: string;
  isActive: boolean;
}


interface Template {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isGlobal?: boolean;
}

export default function NewDigestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [schedule, setSchedule] = useState('0 9 * * *');
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [testRecipients, setTestRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [newTestRecipient, setNewTestRecipient] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [maxAgeHours, setMaxAgeHours] = useState(24);

  useEffect(() => {
    checkAuth();
    fetchTemplates();
    fetchEventTypes();
    fetchApplications();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await ApiClient.get<Template[]>('/templates');
      setTemplates(data || []);
      // Set default template if available
      const defaultTemplate = data?.find(t => t.isDefault);
      if (defaultTemplate) {
        setTemplateId(defaultTemplate.id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      setTemplates([]);
    }
  };

  const fetchEventTypes = async () => {
    try {
      const data = await ApiClient.get<EventType[]>('/admin/event-types');
      // Filter only active event types
      setEventTypes(data.filter(et => et.isActive));
    } catch (error) {
      console.error('Erreur lors du chargement des types d\'événements:', error);
      // Fallback to default list if API fails
      setEventTypes([
        { id: '1', value: 'file.share', label: 'Partage de fichier', isActive: true },
        { id: '2', value: 'file.upload', label: 'Upload de fichier', isActive: true },
        { id: '3', value: 'file.download', label: 'Téléchargement de fichier', isActive: true },
        { id: '4', value: 'comment.create', label: 'Nouveau commentaire', isActive: true },
        { id: '5', value: 'task.create', label: 'Nouvelle tâche', isActive: true },
        { id: '6', value: 'task.complete', label: 'Tâche complétée', isActive: true },
      ]);
    }
  };

  const fetchApplications = async () => {
    try {
      const data = await ApiClient.get<Application[]>('/admin/applications');
      // Filter only active applications
      setApplications(data.filter(app => app.isActive));
    } catch (error) {
      console.error('Erreur lors du chargement des applications:', error);
      // Fallback to default list if API fails
      setApplications([
        { id: '1', value: 'gs-sourcing', label: 'GS Sourcing', isActive: true },
        { id: '2', value: 'gs-casting', label: 'GS Casting', isActive: true },
        { id: '3', value: 'gs-production', label: 'GS Production', isActive: true },
      ]);
    }
  };

  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newRecipient) {
      e.preventDefault();
      if (!recipients.includes(newRecipient)) {
        setRecipients([...recipients, newRecipient]);
        setNewRecipient('');
      }
    }
  };

  const handleAddTestRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTestRecipient) {
      e.preventDefault();
      if (!testRecipients.includes(newTestRecipient)) {
        setTestRecipients([...testRecipients, newTestRecipient]);
        setNewTestRecipient('');
      }
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const removeTestRecipient = (email: string) => {
    setTestRecipients(testRecipients.filter(r => r !== email));
  };

  const toggleEventType = (eventType: string) => {
    if (selectedEventTypes.includes(eventType)) {
      setSelectedEventTypes(selectedEventTypes.filter(t => t !== eventType));
    } else {
      setSelectedEventTypes([...selectedEventTypes, eventType]);
    }
  };

  const toggleApplication = (app: string) => {
    if (selectedApplications.includes(app)) {
      setSelectedApplications(selectedApplications.filter(a => a !== app));
    } else {
      setSelectedApplications([...selectedApplications, app]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('Le nom du digest est requis');
      return;
    }

    if (selectedEventTypes.length === 0) {
      toast.error('Sélectionnez au moins un type d\'événement');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Ajoutez au moins un destinataire');
      return;
    }

    if (!templateId) {
      toast.error('Sélectionnez un template');
      return;
    }

    setIsLoading(true);

    try {
      const digestData = {
        name,
        description,
        filters: {
          eventTypes: selectedEventTypes,
          sourceApplications: selectedApplications,
          maxAgeHours,
        },
        schedule,
        timezone,
        recipients,
        testRecipients,
        templateId,
        isActive,
      };

      await ApiClient.post('/digests', digestData);
      toast.success('Digest créé avec succès !');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Erreur lors de la création du digest');
      console.error(error);
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
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Nouveau Digest</h1>
                <p className="text-sm text-gray-600">Créez un nouveau digest d'événements</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Définissez le nom et la description de votre digest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du digest *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Récapitulatif hebdomadaire des partages"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description détaillée du digest..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Filtres d'événements
              </CardTitle>
              <CardDescription>Sélectionnez les événements à inclure dans le digest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event Types */}
              <div>
                <Label>Types d'événements *</Label>
                {eventTypes.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {eventTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleEventType(type.value)}
                        className={`p-2 text-sm rounded-md border transition-colors ${
                          selectedEventTypes.includes(type.value)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={type.description || type.label}
                      >
                        {type.label}
                        {type.category && (
                          <span className="block text-xs opacity-75 mt-1">{type.category}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">Aucun type d'événement configuré. Contactez un administrateur.</p>
                )}
              </div>

              {/* Applications */}
              <div>
                <Label>Applications sources</Label>
                {applications.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {applications.map(app => (
                      <button
                        key={app.value}
                        type="button"
                        onClick={() => toggleApplication(app.value)}
                        className={`p-2 text-sm rounded-md border transition-colors ${
                          selectedApplications.includes(app.value)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={app.description || app.label}
                      >
                        {app.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">Laissez vide pour inclure toutes les applications.</p>
                )}
              </div>

              {/* Max Age */}
              <div>
                <Label htmlFor="maxAge">Âge maximum des événements (heures)</Label>
                <Input
                  id="maxAge"
                  type="number"
                  value={maxAgeHours}
                  onChange={(e) => setMaxAgeHours(parseInt(e.target.value))}
                  min="1"
                  max="168"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Seuls les événements des {maxAgeHours} dernières heures seront inclus
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Planification
              </CardTitle>
              <CardDescription>Définissez quand le digest sera envoyé</CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleEditor value={schedule} onChange={setSchedule} timezone={timezone} onTimezoneChange={setTimezone} />
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Destinataires
              </CardTitle>
              <CardDescription>Ajoutez les emails des destinataires</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main Recipients */}
              <div>
                <Label htmlFor="recipients">Destinataires principaux *</Label>
                <div className="space-y-2">
                  <Input
                    id="recipients"
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyDown={handleAddRecipient}
                    placeholder="email@example.com (appuyez sur Entrée pour ajouter)"
                  />
                  <div className="flex flex-wrap gap-2">
                    {recipients.map(email => (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Test Recipients */}
              <div>
                <Label htmlFor="testRecipients">Destinataires de test</Label>
                <div className="space-y-2">
                  <Input
                    id="testRecipients"
                    type="email"
                    value={newTestRecipient}
                    onChange={(e) => setNewTestRecipient(e.target.value)}
                    onKeyDown={handleAddTestRecipient}
                    placeholder="test@example.com (pour les envois de test)"
                  />
                  <div className="flex flex-wrap gap-2">
                    {testRecipients.map(email => (
                      <Badge key={email} variant="outline" className="gap-1">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeTestRecipient(email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Template
              </CardTitle>
              <CardDescription>Choisissez le template pour le rendu des emails</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="template">Template d'email *</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {(templates || []).map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-gray-500">{template.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Activation */}
          <Card>
            <CardHeader>
              <CardTitle>Activation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="active">Activer immédiatement</Label>
                  <p className="text-sm text-gray-500">Le digest commencera à envoyer des emails selon la planification</p>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Création en cours...' : 'Créer le digest'}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}