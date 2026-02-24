import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '' }: {
    children: React.ReactNode,
    onClick?: () => void,
    variant?: 'primary' | 'secondary',
    className?: string
}) => {
    const baseStyles = "px-4 py-2 rounded-md font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary";
    const variants = {
        primary: "bg-[var(--color-primary)] text-white hover:opacity-90",
        secondary: "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-gray-50 dark:hover:bg-gray-800"
    };

    return (
        <button
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${className} focus-ring`}
        >
            {children}
        </button>
    );
};
