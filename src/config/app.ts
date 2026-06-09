import pkg from '../../package.json'

export const APP_NAME    = 'PsicoMoreira'
export const APP_VERSION = `v${pkg.version}`
export const APP_ENV     = (import.meta.env.MODE === 'production') ? 'prod' : 'dev'
export const APP_BUILD   = new Date().toISOString().split('T')[0]
