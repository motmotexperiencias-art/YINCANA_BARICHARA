// Variable global para el mapa
let mapaActivo = null;
let marcadorDestino = null;
let marcadorJugador = null;

// 1. Función para iniciar el mapa visual (Leaflet)
export function iniciarMapa(idContenedor, latDestino, lonDestino) {
    // Si ya hay un mapa, lo destruimos para no duplicarlo
    if (mapaActivo) {
        mapaActivo.remove();
    }

    // Crear el mapa centrado en el destino
    mapaActivo = L.map(idContenedor, { zoomControl: false, attributionControl: false }).setView([latDestino, lonDestino], 17);
    
    // Capa de las calles (OpenStreetMap con colores invertidos vía CSS para que se vea oscuro)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaActivo);

    // Ícono personalizado para el destino (Naranja Motmot)
    const iconoDestino = L.divIcon({ 
        html: '<div style="background:#ff6600; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #ff6600;"></div>', 
        className: '' 
    });

    // Poner el pin del destino
    marcadorDestino = L.marker([latDestino, lonDestino], {icon: iconoDestino}).addTo(mapaActivo);
}

// 2. Función matemática para calcular distancia real en metros (Fórmula Haversine)
export function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en metros
}