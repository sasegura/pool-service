# Funcionalidades actuales de la app

## 1. Acceso y sesión
- Inicio de sesión con Google.
- Inicio de sesión con correo + contraseña.
- Atajo para rellenar el correo de cuenta demo.
- Protección de rutas privadas para usuarios autenticados.
- Cierre de sesión desde la cabecera.

## 2. Multiempresa (tenant) y roles
- Soporte de espacio de trabajo por empresa (`company`).
- Flujo de onboarding para crear empresa cuando el usuario no tiene membresía activa.
- Aceptación de invitaciones mediante enlace (`/accept-invite` con `companyId` e `inviteId`).
- Resolución de rol de membresía por empresa (`admin`, `supervisor`, `technician`, `client`).
- Control de acceso por rol en navegación y páginas.

## 3. Modo demo / sandbox
- Cuenta demo configurable por variable de entorno (`VITE_DEMO_ACCOUNT_EMAIL`).
- Bootstrap automático del workspace demo para el usuario demo.
- Conmutador de vista demo en footer para simular panel de `admin`, `worker` y `client`.
- El cambio de vista demo no altera el rol real en Firestore, solo la experiencia UI.

## 4. Dashboard por tipo de usuario
- `Admin/Supervisor`: vista general operativa con estado de rutas, actividad e incidencias.
- `Technician`: panel de jornada y ejecución de ruta con progreso por piscinas.
- `Client`: historial de mantenimiento e incidencias de sus piscinas vinculadas.

## 5. Gestión de piscinas
- Alta, edición y eliminación de piscinas.
- Datos generales: nombre de propiedad, dirección, cliente propietario y metadatos técnicos.
- Geolocalización/validación de dirección con Google Maps Geocoding.
- Soporte de ubicación manual en mapa cuando no hay validación automática.
- Vista de detalle de piscina con historial de visitas, equipo, volumen y notas.

## 6. Visitas de agua y recomendaciones
- Registro de visita de agua por piscina.
- Captura de parámetros químicos (pH, cloro, alcalinidad, dureza, CYA, salinidad, temperatura).
- Inspección visual (claridad, algas, suciedad, presión de filtro, estado de bomba).
- Notas de servicio, tratamiento aplicado y referencias de fotos.
- Recomendaciones automáticas de acciones/productos según lecturas.

## 7. Gestión de rutas
- Creación y edición de rutas con técnico asignado y orden de paradas.
- Configuración de recurrencia (sin repetición, diaria, semanal, quincenal, mensual).
- Planificación por fechas y visualización de calendario semanal.
- Reordenación de paradas y actualización de asignaciones.
- Optimización de ruta asistida por IA (cuando aplica).

## 8. Operación del técnico (Worker)
- Selección de ruta para el día y reasignación de rutas de otros días.
- Inicio, continuación y finalización de jornada.
- Registro de llegada y cierre de servicio por parada.
- Marcado de servicio correcto o reporte de incidencia con detalle.
- Opción de notificar al cliente en el historial.

## 9. Gestión de equipo
- Alta/edición de usuarios del equipo.
- Pre-registro y vinculación de personal.
- Cambio rápido de rol y actualización de membresía.
- Eliminación de usuarios.

## 10. Incidencias
- Vista consolidada de incidencias reportadas.
- Filtros y limpieza de filtros en listado.
- Trazabilidad por piscina, técnico y momento de reporte.

## 11. Localización y UX transversal
- Internacionalización `es`/`en` con selector en cabecera.
- Mensajería de estado con toasts para éxito/error.
- Diseño responsive con navegación contextual por rol.

## 12. Integraciones técnicas activas
- Firebase Authentication.
- Firestore (con soporte de `databaseId` configurable).
- Cloud Functions para operaciones de tenant/equipo.
- Firebase Storage para recursos multimedia.
- Google Maps Platform (mapas, geocoding y seguimiento en tiempo real).
