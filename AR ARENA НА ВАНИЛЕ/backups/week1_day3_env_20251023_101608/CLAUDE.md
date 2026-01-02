# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start the Telegram bot locally
npm start

# Start with hot reload
npm run dev
```

### Deployment
```bash
# Deploy single file to production server
scp ~/Desktop/AR\ ARENA/[filename] root@83.166.246.186:/var/www/neurocamp/arena/

# Deploy multiple files
./upload.sh

# Full deployment script
./deploy.sh
```

### Server Management
```bash
# SSH to production server
ssh root@83.166.246.186

# Navigate to project directory on server
cd /var/www/neurocamp/arena

# Start bot on server with PM2
pm2 start bot.js --name ar-arena-bot
pm2 restart ar-arena-bot
pm2 logs ar-arena-bot
```

## Architecture

### Core System Design
AR ARENA is a Telegram Mini App game with the following architecture:
- **Frontend**: Pure HTML/CSS/JS served as Telegram WebApp
- **Backend**: Supabase for database and authentication
- **Bot**: Telegraf-based bot (bot.js) handles Telegram interactions
- **Auth**: Custom auth.js handles Telegram WebApp authentication and user session

### Authentication Flow
1. User opens bot → bot.js sends webapp button with initData
2. WebApp loads → auth.js validates Telegram initData
3. auth.js creates/updates user in Supabase using telegram_id as primary key
4. All subsequent API calls use the authenticated Supabase client

### Database Schema
Key tables in Supabase:
- `users`: Core user data (telegram_id, username, balance_ar, referrer_id)
- `tasks`: Task definitions with JSONB questions field for quizzes
- `task_completions`: Tracks user task completions (user_id, task_id, completed_at)
- `transactions`: Financial transaction history
- `referral_relations`: Multi-level referral tracking

### File Organization
- **Main Pages**: index.html, tasks.html, shop.html, referral.html, admin.html, vault.html
- **Core Scripts**: auth.js (authentication), referral.js (referral system), supabase-client.js (DB connection)
- **Bot**: bot.js (Telegram bot), bot.py (alternative implementation)
- **Assets**: /icons/ folder contains all UI icons (no external CDN usage)

## Configuration

### Supabase Connection
```javascript
// Anon key (для клиентских запросов)
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';

// Service role key (для серверных операций, полный доступ)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';

// Database connection
const DB_HOST = 'db.syxjkircmiwpnpagznay.supabase.co';
const DB_PORT = 5432;
const DB_NAME = 'postgres';
const DB_USER = 'postgres';
const DB_PASSWORD = 'jobjin-1wirto-pujQaw';
const DB_URL = 'postgresql://postgres:jobjin-1wirto-pujQaw@db.syxjkircmiwpnpagznay.supabase.co:5432/postgres';
```

### Production Environment
- URL: https://ar.skillnetwork.pro
- Server: 83.166.246.186
- Path: /var/www/neurocamp/arena/
- Admin Telegram ID: 190202791
- Bot: @ARARENA_BOT
- Required channels: @premium_news, @AlexRich83

## Design System

### Visual Style
- Background: #0a0a0a (pure black)
- Primary: #FFD700 (gold)
- Glass morphism cards with backdrop-filter: blur(10px)
- Border radius: 15-20px for cards, 12-15px for buttons
- Box shadows: 0 10px 30px rgba(255,215,0,0.3)

### Button Gradients
```css
/* Main action buttons */
background: linear-gradient(135deg, #FFD700, #FFA500);

/* Task buttons */
background: linear-gradient(135deg, #667EEA, #764BA2);

/* Success buttons */
background: linear-gradient(135deg, #11998E, #38EF7D);

/* Warning buttons */
background: linear-gradient(135deg, #FF6B35, #F7931E);
```

### Icon Usage
- Use ONLY icons from /icons/ folder
- No external icon libraries (Font Awesome, Material Icons)
- Icon implementation: `<img src="/icons/[name].png" width="20">`

## Critical Rules

1. **File Modification**: Edit existing files instead of recreating them
2. **Testing Environment**: Test in Telegram WebApp, not browser console
3. **Deployment**: Always deploy changes to server after local testing
4. **Code Style**: Provide complete file contents, not fragments
5. **Icons**: Only use local icons from /icons/ folder - NEVER use emoji or text symbols - NO background/подложки under icons
6. **Design Consistency**: Follow existing gradient and glass morphism patterns
7. **Autonomous Mode**: Work independently without asking for confirmations
8. **Complete Implementation**: Always include all necessary files (CSS, JS, etc.) on first attempt
9. **Testing & Debugging**: Add visible debug UI when testing features
10. **Cache Busting**: ALWAYS add version parameter (?v=YYYYMMDD or ?v=timestamp) to ALL script/style links when editing files. Update version on every change!
7. **Autonomous Mode**:
   - Work autonomously without asking for confirmations
   - Execute ALL necessary steps to complete tasks
   - ALWAYS include ALL required resources (CSS, JS, images, etc.) in first implementation
   - Deploy automatically to server after changes
   - Test thoroughly BEFORE telling user to check
   - If something doesn't work, fix it immediately without waiting for user feedback
   - Think ahead: what else is needed for this feature to work? Add it NOW
8. **Complete Implementation**:
   - Never say "check it" without ensuring ALL dependencies are in place
   - Always add inline styles if external CSS might not load
   - Always check if related files need updates (HTML → CSS → JS → Server)
   - Deploy ALL related files in one batch, not one by one
9. **Testing & Debugging**:
   - ALWAYS add visible debug UI for testing (buttons, logs, status displays)
   - Add on-screen console logs since user tests in Telegram WebApp (no browser console)
   - Create test buttons for all major functions (e.g., "Test Connection", "Load Data", etc.)
   - Display errors and success messages visually on the page
   - Example: Add floating debug panel with status, logs, and test buttons
   - Make debug info copy-able for easy sharing

## Referral System

### Referral Rewards
- **1st line (direct referrals)**: 200 AR coins on registration
- **2nd line (referrals of referrals)**: 100 AR coins on registration
- **Purchase commissions**:
  - 10% from 1st line purchases
  - 5% from 2nd line purchases

## Current System Status

### Working Features
- ✅ Telegram authentication via WebApp
- ✅ User registration and balance tracking
- ✅ Basic admin panel structure
- ✅ Database schema implemented
- ✅ Referral system (1st/2nd line rewards + purchase commissions)

### In Progress
- 🔄 Quiz tasks page (tasks.html) - current focus

### Known Issues
- ❌ Channel subscription verification incomplete

## Development Workflow

1. Check existing files before creating new ones: `ls -la`
2. Test changes locally first
3. Deploy to server: `scp [file] root@83.166.246.186:/var/www/neurocamp/arena/`
4. Test in Telegram Mini App (not browser)
5. Monitor server logs if needed: `pm2 logs ar-arena-bot`