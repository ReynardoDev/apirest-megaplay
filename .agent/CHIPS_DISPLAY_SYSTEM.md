# Sistema de Visualización y Actualización de Chips

## 📋 Resumen
Este documento explica cómo funciona el sistema de visualización de chips del usuario en el navbar y su actualización automática después de cada jugada.

## 🔄 Flujo de Funcionamiento

### 1. **Carga Inicial de la Página**

Cuando el usuario carga cualquier página:

1. El middleware en `app.js` (líneas 34-54) intercepta la petición
2. Verifica si existe un token JWT en las cookies
3. Si el token es válido:
   - Decodifica el token para obtener `id` y `name`
   - **Consulta la base de datos** para obtener los chips actuales
   - Inyecta los datos en `res.locals.user` con: `id`, `name`, y `chips`
4. El navbar (`navbar.ejs`) renderiza los chips usando:
   ```html
   <span id="user-balance" class="...">
       <%= user.chips ? user.chips.toLocaleString() : '0' %>
   </span>
   ```

### 2. **Durante una Jugada**

Cuando el usuario hace clic en "GIRAR":

1. **Frontend** (`black_diamond/index.ejs` líneas 126-193):
   - Deshabilita el botón
   - Muestra animación de "Girando..."
   - Envía petición POST a `/api/spin` con:
     ```javascript
     {
       id_player: playerData.id,
       bet_amount: 10,
       game_id: 1
     }
     ```

2. **Backend** (`game.controller.js` líneas 6-101):
   - Verifica el saldo del jugador
   - Genera números aleatorios (RNG)
   - Calcula premios según las reglas
   - **Actualiza la base de datos**:
     - Inserta registro en `game_spins`
     - Actualiza `wallet` restando apuesta y sumando premio
   - Retorna respuesta JSON:
     ```javascript
     {
       reels: [símbolo1, símbolo2, símbolo3],
       win: cantidad_ganada,
       message: "mensaje",
       new_balance: saldo_nuevo
     }
     ```

3. **Frontend - Actualización Visual** (líneas 168-187):
   - Actualiza los símbolos en los carretes
   - Muestra mensaje de ganancia/pérdida
   - **Actualiza el balance en el navbar**:
     ```javascript
     const balanceElement = document.getElementById('user-balance');
     balanceElement.innerText = data.new_balance.toLocaleString();
     ```
   - Aplica efecto visual:
     - 🟢 Verde con animación pulse si gana
     - 🔴 Rojo si pierde
     - Restaura color original después de 1.5 segundos

## 🎨 Características Visuales

### Navbar - Display de Chips
- **Ubicación**: Esquina superior derecha
- **Diseño**: Tarjeta con gradiente dorado (amber/yellow)
- **Icono**: SVG de moneda
- **Formato**: Números con separadores de miles (ej: 1,234)
- **Responsive**: 
  - Oculto en móviles (`hidden sm:flex`)
  - Visible en tablets y desktop

### Efectos de Actualización
- **Ganancia**: Color verde (#10b981) + animación pulse
- **Pérdida**: Color rojo (#ef4444)
- **Duración**: 1.5 segundos
- **Transición**: Suave (CSS `transition-colors duration-300`)

## 🔧 Archivos Modificados

### 1. `src/app.js`
- **Cambio**: Middleware ahora es `async` y consulta la BD
- **Líneas**: 34-54
- **Propósito**: Obtener chips actuales del usuario

### 2. `src/views/layouts/navbar.ejs`
- **Cambios**:
  - Agregado `id="user-balance"` al span de chips
  - Agregada clase `transition-colors duration-300`
  - Mejorado diseño visual con gradientes e iconos
- **Propósito**: Permitir actualización dinámica desde JavaScript

### 3. `src/views/slot/black_diamond/index.ejs`
- **Cambios**:
  - Mejorado formato con `toLocaleString()`
  - Agregada animación `animate-pulse` para ganancias
  - Aumentado tiempo de feedback visual a 1.5s
- **Líneas**: 168-187
- **Propósito**: Actualizar y animar el balance después de cada jugada

## 📊 Flujo de Datos

```
┌─────────────────┐
│  Usuario Carga  │
│     Página      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Middleware    │
│   (app.js)      │
│  - Verifica JWT │
│  - Consulta BD  │
│  - Inyecta user │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Navbar Render  │
│  Muestra Chips  │
└─────────────────┘

┌─────────────────┐
│ Usuario Juega   │
│  Click "GIRAR"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  POST /api/spin │
│  (Frontend)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controller     │
│  - RNG          │
│  - Calcula Win  │
│  - Update BD    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response JSON  │
│  new_balance    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update Navbar  │
│  + Animación    │
└─────────────────┘
```

## ✅ Ventajas del Sistema

1. **Tiempo Real**: Los chips se actualizan inmediatamente después de cada jugada
2. **Sin Recarga**: No necesita refrescar la página completa
3. **Feedback Visual**: El usuario ve claramente si ganó o perdió
4. **Formato Legible**: Separadores de miles facilitan lectura de cantidades grandes
5. **Responsive**: Se adapta a diferentes tamaños de pantalla
6. **Consistente**: Usa los mismos datos en toda la aplicación

## 🚀 Mejoras Futuras Posibles

- [ ] WebSockets para actualizaciones en tiempo real multi-pestaña
- [ ] Historial de transacciones en el navbar
- [ ] Animación de contador incremental/decremental
- [ ] Sonidos de monedas al ganar
- [ ] Confetti animation para jackpots
