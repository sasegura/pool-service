# Arquitectura Hexagonal (frontend)

Esta base sigue una hexagonal pragmatica orientada a React:

- `app/`: composicion global (providers, router, bootstrap).
- `features/<modulo>/domain`: reglas y modelos puros de negocio.
- `features/<modulo>/application`: casos de uso/orquestacion.
- `features/<modulo>/ports.ts`: contratos (interfaces) de entrada/salida.
- `features/<modulo>/repositories`: adaptadores de infraestructura (Firestore/APIs).
- `features/<modulo>/hooks` y `features/<modulo>/components`: capa de UI del modulo.
- `shared/`: utilidades transversales sin logica de negocio de un dominio.
- `infrastructure/`: clientes/SDKs globales y configuracion tecnica.

## Reglas de dependencia

1. `domain` no depende de React ni Firebase.
2. `application` depende de `domain` y `ports`, nunca de SDKs concretos.
3. `repositories` implementan `ports` y encapsulan detalles de Firestore/APIs.
4. `hooks/components/pages` consumen casos de uso (`application`) y no consultas SDK directas.
5. Todo modulo nuevo debe declarar `ports.ts` antes de crear adaptadores.

## Estado actual de migracion

- `app` ya centraliza ruteo/proveedores.
- `routes` ya tiene flujo hexagonal (`ports` + `application` + `repository`).
- `pools` ya usa flujo hexagonal en lectura/escritura desde UI (`hooks` -> `application` -> `ports` -> `repository`).
- `team` ya usa flujo hexagonal en UI (`hooks` -> `application` -> `ports` -> `repository`).
- `incidents` ya usa flujo hexagonal para suscripciones de pagina (`hooks` -> `application` -> `ports` -> `repository`).
- `visits` ya usa flujo hexagonal para carga/guardado de visita (`page` -> `application` -> `ports` -> `repository`).
- `routes` y `admin-overview` ya delegan escrituras a comandos de aplicacion (sin Firestore directo en pagina).
- `worker-dashboard` ya delega sus escrituras y suscripciones a `application`/`repository`.
- `pool-detail` y `accept-invite` ya eliminan Firestore directo en pagina.
