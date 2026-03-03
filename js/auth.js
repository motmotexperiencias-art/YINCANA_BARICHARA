// Importamos las herramientas desde tu archivo de configuración
import { db, auth, signInAnonymously, collection, doc, getDoc, setDoc, query, where, getDocs, serverTimestamp } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnContinuar = document.getElementById('btn-continuar'); // NUEVO BOTÓN
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

    // ====== 2. FUNCIÓN MAESTRA DE INGRESO ======
    async function procesarIngreso(esContinuacion) {
        const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
        const equipoStr = document.getElementById('input-equipo').value.trim();
        const modoStr = document.getElementById('select-modo').value;

        // Siempre exigimos el código primero
        if (!ticketStr) {
            alert("Por favor, ingresa tu código de acceso.");
            return;
        }

        avisoCarga.style.display = 'flex';
        avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">CONECTANDO CON LA NUBE...</p>';

        try {
            // A. Validar que el ticket general exista y esté activo
            const ticketRef = doc(db, 'tickets', ticketStr);
            const ticketSnap = await getDoc(ticketRef);

            if (!ticketSnap.exists() || ticketSnap.data().estado !== 'activo') {
                alert("⚠️ Código de acceso inválido o caducado.");
                avisoCarga.style.display = 'none';
                return;
            }

            // Iniciamos sesión anónima obligatoriamente para saber QUIÉN es este celular (UID)
            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;

            // B. Buscamos si ya existe una partida atada a este ticket Y a este nombre de equipo
            // (Así evitamos la Guerra de Clones: Buscamos una partida específica, no solo el ticket general)
            const q = query(
                collection(db, "partidas"), 
                where("ticket_usado", "==", ticketStr),
                where("equipo", "==", equipoStr) 
            );
            const querySnapshot = await getDocs(q);

            let partidaExistente = null;
            let idPartidaExistente = null;

            if (!querySnapshot.empty) {
                 // Si encontró una partida con ese código y ese nombre de equipo, tomamos la primera
                partidaExistente = querySnapshot.docs[0].data();
                idPartidaExistente = querySnapshot.docs[0].id;
            }

            // Si encontró la partida, es un JUGADOR QUE REGRESA o UN COMPAÑERO DE EQUIPO
            if (partidaExistente) {
                
                // PROTECCIÓN MODO GUERRERO: Si la partida es modo guerrero, verificamos que el UID sea el creador original
                if (partidaExistente.modo === 'guerrero' && partidaExistente.uid_jugador !== user.uid) {
                    alert("⚔️ Esta partida está en Modo Guerrero y ya está siendo jugada por otro aventurero. No puedes unirte a ella.");
                    avisoCarga.style.display = 'none';
                    return;
                }

                // ¡EL JUGADOR REGRESA (o es un compañero de equipo)!
                localStorage.setItem('motmot_partida_id', idPartidaExistente);
                localStorage.setItem('motmot_equipo', partidaExistente.equipo);

                if (partidaExistente.estado === 'jugando') {
                    alert(`¡Bienvenido de vuelta, equipo ${partidaExistente.equipo}! Retomando desde la pista ${partidaExistente.pista_actual}...`);
                    window.location.href = `pista${partidaExistente.pista_actual}.html`;
                } else {
                    window.location.href = "ranking.html";
                }
                return; 
            }

            // C. SI LLEGA AQUÍ, LA PARTIDA NO EXISTE EN LA NUBE.
            if (esContinuacion) {
                alert("No encontramos ninguna partida guardada con este código y este nombre de equipo. Llena correctamente el nombre de tu equipo y toca 'INICIAR NUEVA PARTIDA'.");
                avisoCarga.style.display = 'none';
                return;
            }

            if (!equipoStr) {
                alert("¡Código válido! Al ser tu primera vez, por favor ingresa un Nombre de Equipo para comenzar.");
                avisoCarga.style.display = 'none';
                return;
            }

            // D. CREAMOS UNA PARTIDA TOTALMENTE NUEVA
            let idSala = "";
            if (modoStr === 'batalla') {
                idSala = prompt("Has elegido Modo Batalla ⚔️\nIngresa el código de sala compartido con tus contrincantes (Ej: FLIA-PEREZ):") || "SALA-GENERAL";
            }

            // Creamos una nueva referencia de documento con ID AUTO-GENERADO
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

            // Guardamos el ID AUTO-GENERADO en la memoria del celular
            localStorage.setItem('motmot_partida_id', nuevaPartidaRef.id);
            localStorage.setItem('motmot_equipo', equipoStr);
            
            window.location.href = "pista1.html"; 

        } catch (error) {
            console.error("Error crítico en el motor:", error);
            alert("Error de conexión. Revisa tu internet e intenta de nuevo.");
            avisoCarga.style.display = 'none';
        }
    }

    // Conectamos los botones a la función maestra
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => procesarIngreso(false));
    }
    if (btnContinuar) {
        btnContinuar.addEventListener('click', () => procesarIngreso(true));
    }
});