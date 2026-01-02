// Управление квизами - Логика
console.log('[AdminQuizzes] Initializing...');

const ADMIN_ID = '190202791';
let quizzes = [];
let currentFilters = {
    type: 'all',
    popularity: 'all'
};
let quizToDelete = null;

// Инициализация
window.addEventListener('DOMContentLoaded', async () => {
    console.log('[AdminQuizzes] DOM loaded');

    // Проверка прав доступа
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();

    const userId = tg?.initDataUnsafe?.user?.id?.toString() || '190202791';

    if (userId !== ADMIN_ID) {
        alert('Доступ запрещен');
        window.location.href = 'index.html';
        return;
    }

    // Загружаем квизы
    await loadQuizzes();
});

// Загрузка квизов
async function loadQuizzes() {
    console.log('[AdminQuizzes] Loading quizzes...');

    const loader = document.getElementById('loader');
    const grid = document.getElementById('quizzesGrid');
    const emptyState = document.getElementById('emptyState');

    // СРАЗУ СКРЫТЬ ВСЁ И ОЧИСТИТЬ
    loader.style.display = 'block';
    grid.style.display = 'none';
    grid.innerHTML = ''; // ОЧИСТИТЬ!
    emptyState.style.display = 'none';

    try {
        const supabase = window.supabaseClient || window.db;

        if (!supabase) {
            throw new Error('Supabase не инициализирован');
        }

        // Загружаем квизы
        const { data: quizzesData, error: quizzesError } = await supabase
            .from('tasks')
            .select('*')
            .eq('type', 'educational_quiz')
            .order('created_at', { ascending: false });

        if (quizzesError) throw quizzesError;

        console.log('[AdminQuizzes] Loaded quizzes:', quizzesData?.length);

        // Загружаем статистику прохождений
        const { data: completions, error: completionsError } = await supabase
            .from('task_completions')
            .select('task_id, user_id');

        if (completionsError) {
            console.warn('[AdminQuizzes] Failed to load completions:', completionsError);
        }

        // Считаем статистику для каждого квиза
        quizzes = (quizzesData || []).map(quiz => {
            const quizCompletions = (completions || []).filter(c => c.task_id === quiz.id);
            const totalUsers = new Set(quizCompletions.map(c => c.user_id)).size;

            return {
                ...quiz,
                stats: {
                    completions: totalUsers,
                    completionRate: 0, // TODO: рассчитать когда будет статистика попыток
                    avgScore: 0 // TODO: рассчитать средний балл
                }
            };
        });

        loader.style.display = 'none';

        if (quizzes.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            grid.style.display = 'grid';
            renderQuizzes();
        }

    } catch (error) {
        console.error('[AdminQuizzes] Error:', error);
        loader.innerHTML = `
            <img src="icons/close1.png" alt="Error" style="opacity: 0.3;">
            <div class="loader-text" style="color: #ef4444;">Ошибка загрузки: ${error.message}</div>
        `;
    }
}

// Отрисовка квизов
function renderQuizzes() {
    const grid = document.getElementById('quizzesGrid');

    if (quizzes.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <img src="icons/QWIZ.png" alt="Empty" style="width: 80px; opacity: 0.3; margin-bottom: 15px;">
                <div style="color: rgba(255,255,255,0.5);">Квизов не найдено</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = quizzes.map(quiz => {
        const quizType = quiz.questions?.quiz_type || 'test';
        const questionsCount = quiz.questions?.questions?.length || 0;
        const completions = quiz.stats.completions;
        const completionRate = quiz.stats.completionRate;

        return `
            <div class="quiz-card">
                <div class="quiz-card-header">
                    <div class="quiz-icon">
                        <img src="icons/QWIZ.png" alt="Quiz">
                    </div>
                    <div class="quiz-header-content" style="flex: 1; min-width: 0; margin-right: 12px;">
                        <div class="quiz-title" style="font-size: 13px; font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${quiz.title || 'Без названия'}</div>
                        <div class="quiz-subtitle" style="font-size: 11px; color: rgba(255,255,255,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${quiz.description || ''}</div>
                    </div>

                    <!-- Кнопки действий перенесены вверх -->
                    <div class="quiz-actions" style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button class="action-btn" onclick="editQuiz('${quiz.id}')" title="Редактировать">
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="action-btn" onclick="duplicateQuiz('${quiz.id}')" title="Дублировать">
                            <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="action-btn delete" onclick="deleteQuiz('${quiz.id}')" title="Удалить">
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>

                <div class="quiz-stats">
                    <div class="stat-item">
                        <div class="stat-label">
                            <img src="icons/users.png" alt="Users">
                            Прошли
                        </div>
                        <div class="stat-value">${completions}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">
                            <img src="icons/QWIZ.png" alt="Questions">
                            Вопросов
                        </div>
                        <div class="stat-value">${questionsCount}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">
                            <img src="icons/arcoin.png?v=1760028100" alt="Reward">
                            Награда
                        </div>
                        <div class="stat-value" style="color: #FFD700;">${quiz.reward_ar || 0} AR</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">
                            <img src="icons/analytics-chart.png" alt="Rate">
                            Завершаемость
                        </div>
                        <div class="stat-value ${completionRate >= 70 ? 'good' : completionRate >= 40 ? 'medium' : 'bad'}">
                            ${completionRate}%
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}


// Создать квиз
window.createQuiz = function() {
    console.log('[AdminQuizzes] Opening quiz constructor');
    // Перенаправляем на конструктор квизов для создания нового квиза
    window.location.href = 'qc.html';
};

// Редактировать квиз
window.editQuiz = function(quizId) {
    console.log('[AdminQuizzes] Edit quiz:', quizId);
    // Перенаправляем на конструктор с ID квиза для редактирования
    window.location.href = `qc.html?edit=${quizId}`;
};

// Дублировать квиз
window.duplicateQuiz = async function(quizId) {
    console.log('[AdminQuizzes] Duplicate quiz:', quizId);

    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    try {
        const supabase = window.supabaseClient || window.db;

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                title: quiz.title + ' (копия)',
                description: quiz.description,
                type: quiz.type,
                category: quiz.category,
                reward_ar: quiz.reward_ar,
                reward_coins: quiz.reward_coins,
                questions: quiz.questions,
                max_completions: quiz.max_completions,
                cooldown_hours: quiz.cooldown_hours,
                priority: quiz.priority,
                is_active: false, // Копия неактивна
                requirements: quiz.requirements
            })
            .select();

        if (error) throw error;

        console.log('[AdminQuizzes] Quiz duplicated');
        alert('Квиз успешно дублирован!');
        await loadQuizzes();

    } catch (error) {
        console.error('[AdminQuizzes] Duplicate error:', error);
        alert('Ошибка дублирования: ' + error.message);
    }
};

// Удалить квиз
window.deleteQuiz = function(quizId) {
    console.log('[AdminQuizzes] Delete quiz:', quizId);
    quizToDelete = quizId;
    document.getElementById('deleteModal').classList.add('active');
};

// Закрыть модальное окно
window.closeDeleteModal = function() {
    document.getElementById('deleteModal').classList.remove('active');
    quizToDelete = null;
};

// Подтвердить удаление
window.confirmDelete = async function() {
    if (!quizToDelete) return;

    console.log('[AdminQuizzes] Confirming delete:', quizToDelete);

    try {
        const supabase = window.supabaseClient || window.db;

        // Удаляем квиз
        const { error: deleteQuizError } = await supabase
            .from('tasks')
            .delete()
            .eq('id', quizToDelete);

        if (deleteQuizError) throw deleteQuizError;

        // Удаляем все прохождения
        const { error: deleteCompletionsError } = await supabase
            .from('task_completions')
            .delete()
            .eq('task_id', quizToDelete);

        if (deleteCompletionsError) {
            console.warn('[AdminQuizzes] Failed to delete completions:', deleteCompletionsError);
        }

        console.log('[AdminQuizzes] Quiz deleted');
        closeDeleteModal();

        // ОЧИСТИТЬ СЕТКУ ПЕРЕД ЗАГРУЗКОЙ
        const grid = document.getElementById('quizzesGrid');
        if (grid) grid.innerHTML = '';

        await loadQuizzes();

    } catch (error) {
        console.error('[AdminQuizzes] Delete error:', error);
        alert('Ошибка удаления: ' + error.message);
    }
};

console.log('[AdminQuizzes] Script loaded');
