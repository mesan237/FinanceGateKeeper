// Per-icon lucide modules, aliased in metro.config.js and jest.config.js.
declare module 'lucide-react-native/icons/*' {
  import type { LucideIcon } from 'lucide-react-native';

  const Icon: LucideIcon;
  export default Icon;
}
