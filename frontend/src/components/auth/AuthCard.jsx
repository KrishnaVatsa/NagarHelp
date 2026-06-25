import React from 'react';

const AuthCard = ({ title, subtitle, children }) => {
    return (
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400">{subtitle}</p>
                </div>
                {children}
            </div>
        </div>
    );
};

export default AuthCard;
