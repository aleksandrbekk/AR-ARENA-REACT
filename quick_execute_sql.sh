#!/bin/bash

# Quick SQL execution script for add_ar_balance RPC function

echo "==================================="
echo "AR ARENA - Execute add_ar_balance"
echo "==================================="
echo ""

# Check if SQL file exists
if [ ! -f "create_add_ar_balance.sql" ]; then
    echo "❌ Error: create_add_ar_balance.sql not found"
    exit 1
fi

echo "📄 SQL file found: create_add_ar_balance.sql"
echo ""

echo "Choose execution method:"
echo "1) Playwright automation (opens browser, auto-executes)"
echo "2) Manual copy-paste (opens browser, you paste)"
echo "3) Show SQL only (copy manually)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "🤖 Starting Playwright automation..."
        echo "⚠️  If you see a login page, log in manually."
        echo "⚠️  The script will wait and continue after login."
        echo ""
        node execute_supabase_sql.js
        ;;
    2)
        echo ""
        echo "🌐 Opening Supabase SQL Editor..."
        open "https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new"
        echo ""
        echo "📋 SQL copied to clipboard!"
        cat create_add_ar_balance.sql | pbcopy
        echo ""
        echo "✅ Paste (Cmd+V) in the SQL editor and click Run"
        echo ""
        ;;
    3)
        echo ""
        echo "📋 SQL to execute:"
        echo "================================"
        cat create_add_ar_balance.sql
        echo "================================"
        echo ""
        echo "🔗 Supabase SQL Editor:"
        echo "https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new"
        echo ""
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ After execution, verify with:"
echo "   SELECT routine_name FROM information_schema.routines WHERE routine_name = 'add_ar_balance';"
echo ""
