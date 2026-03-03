// Importamos las herramientas desde tu archivo de configuración
import { db, auth, signInAnonymously, collection, doc, getDoc, setDoc, serverTimestamp } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnIniciar = document.getElementById('btn-iniciar');
    const avisoCarga = document.getElementById('aviso-carga'); 

    if (btnIniciar) {
        btnIniciar.addEventListener('click', async () => {
            
            // 1. Capturar los datos escritos por el turista
            const ticketStr = document.getElementById('input-ticket').value.trim().toUpperCase();
            const equipoStr = document.getElementById('input-equipo').value.trim();
            const modoStr = document.getElementById('select-modo').value;

            if (!ticketStr || !equipoStr) {
                alert("Por favor, ingresa tu código de acceso y un nombre de equipo.");
                return;
            }

            // 2. Mostrar pantalla de carga
            avisoCarga.style.display = 'flex';
            avisoCarga.innerHTML = '<div class="spinner"></div><p style="color:#ff6600; font-weight:bold;">VALIDANDO CREDENCIALES...</p>';

            try {
                // 3. Ir a Firebase y buscar el ticket
                const ticketRef = doc(db, 'tickets', ticketStr);
                const ticketSnap = await getDoc(ticketRef);

                // Si el ticket NO existe o no dice "activo"
                if (!ticketSnap.exists() || ticketSnap.data().estado !== 'activo') {
                    alert("⚠️ Código de acceso inválido o caducado.");
                    avisoCarga.style.display = 'none';
                    return;
                }

                // 4. Si el ticket es válido, loguear al usuario invisiblemente (Anonymous Auth)
                const userCredential = await signInAnonymously(auth);
                const user = userCredential.user;

                // Si eligió batalla, pedirle el nombre de la sala para agruparlos
                let idSala = "";
                if (modoStr === 'batalla') {
                    idSala = prompt("Has elegido Modo Batalla ⚔️\nIngresa el código de sala compartido con tus contrincantes (Ej: FLIA-PEREZ):") || "SALA-GENERAL";
                }

                // 5. Crear la Partida Oficial en Firebase
                const nuevaPartidaRef = doc(collection(db, "partidas")); // Crea un ID automático
                
                await setDoc(nuevaPartidaRef, {
                    uid_jugador: user.uid,
                    ticket_usado: ticketStr,
                    equipo: equipoStr,
                    modo: modoStr,
                    id_sala: idSala.toUpperCase(),
                    pista_actual: 1,
                    tiempo_total: 0,
                    estado: "jugando",
                    t_inicio: serverTimestamp() // ¡LA MAGIA! Registra la hora exacta desde el servidor de Google
                });

                // 6. Guardar la "Memoria" en el celular del turista
                localStorage.setItem('motmot_partida_id', nuevaPartidaRef.id);
                localStorage.setItem('motmot_equipo', equipoStr);

                alert("✅ ¡Acceso concedido! Prepárate para iniciar.");
                
                // Redirigir a la primera pista (Por ahora lo mandamos al molde)
                window.location.href = "molde-pista.html"; 

            } catch (error) {
                console.error("Error crítico en el motor:", error);
                alert("Error de conexión. Revisa tu internet e intenta de nuevo.");
                avisoCarga.style.display = 'none';
            }
        });
    }
});