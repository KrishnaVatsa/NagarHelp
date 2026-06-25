import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { civicAPI, sosAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LogOut, Bell, AlertCircle, Shield, MapPin, User, ChevronRight, Plus, FileText, MessageSquare, Zap, Activity, Settings } from 'lucide-react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const civicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const sosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const CATEGORY_ICONS = {
  Pothole: '🕳️', Garbage: '🗑️', Safety: '⚠️',
  Waterlogging: '💧', Streetlight: '💡', Drainage: '🚰', Other: '📌'
};

const STATUS_COLORS = {
  Pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'In-Progress': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
  Rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function StatCard({ icon, value, label, color = 'blue', delay = 0 }) {
  const colorMap = {
    blue: 'from-blue-600/20 to-blue-700/10 border-blue-500/20 text-blue-400',
    red: 'from-red-600/20 to-red-700/10 border-red-500/20 text-red-400',
    green: 'from-green-600/20 to-green-700/10 border-green-500/20 text-green-400',
    yellow: 'from-yellow-600/20 to-yellow-700/10 border-yellow-500/20 text-yellow-400',
    purple: 'from-purple-600/20 to-purple-700/10 border-purple-500/20 text-purple-400',
  };
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5 flex flex-col gap-2`}
    >
      <div className={`text-2xl ${colorMap[color].split(' ').pop()}`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
      <div className="text-xs text-white/50 font-medium uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { currentUser, role, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSOS, setShowSOS] = useState(false);
  const [sosType, setSosType] = useState('');
  const [location, setLocation] = useState(null);
  const [civicIssues, setCivicIssues] = useState([]);
  const [pendingSOS, setPendingSOS] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapFilter, setMapFilter] = useState('civic');

  const userName = currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || 'User';
  const userInitial = userName[0]?.toUpperCase() || 'U';

  // Get location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ lat: 23.3441, lng: 85.3096 }) // Ranchi fallback
    );
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [issuesRes, sosRes] = await Promise.allSettled([
        civicAPI.getAll({ limit: 50 }),
        sosAPI.getPending(),
      ]);
      if (issuesRes.status === 'fulfilled' && issuesRes.value?.data?.data?.issues) {
        setCivicIssues(issuesRes.value.data.data.issues);
        const issues = issuesRes.value.data.data.issues;
        setStats({
          total: issues.length,
          pending: issues.filter(i => i.status === 'Pending').length,
          resolved: issues.filter(i => i.status === 'Resolved').length,
          inProgress: issues.filter(i => i.status === 'In-Progress').length,
        });
      }
      if (sosRes.status === 'fulfilled' && sosRes.value?.data?.data?.pendingSOS) {
        setPendingSOS(sosRes.value.data.data.pendingSOS);
      }
    } catch (e) {
      // Silent failure — backend may not be fully set up
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    try { await logout(); } catch (e) {}
    navigate('/login');
  };

  const handleSendSOS = async () => {
    if (!sosType) { toast.error('Please select a crisis type'); return; }
    if (!location) { toast.error('Location not available'); return; }
    try {
      const res = await sosAPI.create({
        crisisType: sosType,
        longitude: location.lng,
        latitude: location.lat,
        description: `Emergency: ${sosType}`
      });
      const data = res.data;
      toast.success('🚨 SOS broadcast sent! Responders are being notified.');
      setShowSOS(false);
      setSosType('');
      if (data.data?.sos?._id) navigate(`/sos/${data.data.sos._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send SOS — check your connection');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'civic', label: 'Civic Issues', icon: FileText },
    { id: 'sos', label: 'SOS Feed', icon: AlertCircle },
    { id: 'map', label: 'Live Map', icon: MapPin },
  ];

  const mapCenter = location ? [location.lat, location.lng] : [23.3441, 85.3096];

  return (
    <div className="min-h-screen bg-[#060b18] text-white font-sans">
      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-[#060b18]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">NagarHelp</span>
          </div>

          {/* Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.id === 'sos' && pendingSOS.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingSOS.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSOS(true)}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-red-600/30 animate-pulse-slow"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">SOS</span>
            </button>
            <Link to="/civic/report" className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl text-sm font-medium text-blue-300 transition-all">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Report Issue</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                {userInitial}
              </div>
              <button onClick={handleLogout} className="p-2 text-white/40 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MOBILE TABS ────────────────────────────────────── */}
      <div className="fixed bottom-0 w-full z-50 md:hidden bg-[#060b18]/95 backdrop-blur-xl border-t border-white/10">
        <div className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
                  activeTab === tab.id ? 'text-blue-400' : 'text-white/40'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-24 md:pb-8">

        {/* ─ OVERVIEW TAB ─ */}
        <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            {/* Welcome */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Welcome, {userName.split(' ')[0]} 👋</h1>
                <p className="text-white/40 mt-1">Here's what's happening in your city</p>
              </div>
              {role === 'admin' && (
                <Link to="/admin/dashboard" className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-sm text-purple-300 hover:bg-purple-600/30 transition-all">
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="🏙️" value={stats?.total ?? 0} label="Total Issues" color="blue" delay={0} />
              <StatCard icon="⏳" value={stats?.pending ?? 0} label="Pending" color="yellow" delay={0.05} />
              <StatCard icon="✅" value={stats?.resolved ?? 0} label="Resolved" color="green" delay={0.1} />
              <StatCard icon="🚨" value={pendingSOS.length} label="Active SOS" color="red" delay={0.15} />
            </div>

            {/* Two columns: Quick Actions + Recent Issues */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '🚨 Send SOS', desc: 'Emergency broadcast', action: () => setShowSOS(true), cls: 'border-red-500/30 hover:bg-red-600/20 hover:border-red-500/60' },
                    { label: '📋 Report Issue', desc: 'Civic complaint', action: () => navigate('/civic/report'), cls: 'border-blue-500/30 hover:bg-blue-600/20 hover:border-blue-500/60' },
                    { label: '🗺️ Live Map', desc: 'View all incidents', action: () => setActiveTab('map'), cls: 'border-green-500/30 hover:bg-green-600/20 hover:border-green-500/60' },
                    { label: '📰 Feed', desc: 'Browse reports', action: () => navigate('/civic/feed'), cls: 'border-purple-500/30 hover:bg-purple-600/20 hover:border-purple-500/60' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className={`p-4 bg-white/5 border ${item.cls} rounded-xl text-left transition-all group`}
                    >
                      <div className="text-base font-bold text-white mb-1">{item.label}</div>
                      <div className="text-xs text-white/40">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Recent Issues */}
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Recent Issues
                  </h2>
                  <button onClick={() => setActiveTab('civic')} className="text-xs text-blue-400 hover:text-blue-300">View all →</button>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : civicIssues.length === 0 ? (
                  <div className="text-center py-8 text-white/30">
                    <div className="text-3xl mb-2">🏙️</div>
                    <p className="text-sm">No issues reported yet</p>
                    <button onClick={() => navigate('/civic/report')} className="mt-3 text-blue-400 text-xs hover:underline">Be the first to report →</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {civicIssues.slice(0, 4).map(issue => (
                      <div
                        key={issue._id}
                        onClick={() => navigate('/civic/feed')}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all"
                      >
                        <span className="text-xl">{CATEGORY_ICONS[issue.category] || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{issue.title}</div>
                          <div className="text-xs text-white/40">{issue.category}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[issue.status] || STATUS_COLORS.Pending}`}>
                          {issue.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Active SOS Alerts */}
            {pendingSOS.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-red-950/30 border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Active SOS Alerts ({pendingSOS.length})
                  </h2>
                  <button onClick={() => setActiveTab('sos')} className="text-xs text-red-400 hover:text-red-300">View all →</button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {pendingSOS.slice(0, 2).map(sos => (
                    <div
                      key={sos._id}
                      onClick={() => navigate(`/sos/${sos._id}`)}
                      className="p-4 bg-red-600/10 border border-red-500/20 rounded-xl cursor-pointer hover:border-red-400/40 hover:bg-red-600/20 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-bold text-red-300 uppercase tracking-wide">{sos.crisisType}</span>
                      </div>
                      <div className="text-xs text-white/50">{sos.address || 'Location shared'}</div>
                      <div className="mt-2 text-xs text-red-400 font-semibold">Tap to respond →</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─ CIVIC ISSUES TAB ─ */}
        {activeTab === 'civic' && (
          <motion.div key="civic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Civic Issues</h1>
              <Link to="/civic/report" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white transition-all">
                <Plus className="w-4 h-4" /> Report New
              </Link>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {['All', 'Pending', 'In-Progress', 'Resolved'].map(f => (
                <button
                  key={f}
                  onClick={() => setMapFilter(f.toLowerCase())}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    mapFilter === f.toLowerCase()
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : civicIssues.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏙️</div>
                <p className="text-white/50 text-lg">No civic issues yet</p>
                <Link to="/civic/report" className="mt-4 inline-block px-6 py-3 bg-blue-600 rounded-xl text-white font-semibold">Report the First Issue →</Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {civicIssues
                  .filter(i => mapFilter === 'all' || !mapFilter || i.status?.toLowerCase() === mapFilter)
                  .map((issue, idx) => (
                    <motion.div
                      key={issue._id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => navigate('/civic/feed')}
                      className="bg-white/5 border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-white/20 hover:bg-white/8 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">{CATEGORY_ICONS[issue.category] || '📌'}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[issue.status] || STATUS_COLORS.Pending}`}>
                          {issue.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-white mb-1">{issue.title}</h3>
                      <p className="text-sm text-white/50 line-clamp-2 mb-3">{issue.description}</p>
                      <div className="flex items-center gap-3 text-xs text-white/30">
                        <span>👍 {issue.upvotes || 0}</span>
                        <span>💬 {issue.comments?.length || 0}</span>
                        {issue.source === 'whatsapp' && <span className="text-green-400 font-medium">📱 WhatsApp</span>}
                        <span className="ml-auto">{new Date(issue.createdAt).toLocaleDateString()}</span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ─ SOS FEED TAB ─ */}
        {activeTab === 'sos' && (
          <motion.div key="sos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">SOS Emergency Feed</h1>
              <button
                onClick={() => setShowSOS(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-red-600/30"
              >
                <Bell className="w-4 h-4" /> Send SOS
              </button>
            </div>

            {pendingSOS.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-10 h-10 text-green-400" />
                </div>
                <p className="text-white/50 text-lg font-medium">All Clear</p>
                <p className="text-white/30 text-sm mt-2">No active SOS alerts in your area</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {pendingSOS.map((sos, idx) => (
                  <motion.div
                    key={sos._id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.08 }}
                    onClick={() => navigate(`/sos/${sos._id}`)}
                    className="bg-red-950/40 border border-red-500/30 rounded-2xl p-5 cursor-pointer hover:border-red-400/60 hover:bg-red-950/60 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-red-600/30 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-bold text-red-300 uppercase tracking-wider">{sos.crisisType}</span>
                        </div>
                        <div className="text-xs text-white/40">{new Date(sos.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 mb-3">{sos.address || 'Location coordinates shared'}</p>
                    {sos.description && <p className="text-xs text-white/40 mb-3 line-clamp-2">{sos.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/30">{sos.responders?.length || 0} responders</span>
                      <span className="text-sm font-bold text-red-400 group-hover:text-red-300">Respond →</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ─ LIVE MAP TAB ─ */}
        {activeTab === 'map' && (
          <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Live City Map</h1>
              <div className="flex gap-2">
                {[
                  { id: 'civic', label: '🏙️ Civic', color: 'blue' },
                  { id: 'sos', label: '🚨 SOS', color: 'red' },
                  { id: 'both', label: '🗺️ Both', color: 'purple' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setMapFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      mapFilter === f.id
                        ? f.color === 'blue' ? 'bg-blue-600 border-blue-500 text-white'
                          : f.color === 'red' ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/60'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: '70vh' }}>
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='© <a href="https://carto.com/">CARTO</a>'
                />
                {/* User location */}
                {location && (
                  <Circle
                    center={[location.lat, location.lng]}
                    radius={80}
                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5 }}
                  />
                )}
                {/* Civic issues */}
                {(mapFilter === 'civic' || mapFilter === 'both') && civicIssues.map(issue => {
                  const [lng, lat] = issue.location?.coordinates || [0, 0];
                  if (!lat || !lng) return null;
                  return (
                    <Marker key={issue._id} position={[lat, lng]} icon={civicIcon}>
                      <Popup>
                        <div className="text-sm">
                          <strong>{CATEGORY_ICONS[issue.category]} {issue.title}</strong>
                          <div className="text-gray-500 mt-1">{issue.category} · {issue.status}</div>
                          <div className="mt-1 text-xs">{issue.description?.slice(0, 80)}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {/* SOS alerts */}
                {(mapFilter === 'sos' || mapFilter === 'both') && pendingSOS.map(sos => {
                  const [lng, lat] = sos.location?.coordinates || [0, 0];
                  if (!lat || !lng) return null;
                  return (
                    <Marker key={sos._id} position={[lat, lng]} icon={sosIcon}>
                      <Popup>
                        <div className="text-sm">
                          <strong className="text-red-600">🆘 {sos.crisisType}</strong>
                          <div className="text-gray-500 mt-1">{sos.address || 'Location shared'}</div>
                          <button onClick={() => navigate(`/sos/${sos._id}`)} className="mt-2 text-red-600 font-semibold text-xs underline">Respond →</button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Map legend */}
            <div className="flex gap-4 text-xs text-white/50">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full" /> Your location</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-400 rounded-sm" /> Civic issues</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm" /> SOS alerts</div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* ── SOS MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showSOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowSOS(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0d1425] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Bell className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Emergency SOS</h2>
                <p className="text-white/50 text-sm mt-2">Select the type of emergency. Nearby responders will be notified immediately.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { type: 'medical', label: '🏥 Medical', desc: 'Injury / Illness' },
                  { type: 'fire', label: '🔥 Fire', desc: 'Fire / Smoke' },
                  { type: 'accident', label: '🚗 Accident', desc: 'Vehicle accident' },
                  { type: 'crime', label: '🚨 Crime', desc: 'Security threat' },
                  { type: 'flood', label: '💧 Flood', desc: 'Water emergency' },
                  { type: 'other', label: '⚠️ Other', desc: 'Other emergency' },
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => setSosType(item.type)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      sosType === item.type
                        ? 'bg-red-600/30 border-red-500 ring-1 ring-red-500/50'
                        : 'bg-white/5 border-white/10 hover:border-red-500/50 hover:bg-red-600/10'
                    }`}
                  >
                    <div className="text-xl mb-1">{item.label.split(' ')[0]}</div>
                    <div className="text-xs font-bold text-white">{item.label.split(' ').slice(1).join(' ')}</div>
                    <div className="text-xs text-white/40">{item.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowSOS(false); setSosType(''); }}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSOS}
                  disabled={!sosType}
                  className="flex-2 px-8 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-all shadow-lg shadow-red-600/40 flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Broadcast SOS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
