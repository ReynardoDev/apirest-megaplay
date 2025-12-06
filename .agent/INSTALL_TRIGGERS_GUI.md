# 🔧 Guía de Instalación - Triggers y Procedimientos

## ⚠️ Problema con DELIMITER en Clientes GUI

Los clientes GUI de MySQL/MariaDB (HeidiSQL, phpMyAdmin, MySQL Workbench) **NO soportan** el comando `DELIMITER $$`.

---

## ✅ Solución: Ejecutar Bloques por Separado

### 📁 **Archivo a Usar: `database_triggers_procedures_GUI.sql`**

---

## 📋 **Instrucciones Paso a Paso**

### **PASO 1: Eliminar Trigger Anterior (si existe)**

Selecciona y ejecuta **SOLO** este código:

```sql
DROP TRIGGER IF EXISTS `trg_validate_transaction_before_insert`;
```

✅ **Resultado esperado:** "Query OK, 0 rows affected"

---

### **PASO 2: Crear Trigger de Validación**

Selecciona y ejecuta **SOLO** este bloque completo:

```sql
CREATE TRIGGER `trg_validate_transaction_before_insert`
BEFORE INSERT ON `transactions`
FOR EACH ROW
BEGIN
    IF NEW.amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El monto de la transacción debe ser mayor a 0';
    END IF;
    
    IF NEW.transaction_type IN ('CREDIT', 'DEPOSIT', 'BONUS') THEN
        IF NEW.balance_after != NEW.balance_before + NEW.amount THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Balance_after incorrecto para transacción de crédito';
        END IF;
    END IF;
    
    IF NEW.transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN
        IF NEW.balance_after != NEW.balance_before - NEW.amount THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Balance_after incorrecto para transacción de débito';
        END IF;
    END IF;
    
    IF NEW.balance_after < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Balance no puede ser negativo';
    END IF;
END;
```

✅ **Resultado esperado:** "Query OK, 0 rows affected"

---

### **PASO 3: Eliminar Procedimiento Anterior (si existe)**

Selecciona y ejecuta **SOLO** este código:

```sql
DROP PROCEDURE IF EXISTS `sp_verify_balance_integrity`;
```

✅ **Resultado esperado:** "Query OK, 0 rows affected"

---

### **PASO 4: Crear Procedimiento de Verificación**

Selecciona y ejecuta **SOLO** este bloque completo:

```sql
CREATE PROCEDURE `sp_verify_balance_integrity`(IN p_player_id INT)
BEGIN
    DECLARE v_wallet_balance DECIMAL(15,2);
    DECLARE v_calculated_balance DECIMAL(15,2);
    DECLARE v_initial_balance DECIMAL(15,2);
    
    SELECT chips INTO v_wallet_balance
    FROM wallet
    WHERE id_player = p_player_id;
    
    SELECT balance_before INTO v_initial_balance
    FROM transactions
    WHERE player_id = p_player_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    SELECT 
        COALESCE(v_initial_balance, 0) +
        COALESCE(SUM(CASE 
            WHEN transaction_type IN ('CREDIT', 'DEPOSIT', 'BONUS') THEN amount
            WHEN transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN -amount
            ELSE 0
        END), 0)
    INTO v_calculated_balance
    FROM transactions
    WHERE player_id = p_player_id
    AND status = 'COMPLETED';
    
    SELECT 
        p_player_id AS player_id,
        v_wallet_balance AS wallet_balance,
        v_calculated_balance AS calculated_balance,
        ABS(v_wallet_balance - v_calculated_balance) AS difference,
        CASE 
            WHEN ABS(v_wallet_balance - v_calculated_balance) < 0.01 THEN 'OK'
            ELSE 'ERROR'
        END AS integrity_status;
END;
```

✅ **Resultado esperado:** "Query OK, 0 rows affected"

---

### **PASO 5: Verificar Instalación**

Ejecuta estos comandos para verificar:

```sql
-- Ver trigger creado
SHOW TRIGGERS WHERE `Table` = 'transactions';

-- Ver procedimiento creado
SHOW PROCEDURE STATUS WHERE Db = 'fair_play_casino';
```

✅ **Resultado esperado:**
- 1 trigger: `trg_validate_transaction_before_insert`
- 1 procedimiento: `sp_verify_balance_integrity`

---

## 🎯 **Resumen Visual**

```
1. DROP TRIGGER IF EXISTS...     ← Ejecutar solo
   ✅ OK

2. CREATE TRIGGER...              ← Ejecutar solo (bloque completo)
   BEGIN
     ...
   END;
   ✅ OK

3. DROP PROCEDURE IF EXISTS...    ← Ejecutar solo
   ✅ OK

4. CREATE PROCEDURE...            ← Ejecutar solo (bloque completo)
   BEGIN
     ...
   END;
   ✅ OK

5. SHOW TRIGGERS...               ← Verificar
   SHOW PROCEDURE STATUS...
   ✅ Listo!
```

---

## ⚠️ **Errores Comunes**

### **Error: "You have an error in your SQL syntax near '$$'"**

**Causa:** Estás intentando ejecutar código con `DELIMITER $$`

**Solución:** Usa el archivo `database_triggers_procedures_GUI.sql` y ejecuta cada bloque por separado

---

### **Error: "Trigger already exists"**

**Causa:** El trigger ya existe

**Solución:** Ejecuta primero el `DROP TRIGGER` del PASO 1

---

### **Error: "Table 'transactions' doesn't exist"**

**Causa:** No has ejecutado el schema principal

**Solución:** Ejecuta primero `database_complete_schema.sql`

---

## 📊 **Probar el Sistema**

### **Probar el Trigger:**

```sql
-- Esto debería FALLAR (monto negativo)
INSERT INTO transactions 
(player_id, transaction_type, amount, balance_before, balance_after, reference_type, description) 
VALUES 
(1, 'DEBIT', -10, 1000, 990, 'GAME_SPIN', 'Test');

-- Error esperado: "El monto de la transacción debe ser mayor a 0"
```

### **Probar el Procedimiento:**

```sql
-- Verificar integridad del jugador 1
CALL sp_verify_balance_integrity(1);

-- Resultado esperado:
-- player_id | wallet_balance | calculated_balance | difference | integrity_status
-- 1         | 1000.00        | 1000.00            | 0.00       | OK
```

---

## ✅ **Checklist Final**

- [ ] Ejecuté PASO 1 (DROP TRIGGER)
- [ ] Ejecuté PASO 2 (CREATE TRIGGER) - **Bloque completo**
- [ ] Ejecuté PASO 3 (DROP PROCEDURE)
- [ ] Ejecuté PASO 4 (CREATE PROCEDURE) - **Bloque completo**
- [ ] Ejecuté PASO 5 (VERIFICACIÓN)
- [ ] Veo 1 trigger en los resultados
- [ ] Veo 1 procedimiento en los resultados
- [ ] Probé el trigger (opcional)
- [ ] Probé el procedimiento (opcional)

---

## 🎉 **¡Sistema Completo!**

Una vez completados todos los pasos, tu sistema tendrá:

✅ 11 tablas  
✅ 2 vistas  
✅ 1 trigger de validación  
✅ 1 procedimiento de verificación  
✅ Transacciones ACID implementadas  
✅ Sistema profesional listo para producción  

---

**Última actualización:** 2025-12-06  
**Versión:** 2.0.0  
**Autor:** Fair Play Casino Development Team
