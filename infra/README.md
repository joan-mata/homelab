# infra/

Infraestructura base compartida por todos los proyectos.

## Servicios

| Directorio | Container | Puerto interno | Función |
|---|---|---|---|
| `authelia/` | `authelia` | 9091 | SSO — protege subdominios privados |
| `postgres/` | `postgres_shared` | 5432 | PostgreSQL compartido (schemas por proyecto) |

## Arranque

```bash
# Desde ~/Documents/
bash shared/scripts/setup.sh
```

## Comandos útiles

```bash
# Logs Authelia
docker compose -f infra/authelia/docker-compose.yml logs -f

# Logs PostgreSQL
docker compose -f infra/postgres/docker-compose.yml logs -f

# Generar hash de contraseña para Authelia
docker run --rm authelia/authelia:latest authelia crypto hash generate bcrypt --password 'TU_PASSWORD'

# Conectar a PostgreSQL compartido
docker exec -it postgres_shared psql -U homelab -d homelab
```
