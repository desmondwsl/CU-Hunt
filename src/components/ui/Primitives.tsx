import type { CSSProperties, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function Screen({
  children,
  className = '',
  tabs = false,
  full = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  tabs?: boolean;
  full?: boolean;
  style?: CSSProperties;
}) {
  const cls = [
    'screen',
    tabs ? 'screen--tabs' : '',
    full ? 'screen--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}

export function FullScreen({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Screen full className={className} style={style}>
      {children}
    </Screen>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="title">{children}</h1>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <p className="subtitle">{children}</p>;
}

export function Card({
  children,
  className = '',
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        className={`card ${className}`.trim()}
        style={{ ...style, textAlign: 'left', width: '100%', cursor: 'pointer' }}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={`card ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  type = 'button',
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const cls =
    variant === 'ghost' ? 'btn btn--ghost' : variant === 'danger' ? 'btn btn--danger' : 'btn';
  return (
    <button type={type} className={cls} onClick={onPress} disabled={disabled}>
      {label}
    </button>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const style: CSSProperties | undefined = selected
    ? { backgroundColor: color ?? 'var(--accent)', borderColor: color ?? 'var(--accent)' }
    : undefined;
  return (
    <button
      type="button"
      className={`chip${selected ? ' chip--selected' : ''}`}
      style={style}
      onClick={onPress}
    >
      {label}
    </button>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  placeholder,
  keyboardType,
  multiline,
  type,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
  type?: 'text' | 'time' | 'date' | 'color';
}) {
  const common = {
    value,
    onChange: (e: { target: { value: string } }) => onChangeText(e.target.value),
    placeholder,
  };
  const inputType =
    type ?? (secureTextEntry ? 'password' : keyboardType === 'number-pad' ? 'tel' : 'text');
  return (
    <div className="field">
      <label>{label}</label>
      {multiline ? (
        <textarea {...(common as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input
          {...(common as InputHTMLAttributes<HTMLInputElement>)}
          type={inputType}
          inputMode={keyboardType === 'number-pad' ? 'numeric' : undefined}
          autoCapitalize="off"
          autoCorrect="off"
        />
      )}
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading screen--full">
      <div className="spinner" aria-label="Loading" />
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}
