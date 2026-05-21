# Rules for `app/` (Routing Layer)

Route files are **thin**. They import a screen component from a feature and render it. Nothing else.

## Allowed

- Importing a screen component from `@/features/finance/<feature>/<Screen>.tsx`.
- Default-exporting a component that renders that screen.

## Forbidden

- Business logic.
- API calls or database queries.
- State management (no `useState`, no context creation).
- UI beyond the imported feature screen.
- Importing from `components/`, `hooks/`, `services/`, `utils/` directly — the feature screen handles those.

## Canonical Form

```tsx
import { DashboardScreen } from "@/features/finance/dashboard/DashboardScreen";

export default function DashboardRoute() {
  return <DashboardScreen />;
}
```

## Layout Files (`_layout.tsx`)

Layouts may configure navigation (tab bar, stack options, providers). They may import shared `components/` for chrome. They still hold no business logic.

## Naming

Route files use kebab-case or Expo Router conventions (`quick-add.tsx`, `[id].tsx`). Screen exports are PascalCase + `Screen` suffix.
