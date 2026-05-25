export const APP_NAME    = 'PsicoMoreira'
export const APP_VERSION = 'v1.1.0'
export const APP_ENV     = (import.meta.env.MODE === 'production') ? 'prod' : 'dev'
export const APP_BUILD   = new Date().toISOString().split('T')[0]

export const STORAGE_KEY = 'psicomoreira-v1'
