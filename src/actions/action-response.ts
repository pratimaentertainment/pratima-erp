export type ActionResponse<T = any> = 
  | { success: true; data: T; message?: string; }
  | { success: false; error: string; code?: string; fieldErrors?: Record<string, string[]>; };
