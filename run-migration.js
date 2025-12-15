import { pool } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        console.log('📊 Ejecutando migración de tablas crypto...');

        // Leer archivo SQL
        const sqlFile = path.join(__dirname, 'migrations', 'create_crypto_tables.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Dividir en statements individuales (separados por ;)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

        // Ejecutar cada statement
        for (const statement of statements) {
            try {
                await pool.query(statement);
                console.log('✅ Statement ejecutado');
            } catch (error) {
                // Ignorar errores de "tabla ya existe"
                if (error.code === 'ER_TABLE_EXISTS_ERR' || error.message.includes('already exists')) {
                    console.log('⚠️  Tabla ya existe, continuando...');
                } else {
                    throw error;
                }
            }
        }

        console.log('✅ Migración completada exitosamente');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
}

runMigration();
