export const logger = {
  info: (msg: string) => console.log(`[BOOTSTRAP-INFO] ${msg}`),
  success: (msg: string) => console.log(`[BOOTSTRAP-SUCCESS] ✅ ${msg}`),
  warn: (msg: string) => console.warn(`[BOOTSTRAP-WARN] ⚠️ ${msg}`),
  error: (msg: string) => console.error(`[BOOTSTRAP-ERROR] ❌ ${msg}`),
};
