# Bot trading

Los bots corren en `bot-trading-bots` (siempre encendido, `restart: always`). El dashboard es on-demand.

```bash
# Estado
docker ps | grep bot-trading

# Logs bots
docker logs bot-trading-bots -f

# Controlar un bot
docker exec bot-trading-bots python control.py --bot smc_btc pausar
```

Ver `bot_trading/CLAUDE.md` para documentación completa.
