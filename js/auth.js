// Importamos las herramientas desde tu archivo de configuración
import { db, auth, signInAnonymously, collection, doc, getDoc, setDoc, serverTimestamp } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const btnIniciar = document.getElementById('btn-iniciar');
    const avisoCarga = document.getElementById('aviso-carga'); 

    // ====== NUEVO: SISTEMA DE RECUPERACIÓN DE PARTIDA ======
    // 1. Revisamos si el celular tiene un ticket VIP guardado
    const partidaGuardadaId = localStorage.getItem('motmot_partida_id');
    
    if (partidaGuardadaId) {
        avisoCarga.style.display = 'flex';
        avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">RECUPERANDO MISIÓN...</p>';
        
        try {
            // 2. Vamos a Firebase a ver en qué pista se quedó
            const partidaRef = doc(db, 'partidas', partidaGuardadaId);
            const partidaSnap = await getDoc(partidaRef);
            
            if (partidaSnap.exists()) {
                const datos = partidaSnap.data();
                
                if (datos.estado === 'jugando') {
                    // Si estaba jugando, lo teletransportamos a su pista exacta
                    window.location.href = `pista${datos.pista_actual}.html`;
                    return; 
                } else if (datos.estado === 'terminado') {
                    // Si ya había terminado, lo mandamos directo al Salón de la Fama
                    window.location.href = "ranking.html";
                    return;
                }
            } else {
                // Si la partida fue borrada de la base de datos, limpiamos la memoria y apagamos la carga
                localStorage.removeItem('motmot_partida_id');
                avisoCarga.style.display = 'none';
            }
        } catch (error) {
            console.error("Error recuperando memoria:", error);
            localStorage.removeItem('motmot_partida_id');
            avisoCarga.style.display = 'none';
        }
    }
    // ========================================================

    // LOGICA ORIGINAL DE INICIO NUEVO (Si no tenía partida guardada)
    if (btnIniciar) {
        btnIniciar.addEventListener('click', async () => {
            
            const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
            const equipoStr = document.getElementById('input-equipo').value.trim();
            const modoStr = document.getElementById('select-modo').value;

            if (!ticketStr || !equipoStr) {
                alert("Por favor, ingresa tu código de acceso y un nombre de equipo.");
                return;
            }

            avisoCarga.style.display = 'flex';
            avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">VALIDANDO CREDENCIALES...</p>';

            try {
                const ticketRef = doc(db, 'tickets', ticketStr);
                const ticketSnap = await getDoc(ticketRef);

                if (!ticketSnap.exists() || ticketSnap.data().estado !== 'activo') {
                    alert("⚠️ Código de acceso inválido o caducado.");
                    avisoCarga.style.display = 'none';
                    return;
                }

                const userCredential = await signInAnonymously(auth);
                const user = userCredential.user;

                let idSala = "";
                if (modoStr === 'batalla') {
                    idSala = prompt("Has elegido Modo Batalla ⚔️\nIngresa el código de sala compartido con tus contrincantes (Ej: FLIA-PEREZ):") || "SALA-GENERAL";
                }

                const nuevaPartidaRef = doc(collection(db, "partidas")); 
                
                await setDoc(nuevaPartidaRef, {
                    uid_jugador: user.uid,
                    ticket_usado: ticketStr,
                    equipo: equipoStr,
                    modo: modoStr,
                    id_sala: idSala.toUpperCase(),
                    pista_actual: 1,
                    tiempo_total: 0,
                    estado: "jugando",
                    t_inicio: serverTimestamp() 
                });

                // Guardar la "Memoria" en el celular del turista
                localStorage.setItem('motmot_partida_id', nuevaPartidaRef.id);
                localStorage.setItem('motmot_equipo', equipoStr);
                
                window.location.href = "pista1.html"; 

            } catch (error) {
                console.error("Error crítico en el motor:", error);
                alert("Error de conexión. Revisa tu internet e intenta de nuevo.");
                avisoCarga.style.display = 'none';
            }
        });
    }
});