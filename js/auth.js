// Importamos las herramientas desde tu archivo de configuración
import { db, auth, signInAnonymously, collection, doc, getDoc, setDoc, query, where, getDocs, serverTimestamp, updateDoc, arrayUnion } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnContinuar = document.getElementById('btn-continuar');
    const avisoCarga = document.getElementById('aviso-carga'); 

    // Ocultamos elementos que ya no son manuales (La nube manda)
    const selectModo = document.getElementById('select-modo');
    const inputBatalla = document.getElementById('input-batalla');
    if(selectModo) selectModo.style.display = 'none';
    if(inputBatalla) inputBatalla.style.display = 'none';

    // Variables globales para la memoria del paso a paso
    let ticketDataNube = null;
    let ticketString = "";

    // ====== 1. RECUPERACIÓN AUTOMÁTICA (Memoria Caché) ======
    const partidaGuardadaId = localStorage.getItem('motmot_partida_id');
    
    if (partidaGuardadaId) {
        avisoCarga.style.display = 'flex';
        avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">RECUPERANDO MISIÓN...</p>';
        try {
            const partidaRef = doc(db, 'partidas', partidaGuardadaId);
            const partidaSnap = await getDoc(partidaRef);
            if (partidaSnap.exists()) {
                const datos = partidaSnap.data();
                window.location.href = datos.estado === 'jugando' ? `pista${datos.pista_actual}.html` : "ranking.html";
                return;
            } else {
                localStorage.removeItem('motmot_partida_id');
                avisoCarga.style.display = 'none';
            }
        } catch (error) {
            localStorage.removeItem('motmot_partida_id');
            avisoCarga.style.display = 'none';
        }
    }

    // ====== 2. REINGRESO MANUAL (Botón "Continuar") ======
    if (btnContinuar) {
        btnContinuar.addEventListener('click', async () => {
            const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
            if (!ticketStr) { alert("Ingresa tu código para continuar."); return; }

            avisoCarga.style.display = 'flex';
            avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">BUSCANDO TU PARTIDA...</p>';

            try {
                const userCredential = await signInAnonymously(auth);
                const user = userCredential.user;

                // Buscamos si este celular (UID) ya estaba jugando con ese ticket
                const qCont = query(collection(db, "partidas"), where("ticket_usado", "==", ticketStr), where("uid_jugador", "==", user.uid));
                const snapCont = await getDocs(qCont);

                if (!snapCont.empty) {
                    const datosNube = snapCont.docs[0].data();
                    localStorage.setItem('motmot_partida_id', snapCont.docs[0].id);
                    localStorage.setItem('motmot_equipo', datosNube.equipo);
                    window.location.href = datosNube.estado === 'jugando' ? `pista${datosNube.pista_actual}.html` : "ranking.html";
                } else {
                    alert("No encontramos una partida activa para este dispositivo con este código. Verifica el ticket.");
                    avisoCarga.style.display = 'none';
                }
            } catch (error) {
                alert("Error de conexión. Revisa tu internet.");
                avisoCarga.style.display = 'none';
            }
        });
    }

    // ====== 3. NUEVA PARTIDA (El Portero Inteligente en 2 Pasos) ======
    if (btnIniciar) {
        btnIniciar.addEventListener('click', async () => {
            const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
            if (!ticketStr) { alert("Ingresa tu código de acceso primero."); return; }

            // PASO A: VALIDAR TICKET Y CUPOS (Solo si no lo hemos validado aún)
            if (!ticketDataNube) {
                avisoCarga.style.display = 'flex';
                avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">VALIDANDO LLAVE...</p>';

                try {
                    const ticketRef = doc(db, 'tickets', ticketStr);
                    const ticketSnap = await getDoc(ticketRef);

                    if (!ticketSnap.exists() || ticketSnap.data().estado !== 'activo') {
                        alert("⚠️ Código inválido o caducado.");
                        avisoCarga.style.display = 'none'; return;
                    }

                    const datosTicket = ticketSnap.data();
                    const usosActuales = datosTicket.usos_actuales || 0;

                    // CONTROL DE CUPOS: El portero cierra la puerta
                    if (usosActuales >= datosTicket.limite_usos) {
                        alert(`🚫 Cupos agotados. Esta llave era para ${datosTicket.limite_usos} persona(s) y ya está llena.`);
                        avisoCarga.style.display = 'none'; return;
                    }

                    // Ticket válido y con cupos -> Pasamos a pedir identidad
                    ticketDataNube = datosTicket;
                    ticketString = ticketStr;

                    // Mostramos la caja para pedir el nombre de Guerrero
                    document.getElementById('caja-nombres').style.display = 'block';
                    document.getElementById('input-ticket').disabled = true; // Bloqueamos el input del ticket
                    
                    // Si es cooperativo y es el primero en entrar (usos = 0), le pedimos nombre de equipo
                    if (datosTicket.modo_asignado === 'cooperativo' && usosActuales === 0) {
                        document.getElementById('input-equipo').style.display = 'block';
                    }

                    btnIniciar.innerText = "UNIRSE A LA MISIÓN";
                    avisoCarga.style.display = 'none';

                } catch (error) {
                    alert("Error conectando con la base de datos.");
                    avisoCarga.style.display = 'none';
                }
                return; // Pausamos aquí hasta que el usuario escriba su nombre
            }

            // PASO B: VALIDAR IDENTIDAD Y CREAR PARTIDA
            const guerreroStr = document.getElementById('input-guerrero').value.trim();
            const equipoStr = document.getElementById('input-equipo').value.trim();
            const modoAsignado = ticketDataNube.modo_asignado;

            if (!guerreroStr) { alert("Por favor ingresa tu Nombre de Guerrero."); return; }
            if (modoAsignado === 'cooperativo' && ticketDataNube.usos_actuales === 0 && !equipoStr) { 
                alert("Eres el líder. Por favor inventa un Nombre para tu Equipo."); return; 
            }

            avisoCarga.style.display = 'flex';
            avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">REGISTRANDO GUERRERO...</p>';

            try {
                const userCredential = await signInAnonymously(auth);
                const user = userCredential.user;
                let idDocumentoFinal = "";
                let nombreEquipoFinal = "";

                // --- 1. LÓGICA COOPERATIVA ---
                if (modoAsignado === 'cooperativo') {
                    // Buscamos si el equipo matriz ya existe
                    const qCoop = query(collection(db, "partidas"), where("ticket_usado", "==", ticketString), where("modo", "==", "cooperativo"));
                    const snapCoop = await getDocs(qCoop);

                    if (!snapCoop.empty) {
                        const docExistente = snapCoop.docs[0];
                        const datosEquipo = docExistente.data();

                        // VALIDACIÓN IDENTIDAD: Revisamos si el nombre ya existe en este equipo
                        if (datosEquipo.guerreros && datosEquipo.guerreros.includes(guerreroStr)) {
                            alert(`⚠️ Ya hay alguien llamado "${guerreroStr}" en tu equipo. ¡Elige otro nombre!`);
                            avisoCarga.style.display = 'none'; return;
                        }

                        // Todo bien, lo unimos
                        idDocumentoFinal = docExistente.id;
                        nombreEquipoFinal = datosEquipo.equipo;
                        await updateDoc(doc(db, "partidas", idDocumentoFinal), {
                            guerreros: arrayUnion(guerreroStr)
                        });
                    } else {
                        // Es el primer jugador, creamos el equipo matriz
                        const nuevaPartidaRef = doc(collection(db, "partidas"));
                        idDocumentoFinal = nuevaPartidaRef.id;
                        nombreEquipoFinal = equipoStr;

                        await setDoc(nuevaPartidaRef, {
                            uid_jugador: user.uid,
                            ticket_usado: ticketString,
                            equipo: nombreEquipoFinal,
                            modo: modoAsignado,
                            id_sala: "COOPERATIVO",
                            guerreros: [guerreroStr],
                            pista_actual: 1,
                            tiempo_total: 0,
                            estado: "jugando",
                            t_inicio: serverTimestamp() 
                        });
                    }
                } 
                // --- 2. LÓGICA SOLITARIO Y BATALLA ---
                else {
                    // VALIDACIÓN IDENTIDAD: Revisamos si alguien en esta batalla/solitario ya usó ese nombre
                    const qUnico = query(collection(db, "partidas"), where("ticket_usado", "==", ticketString), where("equipo", "==", guerreroStr));
                    const snapUnico = await getDocs(qUnico);

                    if (!snapUnico.empty) {
                        alert(`⚠️ El nombre "${guerreroStr}" ya está en uso en esta partida. ¡Elige uno diferente!`);
                        avisoCarga.style.display = 'none'; return;
                    }

                    // Nombre único, creamos su documento individual
                    const nuevaPartidaRef = doc(collection(db, "partidas"));
                    idDocumentoFinal = nuevaPartidaRef.id;
                    nombreEquipoFinal = guerreroStr; // En batalla, tu nombre es tu equipo
                    let salaAsignada = (modoAsignado === 'batalla') ? ticketString : "SOLITARIO"; // La sala es el ticket

                    await setDoc(nuevaPartidaRef, {
                        uid_jugador: user.uid,
                        ticket_usado: ticketString,
                        equipo: nombreEquipoFinal,
                        modo: modoAsignado,
                        id_sala: salaAsignada,
                        pista_actual: 1,
                        tiempo_total: 0,
                        estado: "jugando",
                        t_inicio: serverTimestamp() 
                    });
                }

                // ACTUALIZAMOS CUPOS DEL TICKET (+1 uso)
                await updateDoc(doc(db, 'tickets', ticketString), {
                    usos_actuales: ticketDataNube.usos_actuales + 1
                });

                // Guardamos en memoria y empezamos
                localStorage.setItem('motmot_partida_id', idDocumentoFinal);
                localStorage.setItem('motmot_equipo', nombreEquipoFinal);
                window.location.href = "pista1.html"; 

            } catch (error) {
                console.error("Error al registrar:", error);
                alert("Error de conexión durante el registro.");
                avisoCarga.style.display = 'none';
            }
        });
    }
});