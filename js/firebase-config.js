// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, serverTimestamp, increment, arrayUnion, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics, logEvent, setUserProperties } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBMJ7L3qlFgYGUGIETCjtCAPPM6QnVXY0A",
    authDomain: "indexacion-72846.firebaseapp.com",
    projectId: "indexacion-72846",
    storageBucket: "indexacion-72846.firebasestorage.app",
    messagingSenderId: "794567851819",
    appId: "1:794567851819:web:f08ce8f6f7e6506b080f6e",
    measurementId: "G-LXYCMZT02W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

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

// Función para obtener información del navegador
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'unknown';

    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Opera')) browser = 'Opera';

    return browser;
}

// Función para iniciar seguimiento de sesión
let sessionStartTime = Date.now();
let sessionInterval;

function startSessionTracking() {
    sessionStartTime = Date.now();
    const eventParams = {
        device_type: detectDevice(),
        browser: getBrowserInfo(),
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
    };

    logEvent(analytics, 'session_start', eventParams);
    console.log('📊 Analytics - Session Start:', eventParams);

    // Registrar duración de sesión cada minuto
    sessionInterval = setInterval(() => {
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
        const durationParams = {
            duration: sessionDuration,
            page_title: document.title
        };

        logEvent(analytics, 'session_duration', durationParams);
        console.log('📊 Analytics - Session Duration:', durationParams);
    }, 60000);
}

// Función para detener seguimiento de sesión
function stopSessionTracking() {
    if (sessionInterval) {
        clearInterval(sessionInterval);
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
        logEvent(analytics, 'session_end', {
            duration: sessionDuration,
            page_title: document.title
        });
    }
}

// Función para registrar eventos de navegación
function trackPageView(pageName, additionalParams = {}) {
    const eventParams = {
        page_name: pageName,
        page_title: document.title,
        page_location: window.location.href,
        device_type: detectDevice(),
        browser: getBrowserInfo(),
        ...additionalParams
    };

    logEvent(analytics, 'page_view', eventParams);
    console.log('📊 Analytics - Page View:', eventParams);
}

// Función para registrar interacciones con productos
function trackProductInteraction(action, product) {
    const eventParams = {
        product_id: product.id,
        product_name: product.nombre,
        product_category: product.categoria,
        product_gender: product.genero,
        device_type: detectDevice(),
        timestamp: new Date().toISOString()
    };

    logEvent(analytics, action, eventParams);
    console.log('📊 Analytics - Product Interaction:', action, eventParams);
}

// Función para registrar eventos de usuario
function trackUserAction(action, params = {}) {
    if (auth.currentUser) {
        const eventParams = {
            user_id: auth.currentUser.uid,
            device_type: detectDevice(),
            timestamp: new Date().toISOString(),
            ...params
        };

        // Registrar en Analytics
        logEvent(analytics, action, eventParams);
        console.log('📊 Analytics - User Action:', action, eventParams);

        // Guardar en Firestore para análisis detallado
        const userEventsRef = collection(db, 'user_events');
        setDoc(doc(userEventsRef), {
            ...eventParams,
            action,
            timestamp: serverTimestamp()
        });
    }
}

// Función para guardar usuario en Firestore
async function saveUserToFirestore(user) {
    try {
        const userRef = doc(db, 'usuarios', user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: serverTimestamp(),
            deviceType: detectDevice(),
            browser: getBrowserInfo(),
            firstVisit: serverTimestamp()
        }, { merge: true });

        // Registrar evento de inicio de sesión
        logEvent(analytics, 'login', {
            method: 'google',
            device_type: detectDevice(),
            browser: getBrowserInfo()
        });

        console.log('Usuario guardado en Firestore');
    } catch (error) {
        console.error('Error al guardar usuario en Firestore:', error);
    }
}

// Función para iniciar sesión con Google
async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Guardar o actualizar información del usuario
        await saveUserToFirestore(user);

        // Iniciar seguimiento de sesión
        startSessionTracking();

        return user;
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        throw error;
    }
}

// Función para cerrar sesión
async function signOutUser() {
    try {
        // Detener seguimiento de sesión
        stopSessionTracking();

        await signOut(auth);
        logEvent(analytics, 'logout');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        throw error;
    }
}

// Función para verificar si un producto está en favoritos
async function verificarFavorito(productoId) {
    if (!auth.currentUser) return false;

    try {
        const favoritoRef = doc(db, 'favoritos', `${auth.currentUser.uid}_${productoId}`);
        const docSnap = await getDoc(favoritoRef);
        return docSnap.exists();
    } catch (error) {
        console.error('Error al verificar favorito:', error);
        return false;
    }
}

// Función para toggle favorito
async function toggleFavorito(productoId) {
    if (!auth.currentUser) {
        alert('Debes iniciar sesión para agregar productos a favoritos');
        return false;
    }

    const userId = auth.currentUser.uid;
    const favoritoRef = doc(db, 'favoritos', `${userId}_${productoId}`);

    try {
        const docSnap = await getDoc(favoritoRef);

        if (docSnap.exists()) {
            // Si ya existe en favoritos, lo eliminamos
            await deleteDoc(favoritoRef);

            // Registrar evento de eliminación de favorito
            logEvent(analytics, 'remove_favorite', {
                product_id: productoId
            });

            return false; // Ya no es favorito
        } else {
            // Si no existe, lo agregamos a favoritos
            await setDoc(favoritoRef, {
                userId: userId,
                productoId: productoId,
                fechaAgregado: serverTimestamp()
            });

            // Registrar evento de agregación de favorito
            logEvent(analytics, 'add_favorite', {
                product_id: productoId
            });

            return true; // Ahora es favorito
        }
    } catch (error) {
        console.error('Error al gestionar favorito:', error);
        throw error;
    }
}

// Observador del estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Establecer propiedades de usuario en Analytics
        setUserProperties(analytics, {
            user_id: user.uid,
            user_type: 'registered',
            device_type: detectDevice(),
            browser: getBrowserInfo()
        });

        // Iniciar seguimiento de sesión
        startSessionTracking();
    } else {
        // Detener seguimiento de sesión
        stopSessionTracking();
    }
});

// Agregar event listeners para seguimiento de comportamiento
window.addEventListener('beforeunload', () => {
    stopSessionTracking();
});

// Función para registrar vista de producto
async function trackProductView(productData) {
    if (!auth.currentUser) return;

    try {
        const { product_id, product_name, product_category } = productData;
        const timestamp = serverTimestamp();

        console.log('📊 Registrando vista de producto:', {
            product_id,
            product_name,
            product_category
        });

        // Actualizar estadísticas del producto
        const productStatsRef = doc(db, 'product_stats', product_id);
        await setDoc(productStatsRef, {
            id: product_id,
            name: product_name,
            category: product_category,
            views: increment(1),
            last_viewed: timestamp,
            last_viewed_by: auth.currentUser.uid
        }, { merge: true });

        // Actualizar estadísticas de la categoría
        const categoryStatsRef = doc(db, 'category_stats', product_category);
        await setDoc(categoryStatsRef, {
            name: product_category,
            views: increment(1),
            last_viewed: timestamp,
            products_viewed: arrayUnion(product_id)
        }, { merge: true });

        console.log('✅ Vista de producto registrada correctamente');

    } catch (error) {
        console.error('❌ Error al registrar vista de producto:', error);
    }
}

// Función para obtener estadísticas de productos
async function getProductStats() {
    try {
        console.log('🔍 Obteniendo estadísticas de productos...');
        const statsRef = collection(db, 'product_stats');
        const q = query(statsRef, orderBy('views', 'desc'), limit(10));
        const snapshot = await getDocs(q);

        const stats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('📊 Estadísticas de productos obtenidas:', stats);
        return stats;
    } catch (error) {
        console.error('❌ Error al obtener estadísticas de productos:', error);
        return [];
    }
}

// Función para obtener estadísticas de categorías
async function getCategoryStats() {
    try {
        console.log('🔍 Obteniendo estadísticas de categorías...');
        const statsRef = collection(db, 'category_stats');
        const q = query(statsRef, orderBy('views', 'desc'), limit(10));
        const snapshot = await getDocs(q);

        const stats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('📊 Estadísticas de categorías obtenidas:', stats);
        return stats;
    } catch (error) {
        console.error('❌ Error al obtener estadísticas de categorías:', error);
        return [];
    }
}

// Exportar las funciones
export {
    db,
    auth,
    analytics,
    signInWithGoogle,
    signOutUser,
    trackPageView,
    trackProductInteraction,
    trackUserAction,
    detectDevice,
    getBrowserInfo,
    verificarFavorito,
    toggleFavorito,
    trackProductView,
    getProductStats,
    getCategoryStats
};

// Hacer las funciones disponibles globalmente
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.toggleFavorito = toggleFavorito; 