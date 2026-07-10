# FinanzApp - Finanzas Personales PWA

Aplicación web progresiva (PWA) completa para gestión de finanzas personales.

## 🚀 Características

- **PWA instalable** en Android, iPhone, Windows y Mac
- **Modo oscuro/claro** automático y manual
- **Mobile First** con navegación inferior en móviles
- **Sidebar** en escritorio
- **Autenticación** con Supabase (email/contraseña)
- **Datos en la nube** con Supabase

## 📱 Módulos

| Módulo | Descripción |
|--------|-------------|
| Dashboard | Saldo total, ingresos, gastos, gráficos interactivos |
| Ingresos | Registro con categorías, método de pago, notas |
| Gastos | Registro, filtros por fecha/categoría |
| Cuentas | Bancos, efectivo, digitales, transferencias |
| Presupuestos | Mensuales con alertas configurables |
| Metas | Ahorro con progreso y fecha objetivo |
| Deudas | Por pagar y por cobrar con vencimientos |
| Reportes | Diario/semanal/mensual/anual, exportar PDF y Excel |
| Configuración | Perfil, moneda, tema, backup |

## ⚙️ Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. Copia las credenciales desde **Project Settings > API**

### 3. Variables de entorno

Crea un archivo `.env` en la raíz:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Generar íconos PWA
```bash
npm install canvas --save-dev
node scripts/generate-icons.js
```

### 5. Ejecutar en desarrollo
```bash
npm run dev
```

### 6. Build de producción
```bash
npm run build
npm run preview
```

## 🏗️ Estructura del proyecto

```
src/
├── core/           # Supabase, Router, Store, Theme, Utils
├── modules/
│   ├── auth/       # Login, registro, recuperación
│   ├── shell/      # Navbar, sidebar, layout
│   ├── dashboard/  # Panel principal + gráficos
│   ├── incomes/    # Módulo ingresos
│   ├── expenses/   # Módulo gastos
│   ├── accounts/   # Módulo cuentas
│   ├── budgets/    # Módulo presupuestos
│   ├── goals/      # Metas de ahorro
│   ├── debts/      # Deudas y cobros
│   ├── reports/    # Reportes + exportación
│   ├── settings/   # Configuración
│   └── shared/     # Modal, Toast, TransactionForm
└── styles/         # Variables CSS, reset, global, componentes
```

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS (ES Modules) + Vite
- **PWA**: vite-plugin-pwa + Workbox
- **Backend**: Supabase (PostgreSQL + Auth)
- **Gráficos**: Chart.js
- **Fechas**: date-fns
- **Export**: jsPDF + xlsx

## 📲 Instalación como app nativa

- **Android (Chrome)**: Menú → "Instalar app"
- **iPhone (Safari)**: Compartir → "Agregar a inicio"
- **Windows (Edge/Chrome)**: Barra de direcciones → ícono instalar
- **Mac (Chrome)**: Barra de direcciones → ícono instalar
