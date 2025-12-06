# 🗄️ Fair Play Casino - Database Schema Documentation

## 📋 Descripción General

Schema completo y profesional para un sistema de casino online con:
- ✅ Transacciones ACID
- ✅ Auditoría completa
- ✅ Seguridad y validaciones
- ✅ Performance optimizado
- ✅ Escalabilidad

---

## 📊 Estructura de Tablas

### **Tablas Principales (10)**

| Tabla | Descripción | Registros Típicos |
|-------|-------------|-------------------|
| `players` | Jugadores registrados | Miles |
| `wallet` | Billeteras de jugadores | 1 por jugador |
| `games` | Catálogo de juegos | Decenas |
| `game_spins` | Registro de jugadas | Millones |
| `transactions` | Transacciones financieras | Millones |
| `deposits` | Depósitos de dinero | Miles |
| `withdrawals` | Retiros de dinero | Miles |
| `bonuses` | Bonos y promociones | Decenas |
| `player_bonuses` | Bonos asignados | Miles |
| `sessions` | Sesiones activas | Cientos |
| `audit_logs` | Registro de auditoría | Millones |

---

## 🔑 Relaciones Entre Tablas

```
players (1) ──── (1) wallet
   │
   ├──── (N) game_spins
   │
   ├──── (N) transactions
   │
   ├──── (N) deposits
   │
   ├──── (N) withdrawals
   │
   ├──── (N) player_bonuses
   │
   └──── (N) sessions

games (1) ──── (N) game_spins

bonuses (1) ──── (N) player_bonuses
```

---

## 📝 Detalle de Tablas

### **1. players**

**Propósito:** Almacenar información de jugadores registrados

**Campos Principales:**
- `id_player` - ID único (PK)
- `name` - Nombre completo
- `email` - Email único
- `username` - Nombre de usuario único
- `password_hash` - Hash bcrypt de contraseña
- `status` - Estado de la cuenta (ACTIVE, SUSPENDED, BANNED)
- `email_verified` - Email verificado
- `kyc_verified` - KYC completado
- `daily_deposit_limit` - Límite diario de depósito
- `daily_bet_limit` - Límite diario de apuesta

**Índices:**
- Email (UNIQUE)
- Username (UNIQUE)
- Status
- Created_at

---

### **2. wallet**

**Propósito:** Billetera de cada jugador (1:1 con players)

**Campos Principales:**
- `id_wallet` - ID único (PK)
- `id_player` - FK a players (UNIQUE)
- `chips` - Saldo actual
- `bonus_chips` - Chips de bonificación
- `total_deposited` - Total depositado histórico
- `total_withdrawn` - Total retirado histórico
- `total_wagered` - Total apostado histórico
- `total_won` - Total ganado histórico
- `is_locked` - Wallet bloqueado

**Validaciones:**
- Un wallet por jugador
- Balance no puede ser negativo (trigger)
- Foreign key a players

---

### **3. games**

**Propósito:** Catálogo de juegos disponibles

**Campos Principales:**
- `id_game` - ID único (PK)
- `name` - Nombre del juego
- `slug` - URL-friendly name (UNIQUE)
- `type` - Tipo (SLOT, ROULETTE, BLACKJACK, etc.)
- `min_bet` - Apuesta mínima
- `max_bet` - Apuesta máxima
- `rtp` - Return to Player %
- `status` - Estado (ACTIVE, INACTIVE, MAINTENANCE)
- `is_featured` - Destacado en home

**Datos de Ejemplo:**
```sql
Black Diamond - SLOT - RTP: 90%
Lucky Sevens - SLOT - RTP: 92%
Mega Fortune - SLOT - RTP: 88.5%
```

---

### **4. game_spins**

**Propósito:** Registro de cada jugada/spin

**Campos Principales:**
- `id_spin` - ID único (PK)
- `player_id` - FK a players
- `game_id` - FK a games
- `bet_amount` - Monto apostado
- `win_amount` - Monto ganado
- `rng_data` - JSON con índices RNG
- `result_reels` - JSON con símbolos resultantes
- `win_type` - Tipo de victoria (none, smallwin, win, bigwin, jackpot)
- `session_id` - ID de sesión
- `ip_address` - IP del jugador

**Ejemplo de Registro:**
```json
{
  "id_spin": 12345,
  "player_id": 1,
  "game_id": 1,
  "bet_amount": 10.00,
  "win_amount": 50.00,
  "rng_data": "[42, 15, 58]",
  "result_reels": "[\"🍋\", \"🍒\", \"BAR\"]",
  "win_type": "win"
}
```

---

### **5. transactions**

**Propósito:** Registro de TODAS las transacciones financieras

**Campos Principales:**
- `id_transaction` - ID único (PK)
- `player_id` - FK a players
- `transaction_type` - Tipo (DEBIT, CREDIT, DEPOSIT, WITHDRAWAL, etc.)
- `amount` - Monto
- `balance_before` - Balance antes
- `balance_after` - Balance después
- `reference_type` - Tipo de referencia (GAME_SPIN, GAME_WIN, etc.)
- `reference_id` - ID de la operación relacionada
- `description` - Descripción legible
- `status` - Estado (PENDING, COMPLETED, FAILED, REVERSED)

**Tipos de Transacciones:**
- `DEBIT` - Débito (apuesta)
- `CREDIT` - Crédito (premio)
- `DEPOSIT` - Depósito de dinero
- `WITHDRAWAL` - Retiro de dinero
- `BONUS` - Bonificación
- `REFUND` - Reembolso
- `ADJUSTMENT` - Ajuste manual

**Trigger de Validación:**
- Monto > 0
- Balance_after correcto según tipo
- Balance_after no negativo

---

### **6. deposits**

**Propósito:** Depósitos de dinero real

**Campos Principales:**
- `id_deposit` - ID único (PK)
- `player_id` - FK a players
- `amount` - Monto
- `currency` - Moneda (USD, EUR, etc.)
- `payment_method` - Método (CREDIT_CARD, PAYPAL, CRYPTO, etc.)
- `payment_provider` - Proveedor (Stripe, PayPal, etc.)
- `external_transaction_id` - ID externo
- `status` - Estado (PENDING, COMPLETED, FAILED, etc.)

---

### **7. withdrawals**

**Propósito:** Retiros de dinero

**Campos Principales:**
- `id_withdrawal` - ID único (PK)
- `player_id` - FK a players
- `amount` - Monto solicitado
- `fee` - Comisión
- `net_amount` - Monto neto a recibir
- `payment_method` - Método de pago
- `status` - Estado (PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED)
- `approved_by` - ID del admin que aprobó
- `rejection_reason` - Razón de rechazo

**Flujo:**
1. PENDING - Solicitud creada
2. APPROVED - Aprobado por admin
3. PROCESSING - En proceso
4. COMPLETED - Completado

---

### **8. bonuses**

**Propósito:** Catálogo de bonos y promociones

**Campos Principales:**
- `id_bonus` - ID único (PK)
- `name` - Nombre del bono
- `code` - Código promocional (UNIQUE)
- `type` - Tipo (WELCOME, DEPOSIT, NO_DEPOSIT, etc.)
- `amount` - Monto fijo
- `percentage` - Porcentaje del depósito
- `wagering_requirement` - Requisito de apuesta (ej: 30x)
- `valid_from` - Válido desde
- `valid_until` - Válido hasta
- `max_uses` - Usos máximos totales
- `status` - Estado (ACTIVE, INACTIVE, EXPIRED)

**Ejemplo:**
```sql
Bono de Bienvenida: 100% hasta $500
Código: WELCOME100
Requisito: 30x
```

---

### **9. player_bonuses**

**Propósito:** Bonos asignados a jugadores

**Campos Principales:**
- `id_player_bonus` - ID único (PK)
- `player_id` - FK a players
- `bonus_id` - FK a bonuses
- `bonus_amount` - Monto otorgado
- `wagering_required` - Monto total a apostar
- `wagering_completed` - Monto apostado
- `status` - Estado (ACTIVE, COMPLETED, EXPIRED, etc.)

**Seguimiento:**
```
Bono: $100
Requisito: 30x = $3,000
Apostado: $1,500
Progreso: 50%
```

---

### **10. sessions**

**Propósito:** Sesiones activas de jugadores

**Campos Principales:**
- `id_session` - ID único (PK)
- `player_id` - FK a players
- `session_token` - Token único
- `ip_address` - IP del jugador
- `user_agent` - Navegador/dispositivo
- `is_active` - Sesión activa
- `expires_at` - Fecha de expiración

---

### **11. audit_logs**

**Propósito:** Registro de auditoría de acciones importantes

**Campos Principales:**
- `id_log` - ID único (PK)
- `player_id` - FK a players (opcional)
- `action` - Acción realizada (LOGIN, DEPOSIT, BET, WIN, etc.)
- `entity_type` - Tipo de entidad afectada
- `entity_id` - ID de la entidad
- `description` - Descripción
- `old_values` - JSON con valores anteriores
- `new_values` - JSON con valores nuevos
- `ip_address` - IP

**Acciones Registradas:**
- LOGIN, LOGOUT
- DEPOSIT, WITHDRAWAL
- BET, WIN
- BONUS_CLAIMED
- PROFILE_UPDATE
- PASSWORD_CHANGE

---

## 🔍 Vistas (Views)

### **v_player_balance_audit**

**Propósito:** Vista consolidada de balance y estadísticas de jugadores

**Campos:**
- Balance actual
- Total depositado/retirado
- Total apostado/ganado
- Número de jugadas
- Ganancia neta del casino

**Uso:**
```sql
SELECT * FROM v_player_balance_audit WHERE id_player = 1;
```

---

### **v_game_statistics**

**Propósito:** Estadísticas de cada juego

**Campos:**
- Total de jugadas
- Jugadores únicos
- Total apostado
- Total pagado
- Ganancia del casino
- RTP real vs teórico

**Uso:**
```sql
SELECT * FROM v_game_statistics WHERE game_type = 'SLOT';
```

---

## 🔧 Procedimientos Almacenados

### **sp_verify_balance_integrity**

**Propósito:** Verificar integridad del balance de un jugador

**Parámetros:**
- `p_player_id` - ID del jugador

**Retorna:**
- `wallet_balance` - Balance en wallet
- `calculated_balance` - Balance calculado desde transacciones
- `difference` - Diferencia
- `integrity_status` - OK o ERROR

**Uso:**
```sql
CALL sp_verify_balance_integrity(1);
```

---

## ⚡ Triggers

### **trg_validate_transaction_before_insert**

**Propósito:** Validar transacciones antes de insertar

**Validaciones:**
1. Monto > 0
2. Balance_after correcto para CREDIT
3. Balance_after correcto para DEBIT
4. Balance_after no negativo

**Efecto:**
- Si falla validación → SIGNAL ERROR
- Transacción se cancela (ROLLBACK)

---

## 📈 Índices para Performance

### **Índices Principales:**

```sql
-- Búsquedas por jugador
idx_player_id (player_id)

-- Búsquedas por fecha
idx_created_at (created_at)

-- Búsquedas combinadas
idx_player_created (player_id, created_at)
idx_player_type_created (player_id, transaction_type, created_at DESC)

-- Búsquedas por referencia
idx_reference (reference_type, reference_id)

-- Búsquedas por estado
idx_status (status)
```

---

## 🚀 Instalación

### **Paso 1: Crear Base de Datos**

```bash
mysql -u root -p < database_complete_schema.sql
```

### **Paso 2: Verificar Instalación**

```sql
USE fair_play_casino;
SHOW TABLES;
```

**Resultado esperado:**
```
+---------------------------+
| Tables_in_fair_play_casino|
+---------------------------+
| audit_logs                |
| bonuses                   |
| deposits                  |
| game_spins                |
| games                     |
| player_bonuses            |
| players                   |
| sessions                  |
| transactions              |
| wallet                    |
| withdrawals               |
+---------------------------+
```

---

## 📊 Consultas Útiles

### **Ver balance de un jugador:**
```sql
SELECT * FROM v_player_balance_audit WHERE id_player = 1;
```

### **Ver historial de transacciones:**
```sql
SELECT * FROM transactions 
WHERE player_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

### **Ver estadísticas de juegos:**
```sql
SELECT * FROM v_game_statistics 
ORDER BY total_wagered DESC;
```

### **Verificar integridad de balance:**
```sql
CALL sp_verify_balance_integrity(1);
```

### **Ver jugadas recientes:**
```sql
SELECT 
    gs.id_spin,
    p.name,
    g.name AS game_name,
    gs.bet_amount,
    gs.win_amount,
    gs.win_type,
    gs.created_at
FROM game_spins gs
JOIN players p ON gs.player_id = p.id_player
JOIN games g ON gs.game_id = g.id_game
ORDER BY gs.created_at DESC
LIMIT 20;
```

---

## 🔒 Seguridad

### **Implementado:**
- ✅ Foreign Keys con RESTRICT/CASCADE
- ✅ Triggers de validación
- ✅ Índices únicos (email, username)
- ✅ Soft delete (deleted_at)
- ✅ Auditoría completa
- ✅ Validación de balances
- ✅ Transacciones ACID

### **Recomendaciones:**
- 🔐 Usar SSL para conexiones
- 🔐 Limitar permisos de usuario MySQL
- 🔐 Backups diarios automáticos
- 🔐 Monitoreo de transacciones sospechosas
- 🔐 Rate limiting en aplicación

---

## 📦 Datos de Ejemplo

El script incluye datos de ejemplo:
- ✅ 3 juegos (Black Diamond, Lucky Sevens, Mega Fortune)
- ✅ 1 jugador de prueba (juan@example.com)
- ✅ 1 wallet con $1,000

---

## 🎯 Características Profesionales

### **✅ ACID Compliance**
- Transacciones atómicas
- Consistencia garantizada
- Aislamiento de transacciones
- Durabilidad de datos

### **✅ Auditoría Completa**
- Registro de todas las transacciones
- Balance antes/después
- Trazabilidad total
- Logs de auditoría

### **✅ Performance**
- Índices optimizados
- Vistas pre-calculadas
- Queries eficientes
- Escalable a millones de registros

### **✅ Seguridad**
- Validaciones en BD
- Triggers de protección
- Foreign keys
- Soft delete

---

## 📝 Mantenimiento

### **Backups Recomendados:**
```bash
# Backup diario
mysqldump -u root -p fair_play_casino > backup_$(date +%Y%m%d).sql

# Backup con compresión
mysqldump -u root -p fair_play_casino | gzip > backup_$(date +%Y%m%d).sql.gz
```

### **Limpieza de Sesiones Expiradas:**
```sql
DELETE FROM sessions 
WHERE expires_at < NOW() 
AND is_active = FALSE;
```

### **Análisis de Tablas:**
```sql
ANALYZE TABLE game_spins;
OPTIMIZE TABLE transactions;
```

---

## 🎰 Sistema Completo y Profesional

**El schema está listo para:**
- ✅ Producción
- ✅ Miles de jugadores concurrentes
- ✅ Millones de transacciones
- ✅ Auditoría regulatoria
- ✅ Escalabilidad futura

---

**Última actualización:** 2025-12-06  
**Versión:** 2.0.0  
**Autor:** Fair Play Casino Development Team
