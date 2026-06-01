# DOCUMENTO MAESTRO — Estrategia de negocio Joan Mata
> Este documento es el punto de entrada para orquestar todos los agentes de Claude.
> Léelo primero antes de usar cualquier otro documento.

---

## Descripción del fundador

Joan Mata es un desarrollador individual (bootstrapped, sin inversión externa) con varios proyectos funcionales construidos. Tiene capacidad técnica sólida (Next.js, Python, Docker, APIs de IA) pero está en la fase de validar cuál de sus proyectos tiene más potencial comercial y cómo llevarlos al mercado.

**Situación actual:**
- Versión funcional de los productos: sí
- Usuarios reales: 0
- Presupuesto marketing: ~0€ (orgánico)
- Tiempo disponible: 1 persona, trabajo paralelo probable
- Mercado principal: España / hispanohablante

---

## Los dos proyectos prioritarios

### Proyecto 1: GASTIA
App web de gestión financiera personal con bot de Telegram integrado.
- Stack: Next.js 15 + PostgreSQL + Grammy.js (bot) + Claude API
- Módulos: gastos diarios, fijos, grupos, viajes, huchas, fondo de reserva
- Diferenciador: bot Telegram con IA, sin conexión bancaria obligatoria, self-hosted
- Estado: funcional single-tenant, sin despliegue cloud, sin pagos
- Tiempo estimado hasta lanzamiento: 3-4 semanas de trabajo enfocado

### Proyecto 2: BOT PODCASTS
Sistema de curación de podcasts, YouTube y artículos por Telegram con aprendizaje por feedback.
- Stack: n8n + Docker + Telegram + Claude API + Spotify/YouTube/Listen Notes APIs
- Funcionamiento: digest semanal personalizado + conversación libre + botones de feedback
- Diferenciador: curación conversacional en español, aprende con feedback, multi-fuente
- Estado: funcional self-hosted con n8n, sin multi-usuario, sin UI web
- Tiempo estimado hasta beta: 3-4 semanas de trabajo enfocado

---

## Mapa de documentos por agente

### GASTIA — 5 documentos

| Documento | Archivo | Agente objetivo | Pregunta principal |
|---|---|---|---|
| Product Brief | `gastia_01_product_brief.md` | Estrategia de producto / CPO | ¿Cuál es la propuesta de valor más potente y quién es el usuario ideal? |
| Business Model Canvas | `gastia_02_business_model_canvas.md` | Estrategia de negocio / CFO | ¿Cómo monetizar y cuál es el modelo más adecuado? |
| Go-to-Market | `gastia_03_go_to_market.md` | Marketing y crecimiento | ¿Cómo conseguir los primeros 500 usuarios sin presupuesto? |
| Plan de Producción | `gastia_04_production_plan.md` | Arquitectura y desarrollo | ¿Qué hay que construir para pasar de local a SaaS? |
| Análisis de Competencia | `gastia_05_competitive_analysis.md` | Inteligencia competitiva | ¿Cómo posicionarse frente a Fintonic, YNAB y Splitwise? |

### BOT PODCASTS — 5 documentos

| Documento | Archivo | Agente objetivo | Pregunta principal |
|---|---|---|---|
| Product Brief | `botpodcasts_01_product_brief.md` | Estrategia de producto / CPO | ¿Necesita UI web o puede vivir solo en Telegram? |
| Business Model Canvas | `botpodcasts_02_business_model_canvas.md` | Estrategia de negocio / CFO | ¿B2C a 4€/mes o B2B con mayor ticket? |
| Go-to-Market | `botpodcasts_03_go_to_market.md` | Marketing y crecimiento | ¿Lanzar en español o inglés primero? |
| Plan de Producción | `botpodcasts_04_production_plan.md` | Arquitectura y desarrollo | ¿Mantener n8n o reescribir el orquestador? |
| Análisis de Competencia | `botpodcasts_05_competitive_analysis.md` | Inteligencia competitiva | ¿Cómo diferenciarse de Spotify y Feedly? |

---

## Cómo usar estos documentos con agentes de Claude

### Instrucciones para cada sesión de agente

1. Abre una nueva conversación con Claude
2. Pega el contenido del documento correspondiente al inicio del mensaje
3. Añade tu pregunta o contexto adicional específico
4. El documento ya incluye el rol del agente y las preguntas abiertas — Claude asumirá ese rol

**Ejemplo de prompt:**
```
[PEGAR CONTENIDO COMPLETO DEL DOCUMENTO]

Basándote en este brief, dame tu análisis completo y responde todas las preguntas abiertas al final del documento. Sé concreto y directo, con recomendaciones accionables.
```

---

## Orden recomendado de uso

Si tienes tiempo limitado, empieza por estos documentos en este orden:

**Semana 1 — Validar estrategia:**
1. `gastia_05_competitive_analysis.md` → define el posicionamiento antes de construir nada más
2. `gastia_02_business_model_canvas.md` → define el pricing antes de implementar Stripe
3. `botpodcasts_01_product_brief.md` → decide si necesita UI web o solo Telegram

**Semana 2 — Planificar construcción:**
4. `gastia_04_production_plan.md` → hoja de ruta técnica detallada
5. `botpodcasts_04_production_plan.md` → decide n8n vs reescritura

**Semana 3 — Preparar lanzamiento:**
6. `gastia_03_go_to_market.md` → plan de lanzamiento concreto
7. `botpodcasts_03_go_to_market.md` → plan de lanzamiento paralelo o secuencial

---

## Decisiones pendientes del fundador

Estas son las preguntas estratégicas más importantes que los agentes deben ayudar a resolver:

1. **¿Lanzar ambos productos simultáneamente o secuencialmente?** Si es secuencial, ¿cuál primero? (Recomendación preliminar: Gastia primero por mayor complejidad técnica resuelta)

2. **¿Mismo dominio de marca o marcas separadas?** ¿joanmata.com como paraguas o gastia.app y botpodcasts.app independientes?

3. **¿Qué modelo de pricing para España?** El mercado español es sensible al precio recurrente — ¿freemium, trial o pago único?

4. **¿Open source como estrategia de distribución?** Para ambos productos, el código de calidad podría atraer comunidad técnica si se publica como open source con opción cloud de pago.

5. **¿Telegram como canal único o añadir WhatsApp/email desde el inicio?** Limitar a Telegram restringe el mercado pero simplifica el desarrollo.

---

## Métricas de éxito a 6 meses (targets iniciales)

| Métrica | Target 3 meses | Target 6 meses |
|---|---|---|
| Usuarios registrados (ambos) | 200 | 800 |
| Usuarios activos semanales | 80 | 350 |
| Usuarios pagando | 10 | 60 |
| MRR combinado | ~50€ | ~300€ |
| Churn mensual | <10% | <5% |
| NPS | >30 | >50 |

*Nota: estos targets son conservadores para un equipo de 1 persona bootstrapped. Los agentes deben validar si son realistas o ajustarlos.*

---

## Información de contacto y contexto adicional

- GitHub: https://github.com/joan-mata
- Portfolio: https://joanmata.com (o similar)
- Localización: Catalunya, España
- Idioma preferido para los productos: español (con soporte catalán e inglés)
- Restricciones: sin co-fundadores conocidos actualmente, sin inversión externa buscada en esta fase
