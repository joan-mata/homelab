# Configuración Vim

Config en `~/.vimrc`. Generada el 2026-04-13.

## Atajos principales (Leader = Space)

| Atajo | Acción |
|-------|--------|
| `Space+w` | Guardar |
| `Space+q` | Salir |
| `Space+x` | Guardar y salir |
| `Space+e` | Explorador de archivos (árbol) |
| `Space+a` | Seleccionar todo |
| `Space+y` | Copiar selección al portapapeles del sistema |

## Navegación

| Atajo | Acción |
|-------|--------|
| `Ctrl+h/j/k/l` | Moverse entre splits |
| `Tab` / `Shift+Tab` | Cambiar de buffer |
| `jj` | Escape desde insert mode |
| `Escape` | Limpiar resaltado de búsqueda |

## Edición

| Atajo | Acción |
|-------|--------|
| `Alt+j/k` | Mover línea arriba/abajo |
| `>` / `<` (visual) | Indentar manteniendo selección |

## Características activas

- Números de línea relativos
- Búsqueda case-insensitive (case-sensitive si hay mayúsculas)
- Portapapeles integrado con el sistema (`clipboard=unnamed`)
- Sin archivos `.swp` ni backups `~`
- Soporte de ratón completo
- Tema: `desert` (incluido en vim, sin plugins)
- Indentación: 4 espacios, tabs → espacios
