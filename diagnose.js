console.log('🔍 Verificando configuración del servidor...\n');

// Verificar que las rutas existen
import gameRoutes from './src/routes/game.routes.js';

console.log('✅ game.routes.js importado correctamente');
console.log('📋 Stack de rutas:', gameRoutes.stack);

gameRoutes.stack.forEach((layer, index) => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        const path = layer.route.path;
        console.log(`   ${index + 1}. ${methods} ${path}`);
    }
});

console.log('\n✅ Diagnóstico completado');
