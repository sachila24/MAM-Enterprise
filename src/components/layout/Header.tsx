import React, { useEffect, useState, useRef } from 'react';
import {
  BellIcon,
  UserIcon,
  MenuIcon,
  ChevronDown,
  Settings as SettingsIcon,
  LogOutIcon } from
'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useT } from '../../i18n/I18nProvider';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { resetDemoDb } from '../../lib/local-db/localDb';
interface HeaderProps {
  onMenuClick: () => void;
}
export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useT();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);
  const handleResetDemo = () => {
    if (window.confirm(t('misc.resetDemoConfirm'))) {
      resetDemoDb();
      window.location.reload();
    }
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="no-print sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-900"
    >
      <span className="font-medium">{t('misc.localDemo')}</span>
      <span className="hidden sm:inline"> — {t('misc.localDemoHint')}.</span>
      {' '}
      <button
        type="button"
        onClick={handleResetDemo}
        className="font-semibold text-amber-800 underline hover:text-amber-950"
      >
        {t('misc.resetDemo')}
      </button>
    </motion.div>
    <header className="no-print sticky top-16 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-neutral-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-neutral-700 lg:hidden"
        onClick={onMenuClick}>
        
        <span className="sr-only">Open sidebar</span>
        <MenuIcon className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          {/* Breadcrumbs or Page Title could go here in future phases */}
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <LanguageSwitcher />

          <button
            type="button"
            className="-m-2.5 p-2.5 text-neutral-400 hover:text-neutral-500 relative">
            
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
          </button>

          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-neutral-200"
            aria-hidden="true" />
          

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex items-center gap-x-4 hover:bg-neutral-50 p-1.5 rounded-md transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}>
              
              <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-800">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="hidden lg:flex lg:flex-col lg:items-start">
                <span
                  className="text-sm font-semibold leading-6 text-neutral-900"
                  aria-hidden="true">
                  
                  Sachila
                </span>
                <span className="text-xs leading-4 text-neutral-500">
                  Owner
                </span>
              </div>
              <ChevronDown className="hidden lg:block h-4 w-4 text-neutral-400" />
            </button>

            <AnimatePresence>
              {menuOpen &&
              <motion.div
                initial={{
                  opacity: 0,
                  y: -4
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                exit={{
                  opacity: 0,
                  y: -4
                }}
                transition={{
                  duration: 0.15
                }}
                className="absolute right-0 top-full mt-2 w-60 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-neutral-200 focus:outline-none z-50 overflow-hidden">
                
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-900">
                      Sachila
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      sachila@mamtrading.lk
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                    onClick={() => {
                      setMenuOpen(false);
                      // Profile action placeholder
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    
                      <UserIcon className="mr-3 h-4 w-4 text-neutral-400" />
                      {t('misc.profile')}
                    </button>
                    <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    
                      <SettingsIcon className="mr-3 h-4 w-4 text-neutral-400" />
                      {t('nav.settings')}
                    </button>
                  </div>

                  <div className="border-t border-neutral-100 py-1">
                    <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                      navigate('/login');
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-danger-600 hover:bg-danger-50">
                    
                      <LogOutIcon className="mr-3 h-4 w-4 text-danger-500" />
                      {t('misc.signOut')}
                    </button>
                  </div>
                </motion.div>
              }
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
    </>
  );

}