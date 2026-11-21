import { forwardRef, useId } from 'react';
import { Icon, type IconName } from './Icon';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-105 shadow-soft font-semibold',
  secondary: 'glass text-fg hover:bg-surface',
  ghost: 'text-fg hover:bg-fg/[0.06]',
  danger: 'bg-danger text-white hover:brightness-110 font-semibold',
};
const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-[0.95rem] gap-2',
  lg: 'min-h-12 px-6 text-base gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  busy?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, busy, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(
        'pressable inline-flex items-center justify-center rounded-md select-none disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        busy && 'cursor-progress opacity-80',
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
});

export function IconButton({
  icon,
  label,
  className,
  size = 20,
  active,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        'pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-fg hover:bg-fg/[0.07] disabled:opacity-40',
        active && 'bg-fg/[0.09]',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Card({
  className,
  as: As = 'div',
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <As className={cx('glass rounded-lg p-4 sm:p-5', className)} {...rest} />;
}

const fieldBase =
  'w-full rounded-md border border-line bg-page/80 px-3 text-fg placeholder:text-muted/80 transition-[border-color,box-shadow] duration-150 focus:border-accent-text focus:outline-none focus:ring-2 focus:ring-accent/30';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
}

export const TextField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & FieldProps
>(function TextField({ label, hint, error, className, id, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={fid} className="text-sm font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={fid}
        className={cx(fieldBase, 'min-h-11')}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${fid}-d` : undefined}
        {...rest}
      />
      {(error || hint) && (
        <p id={`${fid}-d`} className={cx('text-sm', error ? 'text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function TextArea({ label, hint, error, className, id, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={fid} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fid}
        className={cx(fieldBase, 'py-2.5 leading-relaxed')}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${fid}-d` : undefined}
        {...rest}
      />
      {(error || hint) && (
        <p id={`${fid}-d`} className={cx('text-sm', error ? 'text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

export function SelectField({
  label,
  hint,
  className,
  id,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={fid} className="text-sm font-medium">
        {label}
      </label>
      <select id={fid} className={cx(fieldBase, 'min-h-11 pr-8')} {...rest}>
        {children}
      </select>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function EmptyState({
  icon = 'feather',
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-10 text-center animate-rise">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-accent-text">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="text-lg">{title}</h3>
      {text && <p className="max-w-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Une erreur est survenue.';
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-line bg-page p-4"
    >
      <p>{msg}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="glass mb-5 inline-flex max-w-full overflow-x-auto rounded-md p-1"
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => {
            const i = tabs.findIndex((x) => x.value === value);
            if (e.key === 'ArrowRight') onChange(tabs[(i + 1) % tabs.length].value);
            if (e.key === 'ArrowLeft') onChange(tabs[(i - 1 + tabs.length) % tabs.length].value);
          }}
          tabIndex={value === t.value ? 0 : -1}
          className={cx(
            'pressable min-h-10 whitespace-nowrap rounded-sm px-3 text-sm font-medium sm:px-4',
            value === t.value ? 'bg-page text-fg shadow-soft' : 'text-muted hover:text-fg',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200',
          checked ? 'border-accent bg-accent' : 'border-line bg-surface',
        )}
      >
        {/* Le curseur est un élément du flux (pas en absolu) : il ne peut pas sortir du rail. */}
        <span
          aria-hidden
          className={cx(
            'block h-5.5 w-5.5 rounded-full bg-page shadow-soft transition-[margin] duration-200 motion-reduce:transition-none',
            checked ? 'ml-auto' : 'ml-0',
          )}
        />
      </button>
    </div>
  );
}

/**
 * Divulgation progressive : les réglages secondaires restent repliés
 * pour ne présenter que l'essentiel (loi de Hick).
 */
export function Disclosure({
  summary,
  children,
  defaultOpen,
  className,
  summaryClassName = 'text-accent-text',
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
}) {
  return (
    <details className={cx('group', className)} open={defaultOpen}>
      <summary
        className={cx(
          'pressable inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium [&::-webkit-details-marker]:hidden',
          summaryClassName,
        )}
      >
        <Icon
          name="chevronRight"
          size={16}
          className="transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
        />
        {summary}
      </summary>
      <div className="mt-2 flex flex-col gap-4">{children}</div>
    </details>
  );
}

/** Section d'une carte : titre, phrase d'aide facultative, contenu. */
export function Section({
  id,
  title,
  description,
  aside,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card as="section" aria-labelledby={id} className={className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="text-xl">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}
