// Script para el modal recordatorio IA antes del cuestionario
export function setupIaModal() {
    const cuestionarioBtn = document.getElementById('cuestionario-navbar-btn');
    const iaModal = document.getElementById('ia-modal');
    const closeIaModal = document.getElementById('close-ia-modal');
    const continuarCuestionario = document.getElementById('continuar-cuestionario');

    if (cuestionarioBtn && iaModal && closeIaModal && continuarCuestionario) {
        cuestionarioBtn.addEventListener('click', function (e) {
            e.preventDefault();
            iaModal.style.display = 'flex';
        });
        closeIaModal.addEventListener('click', function () {
            iaModal.style.display = 'none';
        });
        continuarCuestionario.addEventListener('click', function () {
            iaModal.style.display = 'none';
        });
    }
}

// Si se usa como script global (sin import), autoejecutar
if (typeof window !== 'undefined') {
    window.setupIaModal = setupIaModal;
} 