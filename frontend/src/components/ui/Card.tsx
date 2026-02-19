interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`rounded-xl border border-surface-200 bg-white ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-surface-900">{children}</h3>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm text-surface-500">{children}</p>;
}
