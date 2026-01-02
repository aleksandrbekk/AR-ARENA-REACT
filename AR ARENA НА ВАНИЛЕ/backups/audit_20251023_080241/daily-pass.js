// Daily Pass Logic with Supabase Integration

let currentUser = null;
let currentTab = 'free';
let dailyPassData = {
    currentDay: 1,
    claimedDays: [],
    isVip: false,
    lastClaimDate: null
};

// FREE and VIP rewards
const FREE_REWARDS = [50, 100, 150, 200, 250, 300, 350];
const VIP_REWARDS = [100, 200, 300, 500, 750, 1000, 2000];

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Daily Pass] Initializing...');

    try {
        // Wait for auth
        if (typeof window.waitForAuth === 'function') {
            currentUser = await window.waitForAuth();
            console.log('[Daily Pass] User authenticated:', currentUser?.id);
        } else {
            console.warn('[Daily Pass] Auth not available, using demo mode');
        }

        // Load data
        await loadDailyPassData();

        // Initialize UI
        switchTab('free');

    } catch (error) {
        console.error('[Daily Pass] Initialization error:', error);
        showToast('Ошибка загрузки данных', false);
    }
});

// Load daily pass data from Supabase
async function loadDailyPassData() {
    if (!currentUser || !window.supabase) {
        console.log('[Daily Pass] Using demo data');
        // Demo mode - use hardcoded data
        dailyPassData = {
            currentDay: 3,
            claimedDays: [1, 2],
            isVip: false,
            lastClaimDate: new Date().toISOString()
        };
        updateUI();
        return;
    }

    try {
        // Check if user has VIP status
        const { data: userData, error: userError } = await window.supabase
            .from('users')
            .select('is_vip')
            .eq('telegram_id', currentUser.id)
            .single();

        if (userError) throw userError;

        dailyPassData.isVip = userData?.is_vip || false;

        // Get daily pass progress
        const { data: passData, error: passError } = await window.supabase
            .from('daily_pass_progress')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (passError && passError.code !== 'PGRST116') {
            throw passError;
        }

        if (passData) {
            dailyPassData.currentDay = passData.current_day || 1;
            dailyPassData.claimedDays = passData.claimed_days || [];
            dailyPassData.lastClaimDate = passData.last_claim_date;

            // Check if streak should be reset (missed a day)
            const lastClaim = new Date(passData.last_claim_date);
            const now = new Date();
            const daysDiff = Math.floor((now - lastClaim) / (1000 * 60 * 60 * 24));

            if (daysDiff > 1) {
                // Streak broken, reset
                console.log('[Daily Pass] Streak broken, resetting...');
                await resetProgress();
            }
        } else {
            // First time user
            await initializeProgress();
        }

        updateUI();

    } catch (error) {
        console.error('[Daily Pass] Load error:', error);
    }
}

// Initialize progress for new user
async function initializeProgress() {
    if (!currentUser || !window.supabase) return;

    const { error } = await window.supabase
        .from('daily_pass_progress')
        .insert({
            user_id: currentUser.id,
            current_day: 1,
            claimed_days: [],
            last_claim_date: null
        });

    if (error) {
        console.error('[Daily Pass] Init error:', error);
    }
}

// Reset progress
async function resetProgress() {
    dailyPassData.currentDay = 1;
    dailyPassData.claimedDays = [];
    dailyPassData.lastClaimDate = null;

    if (!currentUser || !window.supabase) return;

    const { error } = await window.supabase
        .from('daily_pass_progress')
        .update({
            current_day: 1,
            claimed_days: [],
            last_claim_date: null
        })
        .eq('user_id', currentUser.id);

    if (error) {
        console.error('[Daily Pass] Reset error:', error);
    }
}

// Switch between FREE and VIP tabs
function switchTab(tab) {
    currentTab = tab;

    // Update buttons
    const freeBtn = document.getElementById('tabFree');
    const vipBtn = document.getElementById('tabVip');

    if (tab === 'free') {
        freeBtn.classList.add('active');
        vipBtn.classList.remove('active');
    } else {
        freeBtn.classList.remove('active');
        vipBtn.classList.add('active');
    }

    // Update content
    const freeContent = document.getElementById('freeContent');
    const vipContent = document.getElementById('vipContent');

    if (tab === 'free') {
        freeContent.classList.add('active');
        vipContent.classList.remove('active');
    } else {
        freeContent.classList.remove('active');
        vipContent.classList.add('active');
    }

    updateUI();
}

// Update UI based on current state
function updateUI() {
    updateDayCards('free');
    updateDayCards('vip');
}

// Update day cards
function updateDayCards(mode) {
    const contentId = mode === 'free' ? 'freeContent' : 'vipContent';
    const content = document.getElementById(contentId);
    if (!content) return;

    const cards = content.querySelectorAll('.day-card');

    cards.forEach((card, index) => {
        const day = index + 1;
        const isClaimed = dailyPassData.claimedDays.includes(day);
        const isActive = day === dailyPassData.currentDay && !isClaimed;
        const isLocked = day > dailyPassData.currentDay;

        // Remove all state classes
        card.classList.remove('completed', 'active', 'locked');

        // Add appropriate state
        if (isClaimed) {
            card.classList.add('completed');
        } else if (isActive) {
            card.classList.add('active');
        } else if (isLocked) {
            card.classList.add('locked');
        }
    });
}

// Handle claim
async function handleClaim(day, reward, isVip) {
    console.log(`[Daily Pass] Claim attempt: Day ${day}, Reward ${reward}, VIP: ${isVip}`);

    // Validate
    if (dailyPassData.claimedDays.includes(day)) {
        showToast('Уже забрано!', false);
        return;
    }

    if (day !== dailyPassData.currentDay) {
        showToast('Заберите награды по порядку', false);
        return;
    }

    if (isVip && !dailyPassData.isVip) {
        showToast('Требуется VIP статус', false);
        return;
    }

    // Prevent double-claiming on same day
    if (dailyPassData.lastClaimDate) {
        const lastClaim = new Date(dailyPassData.lastClaimDate);
        const now = new Date();
        const isSameDay = lastClaim.toDateString() === now.toDateString();

        if (isSameDay) {
            showToast('Возвращайся завтра!', false);
            return;
        }
    }

    try {
        // Update local state
        dailyPassData.claimedDays.push(day);
        dailyPassData.currentDay = Math.min(day + 1, 7);
        dailyPassData.lastClaimDate = new Date().toISOString();

        // Save to Supabase
        if (currentUser && window.supabase) {
            // Update progress
            const { error: progressError } = await window.supabase
                .from('daily_pass_progress')
                .update({
                    current_day: dailyPassData.currentDay,
                    claimed_days: dailyPassData.claimedDays,
                    last_claim_date: dailyPassData.lastClaimDate
                })
                .eq('user_id', currentUser.id);

            if (progressError) throw progressError;

            // Add reward to user balance
            const { error: balanceError } = await window.supabase.rpc('add_balance', {
                user_telegram_id: currentUser.id,
                amount: reward
            });

            if (balanceError) throw balanceError;

            // Create transaction record
            const { error: txError } = await window.supabase
                .from('transactions')
                .insert({
                    user_id: currentUser.id,
                    type: 'daily_reward',
                    amount: reward,
                    description: `Ежедневная награда - День ${day}${isVip ? ' (VIP)' : ''}`
                });

            if (txError) console.error('[Daily Pass] Transaction error:', txError);
        }

        // Update UI
        updateUI();

        // Show success toast
        showToast(`Получено <strong>+${reward} AR</strong> монет!`, true);

        // If day 7 completed, show special message
        if (day === 7) {
            setTimeout(() => {
                showToast('🎉 Поздравляем! Цикл завершен!', true);
            }, 1000);
        }

    } catch (error) {
        console.error('[Daily Pass] Claim error:', error);
        showToast('Ошибка при получении награды', false);

        // Revert local state
        dailyPassData.claimedDays = dailyPassData.claimedDays.filter(d => d !== day);
        dailyPassData.currentDay = day;
        updateUI();
    }
}

// Show toast notification
function showToast(message, isSuccess = true) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    toast.innerHTML = `
        <img src="icons/${isSuccess ? 'kiy.png' : 'lock.png'}" alt="Icon" class="toast-icon">
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// Export for HTML onclick
window.switchTab = switchTab;
window.handleClaim = handleClaim;
