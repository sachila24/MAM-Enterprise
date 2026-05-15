import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { motion } from 'framer-motion';
import { navGroups } from './navConfig';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { t } = useT();
  return (
    <motion.div
      initial={false}
      animate={{
        width: collapsed ? 80 : 256,
      }}
      className="hidden lg:flex lg:flex-col lg:border-r lg:border-neutral-200 lg:bg-white overflow-y-auto">
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-neutral-200 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-800 text-white font-bold tracking-wider shrink-0">
          MAM
        </div>
        {!collapsed && (
          <span className="ml-3 text-sm font-semibold text-neutral-900 truncate">
            M A M TRADING
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col px-4 py-6 space-y-8">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            {!collapsed && (
              <div className="text-xs font-semibold leading-6 text-neutral-400 mb-2 px-2 tracking-wider">
                {t(group.labelKey)}
              </div>
            )}
            <ul role="list" className="space-y-1">
              {group.items.map((item) => (
                <li key={item.nameKey}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      `group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors
                      ${isActive ? 'bg-brand-50 text-brand-800 border-l-4 border-brand-800' : 'text-neutral-700 hover:text-brand-800 hover:bg-neutral-50 border-l-4 border-transparent'}
                      ${collapsed ? 'justify-center border-l-0' : ''}`
                    }
                    title={collapsed ? t(item.nameKey) : undefined}>
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {!collapsed && (
                      <span className="truncate">{t(item.nameKey)}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-neutral-200 p-4">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-md p-2 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900">
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
