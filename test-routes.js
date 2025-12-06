// Script de prueba para verificar las rutas
import app from './src/app.js';

console.log('\n=== RUTAS REGISTRADAS ===\n');

function printRoutes(stack, prefix = '') {
    stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            console.log(`${methods.padEnd(10)} ${prefix}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
            const path = layer.regexp.source
                .replace('\\/?', '')
                .replace('(?=\\/|$)', '')
                .replace(/\\\//g, '/')
                .replace(/\^/g, '')
                .replace(/\$/g, '');
            printRoutes(layer.handle.stack, prefix + path);
        }
    });
}

printRoutes(app._router.stack);

console.log('\n=== FIN DE RUTAS ===\n');
