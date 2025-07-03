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
  {
    rules: {
      "max-len": [
        "error",
        {
          code: 120,
          tabWidth: 2,
          comments: 120, // This ensures comments are also checked
          ignoreUrls: true,
          ignoreStrings: false,
          ignoreTemplateLiterals: false,
          ignoreRegExpLiterals: true,
          ignorePattern: "className=(['\"`]([\\s\\S]*?)['\"`]|\\{[\\s\\S]*?\\})",
        },
      ],
    },
  },
];

export default eslintConfig;
