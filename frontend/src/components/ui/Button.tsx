// ============================================================================
// Button Primitive Component
// Follows: emil-design-eng, fixing-accessibility, notebooklm-design-system
// ============================================================================

import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      borderRadius: 'var(--radius-1)',
      fontWeight: 500,
      fontFamily: 'var(--font-ui)',
      border: '1px solid transparent',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      lineHeight: 1,
      transition: 'transform var(--dur-1) var(--ease-out), background-color var(--dur-1) var(--ease-out), border-color var(--dur-1) var(--ease-out), color var(--dur-1) var(--ease-out)',
      ...style
    };

    const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
      sm: {
        padding: 'var(--space-1) var(--space-2)',
        fontSize: 'var(--text-12)',
        height: '28px'
      },
      md: {
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-13)',
        height: '36px'
      },
      lg: {
        padding: 'var(--space-3) var(--space-4)',
        fontSize: 'var(--text-14)',
        height: '42px'
      }
    };

    const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
      primary: {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-ink)',
        borderColor: 'var(--accent)'
      },
      secondary: {
        backgroundColor: 'transparent',
        color: 'var(--text-1)',
        borderColor: 'var(--line-strong)'
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-2)',
        borderColor: 'transparent'
      },
      danger: {
        backgroundColor: 'var(--danger-bg)',
        color: 'var(--danger)',
        borderColor: 'var(--danger-border)'
      }
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
        style={{
          ...baseStyle,
          ...sizeStyles[size],
          ...variantStyles[variant],
          ...style
        }}
        {...props}
      >
        {isLoading ? (
          <span
            style={{
              width: '12px',
              height: '12px',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: 'var(--radius-full)',
              animation: 'spin 600ms linear infinite',
              display: 'inline-block'
            }}
            aria-hidden="true"
          />
        ) : (
          leftIcon && <span aria-hidden="true" style={{ display: 'inline-flex' }}>{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span aria-hidden="true" style={{ display: 'inline-flex' }}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
