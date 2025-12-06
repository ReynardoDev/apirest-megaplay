import bcrypt from 'bcryptjs';

const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nSQL para crear admin:');
console.log(`
INSERT INTO admins (username, email, password_hash, full_name, role)
VALUES (
  'admin',
  'admin@fairplay.com',
  '${hash}',
  'Administrador Principal',
  'super_admin'
);
`);
