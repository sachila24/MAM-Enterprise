import React from 'react';

interface PageHeaderProps {
  title: string;
  /** Plain text or rich content (rich content is not wrapped in a `<p>` to avoid invalid nesting). */
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const subtitleNode =
    subtitle === undefined || subtitle === null || subtitle === false ? null : typeof subtitle === 'string' ? (
      <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
    ) : (
      <div className="mt-2 text-sm text-neutral-500">{subtitle}</div>
    );

  return (
    <div className="sm:flex sm:items-center sm:justify-between pb-6">
      <div>
        <h1 className="text-2xl font-semibold leading-6 text-neutral-900">{title}</h1>
        {subtitleNode}
      </div>
      {actions && (
        <div className="mt-4 flex gap-3 sm:ml-4 sm:mt-0">{actions}</div>
      )}
    </div>
  );
}
