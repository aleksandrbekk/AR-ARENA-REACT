// AR ARENA - SPA Router
// Мгновенные переходы без перезагрузки страницы

class Router {
    constructor() {
        this.routes = {};
        this.currentPage = null;
        this.contentCache = {};
        this.init();
    }

    init() {
        // Перехватываем клики по ссылкам
        document.addEventListener('click', (e) => {
            if (e.target.matches('.bottom-nav a, a[href$=".html"]')) {
                e.preventDefault();
                const href = e.target.getAttribute('href');
                this.navigate(href);
            }
        });

        // Кнопка "Назад" в браузере
        window.addEventListener('popstate', (e) => {
            this.loadPage(window.location.pathname);
        });

        console.log('🚀 Router инициализирован');
    }

    async navigate(url) {
        // Меняем URL без перезагрузки
        history.pushState(null, '', url);
        await this.loadPage(url);
    }

    async loadPage(url) {
        const pageName = url.replace('.html', '').replace('/', '') || 'index';

        // Проверяем кэш
        if (this.contentCache[pageName]) {
            this.render(this.contentCache[pageName]);
            return;
        }

        try {
            // Загружаем HTML страницы
            const response = await fetch(url);
            const html = await response.text();

            // Парсим HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Извлекаем только контент (без header и nav)
            const content = doc.querySelector('.content') || doc.querySelector('main') || doc.body;

            // Кэшируем
            this.contentCache[pageName] = content.innerHTML;

            // Рендерим
            this.render(content.innerHTML);

            // Подсвечиваем активную вкладку
            this.updateActiveTab(url);

        } catch (error) {
            console.error('Ошибка загрузки страницы:', error);
            // Fallback на обычный переход
            window.location.href = url;
        }
    }

    render(html) {
        const container = document.getElementById('app-content') || document.querySelector('main');
        if (container) {
            // Плавная анимация
            container.style.opacity = '0';
            setTimeout(() => {
                container.innerHTML = html;
                container.style.opacity = '1';
                // Переинициализируем скрипты если нужно
                this.initPageScripts();
            }, 100);
        }
    }

    updateActiveTab(url) {
        // Убираем активный класс со всех
        document.querySelectorAll('.bottom-nav a').forEach(link => {
            link.classList.remove('active');
        });

        // Добавляем активный класс нужной вкладке
        const activeLink = document.querySelector(`.bottom-nav a[href="${url}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    initPageScripts() {
        // Здесь переинициализируем JS для конкретных страниц
        if (window.location.pathname.includes('tasks')) {
            // Инициализация tasks.js
            if (typeof initTasks === 'function') initTasks();
        }
        if (window.location.pathname.includes('shop')) {
            // Инициализация shop.js
            if (typeof initShop === 'function') initShop();
        }
    }
}

// Запускаем роутер
document.addEventListener('DOMContentLoaded', () => {
    window.appRouter = new Router();
});