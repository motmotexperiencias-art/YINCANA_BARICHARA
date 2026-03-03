// Importamos la conexión a la base de datos
import { db, doc, updateDoc } from './firebase-config.js';

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