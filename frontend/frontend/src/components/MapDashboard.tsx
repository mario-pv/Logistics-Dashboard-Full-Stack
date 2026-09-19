import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapDashboard.css';
import webSocketService, { type DriverLocation } from '../services/WebSocketService';

mapboxgl.accessToken = 'pk.eyJ1IjoibWFyaW9wdiIsImEiOiJjbXU0MWg5dG0wZmZsMndwdDk0c3dyc3A3In0.aqYmd3djdBQYoZfeeTKFsQ';

const STATIC_ORDERS = [
    { id: 'ORD-01', address: '5201 Woodward Ave', zip: '48202', lng: -83.0665, lat: 42.3581 },
    { id: 'ORD-02', address: '5200 Woodward Ave', zip: '48202', lng: -83.0645, lat: 42.3594 }, // DIA
    { id: 'ORD-03', address: '400 Renaissance Dr W', zip: '48243', lng: -83.0396, lat: 42.3292 },
    { id: 'ORD-04', address: '2100 Woodward Ave', zip: '48201', lng: -83.0515, lat: 42.3385 },
    { id: 'ORD-05', address: '1 Lafayette Plaisance', zip: '48207', lng: -83.0345, lat: 42.3411 },
    { id: 'ORD-06', address: '1431 Washington Blvd', zip: '48226', lng: -83.0503, lat: 42.3330 },
    { id: 'ORD-07', address: '2211 Woodward Ave', zip: '48201', lng: -83.0528, lat: 42.3389 },
    { id: 'ORD-08', address: '2645 Woodward Ave', zip: '48201', lng: -83.0551, lat: 42.3432 }, // LCA
    { id: 'ORD-09', address: '2901 Grand River Ave', zip: '48201', lng: -83.0641, lat: 42.3394 },
    { id: 'ORD-10', address: '800 Woodward Ave', zip: '48226', lng: -83.0468, lat: 42.3316 }  // Campus Martius
];

type WsPayload = DriverLocation & { status?: string; routeId?: string };
type MockRoute = { id: string; stops: number; estTime: string; status: string; assignedDriver: string | null; orderIds: string[] };

export default function MapDashboard() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<{ [driverId: string]: mapboxgl.Marker }>({});
    const stopMarkersRef = useRef<mapboxgl.Marker[]>([]);

    const [activeNav, setActiveNav] = useState('Home');
    const [activeTab, setActiveTab] = useState('Routes');
    const [isCreatingRoute, setIsCreatingRoute] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);
    const [activeRouteGeometry, setActiveRouteGeometry] = useState<number[][] | null>(null); // NEW: Stores the street curves

    const [lng] = useState(-83.0458);
    const [lat] = useState(42.3314);
    const [zoom] = useState(12.5);

    const [mockRoutes, setMockRoutes] = useState<MockRoute[]>([
        { id: 'R-739', stops: 5, orderIds: ['ORD-01', 'ORD-03', 'ORD-04', 'ORD-05', 'ORD-06'], estTime: '1h 15m', status: 'Created', assignedDriver: 'James W.' },
        { id: 'R-740', stops: 3, orderIds: ['ORD-10', 'ORD-09', 'ORD-02'], estTime: '45m', status: 'Active', assignedDriver: 'Sarah M.' },
        // NEW: Second defaulted active route
        { id: 'R-741', stops: 3, orderIds: ['ORD-06', 'ORD-03', 'ORD-05'], estTime: '35m', status: 'Active', assignedDriver: 'David L.' }
    ]);
    const [mockDrivers, setMockDrivers] = useState([
        { id: 'D-01', name: 'James W.', vehicle: 'Step Van', status: 'Available' },
        { id: 'D-02', name: 'Sarah M.', vehicle: 'Ford Transit', status: 'On Route' },
        { id: 'D-03', name: 'David L.', vehicle: 'Escape Hybrid AWD', status: 'On Route' }
    ]);
    useEffect(() => {
        if (map.current) return;
        if (mapContainer.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current, style: 'mapbox://styles/mapbox/dark-v11', center: [lng, lat], zoom: zoom
            });
        }
    }, [lng, lat, zoom]);

    useEffect(() => {
        webSocketService.connect();
        webSocketService.setLocationCallback((data: WsPayload) => {
            if (!map.current) return;

            if (data.status === 'COMPLETED') {

                setMockRoutes(prev => prev.map(route => route.id === data.routeId ? { ...route, status: 'Completed' } : route));

                setMockDrivers(prev => prev.map(driver => driver.id === data.driverId ? { ...driver, status: 'Available' } : driver));
                return;
            }

            if (markersRef.current[data.driverId]) {
                markersRef.current[data.driverId].setLngLat([data.lng, data.lat]);
            } else {
                markersRef.current[data.driverId] = new mapboxgl.Marker({ color: '#ef4444' })
                    .setLngLat([data.lng, data.lat])
                    .addTo(map.current);
            }
        });
        return () => webSocketService.disconnect();
    }, []);

    useEffect(() => {
        if (!map.current) return;
        const sourceId = 'active-highlight-source';
        const layerId = 'active-highlight-layer';

        if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
        if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
        stopMarkersRef.current.forEach(marker => marker.remove());
        stopMarkersRef.current = [];

        if (highlightedRouteId) {
            const activeRoute = mockRoutes.find(r => r.id === highlightedRouteId);
            if (!activeRoute) return;

            const routeOrders = activeRoute.orderIds.map(id => STATIC_ORDERS.find(o => o.id === id)).filter(Boolean) as typeof STATIC_ORDERS;

            routeOrders.forEach(order => {
                if (!map.current) return;
                stopMarkersRef.current.push(
                    new mapboxgl.Marker({ color: '#10b981', scale: 0.7 }).setLngLat([order.lng, order.lat]).addTo(map.current)
                );
            });

            const fetchRealRoute = async () => {
                try {
                    const coords = routeOrders.map(o => `${o.lng},${o.lat}`).join(';');
                    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

                    const response = await fetch(url);
                    const data = await response.json();
                    if (!data.routes || data.routes.length === 0) return;

                    if (!map.current) return;

                    map.current.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: data.routes[0].geometry }});
                    map.current.addLayer({ id: layerId, type: 'line', source: sourceId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.7 }});

                    setActiveRouteGeometry(data.routes[0].geometry.coordinates);

                    const coordinates = data.routes[0].geometry.coordinates;
                    const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
                    for (const coord of coordinates) bounds.extend(coord);
                    map.current.fitBounds(bounds, { padding: { top: 50, bottom: 50, left: 450, right: 50 } });

                } catch (error) { console.error("Failed to fetch directions", error); }
            };

            fetchRealRoute().catch(console.error);
        }
    }, [highlightedRouteId, mockRoutes]);

    // --- ACTIONS LOGIC ---
    const handleDispatchRoute = (id: string) => {
        setMockRoutes(prev => prev.map(route => route.id === id ? { ...route, status: 'Active' } : route));
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
        setMockRoutes(prev => prev.map(route => route.id === id ? { ...route, assignedDriver: 'David L.' } : route));
        setActiveDropdown(null);
    };


    const handleGenerateRoute = () => {
        if (!map.current) return;

        if (selectedOrders.length < 2) {
            alert("A route requires at least 2 stops. Please select another order.");
            return;
        }

        const sourceId = 'temp-route-source';
        const layerId = 'temp-route-layer';

        const routeOrders = selectedOrders.map(id => STATIC_ORDERS.find(o => o.id === id)).filter(Boolean) as typeof STATIC_ORDERS;
        if (routeOrders.length === 0) return;

        const fetchTempRoute = async () => {
            try {
                const coords = routeOrders.map(o => `${o.lng},${o.lat}`).join(';');
                const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
                const response = await fetch(url);
                const data = await response.json();
                if (!data.routes || data.routes.length === 0) return;

                if (!map.current) return;
                map.current.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: data.routes[0].geometry }});
                map.current.addLayer({ id: layerId, type: 'line', source: sourceId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#3b82f6', 'line-width': 5 }});
            } catch (err) { console.error(err); }
        };

        fetchTempRoute().catch(console.error);

        setTimeout(() => {
            if (map.current && map.current.getSource(sourceId)) {
                map.current.removeLayer(layerId);
                map.current.removeSource(sourceId);
            }
            const newRoute = {
                id: `R-${Math.floor(Math.random() * 900) + 100}`,
                stops: selectedOrders.length,
                orderIds: selectedOrders,
                estTime: `${selectedOrders.length * 12}m`,
                status: 'Created',
                assignedDriver: null
            };
            setMockRoutes(prev => [newRoute, ...prev]);
            setSelectedOrders([]);
            setIsCreatingRoute(false);
        }, 1500);
    };

    const renderExpandedDetails = (route: MockRoute) => {
        return (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <p style={{ margin: 0 }}><strong>Stops:</strong></p>
                    {/* NEW: Explicit Close button to exit the view */}
                    {activeNav === 'Scheduling' && (
                        <button className="btn-small" style={{ width: 'fit-content', padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => setHighlightedRouteId(null)}>
                            Close
                        </button>
                    )}
                </div>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#aaa' }}>
                    {route.orderIds.map(id => {
                        const o = STATIC_ORDERS.find(mo => mo.id === id);
                        return o ? <li key={id}>{o.address} ({o.id})</li> : null;
                    })}
                </ol>
            </div>
        );
    };

    const renderHomeContent = () => {
        const activeRoutes = mockRoutes
            .filter(r => r.status === 'Active' || r.status === 'Completed')
            .sort((a, b) => {
                if (a.id === 'R-740') return -1;
                if (b.id === 'R-740') return 1;
                return 0;
            });

        const inProgressCount = mockRoutes.filter(r => r.status === 'Active').length;
        const completedCount = mockRoutes.filter(r => r.status === 'Completed').length;
        const totalOrdersCount = STATIC_ORDERS.length;

        return (
            <div className="sidebar-content">

                {/* NEW: Compact 4-Column Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <h2>{inProgressCount}</h2>
                        <p>In Progress</p>
                    </div>
                    <div className="stat-card">
                        <h2>{completedCount}</h2>
                        <p>Completed</p>
                    </div>
                    <div className="stat-card">
                        <h2>{totalOrdersCount}</h2>
                        <p>Orders</p>
                    </div>
                </div>

                <h3 style={{ marginTop: '0', marginBottom: '15px' }}>Live Tracking</h3>
                {activeRoutes.length === 0 ? <p style={{ color: '#888' }}>No active routes.</p> : (
                    activeRoutes.map(route => (
                        <div key={route.id} className={`list-card clickable-card ${highlightedRouteId === route.id ? 'selected' : ''}`} onClick={() => setHighlightedRouteId(prev => prev === route.id ? null : route.id)}>
                            <h4>{route.id} <span className="status-badge active">{route.status}</span></h4>
                            <p>Driver: {route.assignedDriver}</p>

                            {/* REMOVED the specific R-740 and Completed checks so it shows for everything */}
                            <div style={{ marginTop: '12px' }}>
                                <button
                                    className="btn-small simulate"
                                    style={{ width: '100%', padding: '8px' }}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const dId = route.assignedDriver === 'James W.' ? 'D-01' : (route.assignedDriver === 'Sarah M.' ? 'D-02' : 'D-03');

                                        let geometryToSend = activeRouteGeometry;

                                        if (highlightedRouteId !== route.id || !geometryToSend) {
                                            setHighlightedRouteId(route.id); // Auto-expands the UI card
                                            const routeOrders = route.orderIds.map(id => STATIC_ORDERS.find(o => o.id === id)).filter(Boolean) as typeof STATIC_ORDERS;
                                            const coords = routeOrders.map(o => `${o.lng},${o.lat}`).join(';');
                                            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

                                            try {
                                                const response = await fetch(url);
                                                const data = await response.json();
                                                geometryToSend = data.routes[0].geometry.coordinates;
                                                setActiveRouteGeometry(geometryToSend);
                                            } catch (err) {
                                                console.error("Failed to fetch route on the fly", err);
                                                return;
                                            }
                                        }

                                        fetch('/api/simulate/start', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ driverId: dId, routeId: route.id, coordinates: geometryToSend })
                                        }).catch(console.error);
                                    }}
                                >
                                    {route.status === 'Completed' ? 'Replay Simulation' : 'Simulate Route'}
                                </button>
                            </div>

                            {highlightedRouteId === route.id && renderExpandedDetails(route)}
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
                        {STATIC_ORDERS.map(order => (
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
                                        <button className="btn-small" style={{ width: '100%' }} onClick={() => setActiveDropdown(activeDropdown === route.id ? null : route.id)}>Options ▾</button>
                                        {activeDropdown === route.id && (
                                            <div className="dropdown-menu">
                                                <button className="dropdown-item" onClick={() => { setHighlightedRouteId(route.id); setActiveDropdown(null); }}>View Route</button>
                                                <button className="dropdown-item" onClick={() => handleAssignMockDriver(route.id)}>Assign Driver</button>
                                                <button className="dropdown-item danger" onClick={() => handleDeleteRoute(route.id, route.status, route.stops)}>Delete</button>
                                            </div>
                                        )}
                                    </div>
                                    {route.status !== 'Active' && <button className="btn-small success" disabled={!route.assignedDriver} onClick={() => handleDispatchRoute(route.id)}>Dispatch</button>}
                                </div>

                                {highlightedRouteId === route.id && renderExpandedDetails(route)}
                            </div>
                        ))}
                    </div>
                );
            case 'Orders':
                return (
                    <div className="sidebar-content">
                        {STATIC_ORDERS.map(order => (
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
            default:
                return <div className="sidebar-content"><p>Select another tab.</p></div>;
        }
    };

    return (
        <div className="app-container">
            <header className="top-header">
                <div className="header-brand">ROUTE LOGISTICS</div>
                <nav className="header-nav">
                    {['Home', 'Scheduling', 'Activity', 'Settings'].map(item => (
                        <button key={item} className={`nav-item ${activeNav === item ? 'active' : ''}`} onClick={() => { setActiveNav(item); setIsCreatingRoute(false); setHighlightedRouteId(null); }}>{item}</button>
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