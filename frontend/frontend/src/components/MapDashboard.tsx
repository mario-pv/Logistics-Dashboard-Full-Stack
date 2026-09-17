import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapDashboard.css';
import webSocketService, { type DriverLocation } from '../services/WebSocketService';

mapboxgl.accessToken = 'pk.eyJ1IjoibWFyaW9wdiIsImEiOiJjbXU0MWg5dG0wZmZsMndwdDk0c3dyc3A3In0.aqYmd3djdBQYoZfeeTKFsQ';

export default function MapDashboard() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<{ [driverId: string]: mapboxgl.Marker }>({});

    // Navigation State
    const [activeNav, setActiveNav] = useState('Home');
    const [activeTab, setActiveTab] = useState('Routes');

    // UI State
    const [isCreatingRoute, setIsCreatingRoute] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);

    // Map State
    const [lng] = useState(-83.0458);
    const [lat] = useState(42.3314);
    const [zoom] = useState(12.5);

    // --- MOCK DATA ---
    type MockRoute = { id: string; stops: number; estTime: string; status: string; assignedDriver: string | null; };

    const [mockRoutes, setMockRoutes] = useState<MockRoute[]>([
        { id: 'R-739', stops: 5, estTime: '1h 15m', status: 'Created', assignedDriver: 'James W.' },
        { id: 'R-740', stops: 3, estTime: '45m', status: 'Active', assignedDriver: 'Sarah M.' }
    ]);

    const mockOrders = [
        { id: 'ORD-01', address: '5201 Woodward Ave', zip: '48202' },
        { id: 'ORD-02', address: '5200 Woodward Ave', zip: '48202' },
        { id: 'ORD-03', address: '400 Renaissance Dr W', zip: '48243' },
        { id: 'ORD-04', address: '2100 Woodward Ave', zip: '48201' },
        { id: 'ORD-05', address: '1 Lafayette Plaisance St', zip: '48207' },
        { id: 'ORD-06', address: '1431 Washington Blvd', zip: '48226' },
        { id: 'ORD-07', address: '2211 Woodward Ave', zip: '48201' },
        { id: 'ORD-08', address: '2645 Woodward Ave', zip: '48201' },
        { id: 'ORD-09', address: '2901 Grand River Ave', zip: '48201' },
        { id: 'ORD-10', address: '800 Woodward Ave', zip: '48226' }
    ];

    const mockDrivers = [
        { id: 'D-01', name: 'James W.', vehicle: 'Step Van', status: 'Available' },
        { id: 'D-02', name: 'Sarah M.', vehicle: 'Ford Transit', status: 'On Route' },
        { id: 'D-03', name: 'David L.', vehicle: 'Escape Hybrid AWD', status: 'Available' }
    ];

    // Initialize Map
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

    // WebSocket Connection
    useEffect(() => {
        webSocketService.connect();
        webSocketService.setLocationCallback((data: DriverLocation) => {
            if (!map.current) return;
            if (markersRef.current[data.driverId]) {
                markersRef.current[data.driverId].setLngLat([data.lng, data.lat]);
            } else {
                const marker = new mapboxgl.Marker({ color: '#ef4444' })
                    .setLngLat([data.lng, data.lat])
                    .addTo(map.current);
                markersRef.current[data.driverId] = marker;
            }
        });
        return () => webSocketService.disconnect();
    }, []);

    // Home Tab: Route Highlighting Logic
    useEffect(() => {
        if (!map.current) return;
        const sourceId = 'active-highlight-source';
        const layerId = 'active-highlight-layer';

        if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
        if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

        if (activeNav === 'Home' && highlightedRouteId) {
            map.current.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: [ [-83.0458, 42.3314], [-83.0600, 42.3520], [-83.0700, 42.3700] ] // Static mock highlight
                    }
                }
            });
            map.current.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.7 }
            });
        }
    }, [highlightedRouteId, activeNav]);

    // --- ACTIONS LOGIC ---
    const handleGenerateRoute = () => {
        if (!map.current) return;
        const sourceId = 'temp-route-source';
        const layerId = 'temp-route-layer';

        map.current.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: [ [-83.0458, 42.3314], [-83.0480, 42.3350], [-83.0510, 42.3400] ] }
            }
        });

        map.current.addLayer({
            id: layerId, type: 'line', source: sourceId,
            paint: { 'line-color': '#3b82f6', 'line-width': 5 }
        });

        setTimeout(() => {
            if (map.current && map.current.getSource(sourceId)) {
                map.current.removeLayer(layerId);
                map.current.removeSource(sourceId);
            }

            const newRoute = {
                id: `R-${Math.floor(Math.random() * 900) + 100}`,
                stops: selectedOrders.length,
                estTime: `${selectedOrders.length * 12}m`,
                status: 'Created',
                assignedDriver: null
            };

            setMockRoutes(prev => [newRoute, ...prev]);
            setSelectedOrders([]);
            setIsCreatingRoute(false);
        }, 1500);
    };

    const handleDispatchRoute = (id: string) => {
        setMockRoutes(prev => prev.map(route =>
            route.id === id ? { ...route, status: 'Active' } : route
        ));
    };

    const handleDeleteRoute = (id: string, status: string, stops: number) => {
        if (status === 'Active') {
            const confirmed = window.confirm(`Are you sure you want to delete this route? The remaining ${stops} stops will be canceled.`);
            if (!confirmed) {
                setActiveDropdown(null);
                return;
            }
        }
        setMockRoutes(prev => prev.filter(route => route.id !== id));
        setActiveDropdown(null);
    };

    const handleAssignMockDriver = (id: string) => {
        setMockRoutes(prev => prev.map(route =>
            route.id === id ? { ...route, assignedDriver: 'David L.' } : route
        ));
        setActiveDropdown(null);
    };

    // --- RENDER HELPERS ---
    const renderHomeContent = () => {
        const activeRoutes = mockRoutes
            .filter(r => r.status === 'Active')
            .sort((a, b) => {
                if (a.id === 'R-740') return -1; // Pins R-740 to the very top
                if (b.id === 'R-740') return 1;
                return 0; // Leaves all other routes in their normal order
            });

        return (
            <div className="sidebar-content">

                <h3 style={{ marginTop: '20px',marginBottom: '25px' }}>Route Live Tracking</h3>
                {activeRoutes.length === 0 ? (
                    <p style={{ color: '#888' }}>No active routes to track.</p>
                ) : (
                    activeRoutes.map(route => (
                        <div
                            key={route.id}
                            className={`list-card clickable-card ${highlightedRouteId === route.id ? 'selected' : ''}`}
                            onClick={() => setHighlightedRouteId(prev => prev === route.id ? null : route.id)}
                        >
                            <h4>{route.id} <span className="status-badge active">{route.status}</span></h4>
                            <p>Driver: {route.assignedDriver}</p>

                            {/* The Simulate Button - Exclusively for R-740 on the Home Tab */}
                            {route.id === 'R-740' && (
                                <div style={{ marginTop: '12px' }}>
                                    <button
                                        className="btn-small simulate"
                                        style={{ width: '100%', padding: '8px' }}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevents the card from expanding/collapsing when clicked
                                            alert('Java Simulator Trigger coming soon!');
                                        }}
                                    >
                                        Simulate Route
                                    </button>
                                </div>
                            )}

                            {highlightedRouteId === route.id && (
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444' }}>
                                    <p>Remaining Stops: {route.stops}</p>
                                    <p>Est. Completion: {route.estTime}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}


            </div>
        );
    };

    const renderSidebarContent = () => {
        if (activeNav === 'Home') return renderHomeContent();
        if (activeNav !== 'Scheduling') return <div className="sidebar-content"><p>{activeNav} module coming soon...</p></div>;

        // CREATE ROUTE VIEW
        if (activeTab === 'Routes' && isCreatingRoute) {
            return (
                <div className="sidebar-content" style={{ paddingTop: 0 }}>
                    <div className="sticky-action-bar">
                        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Select Orders</h3>
                        <button className="generate-btn" style={{ marginTop: 0 }} disabled={selectedOrders.length === 0} onClick={handleGenerateRoute}>
                            Generate Route ({selectedOrders.length} stops)
                        </button>
                        <button className="btn-small" style={{ width: '100%', marginTop: '10px', padding: '10px' }} onClick={() => setIsCreatingRoute(false)}>
                            Cancel
                        </button>
                    </div>
                    <div className="selection-list">
                        {mockOrders.map(order => (
                            <label key={order.id} className="selectable-card">
                                <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => setSelectedOrders(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])} />
                                <div>
                                    <h4 style={{ margin: 0, color: '#fff' }}>{order.id}</h4>
                                    <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#aaa' }}>{order.address}, {order.zip}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            );
        }

        // STANDARD TABS
        switch (activeTab) {
            case 'Routes':
                return (
                    <div className="sidebar-content">
                        <button className="action-btn" style={{ marginBottom: '20px' }} onClick={() => setIsCreatingRoute(true)}>+ New Route</button>
                        {mockRoutes.map(route => (
                            <div key={route.id} className="list-card">
                                <h4>{route.id} <span className={`status-badge ${route.status.toLowerCase()}`}>{route.status}</span></h4>
                                <p>Total Stops: {route.stops}</p>
                                <p>Est. Duration: {route.estTime}</p>
                                <p style={{ color: route.assignedDriver ? '#6ee7b7' : '#fcd34d' }}>Driver: {route.assignedDriver || 'Unassigned'}</p>

                                <div className="button-group">
                                    <div className="dropdown-wrapper">
                                        <button className="btn-small" style={{ width: '100%' }} onClick={() => setActiveDropdown(activeDropdown === route.id ? null : route.id)}>Modify ▾</button>
                                        {activeDropdown === route.id && (
                                            <div className="dropdown-menu">
                                                <button className="dropdown-item" onClick={() => { alert('Modification coming soon!'); setActiveDropdown(null); }}>Modify Orders</button>
                                                <button className="dropdown-item" onClick={() => handleAssignMockDriver(route.id)}>Select Driver</button>
                                                <button className="dropdown-item danger" onClick={() => handleDeleteRoute(route.id, route.status, route.stops)}>Delete</button>
                                            </div>
                                        )}
                                    </div>

                                    {route.status !== 'Active' && (
                                        <button className="btn-small success" disabled={!route.assignedDriver} onClick={() => handleDispatchRoute(route.id)}>
                                            Dispatch
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'Orders':
                return (
                    <div className="sidebar-content">
                        {mockOrders.map(order => (
                            <div key={order.id} className="list-card compact-card">
                                <div><h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>{order.id}</h4><p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>{order.address}, {order.zip}</p></div>

                            </div>
                        ))}
                    </div>
                );
            case 'Drivers':
                return (
                    <div className="sidebar-content">
                        {mockDrivers.map(driver => (
                            <div key={driver.id} className="list-card">
                                <h4>{driver.name} <span className={`status-badge ${driver.status === 'Available' ? 'active' : 'pending'}`}>{driver.status}</span></h4>
                                <p>Vehicle: {driver.vehicle}</p>
                            </div>
                        ))}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="app-container">
            <header className="top-header">
                <div className="header-brand">ROUTE LOGISTICS</div>
                <nav className="header-nav">
                    {['Home', 'Scheduling', 'Activity', 'Settings'].map(item => (
                        <button key={item} className={`nav-item ${activeNav === item ? 'active' : ''}`} onClick={() => { setActiveNav(item); setIsCreatingRoute(false); setHighlightedRouteId(null); }}>
                            {item}
                        </button>
                    ))}
                </nav>
            </header>

            <div className="workspace">
                <div className="sidebar">
                    {activeNav === 'Scheduling' && !isCreatingRoute && (
                        <div className="sidebar-tabs">
                            {['Routes', 'Orders', 'Drivers'].map(tab => (
                                <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
                            ))}
                        </div>
                    )}
                    {renderSidebarContent()}
                </div>
                <div ref={mapContainer} className="map-container" />
            </div>
        </div>
    );
}