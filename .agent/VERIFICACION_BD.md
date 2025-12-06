# ✅ Checklist de Configuración - fair_play_casino

## 📋 **Paso 1: Verificar archivo .env**

Abre tu archivo `.env` y asegúrate de que tenga:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fair_play_casino
DB_PORT=3306
BASE_PORT=3000
JWT_SECRET=tu_secreto_super_seguro
```

**IMPORTANTE:** La línea clave es:
```env
DB_NAME=fair_play_casino
```

---

## 📊 **Paso 2: Verificar Estructura de Tablas**

### **Tabla: players**
```sql
DESCRIBE players;
```

**Campos requeridos:**
- ✅ `id_player` INT UNSIGNED PRIMARY KEY
- ✅ `name` VARCHAR(100) NOT NULL
- ✅ `username` VARCHAR(50) NOT NULL UNIQUE
- ✅ `email` VARCHAR(150) NOT NULL UNIQUE
- ✅ `password_hash` VARCHAR(255) NOT NULL
- ✅ `phone` VARCHAR(20) NULL
- ✅ `country` VARCHAR(2) NULL
- ✅ `status` ENUM('ACTIVE','SUSPENDED','BANNED','PENDING_VERIFICATION')
- ✅ `email_verified` TINYINT(1)
- ✅ `kyc_verified` TINYINT(1)
- ✅ `created_at` TIMESTAMP
- ✅ `updated_at` TIMESTAMP
- ✅ `deleted_at` TIMESTAMP

---

### **Tabla: wallet**
```sql
DESCRIBE wallet;
```

**Campos requeridos:**
- ✅ `id_wallet` INT UNSIGNED PRIMARY KEY
- ✅ `id_player` INT UNSIGNED UNIQUE
- ✅ `chips` DECIMAL(15,2) DEFAULT 0.00
- ✅ `bonus_chips` DECIMAL(15,2) DEFAULT 0.00
- ✅ `total_deposited` DECIMAL(15,2) DEFAULT 0.00
- ✅ `total_withdrawn` DECIMAL(15,2) DEFAULT 0.00
- ✅ `total_wagered` DECIMAL(15,2) DEFAULT 0.00
- ✅ `total_won` DECIMAL(15,2) DEFAULT 0.00
- ✅ `created_at` TIMESTAMP
- ✅ `updated_at` TIMESTAMP

**Foreign Key:**
```sql
FOREIGN KEY (id_player) REFERENCES players(id_player)
```

---

### **Tabla: games**
```sql
DESCRIBE games;
```

**Campos requeridos:**
- ✅ `id_game` INT UNSIGNED PRIMARY KEY
- ✅ `name` VARCHAR(100) NOT NULL
- ✅ `slug` VARCHAR(100) NOT NULL UNIQUE
- ✅ `type` ENUM('SLOT','ROULETTE','BLACKJACK','POKER','BACCARAT','OTHER')
- ✅ `min_bet` DECIMAL(10,2)
- ✅ `max_bet` DECIMAL(10,2)
- ✅ `rtp` DECIMAL(5,2)
- ✅ `status` ENUM('ACTIVE','INACTIVE','MAINTENANCE')
- ✅ `created_at` TIMESTAMP

**Datos de ejemplo:**
```sql
SELECT * FROM games;
```
Debería mostrar:
- Black Diamond
- Lucky Sevens
- Mega Fortune

---

### **Tabla: game_spins**
```sql
DESCRIBE game_spins;
```

**Campos requeridos:**
- ✅ `id_spin` BIGINT UNSIGNED PRIMARY KEY
- ✅ `player_id` INT UNSIGNED
- ✅ `game_id` INT UNSIGNED
- ✅ `bet_amount` DECIMAL(10,2)
- ✅ `win_amount` DECIMAL(10,2)
- ✅ `rng_data` JSON
- ✅ `result_reels` JSON
- ✅ `win_type` ENUM('none','smallwin','win','superwin','bigwin','jackpot')
- ✅ `created_at` TIMESTAMP

**Foreign Keys:**
```sql
FOREIGN KEY (player_id) REFERENCES players(id_player)
FOREIGN KEY (game_id) REFERENCES games(id_game)
```

---

### **Tabla: transactions**
```sql
DESCRIBE transactions;
```

**Campos requeridos:**
- ✅ `id_transaction` BIGINT UNSIGNED PRIMARY KEY
- ✅ `player_id` INT UNSIGNED
- ✅ `transaction_type` ENUM('DEBIT','CREDIT','DEPOSIT','WITHDRAWAL','BONUS','REFUND','ADJUSTMENT')
- ✅ `amount` DECIMAL(15,2)
- ✅ `balance_before` DECIMAL(15,2)
- ✅ `balance_after` DECIMAL(15,2)
- ✅ `reference_type` ENUM('GAME_SPIN','GAME_WIN','DEPOSIT','WITHDRAWAL','BONUS','REFUND','ADJUSTMENT')
- ✅ `reference_id` BIGINT UNSIGNED
- ✅ `description` VARCHAR(255)
- ✅ `status` ENUM('PENDING','COMPLETED','FAILED','REVERSED')
- ✅ `created_at` TIMESTAMP

**Foreign Key:**
```sql
FOREIGN KEY (player_id) REFERENCES players(id_player)
```

---

## 🔍 **Paso 3: Verificar Código**

### **Archivos que usan la BD:**

#### **1. `src/controller/player.crud.controller.js`**
```javascript
// ✅ Usa: players, wallet
INSERT INTO players (name, username, email, password_hash, phone, country, status, email_verified)
INSERT INTO wallet (id_player, chips)
```

#### **2. `src/controller/login.controller.js`**
```javascript
// ✅ Usa: players
SELECT id_player, user, email, password FROM players WHERE email = ?
```

**⚠️ PROBLEMA DETECTADO:** El login usa `user` pero debería usar `username`

#### **3. `src/controller/game.controller.js`**
```javascript
// ✅ Usa: wallet, game_spins, transactions
SELECT chips FROM wallet WHERE id_player = ?
INSERT INTO game_spins (player_id, bet_amount, win_amount, rng_data, result_reels, game_id)
INSERT INTO transactions (player_id, transaction_type, amount, balance_before, balance_after, ...)
UPDATE wallet SET chips = chips - ? WHERE id_player = ?
```

#### **4. `src/app.js`**
```javascript
// ✅ Usa: wallet
SELECT chips FROM wallet WHERE id_player = ?
```

---

## 🔧 **Correcciones Necesarias**

### **Archivo: `src/controller/login.controller.js`**

**Línea 48 - CAMBIAR:**
```javascript
// ANTES (INCORRECTO)
const [rows] = await pool.query(
    "SELECT id_player, user, email, password FROM players WHERE email = ? AND status != 'banned'",
    [email]
);

// DESPUÉS (CORRECTO)
const [rows] = await pool.query(
    "SELECT id_player, username, email, password_hash FROM players WHERE email = ? AND status != 'BANNED'",
    [email]
);
```

**Línea 59 - CAMBIAR:**
```javascript
// ANTES (INCORRECTO)
const esCorrecta = await bcrypt.compare(password, player.password);

// DESPUÉS (CORRECTO)
const esCorrecta = await bcrypt.compare(password, player.password_hash);
```

**Línea 68 - CAMBIAR:**
```javascript
// ANTES (INCORRECTO)
const token = jwt.sign({
    id: player.id_player,
    user: player.user
}, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// DESPUÉS (CORRECTO)
const token = jwt.sign({
    id: player.id_player,
    user: player.username
}, JWT_SECRET, { expiresIn: JWT_EXPIRES });
```

---

## 📝 **Comandos de Verificación SQL**

Ejecuta estos comandos en tu cliente MySQL para verificar:

```sql
-- 1. Verificar que la BD existe
SHOW DATABASES LIKE 'fair_play_casino';

-- 2. Usar la BD
USE fair_play_casino;

-- 3. Ver todas las tablas
SHOW TABLES;

-- 4. Verificar estructura de players
DESCRIBE players;

-- 5. Verificar estructura de wallet
DESCRIBE wallet;

-- 6. Verificar estructura de game_spins
DESCRIBE game_spins;

-- 7. Verificar estructura de transactions
DESCRIBE transactions;

-- 8. Ver juegos disponibles
SELECT id_game, name, slug, type, status FROM games;

-- 9. Ver jugadores (si hay)
SELECT id_player, name, username, email, status FROM players;

-- 10. Verificar foreign keys
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    REFERENCED_TABLE_SCHEMA = 'fair_play_casino'
    AND REFERENCED_TABLE_NAME IS NOT NULL;
```

---

## ✅ **Checklist Final**

- [ ] Archivo `.env` tiene `DB_NAME=fair_play_casino`
- [ ] Base de datos `fair_play_casino` existe
- [ ] Tabla `players` tiene estructura correcta
- [ ] Tabla `wallet` tiene estructura correcta
- [ ] Tabla `games` tiene estructura correcta
- [ ] Tabla `game_spins` tiene estructura correcta
- [ ] Tabla `transactions` tiene estructura correcta
- [ ] Hay 3 juegos en la tabla `games`
- [ ] Código de login usa `username` y `password_hash`
- [ ] Código de registro usa campos correctos
- [ ] Servidor reiniciado después de cambios

---

## 🚀 **Pasos para Activar**

1. **Verificar .env:**
   ```bash
   cat .env | grep DB_NAME
   ```
   Debe mostrar: `DB_NAME=fair_play_casino`

2. **Reiniciar servidor:**
   ```bash
   npm run start
   ```

3. **Probar registro:**
   ```
   http://localhost:3000/register
   ```

4. **Probar login:**
   ```
   http://localhost:3000/api/player/form_login
   ```

5. **Probar juego:**
   ```
   http://localhost:3000/game/black-diamond
   ```

---

## 📞 **¿Necesitas Más Información?**

Si encuentras algún error, por favor comparte:

1. **Estructura de la tabla con problema:**
   ```sql
   DESCRIBE nombre_tabla;
   ```

2. **Error exacto del servidor:**
   ```
   Copia el error completo de la consola
   ```

3. **Consulta que falla:**
   ```
   El mensaje de error SQL
   ```

---

**¡El sistema está casi listo! Solo necesita las correcciones en el login.** 🚀
