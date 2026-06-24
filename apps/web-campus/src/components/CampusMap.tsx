import { useState, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, Navigation, Building, Building2, Landmark, GraduationCap, Palette, TestTube, Leaf, Stethoscope, HeartPulse, Brain, BookOpen, Users, Mic, Dumbbell, Activity, HardHat, Factory, Scale, Smile, Library, School } from 'lucide-react';
import type { MapRef } from 'react-map-gl';

// Token de Mapbox desde la variable de entorno VITE_
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
// Altura del header del host + footer + toolbar del mapa = ~130px
const CHROME_HEIGHT = 130;

// Helper para asignar iconos y colores según el ID del nodo
const getFacultyIcon = (id: string) => {
    switch(id) {
        case 'arquitectura': return { Icon: Building2 };
        case 'artes': return { Icon: Palette };
        case 'ciencias_administrativas':
        case 'economia': return { Icon: Landmark };
        case 'ciencias_agricolas':
        case 'veterinaria': return { Icon: Leaf };
        case 'ciencias_biologicas':
        case 'quimica': return { Icon: TestTube };
        case 'medicina':
        case 'escuela_medicina':
        case 'discapacidad':
        case 'hospital_dia': return { Icon: HeartPulse };
        case 'odontologia': return { Icon: Smile };
        case 'psicologia': return { Icon: Brain };
        case 'sociales':
        case 'filosofia': return { Icon: BookOpen };
        case 'facso': return { Icon: Mic };
        case 'cultura_fisica':
        case 'estadio':
        case 'coliseo': return { Icon: Dumbbell };
        case 'figempa':
        case 'ingenieria_quimica':
        case 'fica': return { Icon: HardHat };
        case 'jurisprudencia': return { Icon: Scale };
        case 'biblioteca': return { Icon: Library };
        case 'edificio_administrativo':
        case 'rectorado': return { Icon: Building };
        case 'laboratorio_clinico': return { Icon: TestTube };
        case 'teatro': return { Icon: Users };
        case 'plaza_indoamerica': return { Icon: Navigation };
        case 'museo_antropologico': return { Icon: Building2 };
        case 'instituto_idiomas': return { Icon: BookOpen };
        case 'residencia': return { Icon: Building };
        case 'entrada_principal':
        case 'entrada_norte': return { Icon: Navigation };
        default: return { Icon: School };
    }
};

export default function CampusMap() {
    const mapRef = useRef<MapRef>(null);

    // Altura real en píxeles calculada desde la ventana
    const [mapHeight, setMapHeight] = useState(() => Math.max(window.innerHeight - CHROME_HEIGHT, 500));

    const [faculties, setFaculties] = useState<Record<string, any>>({});
    const [liveData, setLiveData] = useState<Record<string, number>>({});
    const [wsStatus, setWsStatus] = useState('Conectando MQTT...');
    const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{lat: number, lng: number, name: string} | null>(null);
    
    // Routing state
    const [startNode, setStartNode] = useState('');
    const [endNode, setEndNode] = useState('');
    const [routePath, setRoutePath] = useState<[number, number][]>([]);
    const [routeMsg, setRouteMsg] = useState('');
    const [transportMode, setTransportMode] = useState<'walking' | 'driving'>('walking');

    // Actualizar altura cuando cambie el tamaño de la ventana
    useEffect(() => {
        const onResize = () => setMapHeight(Math.max(window.innerHeight - CHROME_HEIGHT, 500));
        window.addEventListener('resize', onResize);
        
        // Escuchar comando del chatbot para trazar ruta
        const handleRouteCommand = (e: Event) => {
            const customEvent = e as CustomEvent;
            const dest = customEvent.detail?.destination;
            if (dest) {
                setEndNode(dest);
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Mi Ubicación' });
                        setStartNode('mi_ubicacion');
                        // setTimeout for state to propagate (React state batching)
                        setTimeout(() => document.getElementById('btn-trazar')?.click(), 100);
                    }, () => {
                        // Fallback si no hay GPS
                        setTimeout(() => document.getElementById('btn-trazar')?.click(), 100);
                    });
                } else {
                    setTimeout(() => document.getElementById('btn-trazar')?.click(), 100);
                }
            }
        };
        window.addEventListener('ROUTE_COMMAND', handleRouteCommand);
        
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('ROUTE_COMMAND', handleRouteCommand);
        };
    }, []);

    useEffect(() => {
        // Cargar facultades desde el backend PostgreSQL (vía Gateway)
        fetch('/api/geocampus/faculties')
            .then(res => res.json())
            .then(data => {
                setFaculties(data);
                const keys = Object.keys(data);
                if (keys.length >= 2) {
                    setStartNode(keys[0]);
                    setEndNode(keys[1]);
                }
            })
            .catch(err => console.error("Error cargando facultades:", err));

        // Conectar al WebSocket del Gateway
        // Usamos la misma URL base de donde se sirva, pero con wss:// o ws://
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/geocampus`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => setWsStatus('🟢 MQTT En Vivo');
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLiveData(data);
            } catch (e) { }
        };
        ws.onclose = () => setWsStatus('🔴 Desconectado');
        return () => ws.close();
    }, []);

    const handleCalculateRoute = async () => {
        if (!startNode || !endNode) return;
        
        let start = startNode === 'mi_ubicacion' && userLocation ? userLocation : faculties[startNode];
        let end = endNode === 'mi_ubicacion' && userLocation ? userLocation : faculties[endNode];
        
        if (!start || !end) return;

        try {
            setRouteMsg('Calculando ruta...');
            
            // Usar Mapbox directamente con las coordenadas de inicio y fin garantiza
            // que se tome la "ruta más corta" real basándose en calles (driving) o caminos peatonales (walking)
            const waypoints = `${start.lng},${start.lat};${end.lng},${end.lat}`;
            const mapboxResponse = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${transportMode}/${waypoints}?geometries=geojson&access_token=${MAPBOX_TOKEN}`);
            const mapboxData = await mapboxResponse.json();
            
            let finalPath: [number, number][] = [];
            if (mapboxData.routes && mapboxData.routes.length > 0) {
                finalPath = mapboxData.routes[0].geometry.coordinates;
                const distance = Math.round(mapboxData.routes[0].distance);
                const duration = Math.round(mapboxData.routes[0].duration / 60);
                const modeText = transportMode === 'walking' ? 'Caminando' : 'En Auto';
                setRouteMsg(`${modeText}: ${distance}m (~${duration} min)`);
            } else {
                // Fallback a línea recta si Mapbox falla
                finalPath = [[start.lng, start.lat], [end.lng, end.lat]];
                setRouteMsg(`Línea recta (Mapbox falló)`);
            }

            setRoutePath(finalPath);

            if (mapRef.current && finalPath.length > 0) {
                const lats = finalPath.map(c => c[1]);
                const lngs = finalPath.map(c => c[0]);
                mapRef.current.fitBounds([
                    [Math.min(...lngs), Math.min(...lats)],
                    [Math.max(...lngs), Math.max(...lats)]
                ], { padding: 50, duration: 1000 });
            }
        } catch (error) {
            setRouteMsg("Error al conectarse con Mapbox.");
        }
    };

    const geoJsonRoute = useMemo(() => {
        if (routePath.length === 0) return null;
        return {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: routePath
            }
        };
    }, [routePath]);

    return (
        // Contenedor principal con padding para que el mapa flote
        <div style={{ padding: '20px', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', height: `${mapHeight}px` }}>
            {/* Contenedor del mapa con bordes redondeados y sombra */}
            <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            {/* Header Toolbar */}
            <div style={{ padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', zIndex: 10 }}>
                <h3 style={{ margin: 0, color: '#0d3b8e', fontSize: '18px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>UCE-Maps (Premium)</h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Rutas:</span>
                    <select value={startNode} onChange={(e) => setStartNode(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', maxWidth: '200px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {userLocation && <option value="mi_ubicacion">📍 Mi Ubicación</option>}
                        {Object.entries(faculties).map(([id, fac]) => (
                            <option key={`start-${id}`} value={id}>{fac.name}</option>
                        ))}
                    </select>
                    <span style={{ color: '#94a3b8' }}>➔</span>
                    <select value={endNode} onChange={(e) => setEndNode(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', maxWidth: '200px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {Object.entries(faculties).map(([id, fac]) => (
                            <option key={`end-${id}`} value={id}>{fac.name}</option>
                        ))}
                    </select>
                    
                    {/* Selector de Modo de Transporte */}
                    <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '4px', padding: '2px' }}>
                        <button 
                            onClick={() => setTransportMode('walking')} 
                            style={{ border: 'none', backgroundColor: transportMode === 'walking' ? 'white' : 'transparent', color: transportMode === 'walking' ? '#2563eb' : '#64748b', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', boxShadow: transportMode === 'walking' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                        >
                            🚶 Caminando
                        </button>
                        <button 
                            onClick={() => setTransportMode('driving')} 
                            style={{ border: 'none', backgroundColor: transportMode === 'driving' ? 'white' : 'transparent', color: transportMode === 'driving' ? '#2563eb' : '#64748b', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', boxShadow: transportMode === 'driving' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                        >
                            🚗 Auto
                        </button>
                    </div>

                    <button id="btn-trazar" onClick={handleCalculateRoute} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Trazar
                    </button>
                    {routeMsg && <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '5px' }}>{routeMsg}</span>}
                </div>

                <div style={{ fontSize: '13px', fontWeight: 'bold', color: wsStatus.includes('🟢') ? '#22c55e' : '#ef4444', whiteSpace: 'nowrap' }}>
                    {wsStatus}
                </div>
            </div>

            {/* Map Container */}
            <div style={{ flex: 1, position: 'relative', backgroundColor: '#e2e8f0', minHeight: 0 }}>
                {!MAPBOX_TOKEN ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <h2 style={{ margin: '0 0 10px', color: '#ef4444' }}>Falta API Token de Mapbox</h2>
                            <p style={{ color: '#64748b', maxWidth: '400px' }}>
                                Para renderizar el mapa nativo necesitas un token. Por favor crea un archivo <code>.env</code> en <code>apps/web-campus</code> con la variable <code>VITE_MAPBOX_TOKEN=tu_token_aqui</code> y reinicia el servidor.
                            </p>
                        </div>
                    </div>
                ) : (
                    <Map
                        ref={mapRef}
                        mapboxAccessToken={MAPBOX_TOKEN}
                        initialViewState={{
                            longitude: -78.5039,
                            latitude: -0.1994,
                            zoom: 16.5,
                            pitch: 45 // 3D effect
                        }}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                        onClick={(e) => {
                            // Imprimir coordenadas en consola para facilitar ajustes de ubicación
                            console.log(`[Coordenadas Click] lat: ${e.lngLat.lat.toFixed(6)}, lng: ${e.lngLat.lng.toFixed(6)}`);
                        }}
                    >
                        {/* Render User Location Marker */}
                        {userLocation && (
                            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="bottom">
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ color: '#e11d48', filter: 'drop-shadow(1px 1px 0px white) drop-shadow(-1px -1px 0px white)' }}>
                                        <Navigation size={18} strokeWidth={3} fill="#e11d48" style={{ transform: 'rotate(45deg)' }} />
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#e11d48', textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' }}>Tú</span>
                                </div>
                            </Marker>
                        )}

                        {/* Render Markers for Faculties */}
                        {Object.entries(faculties).map(([key, fac]) => {
                            const { Icon } = getFacultyIcon(key);
                            return (
                                <Marker 
                                    key={key} 
                                    longitude={fac.lng} 
                                    latitude={fac.lat} 
                                    anchor="bottom"
                                    onClick={e => {
                                        e.originalEvent.stopPropagation();
                                        setSelectedFaculty(key);
                                    }}
                                    style={{ zIndex: selectedFaculty === key ? 10 : 1 }}
                                >
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        cursor: 'pointer',
                                        transform: 'translateY(4px)' // Ajuste más sutil
                                    }}>
                                        <div style={{
                                            // Halo blanco alrededor del icono oscuro
                                            filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.9)) drop-shadow(-1px -1px 0px rgba(255,255,255,0.9)) drop-shadow(1px -1px 0px rgba(255,255,255,0.9)) drop-shadow(-1px 1px 0px rgba(255,255,255,0.9))',
                                            color: selectedFaculty === key ? '#2563eb' : '#475569',
                                            transition: 'color 0.2s',
                                        }}>
                                            <Icon size={15} strokeWidth={2.5} />
                                        </div>
                                        <span style={{
                                            marginTop: '2px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#334155', // Texto oscuro para mapa claro
                                            // Halo blanco idéntico a Mapbox/Google Maps
                                            textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 1px 3px rgba(255,255,255,0.8)',
                                            textAlign: 'center',
                                            maxWidth: '100px',
                                            lineHeight: 1.1,
                                            letterSpacing: '0.1px'
                                        }}>
                                            {fac.name.replace('Facultad de ', '')}
                                        </span>
                                    </div>
                                </Marker>
                            );
                        })}

                        {/* Render GeoJSON Route Line */}
                        {geoJsonRoute && (
                            <Source id="route" type="geojson" data={geoJsonRoute as any}>
                                <Layer
                                    id="route-line"
                                    type="line"
                                    layout={{
                                        "line-join": "round",
                                        "line-cap": "round"
                                    }}
                                    paint={{
                                        "line-color": "#38bdf8",
                                        "line-width": 6,
                                        "line-opacity": 0.8
                                    }}
                                />
                            </Source>
                        )}
                    </Map>
                )}

                {/* Sidebar overlay for Faculty info */}
                {selectedFaculty && faculties[selectedFaculty] && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '350px',
                        height: '100%',
                        backgroundColor: '#1e293b',
                        color: 'white',
                        boxShadow: '-4px 0 15px rgba(0,0,0,0.4)',
                        zIndex: 1000,
                        padding: '20px',
                        overflowY: 'auto',
                        animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <style>{`
                            @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                        `}</style>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '1.2rem' }}>{faculties[selectedFaculty].name}</h2>
                            <button onClick={() => setSelectedFaculty(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '20px' }}>
                            {/* Temporary fallback desc as DB doesn't have it yet */}
                            Centro de formación académica superior de la Universidad Central del Ecuador.
                        </p>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>⏰ Horario de Atención</div>
                            <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>Lunes a Viernes: 07:00 - 20:00</div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>📡 Estado de Ocupación MQTT</div>
                            
                            {/* Dummy AP IDs logic based on faculty id since we don't have APs in DB yet */}
                            {['BIBLIOTECA', 'CAFETERIA', 'AUDITORIO'].map((apSuffix) => {
                                const ap = `${selectedFaculty.toUpperCase()}-${apSuffix}`;
                                const count = liveData[ap] || 0;
                                let heatColor = '#22c55e'; // low
                                if (count > 80) heatColor = '#eab308'; // medium
                                if (count > 150) heatColor = '#ef4444'; // high

                                return (
                                    <div key={ap} style={{
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{apSuffix}</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: heatColor }}>{count}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}
