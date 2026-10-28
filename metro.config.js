// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// `lucide-react-native/icons/<file>` → that one icon's module. The package's
// `exports` only expose the root barrel (every icon), so `constants/icons.ts`
// imports through this alias to keep the other ~1,700 icons out of the bundle.
const LUCIDE_ICON = /^lucide-react-native\/icons\/([a-z0-9-]+)$/;
// The entry is dist/cjs/lucide-react-native.js (`package.json` itself is not exported).
const lucideIconsDir = path.join(path.dirname(require.resolve('lucide-react-native')), '..', 'esm', 'icons');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const match = LUCIDE_ICON.exec(moduleName);
  if (match) {
    return {
      type: 'sourceFile',
      filePath: path.join(lucideIconsDir, `${match[1]}.mjs`),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
