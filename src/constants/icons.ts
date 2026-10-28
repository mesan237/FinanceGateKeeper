// One module per icon: the package root pulls in all ~1,700 icons (Metro does not tree-shake).
// The alias is resolved in metro.config.js and jest.config.js; types in types/lucide-icons.d.ts.
import AlertCircle from 'lucide-react-native/icons/circle-alert';
import ArrowDownCircle from 'lucide-react-native/icons/circle-arrow-down';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import ArrowUpCircle from 'lucide-react-native/icons/circle-arrow-up';
import Banknote from 'lucide-react-native/icons/banknote';
import BarChart3 from 'lucide-react-native/icons/chart-column';
import Bell from 'lucide-react-native/icons/bell';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Building2 from 'lucide-react-native/icons/building-2';
import Calendar from 'lucide-react-native/icons/calendar';
import CalendarHeart from 'lucide-react-native/icons/calendar-heart';
import Check from 'lucide-react-native/icons/check';
import Circle from 'lucide-react-native/icons/circle';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Clock from 'lucide-react-native/icons/clock';
import CloudUpload from 'lucide-react-native/icons/cloud-upload';
import CreditCard from 'lucide-react-native/icons/credit-card';
import DatabaseBackup from 'lucide-react-native/icons/database-backup';
import Download from 'lucide-react-native/icons/download';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import HandCoins from 'lucide-react-native/icons/hand-coins';
import HelpCircle from 'lucide-react-native/icons/circle-question-mark';
import Home from 'lucide-react-native/icons/house';
import Languages from 'lucide-react-native/icons/languages';
import ListChecks from 'lucide-react-native/icons/list-checks';
import ListOrdered from 'lucide-react-native/icons/list-ordered';
import Lock from 'lucide-react-native/icons/lock';
import Menu from 'lucide-react-native/icons/menu';
import MessageSquareText from 'lucide-react-native/icons/message-square-text';
import Palette from 'lucide-react-native/icons/palette';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Repeat from 'lucide-react-native/icons/repeat';
import Route from 'lucide-react-native/icons/route';
import Settings from 'lucide-react-native/icons/settings';
import Smartphone from 'lucide-react-native/icons/smartphone';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Tag from 'lucide-react-native/icons/tag';
import Target from 'lucide-react-native/icons/target';
import Trash2 from 'lucide-react-native/icons/trash-2';
import UserRound from 'lucide-react-native/icons/user-round';
import Users from 'lucide-react-native/icons/users';
import Wallet from 'lucide-react-native/icons/wallet';
import X from 'lucide-react-native/icons/x';
import type { LucideIcon } from 'lucide-react-native';

/**
 * The single source of truth for UI chrome icons. Feature and component code
 * references icons by these semantic names via `@/components/Icon` — never by
 * importing from `lucide-react-native` directly — so the underlying glyph can
 * change in one place. (Category/source glyphs remain emoji in
 * `@/constants/categoryIcons`; this registry is for navigation/action chrome.)
 */
export const ICONS = {
  back: ChevronLeft,
  close: X,
  forward: ChevronRight,
  add: Plus,
  check: Check,
  /** An open step on a checklist (VS-46). */
  circle: Circle,
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
  debt: HandCoins,
  appearance: Palette,
  language: Languages,
  reminder: Clock,
  notifications: Bell,
  cloud: CloudUpload,
  allocation: Wallet,
  priority: ListOrdered,
  planned: ListChecks,
  moveUp: ChevronUp,
  moveDown: ChevronDown,
  dropdown: ChevronDown,
  edit: Pencil,
  hide: EyeOff,
  show: Eye,
  goal: Target,
  tontine: Users,
  event: CalendarHeart,
  profile: UserRound,
  lock: Lock,
  path: Route,
  /** An envelope whose leftover carries into next month (UX-13). */
  rollover: Repeat,
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
