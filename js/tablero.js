// js/tablero.js

// 1. Inyectamos el HTML del botón y la ventana flotante directo en el Body
const htmlTablero = `
    <div id="btn-abrir-tablero" class="btn-flotante">🗺️</div>

    <div id="ventana-tablero" class="modal-tablero">
        <div class="contenido-tablero">
            <h2 style="color:#ff6600; text-align:center; margin-top:0;">MI RUTA</h2>
            <div id="lista-misiones">
                </div>
            <button id="btn-cerrar-tablero" class="btn-motmot" style="margin-top:20px; background:#333; border:none;">VOLVER A LA MISIÓN</button>
        </div>
    </div>
`;

document.body.insertAdjacentHTML('beforeend', htmlTablero);

// 2. Nombres de las misiones (Puedes ajustarlos luego)
const nombresPistas = [
    "El Origen (La Fuente)", "Los Saberes", "La Capilla", "El Cementerio", 
    "El Taller", "La Calle Real", "El Parque", "La Casa Cultura", 
    "El Camino Real", "El Refugio Final"
];

// 3. Lógica para abrir y cerrar
const btnAbrir = document.getElementById('btn-abrir-tablero');
const btnCerrar = document.getElementById('btn-cerrar-tablero');
const ventana = document.getElementById('ventana-tablero');
const contenedorLista = document.getElementById('lista-misiones');

// Extraemos el número de la pista actual desde la URL (ej: pista4.html -> 4)
const urlActual = window.location.href;
let numeroPistaActual = 1;
const match = urlActual.match(/pista(\d+)\.html/);
if (match) numeroPistaActual = parseInt(match[1]);

// Función para pintar la lista
function actualizarTablero() {
    let htmlLista = "";
    
    for (let i = 0; i < 10; i++) {
        let numero = i + 1;
        let claseStr = "pista-item";
        let icono = "🔒"; // Bloqueada por defecto
        
        if (numero < numeroPistaActual) {
            claseStr += " completada";
            icono = "✅";
        } else if (numero === numeroPistaActual) {
            claseStr += " actual";
            icono = "📍";
        }
        
        htmlLista += `<div class="${claseStr}">${icono} Pista ${numero}: ${nombresPistas[i]}</div>`;
    }
    
    contenedorLista.innerHTML = htmlLista;
}

btnAbrir.addEventListener('click', () => {
    actualizarTablero();
    ventana.style.display = 'flex';
});

btnCerrar.addEventListener('click', () => {
    ventana.style.display = 'none';
});