import {
  Activity,
  Banknote,
  Bike,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import type { DictionaryKey } from '../../i18n/I18nProvider';

export interface NavItem {
  nameKey: DictionaryKey;
  href: string;
  icon: React.ElementType;
}

export interface NavGroup {
  labelKey: DictionaryKey;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    labelKey: 'navGroup.operate',
    items: [
      { nameKey: 'nav.dashboard', href: '/', icon: LayoutDashboard },
      { nameKey: 'nav.customers', href: '/customers', icon: Users },
      { nameKey: 'nav.loans', href: '/loans', icon: Banknote },
      { nameKey: 'nav.payments', href: '/payments', icon: CreditCard },
      { nameKey: 'nav.documents', href: '/documents', icon: FileText },
    ],
  },
  {
    labelKey: 'navGroup.inventory',
    items: [
      { nameKey: 'nav.bikeStock', href: '/bikes', icon: Bike },
      { nameKey: 'nav.guarantees', href: '/guarantees', icon: Shield },
    ],
  },
  {
    labelKey: 'navGroup.records',
    items: [
      { nameKey: 'nav.expenses', href: '/expenses', icon: ReceiptText },
      { nameKey: 'nav.reports', href: '/reports', icon: FileText },
      { nameKey: 'nav.activityLog', href: '/activity', icon: Activity },
    ],
  },
  {
    labelKey: 'navGroup.admin',
    items: [
      { nameKey: 'nav.backup', href: '/backup', icon: Database },
      { nameKey: 'nav.settings', href: '/settings', icon: Settings },
    ],
  },
];
