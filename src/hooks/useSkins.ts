import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Skin, UserSkin } from '../types'

export function useSkins() {
  const { telegramUser } = useAuth()
  const [skins, setSkins] = useState<Skin[]>([])
  const [userSkins, setUserSkins] = useState<UserSkin[]>([])
  const [activeSkin, setActiveSkin] = useState<Skin | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSkins = useCallback(async () => {
    if (!telegramUser) return
    setLoading(true)

    try {
      // 1. Получаем user_id из таблицы users по telegram_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramUser.id)
        .single()

      if (userError || !userData) {
        console.error('Error loading user:', userError)
        setLoading(false)
        return
      }

      const userId = userData.id

      // 2. Все скины
      const { data: allSkins, error: skinsError } = await supabase
        .from('skins')
        .select('*')
        .eq('is_active', true)
        .order('id')

      if (skinsError) {
        console.error('Error loading skins:', skinsError)
      }

      // 3. Купленные скины пользователя
      const { data: owned, error: ownedError } = await supabase
        .from('user_skins')
        .select('skin_id, is_equipped, purchased_at')
        .eq('user_id', userId)

      if (ownedError) {
        console.error('Error loading user skins:', ownedError)
      }

      setSkins(allSkins || [])
      setUserSkins(owned || [])

      // 4. Активный скин
      const equipped = owned?.find(s => s.is_equipped)
      if (equipped && allSkins) {
        const active = allSkins.find(s => s.id === equipped.skin_id)
        setActiveSkin(active || null)
      }
    } catch (err) {
      console.error('Error in loadSkins:', err)
    } finally {
      setLoading(false)
    }
  }, [telegramUser])

  useEffect(() => {
    loadSkins()
  }, [loadSkins])

  // Проверка владения
  const isOwned = useCallback((skinId: number): boolean => {
    return userSkins.some(s => s.skin_id === skinId)
  }, [userSkins])

  // Проверка экипировки
  const isEquipped = useCallback((skinId: number): boolean => {
    return userSkins.some(s => s.skin_id === skinId && s.is_equipped)
  }, [userSkins])

  return {
    skins,
    userSkins,
    activeSkin,
    loading,
    isOwned,
    isEquipped,
    reload: loadSkins
  }
}
