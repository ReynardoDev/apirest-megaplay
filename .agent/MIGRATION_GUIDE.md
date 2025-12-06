# 🔄 Guía de Migración a fair_play_casino

## 📋 Cambios Necesarios

### **1. Actualizar archivo `.env`**

Edita tu archivo `.env` y cambia:

```env
# ANTES
DB_NAME=all_prod

# DESPUÉS
DB_NAME=fair_play_casino
```

**Archivo completo `.env` debería verse así:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fair_play_casino
DB_PORT=3306
BASE_PORT=3000
JWT_SECRET=tu_secreto_super_seguro
```

---

### **2. Mapeo de Tablas**

#### **Tablas Antiguas → Tablas Nuevas**

| Tabla Antigua | Tabla Nueva | Estado |
|---------------|-------------|--------|
| `players` | `players` | ✅ Mismo nombre |
| `wallet` | `wallet` | ✅ Mismo nombre |
| `game_spins` | `game_spins` | ✅ Mismo nombre |
| - | `games` | 🆕 Nueva tabla |
| - | `transactions` | 🆕 Nueva tabla |
| - | `deposits` | 🆕 Nueva tabla |
| - | `withdrawals` | 🆕 Nueva tabla |
| - | `bonuses` | 🆕 Nueva tabla |
| - | `player_bonuses` | 🆕 Nueva tabla |
| - | `sessions` | 🆕 Nueva tabla |
| - | `audit_logs` | 🆕 Nueva tabla |

---

### **3. Cambios en Campos**

#### **Tabla `players`:**

| Campo Antiguo | Campo Nuevo | Notas |
|---------------|-------------|-------|
| `id` | `id_player` | ⚠️ **Cambio importante** |
| Otros campos | Sin cambios | ✅ |

#### **Tabla `wallet`:**

| Campo Antiguo | Campo Nuevo | Notas |
|---------------|-------------|-------|
| `id_player` | `id_player` | ✅ Mismo |
| `chips` | `chips` | ✅ Mismo |
| - | `bonus_chips` | 🆕 Nuevo |
| - | `total_deposited` | 🆕 Nuevo |
| - | `total_withdrawn` | 🆕 Nuevo |
| - | `total_wagered` | 🆕 Nuevo |
| - | `total_won` | 🆕 Nuevo |

#### **Tabla `game_spins`:**

| Campo Antiguo | Campo Nuevo | Notas |
|---------------|-------------|-------|
| `id` | `id_spin` | ⚠️ **Cambio importante** |
| `player_id` | `player_id` | ✅ Mismo |
| `game_id` | `game_id` | ✅ Mismo |
| Otros campos | Sin cambios | ✅ |

---

### **4. Código que NO Necesita Cambios**

✅ **`game.controller.js`** - Ya usa los nombres correctos:
```javascript
"SELECT chips FROM wallet WHERE id_player = ?"
```

✅ **`app.js`** - Ya usa los nombres correctos:
```javascript
"SELECT chips FROM wallet WHERE id_player = ?"
```

✅ **`db.js`** - Solo usa variables de entorno

---

### **5. Migrar Datos (Si tienes datos existentes)**

Si tienes datos en la base de datos antigua `all_prod`, necesitas migrarlos:

#### **Opción A: Exportar/Importar Datos**

```sql
-- 1. Exportar datos de all_prod
USE all_prod;
SELECT * INTO OUTFILE '/tmp/players.csv' FROM players;
SELECT * INTO OUTFILE '/tmp/wallet.csv' FROM wallet;
SELECT * INTO OUTFILE '/tmp/game_spins.csv' FROM game_spins;

-- 2. Importar a fair_play_casino
USE fair_play_casino;
LOAD DATA INFILE '/tmp/players.csv' INTO TABLE players;
LOAD DATA INFILE '/tmp/wallet.csv' INTO TABLE wallet;
LOAD DATA INFILE '/tmp/game_spins.csv' INTO TABLE game_spins;
```

#### **Opción B: INSERT SELECT**

```sql
-- Migrar jugadores
INSERT INTO fair_play_casino.players 
SELECT * FROM all_prod.players;

-- Migrar wallets
INSERT INTO fair_play_casino.wallet 
SELECT * FROM all_prod.wallet;

-- Migrar game_spins
INSERT INTO fair_play_casino.game_spins 
SELECT * FROM all_prod.game_spins;
```

#### **Opción C: Empezar de Cero**

Si no tienes datos importantes, simplemente usa la nueva base de datos vacía.

---

### **6. Insertar Datos Iniciales**

La nueva base de datos ya incluye:

✅ **3 juegos de ejemplo:**
- Black Diamond (Slot)
- Lucky Sevens (Slot)
- Mega Fortune (Slot)

✅ **1 jugador de prueba:**
- Email: juan@example.com
- Username: juanperez
- Chips: 1000

**Para crear tu propio usuario:**

```sql
-- Insertar jugador
INSERT INTO players (name, email, username, password_hash, status, email_verified) 
VALUES ('Tu Nombre', 'tu@email.com', 'tuusername', '$2b$10$hash', 'ACTIVE', TRUE);

-- Obtener el ID del jugador (ejemplo: 2)
SELECT id_player FROM players WHERE email = 'tu@email.com';

-- Crear wallet
INSERT INTO wallet (id_player, chips) 
VALUES (2, 1000.00);
```

---

### **7. Verificar Conexión**

Después de cambiar el `.env`, reinicia el servidor:

```bash
# Detener servidor (Ctrl+C)
# Iniciar servidor
npm run start
```

**Verificar en consola:**
```
✅ Server running on port 3000
✅ Database: fair_play_casino
```

---

### **8. Probar el Sistema**

#### **Test 1: Login**
```
http://localhost:3000/api/player/form_login
```

#### **Test 2: Jugar**
```
http://localhost:3000/game/black-diamond
```

#### **Test 3: API Spin**
```javascript
fetch('/api/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        id_player: 1,
        bet_amount: 10,
        game_id: 1
    })
})
```

---

## ✅ Checklist de Migración

- [ ] Actualizar `.env` con `DB_NAME=fair_play_casino`
- [ ] Ejecutar `database_complete_schema.sql`
- [ ] (Opcional) Migrar datos de `all_prod`
- [ ] Reiniciar servidor Node.js
- [ ] Verificar conexión a BD
- [ ] Probar login
- [ ] Probar juego
- [ ] Verificar que el balance se actualiza

---

## 🔍 Troubleshooting

### **Error: "Table doesn't exist"**

**Solución:** Ejecuta el schema completo:
```bash
mysql -u root -p < .agent/database_complete_schema.sql
```

### **Error: "Database doesn't exist"**

**Solución:** El schema lo crea automáticamente, pero puedes crearlo manualmente:
```sql
CREATE DATABASE fair_play_casino CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### **Error: "Unknown column 'id_player'"**

**Solución:** Estás usando la base de datos antigua. Verifica el `.env`:
```env
DB_NAME=fair_play_casino  # ← Debe ser esto
```

### **Error: "Cannot connect to database"**

**Solución:** Verifica credenciales en `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=fair_play_casino
DB_PORT=3306
```

---

## 📊 Resumen de Cambios

| Componente | Acción | Estado |
|------------|--------|--------|
| `.env` | Actualizar DB_NAME | ⚠️ **Requerido** |
| `database_complete_schema.sql` | Ejecutar | ⚠️ **Requerido** |
| `game.controller.js` | Sin cambios | ✅ Listo |
| `app.js` | Sin cambios | ✅ Listo |
| `db.js` | Sin cambios | ✅ Listo |
| Datos antiguos | Migrar (opcional) | 📋 Opcional |

---

## 🎉 ¡Listo!

Una vez completados los pasos, tu sistema estará funcionando con:

✅ Nueva base de datos `fair_play_casino`  
✅ 11 tablas profesionales  
✅ Transacciones ACID  
✅ Sistema de auditoría  
✅ Código actualizado  

---

**Última actualización:** 2025-12-06  
**Versión:** 2.0.0  
**Autor:** Fair Play Casino Development Team
