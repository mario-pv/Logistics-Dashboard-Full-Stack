import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapDashboard.css';

// token placeholder
mapboxgl.accessToken = 'MAPBOX_ACCESS_TOKEN';

export default function MapDashboard() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    // Defaulting to Eastern Michigan coordinates
    const [lng] = useState(-83.0458);
    const [lat] = useState(42.3314);
    const [zoom] = useState(10);

    useEffect(() => {
        if (map.current) return; // initialize map once

        if (mapContainer.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/dark-v11', // Dark mode map
                center: [lng, lat],
                zoom: zoom
            });
        }
    }, [lng, lat, zoom]);

    return (
        <div className="map-wrapper">
            <div className="sidebar">
                <h2>Dispatch Control</h2>
                <div className="fleet-status">
                    <p>Active Drivers: 0</p>
                    <p>Pending Stops: 0</p>
                </div>
                <button className="route-btn">Optimize Route</button>
            </div>
            <div ref={mapContainer} className="map-container" />
        </div>
    );
}