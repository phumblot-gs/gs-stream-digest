import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Mail, Clock, Filter, BarChart } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">GS Stream Digest</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="outline">Connexion</Button>
              </Link>
              <Link href="/register">
                <Button>Commencer</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Transformez vos événements en{' '}
            <span className="text-primary">emails intelligents</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Créez des digests personnalisés à partir de vos événements système.
            Filtrez, planifiez et envoyez automatiquement des emails récapitulatifs.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg">
                Démarrer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                Voir la démo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Fonctionnalités principales
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Filter className="h-10 w-10 text-primary mb-3" />
              <CardTitle>Filtrage avancé</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Filtrez les événements par type, compte, application ou créez
                des règles personnalisées.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-primary mb-3" />
              <CardTitle>Planification flexible</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Envoyez des digests toutes les heures, quotidiennement,
                hebdomadairement ou avec un cron personnalisé.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="h-10 w-10 text-primary mb-3" />
              <CardTitle>Templates Liquid</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Créez des emails personnalisés avec notre moteur de template
                Liquid puissant et flexible.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart className="h-10 w-10 text-primary mb-3" />
              <CardTitle>Analytics détaillés</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Suivez les ouvertures, clics et performances de vos digests
                avec des statistiques détaillées.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à automatiser vos emails ?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Commencez gratuitement et créez votre premier digest en quelques minutes.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary">
              Créer mon compte
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>© 2024 Grand Shooting. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}