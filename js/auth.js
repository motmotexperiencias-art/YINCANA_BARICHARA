// Importamos las herramientas desde tu archivo de configuración
import { db, auth, signInAnonymously, collection, doc, getDoc, setDoc, query, where, getDocs, serverTimestamp, updateDoc, arrayUnion } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnContinuar = document.getElementById('btn-continuar');
    const avisoCarga = document.getElementById('aviso-carga'); 

    // ====== 1. RECUPERACIÓN AUTOMÁTICA ======
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
            console.error("Error:", error);
            localStorage.removeItem('motmot_partida_id');
            avisoCarga.style.display = 'none';
        }
    }

    // ====== 2. FUNCIÓN MAESTRA DE INGRESO ======
    async function procesarIngreso(esContinuacion) {
        const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
        const modoStr = document.getElementById('select-modo').value;
        const guerreroStr = document.getElementById('input-guerrero').value.trim();
        const equipoStr = document.getElementById('input-equipo').value.trim();
        const batallaStr = document.getElementById('input-batalla').value.trim().toUpperCase();

        if (!ticketStr) { alert("Ingresa tu código de acceso."); return; }

        // Si es nueva partida, exigimos los datos según el modo
        if (!esContinuacion) {
            if (!modoStr) { alert("Selecciona un modo de juego."); return; }
            if (!guerreroStr) { alert("Ingresa tu Nombre de Guerrero."); return; }
            if (modoStr === 'cooperativo' && !equipoStr) { alert("Ingresa el Nombre del Equipo."); return; }
            if (modoStr === 'batalla' && !batallaStr) { alert("Ingresa el Nombre de la Batalla (Sala)."); return; }
        }

        avisoCarga.style.display = 'flex';
        avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">CONECTANDO...</p>';

        try {
            // A. Validar Ticket
            const ticketRef = doc(db, 'tickets', ticketStr);
            const ticketSnap = await getDoc(ticketRef);

            if (!ticketSnap.exists() || ticketSnap.data().estado !== 'activo') {
                alert("⚠️ Código inválido o caducado.");
                avisoCarga.style.display = 'none';
                return;
            }

            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;

            // B. LÓGICA DE CONTINUAR PARTIDA (Recuperación manual)
            if (esContinuacion) {
                // Buscamos si este celular ya tenía una partida
                const qCont = query(collection(db, "partidas"), where("ticket_usado", "==", ticketStr), where("uid_jugador", "==", user.uid));
                const snapCont = await getDocs(qCont);

                if (!snapCont.empty) {
                    const datosNube = snapCont.docs[0].data();
                    localStorage.setItem('motmot_partida_id', snapCont.docs[0].id);
                    localStorage.setItem('motmot_equipo', datosNube.equipo);
                    window.location.href = datosNube.estado === 'jugando' ? `pista${datosNube.pista_actual}.html` : "ranking.html";
                    return;
                } else {
                    alert("No encontramos una partida activa para este dispositivo con este código.");
                    avisoCarga.style.display = 'none';
                    return;
                }
            }

            // C. LÓGICA DE CREACIÓN / UNIÓN (NUEVA PARTIDA)
            let idDocumentoFinal = "";
            let nombreEquipoFinal = "";

            if (modoStr === 'cooperativo') {
                // En cooperativo, buscamos si el equipo ya existe para UNIRNOS al mismo documento
                const qCoop = query(collection(db, "partidas"), where("ticket_usado", "==", ticketStr), where("equipo", "==", equipoStr), where("modo", "==", "cooperativo"));
                const snapCoop = await getDocs(qCoop);

                if (!snapCoop.empty) {
                    // ¡El equipo existe! Nos unimos al documento agregando el nombre del guerrero
                    const docExistente = snapCoop.docs[0];
                    idDocumentoFinal = docExistente.id;
                    nombreEquipoFinal = docExistente.data().equipo;
                    
                    await updateDoc(doc(db, "partidas", idDocumentoFinal), {
                        guerreros: arrayUnion(guerreroStr) // Añade el guerrero a la lista del equipo
                    });
                } else {
                    // El equipo no existe, creamos el documento único del grupo
                    const nuevaPartidaRef = doc(collection(db, "partidas"));
                    idDocumentoFinal = nuevaPartidaRef.id;
                    nombreEquipoFinal = equipoStr;

                    await setDoc(nuevaPartidaRef, {
                        uid_jugador: user.uid, // El líder
                        ticket_usado: ticketStr,
                        equipo: nombreEquipoFinal,
                        modo: modoStr,
                        id_sala: "COOPERATIVO",
                        guerreros: [guerreroStr], // Lista de integrantes
                        pista_actual: 1,
                        tiempo_total: 0,
                        estado: "jugando",
                        t_inicio: serverTimestamp() 
                    });
                }
            } else {
                // Modos SOLITARIO y BATALLA (Crean documentos individuales para evitar la Guerra de Clones)
                const nuevaPartidaRef = doc(collection(db, "partidas"));
                idDocumentoFinal = nuevaPartidaRef.id;
                
                nombreEquipoFinal = guerreroStr; 
                let salaAsignada = (modoStr === 'batalla') ? batallaStr : "SOLITARIO";

                await setDoc(nuevaPartidaRef, {
                    uid_jugador: user.uid,
                    ticket_usado: ticketStr,
                    equipo: nombreEquipoFinal, 
                    modo: modoStr,
                    id_sala: salaAsignada,
                    pista_actual: 1,
                    tiempo_total: 0,
                    estado: "jugando",
                    t_inicio: serverTimestamp() 
                });
            }

            // Guardamos el ID en memoria y avanzamos a la Pista 1
            localStorage.setItem('motmot_partida_id', idDocumentoFinal);
            localStorage.setItem('motmot_equipo', nombreEquipoFinal);
            
            window.location.href = "pista1.html"; 

        } catch (error) {
            console.error("Error crítico:", error);
            alert("Error de conexión. Revisa tu internet e intenta de nuevo.");
            avisoCarga.style.display = 'none';
        }
    }

    if (btnIniciar) btnIniciar.addEventListener('click', () => procesarIngreso(false));
    if (btnContinuar) btnContinuar.addEventListener('click', () => procesarIngreso(true));
});