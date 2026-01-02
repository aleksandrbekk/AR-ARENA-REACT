// admin-section-header.js - Единый хедер для всех разделов админки AR ARENA
// Минималистичная карточка: стрелка назад + название раздела

function createSectionHeader(title, backUrl = 'admin.html') {
    return `
        <div class="section-header-card">
            <button class="section-back-btn" onclick="window.location.href='${backUrl}'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <h2 class="section-header-title">${title}</h2>
        </div>
    `;
}

const sectionHeaderStyles = `
    .section-header-card {
        background: rgba(20, 20, 20, 0.8);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 215, 0, 0.25);
        border-radius: 16px;
        padding: 16px 18px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
    }

    .section-back-btn {
        width: 38px;
        height: 38px;
        min-width: 38px;
        background: rgba(255, 215, 0, 0.12);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        color: #FFD700;
        padding: 0;
    }

    .section-back-btn:hover {
        background: rgba(255, 215, 0, 0.2);
        border-color: rgba(255, 215, 0, 0.5);
        transform: translateX(-2px);
    }

    .section-back-btn:active {
        transform: scale(0.95);
    }

    .section-header-title {
        font-size: 19px;
        font-weight: 800;
        color: #FFD700;
        margin: 0;
        text-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
        flex: 1;
    }

    @media (max-width: 360px) {
        .section-header-card {
            padding: 14px 16px;
        }

        .section-back-btn {
            width: 36px;
            height: 36px;
            min-width: 36px;
        }

        .section-header-title {
            font-size: 17px;
        }
    }
`;

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSectionHeader, sectionHeaderStyles };
}
