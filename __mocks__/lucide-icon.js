// Manual mock for the per-icon `lucide-react-native/icons/<file>` modules (see
// jest.config.js). Like the barrel stub in jest.setup.ts, it renders a plain View
// that surfaces testID/accessibilityLabel instead of a react-native-svg tree.
const React = require('react');
const { View } = require('react-native');

const LucideIcon = ({ testID, accessibilityLabel }) =>
  React.createElement(View, { testID, accessibilityLabel, accessibilityRole: 'image' });

module.exports = { __esModule: true, default: LucideIcon };
