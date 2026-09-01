// Local API: php artisan serve in /api → http://127.0.0.1:8000

const raw = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const API_URL = raw.replace(/\/$/, '')
