// sql.js 类型声明
declare module 'sql.js' {
  interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string): { columns: string[]; values: unknown[][] }[]
    prepare(sql: string): Statement
    export(): Uint8Array
  }

  interface Statement {
    bind(params?: unknown[]): void
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): void
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | null) => Database
  }

  function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>

  export default initSqlJs
  export type { Database, SqlJsStatic, Statement }
}

// Vite WASM URL import
declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string
  export default url
}
