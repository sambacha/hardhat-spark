module.exports = {
  extends: ["../../config/eslint/eslintrc.js"],
  parserOptions: {
    project: require("path").join(__dirname, "tsconfig.json"),
    sourceType: "module",
  },
};
