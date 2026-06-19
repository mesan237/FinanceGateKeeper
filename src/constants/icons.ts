import {
  AlertCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Banknote,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudUpload,
  CreditCard,
  DatabaseBackup,
  Download,
  Eye,
  EyeOff,
  HelpCircle,
  Home,
  ListOrdered,
  Lock,
  Menu,
  MessageSquareText,
  Palette,
  Pencil,
  Plus,
  Settings,
  Smartphone,
  SlidersHorizontal,
  Tag,
  Target,
  Trash2,
  UserRound,
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
  wallet: Wallet,
  transfer: ArrowLeftRight,
  accountCash: Banknote,
  accountMobileMoney: Smartphone,
  accountBank: Building2,
  accountCard: CreditCard,
  menu: Menu,
  export: Download,
  backup: DatabaseBackup,
  help: HelpCircle,
  feedback: MessageSquareText,
  categories: Tag,
  appMode: SlidersHorizontal,
  appearance: Palette,
  reminder: Clock,
  notifications: Bell,
  cloud: CloudUpload,
  allocation: Wallet,
  priority: ListOrdered,
  moveUp: ChevronUp,
  moveDown: ChevronDown,
  edit: Pencil,
  hide: EyeOff,
  show: Eye,
  goal: Target,
  profile: UserRound,
  lock: Lock,
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
