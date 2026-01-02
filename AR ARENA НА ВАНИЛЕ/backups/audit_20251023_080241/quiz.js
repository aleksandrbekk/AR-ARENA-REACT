// Система квизов для AR ARENA
(function() {
    'use strict';

    console.log('[Quiz] Initializing quiz system...');

    // Получаем клиент Supabase
    const supabase = window.supabaseClient;

    // Состояние приложения
    const state = {
        user: null,
        quizMap: new Map(),
        completedIds: new Set(),
        current: null,
        nextAction: null,
        busy: false,
        initialized: false
    };

    // UI элементы
    const ui = {
        quizList: null,
        overlay: null,
        dialog: null,
        closeBtn: null,
        title: null,
        counter: null,
        progressFill: null,
        questionText: null,
        options: null,
        education: null,
        educationText: null,
        nextButton: null,
        final: null,
        body: null
    };

    // Инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM уже загружен
        setTimeout(init, 100);
    }

    function init() {
        console.log('[Quiz] DOM loaded, initializing...');
        cacheDom();

        if (!ui.overlay) {
            console.warn('[Quiz] Modal overlay not found, quiz system not fully initialized');
            // Даже если нет модального окна, инициализируем пользователя для возможного использования
            initUser();
            return;
        }

        bindEvents();
        initUser();
        state.initialized = true;
        console.log('[Quiz] Quiz system initialized successfully');
    }

    function initUser() {
        ensureUser()
            .then((user) => {
                state.user = user;
                console.log('[Quiz] User initialized:', user);
            })
            .catch((error) => {
                console.error('[Quiz] User initialization error:', error);
            });
    }

    function cacheDom() {
        ui.quizList = document.getElementById('quizList');
        ui.overlay = document.getElementById('quizModal');

        if (!ui.overlay) {
            console.warn('[Quiz] Modal element #quizModal not found');
            return;
        }

        ui.dialog = ui.overlay.querySelector('.quiz-dialog');
        ui.closeBtn = ui.overlay.querySelector('.quiz-close');
        ui.title = ui.overlay.querySelector('.quiz-title');
        ui.counter = ui.overlay.querySelector('.quiz-progress-counter');
        ui.progressFill = ui.overlay.querySelector('.quiz-progress-fill');
        ui.questionText = ui.overlay.querySelector('.quiz-question-text');
        ui.options = ui.overlay.querySelector('.quiz-options');
        ui.education = ui.overlay.querySelector('.quiz-education');
        ui.educationText = ui.overlay.querySelector('.quiz-education-text');
        ui.nextButton = ui.overlay.querySelector('.quiz-next');
        ui.final = ui.overlay.querySelector('.quiz-final');
        ui.body = ui.overlay.querySelector('.quiz-body');

        console.log('[Quiz] DOM elements cached:', {
            overlay: !!ui.overlay,
            dialog: !!ui.dialog,
            closeBtn: !!ui.closeBtn,
            nextButton: !!ui.nextButton
        });
    }

    function bindEvents() {
        if (ui.closeBtn) {
            ui.closeBtn.addEventListener('click', attemptClose);
        }

        if (ui.overlay) {
            ui.overlay.addEventListener('click', (event) => {
                if (event.target === ui.overlay) {
                    attemptClose();
                }
            });
        }

        if (ui.nextButton) {
            ui.nextButton.addEventListener('click', handleNextClick);
        }

        document.addEventListener('keydown', handleKeydown);
        console.log('[Quiz] Event listeners bound');
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && isOverlayVisible()) {
            attemptClose();
        }
    }

    function isOverlayVisible() {
        return ui.overlay && !ui.overlay.hidden && ui.overlay.classList.contains('is-visible');
    }

    function attemptClose() {
        if (state.busy) {
            return;
        }
        closeQuiz();
    }

    function closeQuiz() {
        if (!ui.overlay) {
            return;
        }

        console.log('[Quiz] Closing quiz modal');
        ui.overlay.classList.remove('is-visible');

        setTimeout(() => {
            if (ui.overlay) {
                ui.overlay.hidden = true;
            }
        }, 320);

        document.body.classList.remove('quiz-lock');
        resetModal();
        state.current = null;
        state.nextAction = null;
        state.busy = false;
    }

    function resetModal() {
        if (!ui.title) return;

        ui.title.textContent = '';
        ui.counter.textContent = '';
        ui.progressFill.style.width = '0%';

        if (ui.questionText) {
            ui.questionText.textContent = '';
            ui.questionText.classList.remove('quiz-fade-in');
        }

        if (ui.options) {
            ui.options.innerHTML = '';
        }

        if (ui.education) {
            ui.education.hidden = true;
            ui.education.classList.remove('is-visible');
        }

        if (ui.educationText) {
            ui.educationText.textContent = '';
        }

        if (ui.nextButton) {
            ui.nextButton.disabled = false;
            ui.nextButton.textContent = 'Далее';
            ui.nextButton.classList.remove('is-primary');
        }

        if (ui.final) {
            ui.final.hidden = true;
            ui.final.innerHTML = '';
        }
    }

    async function ensureUser() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = tgUser?.id || '190202791'; // Fallback для тестирования

        if (!supabase) {
            console.warn('[Quiz] Supabase not available, using local storage');
            return {
                telegram_id: telegramId,
                balance_ar: Number(localStorage.getItem('ar_balance') || 0)
            };
        }

        try {
            // Проверяем существующего пользователя
            const { data: existingUser, error } = await supabase
                .from('users')
                .select('id, telegram_id, balance_ar, username, first_name, last_name')
                .or(`telegram_id.eq.${telegramId},id.eq.${telegramId}`)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.warn('[Quiz] Failed to fetch user:', error);
            }

            if (existingUser) {
                return normalizeUser(existingUser, tgUser);
            }

            // Создаем нового пользователя
            const payload = {
                id: telegramId,
                telegram_id: telegramId,
                username: tgUser?.username || tgUser?.first_name || 'Игрок',
                first_name: tgUser?.first_name || null,
                last_name: tgUser?.last_name || null,
                balance_ar: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: insertedUser, error: insertError } = await supabase
                .from('users')
                .insert(payload)
                .select('id, telegram_id, balance_ar, username, first_name, last_name')
                .maybeSingle();

            if (insertError) {
                console.warn('[Quiz] Failed to create user:', insertError);
                return normalizeUser({ telegram_id: telegramId, balance_ar: 0 }, tgUser);
            }

            return normalizeUser(insertedUser, tgUser);
        } catch (error) {
            console.error('[Quiz] ensureUser error:', error);
            return {
                telegram_id: telegramId,
                balance_ar: Number(localStorage.getItem('ar_balance') || 0)
            };
        }
    }

    function normalizeUser(dbUser, tgUser) {
        const telegramId = dbUser.telegram_id || dbUser.id || tgUser?.id || '190202791';
        return {
            id: dbUser.id || null,
            telegram_id: telegramId,
            balance_ar: typeof dbUser.balance_ar === 'number' ? dbUser.balance_ar : 0,
            username: dbUser.username || tgUser?.username || tgUser?.first_name || 'Игрок'
        };
    }

    function startQuiz(quizId) {
        console.log('[Quiz] Starting quiz:', quizId);

        if (!state.quizMap.has(quizId)) {
            console.warn('[Quiz] Quiz not found in map:', quizId);
            return;
        }

        if (state.completedIds.has(quizId)) {
            showAlreadyCompleted();
            return;
        }

        const quiz = state.quizMap.get(quizId);
        const questions = normalizeQuestions(quiz.questions);

        if (!questions.length) {
            showQuizDraftNotice(quiz);
            return;
        }

        // Подготавливаем состояние квиза
        state.current = {
            id: quizId,
            quiz,
            questions,
            index: 0,
            answers: new Array(questions.length).fill(null),
            reward: quiz.reward_ar ?? quiz.reward ?? 0,
            completionMessage: quiz.completion_message || 'Спасибо за прохождение!'
        };
        state.nextAction = null;

        console.log('[Quiz] Quiz state prepared, opening overlay...');
        openOverlay();
        renderQuestion();
    }

    function openOverlay() {
        if (!ui.overlay) {
            console.error('[Quiz] Cannot open overlay - element not found');
            return;
        }

        console.log('[Quiz] Opening quiz modal');
        ui.overlay.hidden = false;
        document.body.classList.add('quiz-lock');

        // Добавляем класс видимости после небольшой задержки для анимации
        requestAnimationFrame(() => {
            ui.overlay.classList.add('is-visible');
        });
    }

    function renderQuestion() {
        if (!state.current || !ui.questionText) {
            console.error('[Quiz] Cannot render question - missing state or UI elements');
            return;
        }

        const { questions, index, quiz } = state.current;
        const question = questions[index];

        console.log(`[Quiz] Rendering question ${index + 1}/${questions.length}`);

        ui.title.textContent = quiz.title || 'Образовательный квиз';
        ui.counter.textContent = `${index + 1} / ${questions.length}`;
        ui.progressFill.style.width = `${(index / questions.length) * 100}%`;

        ui.questionText.textContent = question.question || 'Вопрос';
        ui.questionText.classList.remove('quiz-fade-in');
        void ui.questionText.offsetWidth; // Force reflow
        ui.questionText.classList.add('quiz-fade-in');

        // Очищаем и заполняем варианты ответов
        ui.options.innerHTML = '';

        if (!question.options || !question.options.length) {
            const placeholder = document.createElement('div');
            placeholder.className = 'quiz-options__placeholder';
            placeholder.textContent = 'Варианты ответов появятся скоро.';
            ui.options.appendChild(placeholder);
        } else {
            question.options.forEach((optionText, optionIndex) => {
                const optionButton = document.createElement('button');
                optionButton.type = 'button';
                optionButton.className = 'quiz-option';
                optionButton.textContent = optionText;
                optionButton.addEventListener('click', () => handleOptionSelect(optionIndex));
                ui.options.appendChild(optionButton);
            });
        }

        // Скрываем образовательный блок и финал
        if (ui.education) {
            ui.education.hidden = true;
            ui.education.classList.remove('is-visible');
        }
        if (ui.educationText) {
            ui.educationText.textContent = '';
        }
        if (ui.final) {
            ui.final.hidden = true;
            ui.final.innerHTML = '';
        }

        // Сбрасываем кнопку "Далее"
        ui.nextButton.disabled = true;
        ui.nextButton.textContent = 'Далее';
        ui.nextButton.classList.remove('is-primary');
        state.nextAction = null;
    }

    function handleOptionSelect(optionIndex) {
        if (!state.current || state.busy) {
            return;
        }

        console.log('[Quiz] Option selected:', optionIndex);

        const question = state.current.questions[state.current.index];
        const quizType = state.current.quiz.questions?.quiz_type || 'test';
        const isCorrect = question.correct_answer === optionIndex;

        console.log('[Quiz] Quiz type:', quizType);

        // Отмечаем выбранный вариант
        const buttons = Array.from(ui.options.querySelectorAll('.quiz-option'));

        if (quizType === 'survey') {
            // ОПРОС: все варианты одинаковые (золотой выбранный)
            buttons.forEach((button, index) => {
                button.disabled = true;

                if (index === optionIndex) {
                    button.classList.add('quiz-option--selected');
                } else {
                    button.classList.add('quiz-option--muted');
                }
            });
        } else {
            // ТЕСТ: правильный = зеленый, неправильный = красный
            buttons.forEach((button, index) => {
                button.disabled = true;

                // Показываем правильный ответ зеленым
                if (index === question.correct_answer) {
                    button.classList.add('quiz-option--correct');
                }

                // Если выбран неправильный ответ - показываем красным
                if (index === optionIndex && !isCorrect) {
                    button.classList.add('quiz-option--wrong');
                }

                // Остальные варианты делаем менее заметными
                if (index !== optionIndex && index !== question.correct_answer) {
                    button.classList.add('quiz-option--muted');
                }
            });
        }

        // Сохраняем ответ
        state.current.answers[state.current.index] = optionIndex;

        // Показываем образовательный текст
        showEducation(isCorrect);
    }

    function showEducation(isCorrect) {
        if (!state.current) return;

        const question = state.current.questions[state.current.index];
        const answerIndex = state.current.answers[state.current.index];

        // Получаем текст пояснения из выбранного варианта ответа или общий текст
        let text = '';
        if (question.options_data && question.options_data[answerIndex]) {
            text = question.options_data[answerIndex].education_text || '';
        }
        if (!text) {
            text = question.education_text || question.explanation || 'Спасибо за ответ!';
        }

        ui.educationText.textContent = text;
        ui.education.hidden = false;

        // Добавляем класс для стилизации (зеленый/красный фон)
        ui.education.classList.remove('education--correct', 'education--wrong');
        if (isCorrect !== undefined) {
            ui.education.classList.add(isCorrect ? 'education--correct' : 'education--wrong');
        }

        requestAnimationFrame(() => {
            ui.education.classList.add('is-visible');
        });

        // Определяем следующее действие
        const isLast = state.current.index + 1 >= state.current.questions.length;
        state.nextAction = isLast ? 'finish' : 'next-question';
        ui.nextButton.textContent = isLast ? 'Завершить' : 'Далее';
        ui.nextButton.disabled = false;
    }

    function handleNextClick() {
        if (!state.current || !state.nextAction || state.busy) {
            return;
        }

        console.log('[Quiz] Next button clicked, action:', state.nextAction);

        if (state.nextAction === 'next-question') {
            state.current.index += 1;
            state.nextAction = null;
            renderQuestion();
            return;
        }

        if (state.nextAction === 'finish') {
            showCompletion();
            return;
        }

        if (state.nextAction === 'close') {
            closeQuiz();
        }
    }

    function showCompletion() {
        if (!state.current) return;

        console.log('[Quiz] Showing completion screen');

        state.busy = true;
        ui.nextButton.disabled = true;
        ui.nextButton.textContent = 'Начисляем...';
        ui.progressFill.style.width = '100%';

        // Скрываем вопросы и образовательный блок
        if (ui.options) ui.options.innerHTML = '';
        if (ui.education) {
            ui.education.hidden = true;
            ui.education.classList.remove('is-visible');
        }

        // Показываем финальный экран
        ui.final.hidden = false;
        ui.final.innerHTML = `
            <div class="quiz-final__card quiz-final__card--loading">
                <div class="quiz-final__spinner"></div>
                <p>Фиксируем результат и начисляем награду...</p>
            </div>
        `;

        // Сохраняем результат
        persistCompletion()
            .then((result) => {
                renderFinalSuccess(result);
                state.busy = false;
                state.nextAction = 'close';
                ui.nextButton.disabled = false;
                ui.nextButton.textContent = 'Забрать награду';
                ui.nextButton.classList.add('is-primary');
                markQuizAsCompleted(state.current.id);
            })
            .catch((error) => {
                console.error('[Quiz] Completion error:', error);
                renderFinalError(error);
                state.busy = false;
                state.nextAction = 'close';
                ui.nextButton.disabled = false;
                ui.nextButton.textContent = 'Закрыть';
            });
    }

    async function persistCompletion() {
        if (!state.current || !state.user || !supabase) {
            throw new Error('Нет соединения с базой данных');
        }

        const quiz = state.current.quiz;
        const reward = state.current.reward || 0;
        const userId = state.user.telegram_id || state.user.id || '190202791';

        console.log('[Quiz] Persisting completion for user:', userId, 'quiz:', quiz.id);

        // Проверяем, не был ли квиз уже пройден
        const { data: existing, error: existingError } = await supabase
            .from('task_completions')
            .select('id')
            .eq('user_id', userId)
            .eq('task_id', String(quiz.id))
            .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
            console.warn('[Quiz] Completion check error:', existingError);
        }

        if (existing) {
            console.log('[Quiz] Quiz already completed');
            state.completedIds.add(String(quiz.id));
            return {
                alreadyCompleted: true,
                reward: 0,
                balance: state.user.balance_ar
            };
        }

        const timestamp = new Date().toISOString();

        // Сохраняем прохождение квиза
        const { error: insertCompletionError } = await supabase
            .from('task_completions')
            .insert({
                user_id: userId,
                task_id: String(quiz.id),
                completed_at: timestamp
            });

        if (insertCompletionError) {
            console.error('[Quiz] Failed to save completion:', insertCompletionError);
            throw new Error('Не удалось сохранить результат');
        }

        // Обновляем баланс пользователя
        const newBalance = (state.user.balance_ar || 0) + reward;

        const { error: balanceError } = await supabase
            .from('users')
            .update({
                balance_ar: newBalance,
                updated_at: timestamp
            })
            .eq('telegram_id', userId);

        if (balanceError) {
            console.warn('[Quiz] Balance update error:', balanceError);
        }

        // Записываем транзакцию
        const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: state.user.id || userId,
                type: 'quiz_reward',
                amount: reward,
                description: `Награда за квиз "${quiz.title || 'AR ARENA'}"`,
                created_at: timestamp
            });

        if (transactionError) {
            console.warn('[Quiz] Transaction log error:', transactionError);
        }

        // Обновляем локальное состояние
        state.user.balance_ar = newBalance;
        state.completedIds.add(String(quiz.id));
        updateBalanceDisplay(newBalance);

        console.log('[Quiz] Completion saved, new balance:', newBalance);

        return {
            alreadyCompleted: false,
            reward,
            balance: newBalance
        };
    }

    function renderFinalSuccess(result) {
        if (!state.current) return;

        const reward = result.reward || 0;
        const quizType = state.current.quiz.type || 'ОПРОС';

        ui.final.innerHTML = `
            <div class="quiz-final__card">
                <div class="quiz-final__icon">
                    <img src="icons/yes.png" alt="Success" style="width: 64px; height: 64px;">
                </div>
                <h3 class="quiz-final__headline">Квиз пройден!</h3>
                <div class="quiz-final__reward" data-reward="${reward}">+${reward} AR</div>
                <button class="quiz-final__btn" onclick="window.quizModule.close()">продолжить</button>
            </div>
        `;

        // Анимация начисления монет
        const rewardElement = ui.final.querySelector('.quiz-final__reward');
        animateReward(rewardElement, reward);

        // Запускаем конфетти
        launchConfetti();
    }

    function renderFinalError(error) {
        ui.final.innerHTML = `
            <div class="quiz-final__card quiz-final__card--error">
                <div class="quiz-final__burst">⚠️</div>
                <h3 class="quiz-final__headline">Не удалось сохранить результат</h3>
                <p class="quiz-final__message">${error?.message || 'Попробуйте пройти квиз позже.'}</p>
            </div>
        `;
    }

    function updateBalanceDisplay(balance) {
        const numeric = Number(balance) || 0;

        // Сохраняем в localStorage
        try {
            localStorage.setItem('ar_balance', String(numeric));
        } catch (error) {
            console.warn('[Quiz] Unable to persist balance locally:', error);
        }

        // Обновляем все элементы отображения баланса
        const targets = document.querySelectorAll('#userBalance, #headerBalance');
        targets.forEach((element) => {
            element.textContent = numeric;
        });

        console.log('[Quiz] Balance display updated:', numeric);
    }

    function markQuizAsCompleted(quizId) {
        const card = document.querySelector(`.task-card[data-quiz-id="${quizId}"]`);
        if (!card) return;

        card.classList.add('quiz-card--completed');
        const button = card.querySelector('.task-button');
        if (button) {
            button.textContent = 'Пройден';
            button.disabled = true;
        }
    }

    function animateReward(element, targetValue) {
        if (!element) return;

        const duration = 900;
        const start = performance.now();

        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const value = Math.round(progress * targetValue);
            element.textContent = `+${value} AR`;

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    function launchConfetti() {
        if (!ui.dialog) return;

        const confettiLayer = document.createElement('div');
        confettiLayer.className = 'quiz-confetti';

        const pieces = 32;
        for (let i = 0; i < pieces; i++) {
            const piece = document.createElement('span');
            piece.className = 'quiz-confetti__piece';
            piece.style.setProperty('--x', `${Math.random() * 100}%`);
            piece.style.setProperty('--delay', `${Math.random() * 0.4}s`);
            piece.style.setProperty('--duration', `${1.5 + Math.random()}s`);
            confettiLayer.appendChild(piece);
        }

        ui.dialog.appendChild(confettiLayer);
        setTimeout(() => confettiLayer.remove(), 2500);
    }

    function normalizeQuestions(raw) {
        if (!raw) return [];

        let value = raw;

        // Если это строка, пытаемся распарсить JSON
        if (typeof raw === 'string') {
            try {
                value = JSON.parse(raw);
            } catch (error) {
                console.warn('[Quiz] Failed to parse questions JSON:', error);
                return [];
            }
        }

        // Если это массив
        if (Array.isArray(value)) {
            return value.map(normalizeQuestion).filter(Boolean);
        }

        // Если это объект с полем questions
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value.questions)) {
                return value.questions.map(normalizeQuestion).filter(Boolean);
            }
            // Пробуем преобразовать объект в массив
            return Object.values(value).map(normalizeQuestion).filter(Boolean);
        }

        return [];
    }

    function normalizeQuestion(question) {
        if (!question) return null;

        const text = (question.question || question.text || '').toString().trim();
        const optionsSource = Array.isArray(question.options)
            ? question.options
            : Array.isArray(question.answers)
                ? question.answers
                : Array.isArray(question.choices)
                    ? question.choices
                    : [];

        const options = optionsSource.map((option) => option && option.toString().trim()).filter(Boolean);
        const education = (question.education_text || question.education || question.explanation || '').toString().trim();

        if (!text || options.length < 1) {
            return null;
        }

        return {
            question: text,
            options,
            education_text: education
        };
    }

    function showAlreadyCompleted() {
        if (!ui.overlay) {
            alert('Вы уже прошли этот квиз');
            return;
        }

        // Показываем уведомление
        const toast = document.createElement('div');
        toast.className = 'quiz-toast';
        toast.textContent = 'Вы уже прошли этот квиз';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
    }

    function showQuizDraftNotice(quiz) {
        if (!ui.overlay) {
            alert('Квиз еще в разработке');
            return;
        }

        openOverlay();

        ui.final.hidden = false;
        ui.final.innerHTML = `
            <div class="quiz-final__card">
                <div class="quiz-final__burst">🔧</div>
                <h3 class="quiz-final__headline">Квиз в разработке</h3>
                <p class="quiz-final__message">Вопросы для квиза "${quiz.title || 'AR ARENA'}" еще готовятся. Загляните позже.</p>
            </div>
        `;

        ui.nextButton.textContent = 'Закрыть';
        ui.nextButton.disabled = false;
        state.nextAction = 'close';
    }

    // ======= ГЛОБАЛЬНЫЕ ФУНКЦИИ =======

    // Инициализация системы квизов
    window.initQuizSystem = async function() {
        console.log('[Quiz] External init request');

        if (!state.initialized) {
            console.log('[Quiz] System not initialized, initializing now...');
            cacheDom();

            if (ui.overlay) {
                bindEvents();
            }

            state.initialized = true;
        }

        if (!state.user) {
            try {
                state.user = await ensureUser();
                console.log('[Quiz] User initialized via initQuizSystem:', state.user);
            } catch (error) {
                console.error('[Quiz] Failed to initialize user:', error);
            }
        }

        return state.user;
    };

    // Запуск образовательного квиза
    window.startEducationalQuiz = async function(quizId) {
        console.log('[Quiz] External start request for quiz:', quizId);

        // Убедимся, что система инициализирована
        if (!state.initialized) {
            await window.initQuizSystem();
        }

        // Проверяем наличие квиза в памяти
        if (!state.quizMap.has(quizId)) {
            console.log('[Quiz] Quiz not in map, loading from DB...');
            await loadSingleQuiz(quizId);
            return;
        }

        startQuiz(quizId);
    };

    // Загрузка одного квиза из БД
    async function loadSingleQuiz(quizId) {
        if (!supabase) {
            alert('Нет подключения к базе данных');
            return;
        }

        try {
            console.log('[Quiz] Loading quiz from DB:', quizId);

            const { data: quiz, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', quizId)
                .eq('type', 'educational_quiz')
                .single();

            if (error || !quiz) {
                console.error('[Quiz] Failed to load quiz:', error);
                alert('Не удалось загрузить квиз');
                return;
            }

            console.log('[Quiz] Quiz loaded from DB:', quiz);

            // Инициализируем пользователя если еще не инициализирован
            if (!state.user) {
                state.user = await ensureUser();
            }

            // Загружаем информацию о прохождении
            await hydrateCompletions();

            // Сохраняем квиз в карте и запускаем
            state.quizMap.set(String(quiz.id), quiz);
            startQuiz(String(quiz.id));

        } catch (error) {
            console.error('[Quiz] loadSingleQuiz error:', error);
            alert('Ошибка загрузки квиза');
        }
    }

    // Загрузка информации о пройденных квизах
    async function hydrateCompletions() {
        if (!supabase || !state.user) return;

        const userId = state.user.telegram_id || state.user.id || '190202791';

        const { data, error } = await supabase
            .from('task_completions')
            .select('task_id')
            .eq('user_id', userId);

        if (error) {
            console.warn('[Quiz] Failed to fetch completions:', error);
            return;
        }

        state.completedIds = new Set((data || []).map((row) => String(row.task_id)));
        console.log('[Quiz] Completions loaded:', state.completedIds.size);
    }

    // Экспорт для отладки
    window.QuizDebug = {
        state,
        ui,
        init,
        startQuiz,
        openOverlay
    };

})();