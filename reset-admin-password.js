import bcrypt from 'bcryptjs';

// Nueva contraseña que quieres usar
const newPassword = 'admin123';
const hash = bcrypt.hashSync(newPassword, 10);

console.log('🔐 Nueva contraseña para admin:');
console.log('Password:', newPassword);
console.log('Hash:', hash);
console.log('\n📝 SQL para actualizar la contraseña del admin:');
console.log(`
UPDATE admins 
SET password_hash = '${hash}' 
WHERE username = 'admin';
`);

console.log('\n✅ Copia y ejecuta el SQL anterior en tu base de datos MySQL');
console.log('💡 O puedes cambiar "admin123" por la contraseña que prefieras en este archivo');
