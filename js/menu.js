import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function cargarCategoriasMenu() {
    try {
        // Obtener categorías de hombre
        const querySnapshotHombre = await getDocs(collection(db, 'chombre'));
        const categoriasHombre = new Set();
        querySnapshotHombre.forEach((doc) => {
            const nombre = doc.data().name;
            if (nombre) {
                categoriasHombre.add(nombre);
            }
        });

        // Obtener categorías de mujer
        const querySnapshotMujer = await getDocs(collection(db, 'cmujer'));
        const categoriasMujer = new Set();
        querySnapshotMujer.forEach((doc) => {
            const nombre = doc.data().name;
            if (nombre) {
                categoriasMujer.add(nombre);
            }
        });

        // Actualizar menú de hombre
        const menuHombre = document.querySelector('#menu-hombre');
        if (menuHombre) {
            menuHombre.innerHTML = Array.from(categoriasHombre)
                .map(nombre => `
                    <div class="dropdown-item">
                        <a href="productos.html?genero=hombre&categoria=${nombre}">${nombre.charAt(0).toUpperCase() + nombre.slice(1)}</a>
                    </div>
                `).join('');
        }

        // Actualizar menú de mujer
        const menuMujer = document.querySelector('#menu-mujer');
        if (menuMujer) {
            menuMujer.innerHTML = Array.from(categoriasMujer)
                .map(nombre => `
                    <div class="dropdown-item">
                        <a href="productos.html?genero=mujer&categoria=${nombre}">${nombre.charAt(0).toUpperCase() + nombre.slice(1)}</a>
                    </div>
                `).join('');
        }

    } catch (error) {
        console.error("Error al cargar las categorías:", error);
    }
}

// Cargar categorías solo cuando se necesite
if (document.querySelector('.nav-links')) {
    cargarCategoriasMenu();
} 