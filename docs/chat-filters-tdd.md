# Chat Filters — TDD de regresiones

Este documento resume los filtros del bot y los casos de regresión ya cubiertos con TDD (basados en conversaciones reales).

## Objetivo

- Replicar primero el error reportado.
- Escribir el test de regresión (Given/When/Then).
- Ajustar lógica del bot.
- Dejar el test como contrato para que no vuelva a romperse.

## Suite de tests

- `tests/chatBehavior.tdd.test.ts`
- `tests/ycloudBot.helpers.test.ts`
- `tests/validateServiceField.tool.test.ts`

Ejecutar:

```bash
npm test
```

## Reglas de filtrado documentadas

### 1) Off-topic estricto

- Si el mensaje es claramente fuera del alcance (matemáticas, programación, clima, etc.), se bloquea.
- Respuesta debe ser exacta (constante `UNSUPPORTED_INTENT_REPLY`).

Cobertura:
- `chatBehavior.tdd.test.ts` → `keeps strict off-topic guard reply unchanged`

### 2) Preguntas de contexto/progreso SON on-topic

- Ejemplos: "en qué campo voy", "qué me falta", "por dónde vamos".
- No se deben bloquear en flujo activo.

Cobertura:
- `chatBehavior.tdd.test.ts` → `progress question must stay on-topic`
- `ycloudBot.helpers.test.ts` → `active-flow-progress-question`

### 3) Selección de servicio por shorthand

- Si el usuario escribe una palabra clave del servicio luego del listado (ej. "Matrimonio"), se interpreta como selección válida.
- No debe caer en bloqueo de fuera de alcance.

Cobertura:
- `chatBehavior.tdd.test.ts` → `shorthand service selection must not be blocked`
- `ycloudBot.helpers.test.ts` → `service-shorthand-after-list`

### 4) Repetición de `validateServiceField` sin texto final

- Si el agente consume pasos con `validateServiceField` y no produce respuesta textual, SIEMPRE enviar fallback.
- Si hay repetición del mismo input y opciones visibles, la respuesta debe ser estricta con opciones exactas.

Cobertura:
- `chatBehavior.tdd.test.ts` → `repeated validate loop must return strict recovery`
- `ycloudBot.helpers.test.ts` → `assistant-fallback-after-validate-loop`

### 5) Validación estricta de campos Select/Boolean

- `Select`: aceptar opciones válidas y rechazar ambiguas.
- `Boolean`: aceptar Sí/No y rechazar valores inválidos.
- Soportar `options` tanto en strings como en objetos `{ label, value }`.

Cobertura:
- `validateServiceField.tool.test.ts`

## Convención de TDD para nuevos bugs de chat

1. Crear test con nombre `reproduces and protects: <bug>`.
2. Agregar fixture con texto real del chat (sin datos sensibles).
3. Verificar comportamiento esperado (`shouldBlock`, fallback, mensaje estricto, etc.).
4. Ajustar implementación mínima.
5. Correr `npm test` y dejar evidencia.
