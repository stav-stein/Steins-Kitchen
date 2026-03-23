import { useTranslation } from 'react-i18next';
import { NavBar } from './NavBar';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 w-full sticky top-0 z-50
        bg-background/90 backdrop-blur-md border-b border-outline-variant/30">
        <h1 className="font-headline italic text-primary text-2xl tracking-tight">
          {t('app.name')}
        </h1>
      </header>

      {/* Main */}
      <main className="pb-32">{children}</main>

      {/* Bottom Nav */}
      <NavBar />
    </div>
  );
}
