module.exports = {
  "env": {
    "node": true,
  },
  "plugins": [
    "node",
    "prettier",
  ],
  "extends": [
    "eslint:recommended",
    "google",
    "plugin:node/recommended",
    "prettier",
  ],
  "rules": {
    "no-console": 0,
    "prettier/prettier": ["error", {"singleQuote": true, "printWidth": 160}],
    "prefer-const": "error",
    "prefer-rest-params": "off",
    "valid-jsdoc": "off",
    "camelcase": 2,
  }
};
