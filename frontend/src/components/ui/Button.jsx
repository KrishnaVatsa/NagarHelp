import React from 'react';

const Button = ({ children, className = '', disabled, onClick, type = 'button' }) => {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={`flex justify-center items-center rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;
