# Flags de configuracion

Este documento centraliza las feature flags del proyecto.

## `VITE_ENABLE_MAPS_INTEGRATION`

- **Tipo:** `string` (interpretado como booleano)
- **Por defecto:** activada (`true`) cuando no esta definida
- **Objetivo:** activar u ocultar toda la integracion de mapas (Google Maps + geocodificacion + tracking visual en mapa)

### Valores que la desactivan

- `false`
- `0`
- `off`
- `no`

### Ejemplo

```bash
VITE_ENABLE_MAPS_INTEGRATION=false
```

### Efecto al desactivar

- No se monta `APIProvider` de Google Maps.
- No se renderizan componentes `Map`, `Marker` ni `Geocoder`.
- Las paginas siguen operativas en modo sin mapa (listas/formularios).
- En panel de tecnico, se desactiva el tracking de geolocalizacion asociado al mapa.
