# Auth Feature Context

## Domain Responsibility
PIN-based authentication. No passwords, no email — just a 4-digit PIN.

## Database Tables
- `users` — id, pin_hash, app_mode (learning | control), created_at

## Key Business Rules
- First launch: no PIN exists → show setup flow (enter + confirm).
- Subsequent launches: require PIN to unlock. 3 wrong attempts → 30-second cooldown.
- PIN is hashed before storage (use a simple hash — not bcrypt, this is local-only security).
- `app_mode` defaults to `learning`. User manually switches to `control` or is prompted after 30 days.
- Auth state is managed in a React context wrapping the entire app.

## Files
- `AuthScreen.tsx`, `auth.hooks.ts`, `auth.service.ts`, `auth.types.ts`
