import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { TelegramUser, GameState } from '../types'

interface AuthContextType {
    telegramUser: TelegramUser | null
    gameState: GameState | null
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    updateGameState: (updates: Partial<GameState>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Функция загрузки состояния игры
    const loadGameState = useCallback(async (telegramId: number) => {
        try {
            console.log('AuthProvider: Loading game state for', telegramId)
            // setError(null) // Не сбрасываем ошибку тут, чтобы не мигать UI

            // Вызываем RPC функцию get_bull_game_state
            const { data, error: rpcError } = await supabase
                .rpc('get_bull_game_state', {
                    p_telegram_id: telegramId.toString()
                })

            if (rpcError) {
                console.error('AuthProvider: Error loading game state:', rpcError)
                throw new Error(rpcError.message)
            }

            // RPC с RETURNS TABLE возвращает массив, берём первый элемент
            const row = Array.isArray(data) ? data[0] : data

            if (row) {
                const state: GameState = {
                    balance_bul: Number(row.balance_bul ?? 0),
                    balance_ar: Number(row.balance_ar ?? 0),
                    energy: Number(row.energy ?? 100),
                    energy_max: Number(row.energy_max ?? 100),
                    level: Number(row.level ?? 1),
                    xp: Number(row.xp ?? 0),
                    xp_to_next: Number(row.xp_to_next ?? 1000),
                    active_skin: row.active_skin ?? 'Bull1.png',
                    last_energy_update: row.last_energy_update ?? new Date().toISOString()
                }

                setGameState(state)
                console.log('AuthProvider: Game state loaded:', state)
            } else {
                console.warn('AuthProvider: No game state returned from RPC')
            }
        } catch (err) {
            console.error('AuthProvider: Load game state error:', err)
            // Используем mock-данные при ошибке только если это сетевая ошибка
            // Но для продакшена лучше показывать ошибку
            const mockState: GameState = {
                balance_bul: 1000,
                balance_ar: 50,
                energy: 100,
                energy_max: 100,
                level: 1,
                xp: 0,
                xp_to_next: 1000,
                active_skin: 'Bull1.png',
                last_energy_update: new Date().toISOString()
            }
            setGameState(mockState)
        }
    }, [])

    const refetch = useCallback(async () => {
        if (telegramUser) {
            await loadGameState(telegramUser.id)
        }
    }, [telegramUser, loadGameState])

    const updateGameState = useCallback((updates: Partial<GameState>) => {
        setGameState((prev) => {
            if (!prev) return null
            return { ...prev, ...updates }
        })
    }, [])

    // Инициализация при монтировании (один раз на все приложение)
    useEffect(() => {
        const initAuth = async () => {
            try {
                console.log('AuthProvider: Initializing...')
                setIsLoading(true)
                setError(null)

                // DEV MODE: проверяем ?dev=true или localhost
                const urlParams = new URLSearchParams(window.location.search)
                const isDevMode = urlParams.get('dev') === 'true' || 
                                  window.location.hostname === 'localhost' ||
                                  window.location.hostname === '127.0.0.1'

                const tg = window.Telegram?.WebApp
                const hasTelegramUser = tg?.initDataUnsafe?.user?.id

                // BROWSER AUTH: проверяем localStorage на наличие авторизации через Telegram Login Widget
                const browserAuthData = localStorage.getItem('telegram_browser_auth')
                if (browserAuthData && !hasTelegramUser) {
                    try {
                        const savedUser = JSON.parse(browserAuthData)
                        // Проверяем что auth_date не старше 7 дней
                        const authAge = Date.now() / 1000 - savedUser.auth_date
                        if (authAge < 604800) { // 7 дней в секундах
                            console.log('AuthProvider: BROWSER AUTH - using saved Telegram user')
                            
                            const browserUser: TelegramUser = {
                                id: savedUser.id,
                                first_name: savedUser.first_name,
                                last_name: savedUser.last_name,
                                username: savedUser.username,
                                photo_url: savedUser.photo_url
                            }
                            
                            setTelegramUser(browserUser)
                            await loadGameState(browserUser.id)
                            setIsLoading(false)
                            return
                        } else {
                            // Авторизация устарела, удаляем
                            localStorage.removeItem('telegram_browser_auth')
                        }
                    } catch (e) {
                        console.error('AuthProvider: Error parsing browser auth:', e)
                        localStorage.removeItem('telegram_browser_auth')
                    }
                }

                // DEV MODE: если нет реального Telegram пользователя — используем mock
                if (isDevMode && !hasTelegramUser) {
                    console.log('AuthProvider: DEV MODE - using mock Telegram user')
                    
                    const devUser: TelegramUser = {
                        id: 190202791,
                        first_name: 'Александр',
                        username: 'AleksandrBekk',
                        language_code: 'ru'
                    }
                    
                    setTelegramUser(devUser)
                    await loadGameState(devUser.id)
                    setIsLoading(false)
                    return
                }

                if (!tg) {
                    console.error('Telegram WebApp not available')
                    setError('This app only works in Telegram Mini App')
                    setIsLoading(false)
                    return
                }

                tg.ready()

                // Restore Fullscreen and Header Color
                const platform = tg.platform
                const isMobile = platform === 'android' || platform === 'ios'
                if (isMobile) {
                    tg.expand()
                    if (typeof tg.requestFullscreen === 'function') {
                        try { tg.requestFullscreen() } catch (e) { console.warn('requestFullscreen error', e) }
                    }
                }
                tg.setHeaderColor('#0a0a0a')

                const initData = tg.initData
                const user = tg.initDataUnsafe?.user

                if (!user || !initData) {
                    console.error('Telegram user data missing')
                    setError('Invalid Telegram session')
                    setIsLoading(false)
                    return
                }

                const telegramUserData: TelegramUser = {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    photo_url: user.photo_url,
                    language_code: user.language_code
                }

                setTelegramUser(telegramUserData)
                console.log('AuthProvider: Telegram user set:', telegramUserData)

                // Upsert пользователя через API с VALIDATION (initData)
                fetch('/api/upsert-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        initData: initData
                    })
                }).then(async (res) => {
                    const text = await res.text()
                    if (!res.ok) {
                        console.error('AuthProvider: User upsert API ERROR:', text)
                        // Don't block app flow for now, but log critical error
                    } else {
                        console.log('AuthProvider: User upserted via SECURE API')
                    }
                }).catch(e => {
                    console.error('AuthProvider: User upsert fetch error:', e)
                })

                // Обработка реферального кода из ?startapp=CODE
                const startParam = tg.initDataUnsafe?.start_param
                if (startParam) {
                    console.log('AuthProvider: Processing referral code:', startParam)
                    supabase.rpc('apply_referral_code', {
                        p_telegram_id: user.id.toString(),
                        p_referral_code: startParam
                    }).then(({ data, error: refError }) => {
                        if (refError) {
                            console.error('AuthProvider: Referral code error:', refError)
                        } else if (data?.success) {
                            console.log('AuthProvider: Referral code applied successfully')
                        } else if (data?.error === 'ALREADY_HAS_REFERRER') {
                            console.log('AuthProvider: User already has referrer')
                        } else {
                            console.log('AuthProvider: Referral code result:', data)
                        }
                    })
                }

                // Загружаем стейт
                await loadGameState(user.id)

            } catch (err) {
                console.error('AuthProvider: Init error:', err)
                setError('Authentication failed')
            } finally {
                setIsLoading(false)
            }
        }

        initAuth()
    }, [loadGameState])

    return (
        <AuthContext.Provider value={{ telegramUser, gameState, isLoading, error, refetch, updateGameState }}>
            {children}
        </AuthContext.Provider>
    )
}

// Хук для использования контекста
export function useAuthContext() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider')
    }
    return context
}
