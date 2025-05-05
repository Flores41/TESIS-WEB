// Función para cargar el navbar en todas las páginas
document.addEventListener('DOMContentLoaded', function () {
    // Buscar el elemento donde se insertará el navbar
    const navbarContainer = document.querySelector('.navbar-container');

    if (navbarContainer) {
        // Cargar el navbar desde el archivo components/navbar.html
        fetch('/components/navbar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar el navbar');
                }
                return response.text();
            })
            .then(html => {
                // Insertar el HTML del navbar
                navbarContainer.innerHTML = html;

                // Cargar el script de menú después de insertar el navbar
                const script = document.createElement('script');
                script.type = 'module';
                script.src = '/js/menu.js';
                document.body.appendChild(script);

                // Verificar si el usuario está autenticado y mostrar su nombre
                import('./firebase-config.js').then(module => {
                    const { auth } = module;
                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js").then(authModule => {
                        const { onAuthStateChanged } = authModule;

                        onAuthStateChanged(auth, (user) => {
                            const accountIcon = document.querySelector('.account-icon');
                            if (user) {
                                // Usuario autenticado
                                accountIcon.innerHTML = `
                                    <div class="user-profile">
                                        <img src="${user.photoURL || 'img/default-avatar.png'}" alt="${user.displayName || 'Usuario'}" class="user-avatar">
                                        <span class="user-name">${user.displayName || 'Usuario'}</span>
                                    </div>
                                `;

                                // Agregar evento para cerrar sesión
                                accountIcon.addEventListener('click', async (e) => {
                                    e.preventDefault();
                                    const { signOutUser } = await import('./firebase-config.js');
                                    await signOutUser();
                                });
                            } else {
                                // Usuario no autenticado
                                accountIcon.innerHTML = '👤';
                                accountIcon.href = 'login.html';
                            }
                        });
                    });
                });
            })
            .catch(error => {
                console.error('Error al cargar el navbar:', error);
            });
    }
}); 