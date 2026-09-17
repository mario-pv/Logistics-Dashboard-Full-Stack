import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapDashboard.css';
import webSocketService, { type DriverLocation } from '../services/WebSocketService';

mapboxgl.accessToken = 'pk.eyJ1IjoibWFyaW9wdiIsImEiOiJjbXU0MWg5dG0wZmZsMndwdDk0c3dyc3A3In0.aqYmd3djdBQYoZfeeTKFsQ';

export default function MapDashboard() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    // store the markers in a ref to update their positions instantly
    // without triggering a heavy React re-render every time a truck moves.
    const markersRef = useRef<{ [driverId: string]: mapboxgl.Marker }>({});

    const [lng] = useState(-83.0458);
    const [lat] = useState(42.3314);
    const [zoom] = useState(10);
    const [activeDrivers, setActiveDrivers] = useState(0);

    useEffect(() => {
        if (map.current) return;

        if (mapContainer.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/dark-v11',
                center: [lng, lat],
                zoom: zoom
            });
        }
    }, [lng, lat, zoom]);

    // Connect to the WebSocket when the dashboard loads
    useEffect(() => {
        webSocketService.connect();

        webSocketService.setLocationCallback((data: DriverLocation) => {
            if (!map.current) return;

            // If the truck is already on the map, just update its coordinates
            if (markersRef.current[data.driverId]) {
                markersRef.current[data.driverId].setLngLat([data.lng, data.lat]);
            } else {
                // If this is a new truck, create a new red marker and drop it on the map
                const marker = new mapboxgl.Marker({ color: '#ef4444' })
                    .setLngLat([data.lng, data.lat])
                    .addTo(map.current);

                markersRef.current[data.driverId] = marker;

                // Update the sidebar count safely
                setActiveDrivers(Object.keys(markersRef.current).length);
            }
        });

        // Disconnect cleanly if the user closes the dashboard
        return () => {
            webSocketService.disconnect();
        };
    }, []);

    return (
        <div className="map-wrapper">
            <div className="sidebar">
                <h2>Dispatch Control</h2>
                <div className="fleet-status">
                    <p>Active Drivers: {activeDrivers}</p>
                    <p>Pending Stops: 0</p>
                </div>
                <button className="route-btn">Optimize Route</button>
            </div>
            <div ref={mapContainer} className="map-container" />
        </div>
    );
}