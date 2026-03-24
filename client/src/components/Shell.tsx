import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { NavBar } from './NavBar';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { t } = useTranslation();

  const shellGutter = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-50 w-full border-b border-outline-variant/30
          bg-background/90 backdrop-blur-md"
      >
        <div className={`${shellGutter} flex items-center justify-between py-4`}>
          <h1 className="font-headline text-2xl italic tracking-tight text-primary">
            <Link
              to="/"
              className="rounded-sm text-inherit no-underline hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('app.name')}
            </Link>
          </h1>
        </div>
      </header>

      <main className="w-full pb-32 lg:pb-28">
        <div className={shellGutter}>{children}</div>
      </main>

      {/* Bottom Nav */}
      <NavBar />
    </div>
  );
}
