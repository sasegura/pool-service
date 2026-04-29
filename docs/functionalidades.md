# Documento Maestro de Características y Casos de Uso – App de Gestión de Rutas de Piscinas

---

# 1. Objetivo de la plataforma

La aplicación permite gestionar de forma integral empresas de mantenimiento de piscinas, optimizando la planificación de rutas, el trabajo de técnicos, la relación con clientes, el control de incidencias, el mantenimiento preventivo, la facturación y la supervisión operativa.

Está diseñada bajo arquitectura multiempresa (multi-tenant), permitiendo que cada empresa gestione su propio equipo, clientes y piscinas de forma independiente.

---

# 2. Roles del sistema

## Admin

Responsable total de la empresa.

### Puede:

* Configurar empresa
* Gestionar facturación
* Gestionar clientes
* Gestionar técnicos
* Crear rutas
* Revisar incidencias
* Consultar reportes
* Configurar integraciones
* Gestionar inventario
* Gestionar contratos

---

## Supervisor

Responsable operativo.

### Puede:

* Gestionar rutas
* Supervisar técnicos
* Revisar incidencias
* Reasignar trabajos
* Controlar visitas
* Validar mantenimientos

---

## Técnico

Responsable de ejecución.

### Puede:

* Ver sus rutas asignadas
* Ejecutar visitas
* Registrar parámetros
* Reportar incidencias
* Subir fotos
* Registrar consumo de productos
* Solicitar asistencia

---

## Cliente

Propietario de una o varias piscinas.

### Puede:

* Consultar historial de mantenimiento
* Ver incidencias
* Recibir notificaciones
* Firmar servicios
* Descargar reportes
* Consultar facturas
* Solicitar visitas extraordinarias

---

# 3. Casos de uso funcionales

---

# MÓDULO A — Acceso y autenticación

## Caso de uso A1 — Inicio de sesión

### Actor

Usuario autenticado

### Flujo

* Login con Google
* Login con email + contraseña
* Recuperación de contraseña
* Acceso demo
* Protección de rutas privadas
* Cierre de sesión

---

## Caso de uso A2 — Onboarding empresa

### Actor

Nuevo usuario

### Flujo

* Crear nueva empresa
* Configurar datos iniciales
* Crear primer administrador
* Seleccionar plan inicial

---

# MÓDULO B — Multiempresa y permisos

## Caso de uso B1 — Gestión de membresías

### Actor

Admin

### Flujo

* Invitar usuarios
* Aceptar invitaciones
* Asignar roles
* Cambiar permisos
* Eliminar acceso

---

## Caso de uso B2 — Control de acceso por rol

### Actor

Sistema

### Flujo

* Resolver permisos por empresa
* Mostrar navegación contextual
* Restringir acciones sensibles

---

# MÓDULO C — Gestión de clientes

## Caso de uso C1 — Alta de cliente

### Actor

Admin / Supervisor

### Flujo

* Crear cliente
* Datos fiscales
* Contacto principal
* Dirección de facturación
* Observaciones internas
* Documentos asociados

---

## Caso de uso C2 — Gestión de múltiples piscinas

### Actor

Admin

### Flujo

* Asociar varias piscinas a un cliente
* Historial por cliente
* Estado general de servicio

---

# MÓDULO D — Gestión de piscinas

## Caso de uso D1 — Alta y edición de piscina

### Actor

Admin / Supervisor

### Flujo

* Crear piscina
* Dirección
* Cliente asociado
* Geolocalización
* Ubicación manual en mapa
* Datos técnicos
* Equipamiento
* Notas internas

---

## Caso de uso D2 — Vista de detalle

### Actor

Todos según permisos

### Flujo

* Historial de visitas
* Historial de incidencias
* Historial fotográfico
* Equipos instalados
* Mantenimiento preventivo

---

# MÓDULO E — Rutas y planificación

## Caso de uso E1 — Crear ruta

### Actor

Supervisor / Admin

### Flujo

* Crear ruta
* Asignar técnico
* Definir orden de paradas
* Frecuencia de recurrencia
* Calendario semanal

---

## Caso de uso E2 — Optimización automática

### Actor

Sistema

### Flujo

* Optimizar por distancia
* Optimizar por tráfico
* Prioridad por incidencias
* SLA urgentes
* Disponibilidad del técnico

---

## Caso de uso E3 — Reasignación de rutas

### Actor

Supervisor

### Flujo

* Mover visitas
* Reasignar técnico
* Replanificar incidencias urgentes

---

# MÓDULO F — Operación técnica

## Caso de uso F1 — Inicio de jornada

### Actor

Técnico

### Flujo

* Seleccionar ruta
* Iniciar jornada
* Confirmar primera visita

---

## Caso de uso F2 — Ejecución de visita

### Actor

Técnico

### Flujo

* Registrar llegada
* Validación GPS
* Registro de parámetros químicos
* Inspección visual
* Tratamiento aplicado
* Notas de servicio
* Fotos antes/después
* Firma del cliente
* Cierre de visita

---

## Caso de uso F3 — Reporte de incidencia

### Actor

Técnico

### Flujo

* Registrar problema
* Nivel de urgencia
* Evidencia fotográfica
* Notificación al supervisor
* Seguimiento posterior

---

# MÓDULO G — Agua y mantenimiento

## Caso de uso G1 — Control químico

### Actor

Técnico

### Flujo

* pH
* Cloro
* Alcalinidad
* Dureza
* CYA
* Salinidad
* Temperatura
* Recomendaciones automáticas

---

## Caso de uso G2 — Mantenimiento preventivo

### Actor

Supervisor / Técnico

### Flujo

* Revisiones periódicas
* Bomba
* Filtro
* Clorador
* Robot
* Cuadro eléctrico
* Alertas preventivas
* Historial técnico

---

# MÓDULO H — Inventario

## Caso de uso H1 — Gestión de stock

### Actor

Admin / Supervisor

### Flujo

* Alta de productos
* Control de stock
* Alertas de bajo stock
* Coste por producto
* Proveedores

---

## Caso de uso H2 — Consumo por visita

### Actor

Técnico

### Flujo

* Registrar producto usado
* Cantidad consumida
* Coste imputado
* Trazabilidad completa

---

# MÓDULO I — Incidencias

## Caso de uso I1 — Gestión consolidada

### Actor

Supervisor / Admin

### Flujo

* Listado general
* Filtros
* Estado de resolución
* Trazabilidad por piscina
* Responsable asignado

---

# MÓDULO J — Facturación

## Caso de uso J1 — Contratos

### Actor

Admin

### Flujo

* Tipo de contrato
* Servicios incluidos
* Frecuencia
* Precio mensual
* Renovaciones

---

## Caso de uso J2 — Facturación

### Actor

Admin

### Flujo

* Facturas periódicas
* Servicios extraordinarios
* Presupuestos
* Seguimiento de cobros
* Pendientes de pago

---

# MÓDULO K — Firma digital y reportes

## Caso de uso K1 — Firma de servicio

### Actor

Cliente

### Flujo

* Validar servicio realizado
* Firma digital
* Generación de comprobante
* PDF descargable

---

## Caso de uso K2 — Reporte automático

### Actor

Sistema

### Flujo

* Informe post-servicio
* Envío por email
* Historial descargable

---

# MÓDULO L — Notificaciones

## Caso de uso L1 — Alertas automáticas

### Actor

Sistema

### Flujo

* Recordatorio de visita
* Cambio de ruta
* Incidencia crítica
* Servicio completado
* Stock bajo
* Mantenimiento preventivo

---

# MÓDULO M — Analítica y reportes

## Caso de uso M1 — Dashboard operativo

### Actor

Admin / Supervisor

### Flujo

* Productividad por técnico
* Piscinas atendidas
* Tiempo medio por visita
* Incidencias por periodo
* Rentabilidad por cliente
* Costes operativos

---

## Caso de uso M2 — Exportaciones

### Actor

Admin

### Flujo

* Exportar CSV
* Exportar Excel
* Exportar PDF

---

# MÓDULO N — Integraciones técnicas

## Firebase

* Authentication
* Firestore
* Cloud Functions
* Storage

## Google Maps Platform

* Geocoding
* Mapas
* Tracking GPS
* Validación de visitas

## Automatizaciones futuras

* WhatsApp Business
* Stripe
* Firma electrónica avanzada
* ERP externo

---

# 4. Prioridad de desarrollo recomendada

## Fase 1 — Core MVP

* Auth
* Multiempresa
* Clientes
* Piscinas
* Técncnicos
* Rutas
* Visitas
* Incidencias

## Fase 2 — Operación avanzada

* Inventario
* Firma digital
* Tracking GPS
* Notificaciones
* Reportes

## Fase 3 — Negocio completo

* Facturación
* Contratos
* Analítica avanzada
* Integraciones externas

---

# 5. Resultado esperado

Convertir la aplicación en una plataforma SaaS completa de gestión empresarial para mantenimiento profesional de piscinas, no solo en una app de rutas operativas.
