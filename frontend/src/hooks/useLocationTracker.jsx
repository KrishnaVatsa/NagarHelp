import { useEffect, useState } from 'react';
import { initSocket, updateLocation } from '../services/socket';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export function useLocationTracker(isAuthenticated) {
  const [locationError, setLocationError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    let watchId;
    let socket;

    const setup = async () => {
      try {
        socket = await initSocket();
        
        // Listen for nearby SOS alerts
        socket.on('sos_alert', (data) => {
          toast.error(
            (t) => (
              <div className="flex flex-col gap-2">
                <strong className="text-lg">🚨 EMERGENCY: {data.crisisType?.toUpperCase()}</strong>
                <p className="text-sm">An SOS was triggered near your current location!</p>
                <div className="text-xs text-red-100">{data.address || 'Location coordinates shared'}</div>
                <button 
                  onClick={() => {
                    toast.dismiss(t.id);
                    navigate(`/sos/${data.sosId}`);
                  }}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Respond Now
                </button>
              </div>
            ),
            { 
              duration: 15000,
              style: {
                background: '#450a0a',
                color: '#fff',
                border: '1px solid #dc2626'
              }
            }
          );
        });

        // Watch location changes and send to backend
        if ('geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              updateLocation(longitude, latitude);
            },
            (err) => {
              console.error("Location tracking error:", err);
              setLocationError(err.message);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          setLocationError("Geolocation is not supported by your browser.");
        }
      } catch (err) {
        console.error("Socket connection failed in location tracker:", err);
      }
    };

    setup();

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (socket) {
        socket.off('sos_alert');
      }
    };
  }, [isAuthenticated, navigate]);

  return { locationError };
}
