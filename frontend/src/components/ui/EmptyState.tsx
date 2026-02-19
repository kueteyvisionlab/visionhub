interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50 px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-surface-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-surface-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
