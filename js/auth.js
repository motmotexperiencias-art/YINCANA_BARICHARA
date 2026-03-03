// Importamos las herramientas desde tu archivo de configuración
import { db, auth, signInAnonymously, collection, doc, getDoc, setDoc, query, where, getDocs, serverTimestamp } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Referencias a las cajas de pasos
    const paso1Ticket = document.getElementById('paso-1-ticket');
    const paso2Lobby = document.getElementById('paso-2-lobby');
    const paso3Crear = document.getElementById('paso-3-crear');
    
    // Referencias a los botones e inputs
    const btnBuscarTicket = document.getElementById('btn-buscar-ticket');
    const btnMostrarCrear = document.getElementById('btn-mostrar-crear');
    const btnVolverTicket = document.getElementById('btn-volver-ticket');
    const btnVolverLobby = document.getElementById('btn-volver-lobby');
    const btnIniciarNuevo = document.getElementById('btn-iniciar-nuevo');
    const listaEquiposLobby = document.getElementById('lista-equipos-lobby');
    const avisoCarga = document.getElementById('aviso-carga'); 

    // Variable global para guardar el ticket válido
    let ticketValidado = "";

    // ====== 1. RECUPERACIÓN AUTOMÁTICA (Mantenido de tu versión original) ======
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

    // ====== 2. LÓGICA DE NAVEGACIÓN ENTRE PASOS ======

    // A. Buscar el Ticket y Cargar el Lobby
    btnBuscarTicket.addEventListener('click', async () => {
        const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
        if (!ticketStr) { alert("Ingresa tu código de acceso."); return; }

        avisoCarga.style.display = 'flex';
        avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">BUSCANDO MISIÓN...</p>';

        try {
            // 1. Validar ticket
            const ticketRef = doc(db, 'tickets', ticketStr);
            const ticketSnap = await getDoc(ticketRef);

            if (!ticketSnap.exists() || ticketSnap.data().estado !== 'activo') {
                alert("⚠️ Código de acceso inválido o caducado.");
                avisoCarga.style.display = 'none';
                return;
            }

            ticketValidado = ticketStr;

            // 2. Buscar qué equipos están jugando ahora mismo con ese ticket
            const q = query(collection(db, "partidas"), where("ticket_usado", "==", ticketStr));
            const querySnapshot = await getDocs(q);

            listaEquiposLobby.innerHTML = ""; // Limpiamos la lista

            if (querySnapshot.empty) {
                listaEquiposLobby.innerHTML = "<p style='font-size:12px; color:#888; text-align:center;'>No hay equipos jugando. ¡Sé el primero!</p>";
            } else {
                // Generamos un botón por cada equipo encontrado
                querySnapshot.forEach((docSnap) => {
                    const datos = docSnap.data();
                    const btnEquipo = document.createElement('button');
                    btnEquipo.className = 'btn-opcion-azul'; // Reutilizamos tu clase de global.css
                    btnEquipo.innerHTML = `🏁 ${datos.equipo} <span style="font-size:10px; color:#aaa; float:right;">(${datos.modo})</span>`;
                    
                    // Al tocar el botón de un equipo, intentamos unirnos
                    btnEquipo.onclick = () => unirseAEquipoExistente(docSnap.id, datos);
                    listaEquiposLobby.appendChild(btnEquipo);
                });
            }

            // Cambiamos de pantalla visualmente
            paso1Ticket.style.display = 'none';
            paso2Lobby.style.display = 'block';
            avisoCarga.style.display = 'none';

        } catch (error) {
            console.error(error);
            alert("Error de conexión. Revisa tu internet.");
            avisoCarga.style.display = 'none';
        }
    });

    // B. Unirse a un Equipo Existente desde el Lobby
    async function unirseAEquipoExistente(idPartida, datosPartida) {
        avisoCarga.style.display = 'flex';
        avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">UNIÉNDOSE AL EQUIPO...</p>';

        try {
            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;

            // PROTECCIÓN MODO GUERRERO MANTENIDA
            if (datosPartida.modo === 'guerrero' && datosPartida.uid_jugador !== user.uid) {
                alert("⚔️ Esta partida está en Modo Guerrero (Privada). ¡Crea un nuevo equipo para jugar tu propia batalla!");
                avisoCarga.style.display = 'none';
                return;
            }

            localStorage.setItem('motmot_partida_id', idPartida);
            localStorage.setItem('motmot_equipo', datosPartida.equipo);

            if (datosPartida.estado === 'jugando') {
                window.location.href = `pista${datosPartida.pista_actual}.html`;
            } else {
                window.location.href = "ranking.html";
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al unirse.");
            avisoCarga.style.display = 'none';
        }
    }

    // C. Mostrar Formulario de Crear Equipo
    btnMostrarCrear.addEventListener('click', () => {
        paso2Lobby.style.display = 'none';
        paso3Crear.style.display = 'block';
    });

    // D. Crear una Partida Totalmente Nueva
    btnIniciarNuevo.addEventListener('click', async () => {
        const equipoStr = document.getElementById('input-equipo').value.trim();
        const modoStr = document.getElementById('select-modo').value;

        if (!equipoStr) { alert("Por favor ingresa un Nombre de Equipo."); return; }

        avisoCarga.style.display = 'flex';
        avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">CREANDO MISIÓN...</p>';

        try {
            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;

            let idSala = "";
            if (modoStr === 'batalla') {
                idSala = prompt("Has elegido Modo Batalla ⚔️\nIngresa el código de sala compartido con tus contrincantes:") || "SALA-GENERAL";
            }

            const nuevaPartidaRef = doc(collection(db, "partidas"));

            await setDoc(nuevaPartidaRef, {
                uid_jugador: user.uid,
                ticket_usado: ticketValidado,
                equipo: equipoStr,
                modo: modoStr,
                id_sala: idSala.toUpperCase(),
                pista_actual: 1,
                tiempo_total: 0,
                estado: "jugando",
                t_inicio: serverTimestamp() 
            });

            localStorage.setItem('motmot_partida_id', nuevaPartidaRef.id);
            localStorage.setItem('motmot_equipo', equipoStr);
            
            window.location.href = "pista1.html"; 

        } catch (error) {
            console.error(error);
            alert("Error creando la partida.");
            avisoCarga.style.display = 'none';
        }
    });

    // E. Botones de Volver (Navegación)
    btnVolverTicket.addEventListener('click', () => {
        paso2Lobby.style.display = 'none';
        paso1Ticket.style.display = 'block';
    });

    btnVolverLobby.addEventListener('click', () => {
        paso3Crear.style.display = 'none';
        paso2Lobby.style.display = 'block';
    });
});