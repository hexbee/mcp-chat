import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // ✅ 添加自定义规则覆盖
  {
    rules: {
      // ❌ 关闭 any 报错（或者用 warn 也行）
      "@typescript-eslint/no-explicit-any": "off",

      // ❌ 关闭未使用变量检查（或改为 warn）
      "@typescript-eslint/no-unused-vars": "off",

      // 可选：允许使用 Function 类型（用于 props 回调）
      "@typescript-eslint/no-unsafe-function-type": "off",

      // 可选：禁用 useEffect 的依赖数组检查
      "react-hooks/exhaustive-deps": "off",

      // 可选：关闭 prefer-const
      "prefer-const": "off",
    },
  },
];

export default eslintConfig;
