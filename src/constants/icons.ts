import {
  AlertCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  BarChart3,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Home,
  Plus,
  Settings,
  Trash2,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * The single source of truth for UI chrome icons. Feature and component code
 * references icons by these semantic names via `@/components/Icon` — never by
 * importing from `lucide-react-native` directly — so the underlying glyph can
 * change in one place. (Category/source glyphs remain emoji in
 * `@/constants/categoryIcons`; this registry is for navigation/action chrome.)
 */
export const ICONS = {
  back: ChevronLeft,
  forward: ChevronRight,
  add: Plus,
  check: Check,
  delete: Trash2,
  settings: Settings,
  calendar: Calendar,
  alert: AlertCircle,
  expense: ArrowUpCircle,
  income: ArrowDownCircle,
  zeroDay: CheckCircle2,
  home: Home,
  transactions: ArrowLeftRight,
  budget: Wallet,
  projects: Briefcase,
  reports: BarChart3,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Standard icon sizes: sm = inline, md = rows/actions, lg = headers/FAB. */
export const ICON_SIZE = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

/** Default Lucide stroke width across the app. */
export const ICON_STROKE = 2;
