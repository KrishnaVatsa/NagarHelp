import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'react-hot-toast';
import { civicAPI } from '../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CATEGORIES = [
  { id: 'Pothole',      emoji: '🕳️', label: 'Pothole',       desc: 'Road damage' },
  { id: 'Garbage',      emoji: '🗑️', label: 'Garbage Dump',  desc: 'Waste/littering' },
  { id: 'Safety',       emoji: '⚠️', label: 'Safety Hazard', desc: 'Unsafe area' },
  { id: 'Waterlogging', emoji: '💧', label: 'Waterlogging',  desc: 'Flooding/stagnant water' },
  { id: 'Streetlight',  emoji: '💡', label: 'Streetlight',   desc: 'Broken/missing light' },
  { id: 'Drainage',     emoji: '🚰', label: 'Drainage',      desc: 'Blocked drain/sewer' },
  { id: 'Other',        emoji: '📌', label: 'Other',         desc: 'Something else' },
];

function MapPicker({ onSelect }) {
  useMapEvents({
    click(e) { onSelect(e.latlng); }
  });
  return null;
}

export default function ReportIssue() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1: category, 2: details, 3: location
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mapCenter, setMapCenter] = useState([23.3441, 85.3096]);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(latlng);
        setMapCenter([latlng.lat, latlng.lng]);
        setAddress('Current Location');
      },
      () => toast.error('Could not get location. Please tap on the map.')
    );
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    const previews = files.map(f => URL.createObjectURL(f));
    setImagePreviews(previews);
  };

  const handleSubmit = async () => {
    if (!category) return toast.error('Please select a category');
    if (!title.trim()) return toast.error('Please add a title');
    if (!location) return toast.error('Please pin your location on the map');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('location', JSON.stringify({ latitude: location.lat, longitude: location.lng }));
      formData.append('address', address);
      images.forEach(img => formData.append('images', img));

      await civicAPI.create(formData);
      toast.success('🎉 Issue reported successfully! Thank you for making your city better.');
      navigate('/civic/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/civic" className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            ← Back
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">Report a Civic Issue</h1>
            <p className="text-xs text-white/50">Help improve your city — every report matters</p>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
                s < step ? 'bg-green-600 text-white' : s === step ? 'bg-blue-600 text-white ring-4 ring-blue-600/30' : 'bg-white/10 text-white/40'
              }`}>
                {s < step ? '✓' : s}
              </div>
              <div className="text-xs text-white/40">
                {s === 1 ? 'Category' : s === 2 ? 'Details' : 'Location'}
              </div>
              {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-green-600/60' : 'bg-white/10'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        {/* Step 1: Category */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white/90">What are you reporting?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setStep(2); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-left ${
                    category === cat.id
                      ? 'border-blue-500 bg-blue-600/20 shadow-lg shadow-blue-600/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{cat.label}</div>
                    <div className="text-xs text-white/50 mt-0.5">{cat.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="text-blue-400 hover:text-blue-300 text-sm">← Back</button>
              <h2 className="text-lg font-bold text-white/90">Describe the issue</h2>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Large pothole near bus stop"
                  maxLength={100}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Provide more details about the issue..."
                  rows={4}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Photos (up to 5)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-600/5 transition-all"
                >
                  {imagePreviews.length > 0 ? (
                    <div className="flex gap-2 flex-wrap justify-center">
                      {imagePreviews.map((src, i) => (
                        <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl mb-2">📸</div>
                      <p className="text-sm text-white/40">Tap to add photos</p>
                      <p className="text-xs text-white/30 mt-1">PNG, JPG up to 10MB each</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => { if (!title.trim()) { toast.error('Please add a title'); return; } setStep(3); getUserLocation(); }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all"
            >
              Next: Set Location →
            </button>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className="text-blue-400 hover:text-blue-300 text-sm">← Back</button>
              <h2 className="text-lg font-bold text-white/90">Pin the location</h2>
            </div>

            <p className="text-sm text-white/50">Tap anywhere on the map to mark the exact location of the issue.</p>

            <div className="rounded-2xl overflow-hidden border border-white/10 h-72">
              <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} className="z-0">
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO'
                />
                <MapPicker onSelect={(latlng) => { setLocation(latlng); setAddress('Pinned Location'); }} />
                {location && <Marker position={[location.lat, location.lng]} />}
              </MapContainer>
            </div>

            {location && (
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3">
                <p className="text-sm text-blue-400 font-medium">📍 Location pinned!</p>
                <p className="text-xs text-white/50 mt-0.5">Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}</p>
              </div>
            )}

            {/* Address override */}
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Address / Landmark (optional)</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. Near Firayalal Chowk, Ranchi"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !location}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
              ) : (
                '🚀 Submit Report'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
