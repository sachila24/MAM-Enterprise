import React from 'react';
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="sm:flex sm:items-center sm:justify-between pb-6">
      <div>
        <h1 className="text-2xl font-semibold leading-6 text-neutral-900">
          {title}
        </h1>
        {subtitle &&
        <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
        }
      </div>
      {actions &&
      <div className="mt-4 flex gap-3 sm:ml-4 sm:mt-0">{actions}</div>
      }
    </div>);

}