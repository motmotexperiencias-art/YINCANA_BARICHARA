// Importamos la conexión a la base de datos y agregamos el "Walkie-Talkie" (onSnapshot)
import { db, doc, updateDoc, onSnapshot } from './firebase-config.js';

// 1. Función para forzar pantalla completa (Mejora la inmersión)
export function forzarFullScreen() {
    let el = document.documentElement;
    if(el.requestFullscreen) el.requestFullscreen().catch(e=>{console.log("Fullscreen bloqueado por el navegador");});
    else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(e=>{});
}

// 2. Función para actualizar el progreso en la bóveda (Firebase)
export async function avanzarPistaEnFirebase(numeroPista) {
    const partidaId = localStorage.getItem('motmot_partida_id');
    
    if (!partidaId) {
        alert("Error de sesión. Serás redirigido al inicio.");
        window.location.href = "index.html";
        return false;
    }

    try {
        const partidaRef = doc(db, 'partidas', partidaId);
        await updateDoc(partidaRef, {
            pista_actual: numeroPista
        });
        console.log(`Progreso guardado: Pista ${numeroPista}`);
        return true;
    } catch (error) {
        console.error("Error al comunicarse con la base de datos:", error);
        alert("Revisa tu conexión a internet.");
        return false;
    }
}

// 3. NUEVO: El Radar Cooperativo (Sincronización en tiempo real)
export function activarSincronizacionCooperativa() {
    const partidaId = localStorage.getItem('motmot_partida_id');
    if (!partidaId) return; // Si no hay partida, apagamos el radar

    // Averiguar en qué pista está este celular visualmente
    const match = window.location.href.match(/pista(\d+)\.html/);
    if (!match) return; // Si no está en una pista (ej. está en el inicio o ranking), apagamos el radar
    const miPistaActual = parseInt(match[1]);

    const partidaRef = doc(db, 'partidas', partidaId);
    
    // onSnapshot es el "Walkie-Talkie". Se activa automáticamente cada vez que la base de datos cambia.
    onSnapshot(partidaRef, (docSnap) => {
        if (docSnap.exists()) {
            const datosNube = docSnap.data();
            
            // Si la base de datos dice que el equipo va más adelante que el celular actual...
            if (datosNube.pista_actual > miPistaActual && datosNube.estado === 'jugando') {
                alert(`🎉 ¡TRABAJO EN EQUIPO!\nUn compañero acaba de resolver esta pista.\n\nSerás teletransportado a la Pista ${datosNube.pista_actual} para continuar la misión.`);
                window.location.href = `pista${datosNube.pista_actual}.html`;
            } 
            // Si alguien del equipo llegó a la meta final y dio por terminado el juego
            else if (datosNube.estado === 'terminado' && !window.location.href.includes('ranking')) {
                alert("🏆 ¡Tu equipo ha cruzado la meta!\nVamos al Salón de la Fama a ver su tiempo.");
                window.location.href = "ranking.html";
            }
        }
    });
}

// Auto-arranque: Apenas el celular cargue motor.js, encendemos el radar automáticamente
activarSincronizacionCooperativa();