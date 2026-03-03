// Importamos las herramientas desde tu archivo de configuración
import { db, auth, signInAnonymously, collection, doc, getDoc, setDoc, serverTimestamp } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const btnIniciar = document.getElementById('btn-iniciar');
    const avisoCarga = document.getElementById('aviso-carga'); 

    // ====== 1. RECUPERACIÓN AUTOMÁTICA (Si el turista NO ha borrado el caché) ======
    const partidaGuardadaId = localStorage.getItem('motmot_partida_id');
    
    if (partidaGuardadaId) {
        avisoCarga.style.display = 'flex';
        avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">RECUPERANDO MISIÓN...</p>';
        
        try {
            const partidaRef = doc(db, 'partidas', partidaGuardadaId);
            const partidaSnap = await getDoc(partidaRef);
            
            if (partidaSnap.exists()) {
                const datos = partidaSnap.data();
                if (datos.estado === 'jugando') {
                    window.location.href = `pista${datos.pista_actual}.html`;
                    return; 
                } else if (datos.estado === 'terminado') {
                    window.location.href = "ranking.html";
                    return;
                }
            } else {
                localStorage.removeItem('motmot_partida_id');
                avisoCarga.style.display = 'none';
            }
        } catch (error) {
            console.error("Error recuperando memoria:", error);
            localStorage.removeItem('motmot_partida_id');
            avisoCarga.style.display = 'none';
        }
    }

    // ====== 2. INICIO MANUAL / RECUPERACIÓN DESDE LA NUBE (Si borró el caché) ======
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
            avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">CONECTANDO CON LA NUBE...</p>';

            try {
                // A. Validar que el ticket general exista
                const ticketRef = doc(db, 'tickets', ticketStr);
                const ticketSnap = await getDoc(ticketRef);

                if (!ticketSnap.exists() || ticketSnap.data().estado !== 'activo') {
                    alert("⚠️ Código de acceso inválido o caducado.");
                    avisoCarga.style.display = 'none';
                    return;
                }

                // B. ¡LA MAGIA EN LA NUBE! Buscamos si ya existe una partida atada a este ticket
                const partidaRef = doc(db, 'partidas', ticketStr); // Usamos el ticket como ID
                const partidaSnap = await getDoc(partidaRef);

                if (partidaSnap.exists()) {
                    // ¡El jugador ya había empezado! Lo recuperamos desde Firebase
                    const datosNube = partidaSnap.data();
                    
                    // Restauramos la memoria en su celular para que no tenga que volver a loguearse
                    localStorage.setItem('motmot_partida_id', ticketStr);
                    localStorage.setItem('motmot_equipo', datosNube.equipo);

                    if (datosNube.estado === 'jugando') {
                        alert(`¡Bienvenido de vuelta, equipo ${datosNube.equipo}! Retomando desde la pista ${datosNube.pista_actual}...`);
                        window.location.href = `pista${datosNube.pista_actual}.html`;
                    } else {
                        window.location.href = "ranking.html";
                    }
                    return; // Cortamos el código aquí. Ya no crea una partida nueva.
                }

                // C. Si no existía la partida, es un JUGADOR NUEVO. Creamos todo desde cero.
                const userCredential = await signInAnonymously(auth);
                const user = userCredential.user;

                let idSala = "";
                if (modoStr === 'batalla') {
                    idSala = prompt("Has elegido Modo Batalla ⚔️\nIngresa el código de sala compartido con tus contrincantes (Ej: FLIA-PEREZ):") || "SALA-GENERAL";
                }

                // Guardamos la nueva partida obligando a Firebase a que el ID sea el código del ticket
                await setDoc(partidaRef, {
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

                // Memoria local
                localStorage.setItem('motmot_partida_id', ticketStr);
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