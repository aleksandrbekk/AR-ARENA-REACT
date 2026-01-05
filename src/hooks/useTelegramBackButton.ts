import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * useTelegramBackButton — управляет системной кнопкой "Назад" в Telegram Mini App
 *
 * - Показывает BackButton на всех страницах кроме главной (/)
 * - При клике делает navigate(-1) или переход на /
 * - Автоматически скрывает на главной странице
 */
// Страницы, которые сами управляют BackButton
const SELF_MANAGED_PAGES = ['/live-test', '/admin', '/shop', '/full-crm', '/skins', '/partners']

export function useTelegramBackButton() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    const isHomePage = location.pathname === '/'
    const isSelfManaged = SELF_MANAGED_PAGES.includes(location.pathname)

    // Если страница сама управляет BackButton — не трогаем
    if (isSelfManaged) return

    if (isHomePage) {
      // На главной — скрываем кнопку назад
      tg.BackButton.hide()
    } else {
      // На других страницах — показываем
      tg.BackButton.show()

      const handleBack = () => {
        // Если есть история — назад, иначе на главную
        if (window.history.length > 1) {
          navigate(-1)
        } else {
          navigate('/')
        }
      }

      tg.BackButton.onClick(handleBack)

      // Cleanup
      return () => {
        tg.BackButton.offClick(handleBack)
      }
    }
  }, [location.pathname, navigate])
}
