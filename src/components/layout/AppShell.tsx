import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { navGroups } from './navConfig';
import { Header } from './Header';
import { MamLogo } from '../branding/MamLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '../../i18n/I18nProvider';
import { X } from 'lucide-react';
export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useT();
  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed} />
      

      <AnimatePresence>
        {mobileMenuOpen &&
        <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            transition={{
              duration: 0.2
            }}
            className="fixed inset-0 bg-neutral-900/60"
            onClick={() => setMobileMenuOpen(false)} />
          
            <motion.div
            initial={{
              x: '-100%'
            }}
            animate={{
              x: 0
            }}
            exit={{
              x: '-100%'
            }}
            transition={{
              type: 'spring',
              bounce: 0,
              duration: 0.25
            }}
            className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col">
            
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
                <div className="flex items-center">
                  <MamLogo size={40} />
                  <span className="ml-3 text-sm font-semibold text-neutral-900">
                    M A M TRADING
                  </span>
                </div>
                <button
                type="button"
                className="-m-2.5 p-2.5 text-neutral-500 hover:text-neutral-700"
                onClick={() => setMobileMenuOpen(false)}>
                
                  <span className="sr-only">{t('closeSidebar')}</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex flex-1 flex-col px-4 py-6 space-y-8 overflow-y-auto">
                {navGroups.map((group) =>
              <div key={group.labelKey}>
                    <div className="text-xs font-semibold leading-6 text-neutral-400 mb-2 px-2 tracking-wider">
                      {t(group.labelKey)}
                    </div>
                    <ul role="list" className="space-y-1">
                      {group.items.map((item) =>
                  <li key={item.nameKey}>
                          <NavLink
                      to={item.href}
                      end={item.href === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => `
                              group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors
                              ${isActive ? 'bg-brand-50 text-brand-800 border-l-4 border-brand-800' : 'text-neutral-700 hover:text-brand-800 hover:bg-neutral-50 border-l-4 border-transparent'}
                            `}>
                      
                            <item.icon
                        className="h-5 w-5 shrink-0"
                        aria-hidden="true" />
                      
                            <span className="truncate">{t(item.nameKey)}</span>
                          </NavLink>
                        </li>
                  )}
                    </ul>
                  </div>
              )}
              </nav>
            </motion.div>
          </div>
        }
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>);

}