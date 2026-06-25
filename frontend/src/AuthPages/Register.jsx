import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [userType, setUserType] = useState('citizen');
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [address, setAddress] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        mobile: '',
        email: '',
        password: '',
        confirmPassword: '',
        department: '',
        city: '',
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (!formData.firstName.trim()) errs.firstName = 'Required';
        if (!formData.lastName.trim()) errs.lastName = 'Required';
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Valid email required';
        if (!formData.mobile.trim() || !/^\d{10}$/.test(formData.mobile.replace(/\s/g, ''))) errs.mobile = 'Valid 10-digit number required';
        if (!formData.password || formData.password.length < 6) errs.password = 'Minimum 6 characters';
        if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        if (userType === 'citizen' && !address.trim()) errs.address = 'Address required';
        if (userType === 'admin' && !formData.department) errs.department = 'Department required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const result = await register({
                email: formData.email.trim(),
                password: formData.password,
                name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
                phone: formData.mobile.trim(),
                role: userType,
                address: userType === 'citizen' ? address.trim() : undefined,
                city: formData.city?.trim() || undefined,
                department: formData.department || undefined,
            });

            toast.success(`Welcome to NagarHelp, ${formData.firstName}! 🎉`);

            setTimeout(() => {
                navigate('/dashboard');
            }, 500);

        } catch (err) {
            console.error('Registration error:', err);
            let msg = err.message;
            if (msg.includes('email-already-in-use')) {
                msg = 'An account with this email already exists. Try logging in.';
            } else if (msg.includes('weak-password')) {
                msg = 'Password too weak. Use at least 6 characters.';
            }
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleLocation = () => {
        if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
                    .then(r => r.json())
                    .then(d => {
                        setAddress(d.display_name || '');
                        if (d.address?.city || d.address?.town) {
                            setFormData(p => ({ ...p, city: d.address.city || d.address.town || '' }));
                        }
                        setLocationLoading(false);
                    })
                    .catch(() => setLocationLoading(false));
            },
            () => { toast.error('Location access denied'); setLocationLoading(false); }
        );
    };

    const inputClass = (field) =>
        `w-full px-4 py-3 bg-white/5 border ${errors[field] ? 'border-red-500/70' : 'border-white/10'} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm`;

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-white">NagarHelp</span>
                    </div>

                    <h1 className="text-5xl font-bold text-white leading-tight mb-6">
                        Join the<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Movement.</span>
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md">
                        Be part of a community making Indian cities safer, cleaner, and more responsive.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { icon: '🚨', label: 'SOS Response' },
                            { icon: '📍', label: 'Issue Mapping' },
                            { icon: '💬', label: 'WhatsApp Bot' },
                            { icon: '🤖', label: 'AI Chatbot' },
                        ].map(f => (
                            <div key={f.label} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                <span className="text-xl">{f.icon}</span>
                                <span className="text-white text-sm font-medium">{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-8 lg:px-16 overflow-y-auto">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-white">NagarHelp</span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
                            <p className="text-slate-400 text-sm">Join NagarHelp today — it's free</p>
                        </div>

                        {/* User type toggle */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-black/20 rounded-xl mb-6">
                            {['citizen', 'admin'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setUserType(type)}
                                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                        userType === type
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {type === 'citizen' ? '👤 Citizen' : '🛡️ Official'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">First Name</label>
                                    <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Raj" className={inputClass('firstName')} />
                                    {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Last Name</label>
                                    <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Kumar" className={inputClass('lastName')} />
                                    {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                                </div>
                            </div>

                            {/* Mobile */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 text-sm font-medium border-r border-white/10 pr-3">+91</span>
                                    <input
                                        name="mobile"
                                        type="tel"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        placeholder="9876543210"
                                        maxLength={10}
                                        className={`w-full pl-16 pr-4 py-3 bg-white/5 border ${errors.mobile ? 'border-red-500/70' : 'border-white/10'} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm`}
                                    />
                                </div>
                                {errors.mobile && <p className="text-red-400 text-xs mt-1">{errors.mobile}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className={inputClass('email')} />
                                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                            </div>

                            {/* Citizen: Address | Admin: Department */}
                            {userType === 'citizen' ? (
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</label>
                                        <button
                                            type="button"
                                            onClick={handleLocation}
                                            disabled={locationLoading}
                                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                        >
                                            {locationLoading ? '📍 Locating...' : '📍 Use My Location'}
                                        </button>
                                    </div>
                                    <input
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        placeholder="Full address with city, state"
                                        className={`w-full px-4 py-3 bg-white/5 border ${errors.address ? 'border-red-500/70' : 'border-white/10'} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm mb-2`}
                                    />
                                    <input
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="City (e.g. Ranchi, Bhilai)"
                                        className={inputClass('city')}
                                    />
                                    {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-white/5 border ${errors.department ? 'border-red-500/70' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm`}
                                    >
                                        <option value="" className="bg-slate-800">Select Department</option>
                                        {['Police', 'Traffic', 'Fire & Safety', 'Medical / Ambulance', 'Municipal / Waste', 'Electricity Board', 'Water Supply'].map(d => (
                                            <option key={d} value={d} className="bg-slate-800">{d}</option>
                                        ))}
                                    </select>
                                    {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department}</p>}
                                </div>
                            )}

                            {/* Password row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                                    <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min 6 chars" className={inputClass('password')} />
                                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Confirm</label>
                                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" className={inputClass('confirmPassword')} />
                                    {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : 'Create NagarHelp Account'}
                            </button>
                        </form>

                        <p className="text-center text-slate-500 text-sm mt-6">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
