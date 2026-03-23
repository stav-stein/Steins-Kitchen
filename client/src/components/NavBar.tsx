import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './ui/Icon';

export function NavBar() {
  const { t } = useTranslation();

  const items = [
    { to: '/', icon: 'menu_book', label: t('nav.cookbook') },
    { to: '/add', icon: 'add_circle', label: t('nav.add') },
    { to: '/discover', icon: 'auto_stories', label: t('nav.discover') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center
      px-4 pb-6 pt-3 bg-white/70 backdrop-blur-xl nav-shadow rounded-t-3xl">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-5 py-2 rounded-2xl
            transition-all duration-200 active:scale-90 select-none
            ${isActive
              ? 'bg-primary-fixed text-primary'
              : 'text-on-surface-variant hover:text-secondary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} filled={isActive} size={24} />
              <span className="font-label uppercase tracking-widest text-[10px] font-bold mt-1">
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
