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
    let modoReingreso = false; // Bandera para saber si estamos buscando una partida vieja

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

    // ====== 2. REINGRESO MANUAL (El "Doble Candado") ======
    if (btnContinuar) {
        btnContinuar.addEventListener('click', async () => {
            const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
            if (!ticketStr) { alert("Ingresa tu código para continuar."); return; }

            // PASO A: Validar que el ticket existe antes de buscar al guerrero
            if (!modoReingreso) {
                avisoCarga.style.display = 'flex';
                avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">VERIFICANDO LLAVE...</p>';
                
                try {
                    const ticketRef = doc(db, 'tickets', ticketStr);
                    const ticketSnap = await getDoc(ticketRef);

                    if (!ticketSnap.exists() || ticketSnap.data().estado !== 'activo') {
                        alert("⚠️ Código inválido o caducado.");
                        avisoCarga.style.display = 'none'; return;
                    }

                    // A diferencia del registro nuevo, aquí no validamos cupos llenos
                    // porque el usuario ya está adentro, solo intenta volver.
                    ticketDataNube = ticketSnap.data();
                    ticketString = ticketStr;
                    modoReingreso = true;

                    // INTERFAZ: Preparamos la pantalla para buscar al guerrero
                    document.getElementById('caja-nombres').style.display = 'block';
                    document.getElementById('input-ticket').disabled = true;
                    if(document.getElementById('input-equipo')) document.getElementById('input-equipo').style.display = 'none'; // No se pide equipo al volver
                    
                    document.getElementById('mensaje-modo').innerText = "🔍 MODO REINGRESO: Identifícate";
                    document.getElementById('mensaje-modo').style.color = "#888"; // Color gris para diferenciar
                    
                    btnContinuar.innerText = "ENTRAR A MI PARTIDA";
                    btnContinuar.style.background = "#ff6600";
                    btnContinuar.style.color = "#000";
                    btnIniciar.style.display = 'none'; // Escondemos el botón de Nueva Misión para no confundir

                    avisoCarga.style.display = 'none';
                } catch (error) {
                    alert("Error conectando con la base de datos.");
                    avisoCarga.style.display = 'none';
                }
                return; // Pausamos aquí hasta que escriba su nombre y vuelva a dar clic
            }

            // PASO B: Buscar la combinación exacta (Ticket + Guerrero) en la nube
            const guerreroStr = document.getElementById('input-guerrero').value.trim();
            if (!guerreroStr) { alert("Ingresa tu Nombre de Guerrero para buscar tu partida."); return; }

            avisoCarga.style.display = 'flex';
            avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">BUSCANDO GUERRERO...</p>';

            try {
                let partidaEncontrada = null;
                let idPartidaNube = "";

                if (ticketDataNube.modo_asignado === 'cooperativo') {
                    // Buscar en el array de guerreros del equipo
                    const qCoop = query(collection(db, "partidas"), where("ticket_usado", "==", ticketString), where("modo", "==", "cooperativo"));
                    const snapCoop = await getDocs(qCoop);

                    if (!snapCoop.empty) {
                        const docData = snapCoop.docs[0].data();
                        if (docData.guerreros && docData.guerreros.includes(guerreroStr)) {
                            partidaEncontrada = docData;
                            idPartidaNube = snapCoop.docs[0].id;
                        }
                    }
                } else {
                    // Solitario y Batalla: Buscar coincidencia directa
                    const qUnico = query(collection(db, "partidas"), where("ticket_usado", "==", ticketString), where("equipo", "==", guerreroStr));
                    const snapUnico = await getDocs(qUnico);

                    if (!snapUnico.empty) {
                        partidaEncontrada = snapUnico.docs[0].data();
                        idPartidaNube = snapUnico.docs[0].id;
                    }
                }

                if (partidaEncontrada) {
                    // Le devolvemos su sesión al turista
                    localStorage.setItem('motmot_partida_id', idPartidaNube);
                    localStorage.setItem('motmot_equipo', partidaEncontrada.equipo);
                    
                    window.location.href = partidaEncontrada.estado === 'jugando' ? `pista${partidaEncontrada.pista_actual}.html` : "ranking.html";
                } else {
                    alert(`No encontramos a ningún guerrero llamado "${guerreroStr}" en esta llave. Verifica mayúsculas, minúsculas o si pusiste un espacio de más.`);
                    avisoCarga.style.display = 'none';
                }

            } catch (error) {
                console.error("Error al buscar partida:", error);
                alert("Error de conexión al buscar tu partida. Revisa tu internet.");
                avisoCarga.style.display = 'none';
            }
        });
    }

    // ====== 3. NUEVA PARTIDA (Registro Seguro) ======
    if (btnIniciar) {
        btnIniciar.addEventListener('click', async () => {
            const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
            if (!ticketStr) { alert("Ingresa tu código de acceso primero."); return; }

            // --- PASO A: VALIDAR TICKET Y CUPOS EN LA NUBE ---
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

                    if (usosActuales >= datosTicket.limite_usos) {
                        alert(`🚫 Cupos agotados. Esta llave era para ${datosTicket.limite_usos} persona(s) y ya está llena.`);
                        avisoCarga.style.display = 'none'; return;
                    }

                    ticketDataNube = datosTicket;
                    ticketString = ticketStr;

                    // INTERFAZ
                    document.getElementById('caja-nombres').style.display = 'block';
                    document.getElementById('input-ticket').disabled = true; 
                    
                    let mensaje = "";
                    if(datosTicket.modo_asignado === 'solitario') mensaje = "🐺 MODO SOLITARIO DETECTADO";
                    if(datosTicket.modo_asignado === 'batalla') mensaje = `⚔️ MODO BATALLA DETECTADO (${datosTicket.limite_usos - usosActuales} cupos libres)`;
                    if(datosTicket.modo_asignado === 'cooperativo') {
                        mensaje = "🤝 MODO COOPERATIVO DETECTADO";
                        if(usosActuales === 0) document.getElementById('input-equipo').style.display = 'block';
                    }
                    
                    document.getElementById('mensaje-modo').innerText = mensaje;
                    btnIniciar.innerText = "COMENZAR MISIÓN";
                    btnContinuar.style.display = 'none'; // Escondemos "Continuar" para evitar confusiones
                    avisoCarga.style.display = 'none';

                } catch (error) {
                    alert("Error conectando con la base de datos.");
                    avisoCarga.style.display = 'none';
                }
                return;
            }

            // --- PASO B: VALIDAR IDENTIDAD Y CREAR PARTIDA ---
            const guerreroStr = document.getElementById('input-guerrero').value.trim();
            const equipoStr = document.getElementById('input-equipo') ? document.getElementById('input-equipo').value.trim() : "";
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

                if (modoAsignado === 'cooperativo') {
                    const qCoop = query(collection(db, "partidas"), where("ticket_usado", "==", ticketString), where("modo", "==", "cooperativo"));
                    const snapCoop = await getDocs(qCoop);

                    if (!snapCoop.empty) {
                        const docExistente = snapCoop.docs[0];
                        const datosEquipo = docExistente.data();

                        if (datosEquipo.guerreros && datosEquipo.guerreros.includes(guerreroStr)) {
                            alert(`⚠️ Ya hay alguien llamado "${guerreroStr}" en tu equipo. ¡Elige otro nombre!`);
                            avisoCarga.style.display = 'none'; return;
                        }

                        idDocumentoFinal = docExistente.id;
                        nombreEquipoFinal = datosEquipo.equipo;
                        await updateDoc(doc(db, "partidas", idDocumentoFinal), {
                            guerreros: arrayUnion(guerreroStr)
                        });
                    } else {
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
                else {
                    const qUnico = query(collection(db, "partidas"), where("ticket_usado", "==", ticketString), where("equipo", "==", guerreroStr));
                    const snapUnico = await getDocs(qUnico);

                    if (!snapUnico.empty) {
                        alert(`⚠️ El nombre "${guerreroStr}" ya está en uso. ¡Elige uno diferente!`);
                        avisoCarga.style.display = 'none'; return;
                    }

                    const nuevaPartidaRef = doc(collection(db, "partidas"));
                    idDocumentoFinal = nuevaPartidaRef.id;
                    nombreEquipoFinal = guerreroStr; 
                    let salaAsignada = (modoAsignado === 'batalla') ? ticketString : "SOLITARIO";

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

                await updateDoc(doc(db, 'tickets', ticketString), {
                    usos_actuales: ticketDataNube.usos_actuales + 1
                });

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