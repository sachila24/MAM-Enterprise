import React from 'react';
import { HammerIcon } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { EmptyState } from './ui/EmptyState';
import { useT } from '../i18n/I18nProvider';
interface ComingSoonProps {
  title: string;
  phase: number;
}
export function ComingSoon({ title, phase }: ComingSoonProps) {
  const { t } = useT();
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={title} />
      <EmptyState
        icon={HammerIcon}
        title={t('misc.comingSoon')}
        description={`${t('misc.phase')} ${phase}. This module is currently under construction as part of the redesign.`} />
      
    </div>);

}