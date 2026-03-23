import { type ChangeEvent, type InputHTMLAttributes, useId } from 'react';

export type InputFieldType = 'text' | 'password' | 'email' | 'number';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  type?: InputFieldType;
}

export function Input({
  label,
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  type = 'text',
  id: idProp,
  className = '',
  ...rest
}: InputProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const hasError = Boolean(error);

  return (
    <div className={`w-full ${className}`.trim()}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-navy dark:text-white">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={[
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-navy transition-[border-color,box-shadow] duration-200 placeholder:text-gray/80 focus:outline-none dark:bg-navy dark:text-white dark:placeholder:text-gray',
          hasError
            ? 'border-red focus:border-red focus:ring-2 focus:ring-red/30'
            : 'border-navy/15 focus:border-navy focus:ring-2 focus:ring-navy/20 dark:border-white/10 dark:focus:border-white dark:focus:ring-white/15',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
        {...rest}
      />
      {hasError ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
