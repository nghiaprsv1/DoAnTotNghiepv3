// Application-wide constants

export const APP_NAME = import.meta.env.VITE_APP_TITLE || 'React App'
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'development'
export const IS_DEV = APP_ENV === 'development'
export const IS_PROD = APP_ENV === 'production'
