// ============================================================================
// IconButton Primitive Component
// Follows: fixing-accessibility, emil-design-eng
// ============================================================================

import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string; // Mandatory for accessibility
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      'aria-label': ariaLabel,
      size = 'md',
      variant = 'ghost',
      children,
      className = '',
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeMap = {
      sm: { width: '28px', height: '28px', minWidth: '28px' },
      md: { width: '36px', height: '36px', minWidth: '36px' },
      lg: { width: '42px', height: '42px', minWidth: '42px' }
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-2)',
        borderColor: 'transparent'
      },
      secondary: {
        backgroundColor: 'var(--bg-1)',
        color: 'var(--text-1)',
        borderColor: 'var(--line)'
      },
      primary: {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-ink)',
        borderColor: 'var(--accent)'
      },
      danger: {
        backgroundColor: 'transparent',
        color: 'var(--danger)',
        borderColor: 'transparent'
      }
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`ui-icon-button ui-icon-button--${variant} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-1)',
          border: '1px solid',
          transition: 'transform var(--dur-1) var(--ease-out), background-color var(--dur-1) var(--ease-out), color var(--dur-1) var(--ease-out), border-color var(--dur-1) var(--ease-out)',
          ...sizeMap[size],
          ...variantStyles[variant],
          ...style
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
