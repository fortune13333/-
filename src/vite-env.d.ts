// FIX: Commented out to resolve "Cannot find type definition file for 'vite/client'" error.
// The app does not appear to use Vite client-specific environment variables, making this reference unnecessary.
// /// <reference types="vite/client" />

// 此文件为Vite注入到客户端代码中的环境变量提供健壮的类型定义。

declare global {
  // 我们扩展NodeJS命名空间来为 `process.env` 提供类型信息。
  // 这是为由Vite等构建工具进行polyfill或替换的环境变量提供类型的标准方法。
  namespace NodeJS {
    interface ProcessEnv {
      // 定义预期可用的环境变量。
      // 实际值由Vite的 `define` 配置注入。
      readonly API_KEY: string;
      readonly VITE_ANALYSIS_API_URL?: string;
      readonly VITE_COMMAND_GENERATION_API_URL?: string;
      readonly VITE_CONFIG_CHECK_API_URL?: string;
    }
  }
}

// 通过添加 `export {}`，我们明确地将此文件设为模块。
// 这是一个关键步骤，可以防止此文件的声明以可能与
// 其他类型定义（如 `vite.config.ts` 中使用的完整Node.js类型）冲突的方式污染全局作用域。
export {};