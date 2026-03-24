import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './ui/Icon';

export function NavBar() {
  const { t } = useTranslation();

  const items = [
    { to: '/', icon: 'menu_book', label: t('nav.cookbook') },
    { to: '/add', icon: 'add_circle', label: t('nav.add') },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-evenly rounded-t-3xl
        border-t border-outline-variant/20 bg-white/70 px-4 pb-6 pt-3 backdrop-blur-xl nav-shadow
        lg:bottom-6 lg:left-1/2 lg:w-auto lg:min-w-[min(100%-2rem,22rem)] lg:-translate-x-1/2 lg:rounded-full
        lg:border lg:border-outline-variant/30 lg:px-10 lg:pb-4 lg:pt-3 lg:shadow-editorial"
    >
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
              : 'text-on-surface-variant hover:text-primary'
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
