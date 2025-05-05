import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics, logEvent, setUserProperties } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, doc, setDoc, serverTimestamp, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inicializar Analytics
const analytics = getAnalytics();
const db = getFirestore();

// Variables para seguimiento de tiempo de sesión
let sessionStartTime = null;
let sessionTimer = null;

/**
 * Verifica si el usuario está autenticado
 * Si no está autenticado, redirige a la página de login
 * @returns {Promise<boolean>} - True si el usuario está autenticado, false en caso contrario
 */
export async function requireAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Usuario autenticado
                resolve(true);

                // Iniciar seguimiento de tiempo de sesión
                startSessionTracking(user.uid);

                // Establecer propiedades de usuario en Analytics
                setUserProperties(analytics, {
                    user_id: user.uid,
                    user_email: user.email,
                    user_name: user.displayName || 'Usuario'
                });
            } else {
                // Usuario no autenticado, redirigir a login
                window.location.href = 'login.html';
                resolve(false);
            }
        });
    });
}

/**
 * Cierra la sesión del usuario
 */
export async function logout() {
    try {
        // Detener seguimiento de tiempo de sesión
        stopSessionTracking();

        // Registrar evento de cierre de sesión
        logEvent(analytics, 'logout');

        // Cerrar sesión en Firebase
        await signOut(auth);

        // Redirigir a la página de login
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

/**
 * Registra una acción del usuario en Google Analytics
 * @param {string} action - Nombre de la acción
 * @param {Object} params - Parámetros adicionales para la acción
 */
export function trackUserAction(action, params = {}) {
    // Agregar timestamp a los parámetros
    const eventParams = {
        ...params,
        timestamp: new Date().toISOString(),
        page: window.location.pathname
    };

    // Registrar evento en Analytics
    logEvent(analytics, action, eventParams);

    // Guardar evento en Firestore para análisis detallado
    saveEventToFirestore(action, eventParams);
}

/**
 * Registra una vista de página en Google Analytics
 * @param {string} pageName - Nombre de la página
 */
export function trackPageView(pageName) {
    // Registrar vista de página en Analytics
    logEvent(analytics, 'page_view', {
        page_name: pageName,
        page_path: window.location.pathname,
        page_title: document.title,
        device_type: detectDevice()
    });

    // Guardar vista de página en Firestore
    saveEventToFirestore('page_view', {
        page_name: pageName,
        page_path: window.location.pathname,
        page_title: document.title,
        device_type: detectDevice()
    });
}

/**
 * Guarda un evento en Firestore para análisis detallado
 * @param {string} eventType - Tipo de evento
 * @param {Object} eventData - Datos del evento
 */
async function saveEventToFirestore(eventType, eventData) {
    if (!auth.currentUser) return;
    try {
        const userId = auth.currentUser.uid;
        let collectionName = 'user_events';
        if (eventType === 'session_start' || eventType === 'session_end') {
            collectionName = 'session_events';
        }
        await addDoc(collection(db, collectionName), {
            userId,
            action: eventType,
            ...eventData,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error al guardar evento en Firestore:', error);
    }
}

/**
 * Inicia el seguimiento del tiempo de sesión
 * @param {string} userId - ID del usuario
 */
function startSessionTracking(userId) {
    // Detener cualquier temporizador existente
    stopSessionTracking();

    // Registrar inicio de sesión
    sessionStartTime = Date.now();

    // Crear un temporizador para registrar la duración de la sesión cada 5 minutos
    sessionTimer = setInterval(() => {
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);

        // Registrar duración de sesión
        logEvent(analytics, 'session_duration', {
            duration: sessionDuration
        });

        // Guardar duración de sesión en Firestore
        saveEventToFirestore('session_duration', {
            duration: sessionDuration
        });
    }, 5 * 60 * 1000); // 5 minutos

    // Registrar inicio de sesión
    logEvent(analytics, 'session_start', {
        timestamp: new Date().toISOString()
    });

    // Guardar inicio de sesión en Firestore
    saveEventToFirestore('session_start', {
        timestamp: new Date().toISOString()
    });
}

/**
 * Detiene el seguimiento del tiempo de sesión
 */
function stopSessionTracking() {
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }

    if (sessionStartTime) {
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);

        // Registrar fin de sesión
        logEvent(analytics, 'session_end', {
            duration: sessionDuration,
            timestamp: new Date().toISOString()
        });

        // Guardar fin de sesión en Firestore
        saveEventToFirestore('session_end', {
            duration: sessionDuration,
            timestamp: new Date().toISOString()
        });

        sessionStartTime = null;
    }
}

// Detectar cuando el usuario cierra la pestaña o navega a otra página
window.addEventListener('beforeunload', () => {
    stopSessionTracking();
});

// Detectar cuando el usuario cambia de pestaña
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Usuario cambió a otra pestaña
        logEvent(analytics, 'tab_switch', {
            timestamp: new Date().toISOString()
        });
    } else {
        // Usuario volvió a la pestaña
        logEvent(analytics, 'tab_return', {
            timestamp: new Date().toISOString()
        });
    }
});

// Función para detectar el dispositivo
function detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
        return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
        return 'tablet';
    }
    return 'desktop';
} 