"use strict";

const nodeGlobals = {
  require: "readonly",
  module: "writable",
  exports: "writable",
  process: "readonly",
  console: "readonly",
  __dirname: "readonly",
};

const jestGlobals = {
  describe: "readonly",
  test: "readonly",
  it: "readonly",
  expect: "readonly",
};

module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...nodeGlobals, ...jestGlobals },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error",
      semi: ["error", "always"],
      eqeqeq: "error",
    },
  },
];
