// Variable global para el lector
let html5QrCode = null;

// Función para iniciar la cámara
export function iniciarEscaner(idContenedor, textoQrEsperado, callbackExito) {
    // Si ya hay un escáner corriendo, lo ignoramos
    if (html5QrCode && html5QrCode.isScanning) return;

    // Asegurarnos de que el contenedor sea visible y tenga estilo
    const contenedor = document.getElementById(idContenedor);
    contenedor.style.display = 'block';
    contenedor.style.background = '#000';
    contenedor.style.borderRadius = '10px';
    contenedor.style.overflow = 'hidden';

    // Instanciamos la librería
    // (Asegúrate de que la librería html5-qrcode esté en el HTML)
    html5QrCode = new Html5Qrcode(idContenedor);

    // Configuramos la cámara trasera (environment)
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
            // Cuando la cámara lee CUALQUIER código QR, entra aquí
            console.log("QR Leído: ", decodedText);

            // Verificamos si el texto del QR es exactamente el que pide la pista
            if(decodedText.toUpperCase() === textoQrEsperado.toUpperCase()) {
                // ¡Éxito! Detenemos la cámara
                html5QrCode.stop().then(() => {
                    contenedor.style.display = 'none';
                    callbackExito(); // Ejecutamos lo que sea que pase al ganar
                }).catch(err => console.error("Error deteniendo cámara", err));
            } else {
                // Leyó un QR, pero no es el de esta pista
                alert("Este código QR no pertenece a esta pista. ¡Sigue buscando!");
            }
        },
        (errorMessage) => {
            // Errores de lectura normales (pasa en cada frame que no ve un QR, lo ignoramos)
        }
    ).catch((err) => {
        console.error("Error encendiendo la cámara:", err);
        alert("No se pudo iniciar la cámara. Verifica los permisos de tu navegador.");
    });
}