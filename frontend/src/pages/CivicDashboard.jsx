import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { civicAPI, sosAPI } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'react-hot-toast';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const sosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const civicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const STATUS_COLORS = {
  Pending:    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'In-Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Resolved:   'bg-green-500/20 text-green-400 border-green-500/30',
  Rejected:   'bg-red-500/20 text-red-400 border-red-500/30',
};

const CATEGORY_ICONS = {
  Pothole: '🕳️', Garbage: '🗑️', Safety: '⚠️',
  Waterlogging: '💧', Streetlight: '💡', Drainage: '🚰', Other: '📌'
};

export default function CivicDashboard() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [civicIssues, setCivicIssues] = useState([]);
  const [pendingSOS, setPendingSOS] = useState([]);
  const [civicStats, setCivicStats] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'sos'
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [issuesRes, statsRes, sosRes] = await Promise.allSettled([
        civicAPI.getAll({ limit: 50 }),
        civicAPI.getStats(),
        sosAPI.getPending(),
      ]);

      if (issuesRes.status === 'fulfilled') setCivicIssues(issuesRes.value.data?.data?.issues || []);
      if (statsRes.status === 'fulfilled') setCivicStats(statsRes.value.data?.data?.summary || null);
      if (sosRes.status === 'fulfilled') setPendingSOS(sosRes.value.data?.data?.pendingSOS || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Get user location
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 23.3441, lng: 85.3096 }) // Ranchi fallback
    );
  }, [fetchData]);

  const filteredIssues = filter === 'all' ? civicIssues : civicIssues.filter(i => i.status === filter);

  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : [23.3441, 85.3096];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-lg">🏙️</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white">NagarHelp</h1>
              <p className="text-xs text-white/50">Civic Command Center</p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {[
              { id: 'map', label: '🗺️ Map View' },
              { id: 'sos', label: '🆘 SOS Feed' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/civic/report"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all">
              <span>+</span> Report Issue
            </Link>
            <Link to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-600/30 transition-all">
              🆘 SOS Mode
            </Link>
            {role === 'admin' && (
              <Link to="/admin"
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 transition-all">
                ⚙️
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {civicStats && (
        <div className="bg-white/5 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6 overflow-x-auto">
            {[
              { label: 'Total Issues', value: civicStats.total, color: 'text-white' },
              { label: 'Pending', value: civicStats.pending, color: 'text-yellow-400' },
              { label: 'Resolved', value: civicStats.resolved, color: 'text-green-400' },
              { label: 'Resolution Rate', value: civicStats.resolutionRate, color: 'text-blue-400' },
              { label: 'Active SOS', value: pendingSOS.length, color: 'text-red-400' },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center min-w-max">
                <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-white/50">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)]">
        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-xl min-h-[400px]">
          {userLocation && (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />

              {/* User location */}
              {userLocation && (
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={50}
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.4 }}
                />
              )}

              {/* Civic Issues */}
              {activeTab === 'map' && filteredIssues.map(issue => {
                const [lng, lat] = issue.location?.coordinates || [0, 0];
                if (!lat || !lng) return null;
                return (
                  <Marker key={issue._id} position={[lat, lng]} icon={civicIcon}>
                    <Popup>
                      <div className="text-xs">
                        <div className="font-bold">{CATEGORY_ICONS[issue.category]} {issue.title}</div>
                        <div className="text-gray-500 mt-1">{issue.category} · {issue.status}</div>
                        <div className="mt-1">{issue.description?.slice(0, 80)}...</div>
                        <button
                          onClick={() => navigate(`/civic/feed`)}
                          className="mt-2 text-blue-600 underline">View Details</button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* SOS Alerts */}
              {activeTab === 'sos' && pendingSOS.map(sos => {
                const [lng, lat] = sos.location?.coordinates || [0, 0];
                if (!lat || !lng) return null;
                return (
                  <Marker key={sos._id} position={[lat, lng]} icon={sosIcon}>
                    <Popup>
                      <div className="text-xs">
                        <div className="font-bold text-red-600">🆘 {sos.crisisType}</div>
                        <div className="text-gray-500 mt-1">{sos.address || 'Location shared'}</div>
                        <button
                          onClick={() => navigate(`/sos/${sos._id}`)}
                          className="mt-2 text-red-600 underline font-semibold">Respond →</button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
          {!userLocation && (
            <div className="h-full flex items-center justify-center bg-white/5">
              <div className="text-center">
                <div className="text-4xl mb-3">📍</div>
                <p className="text-white/50">Getting your location...</p>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'Pending', 'In-Progress', 'Resolved'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  filter === f
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {f === 'all' ? 'All Issues' : f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeTab === 'sos' ? (
                pendingSOS.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-sm">No active SOS alerts nearby</p>
                  </div>
                ) : (
                  pendingSOS.map(sos => (
                    <div key={sos._id}
                      onClick={() => navigate(`/sos/${sos._id}`)}
                      className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 cursor-pointer hover:border-red-400/50 hover:bg-red-950/50 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wide">🆘 {sos.crisisType}</span>
                        <span className="text-xs text-white/40">{new Date(sos.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-white/80">{sos.address || 'Location coordinates shared'}</p>
                      <p className="text-xs text-white/40 mt-1">{sos.responders?.length || 0} responders</p>
                      <div className="mt-2 text-xs text-red-400 group-hover:text-red-300 font-semibold">Tap to respond →</div>
                    </div>
                  ))
                )
              ) : (
                filteredIssues.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <div className="text-3xl mb-2">🏙️</div>
                    <p className="text-sm">No civic issues reported yet</p>
                    <Link to="/civic/report" className="mt-3 inline-block text-blue-400 text-sm hover:underline">Report the first one →</Link>
                  </div>
                ) : (
                  filteredIssues.slice(0, 20).map(issue => (
                    <div key={issue._id}
                      onClick={() => navigate('/civic/feed')}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:border-white/20 hover:bg-white/10 transition-all group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-semibold text-white line-clamp-1">
                          {CATEGORY_ICONS[issue.category]} {issue.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[issue.status] || STATUS_COLORS.Pending}`}>
                          {issue.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 line-clamp-2">{issue.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                        <span>👍 {issue.upvotes || 0}</span>
                        <span>💬 {issue.comments?.length || 0}</span>
                        {issue.source === 'whatsapp' && <span className="text-green-400">📱 WhatsApp</span>}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          )}

          <Link to="/civic/feed"
            className="block text-center py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white hover:border-white/20 transition-all">
            View All Issues & Comments →
          </Link>
        </div>
      </div>
    </div>
  );
}
