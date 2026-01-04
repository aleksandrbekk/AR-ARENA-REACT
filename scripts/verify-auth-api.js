import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// --- 1. Load Env Vars manually ---
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.local')

if (fs.existsSync(envPath)) {
    console.log('Loading .env.local...')
    const envConfig = fs.readFileSync(envPath, 'utf-8')
    envConfig.split('\n').forEach(line => {
        const [key, ...valParts] = line.split('=')
        if (key && valParts.length > 0) {
            const val = valParts.join('=').trim().replace(/^["']|["']$/g, '')
            if (key.trim() && !key.startsWith('#')) {
                process.env[key.trim()] = val
            }
        }
    })
}

// INJECT MOCKS FOR TESTING AUTH LOGIC ONLY
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Mocking SUPABASE_SERVICE_ROLE_KEY for testing')
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'
}
if (!process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
    console.warn('⚠️ Mocking SUPABASE_URL for testing')
    process.env.SUPABASE_URL = 'https://mock-project.supabase.co'
}

process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN')
    process.exit(1)
}

// --- 2. Dynamic Import of Handler ---
console.log('Importing handler...')
const handlerModule = await import('../api/upsert-user.js')
const handler = handlerModule.default

// --- 3. Mock Request/Response ---
class MockRes {
    constructor() {
        this.statusCode = 200
        this.headers = {}
        this.body = null
        this.errorMessage = ''
    }

    setHeader(k, v) { this.headers[k] = v; return this }
    status(n) { this.statusCode = n; return this }
    json(data) {
        this.body = data
        if (data && data.error) this.errorMessage = data.error
        return this
    }
    end(data) { this.body = data; return this }
}

// --- 4. Helper: Generate InitData ---
function generateValidInitData(userStruct) {
    const userStr = JSON.stringify(userStruct)
    const authDate = Math.floor(Date.now() / 1000)

    const data = {
        auth_date: authDate,
        query_id: 'AAHdF6IQAAAAAN0XohB7',
        user: userStr
    }

    const sortedKeys = Object.keys(data).sort()
    const dataCheckArr = []
    const params = new URLSearchParams()

    for (const key of sortedKeys) {
        const val = data[key]
        dataCheckArr.push(`${key}=${val}`)
        params.append(key, val)
    }

    const dataCheckString = dataCheckArr.join('\n')
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    params.append('hash', hash)
    return params.toString()
}

// --- 5. Test Runner ---
async function runTests() {
    console.log('\n--- Starting Unit Tests (Auth Only) ---')

    const mockUser = {
        id: 12345678,
        first_name: 'Unit',
        last_name: 'Test',
        username: 'unittest_bot',
        language_code: 'en'
    }

    // TEST 1: Valid Signature
    // Expectation: 401 Unauthorized but NOT "Invalid signature". 
    // It should fail at Supabase connection (invalid URL/Key)
    console.log('\n🧪 Test 1: Valid Signature')
    const validInitData = generateValidInitData(mockUser)

    const req1 = { method: 'POST', body: { initData: validInitData } }
    const res1 = new MockRes()

    await handler(req1, res1)

    // We expect failure downstream, which proves Auth passed.
    // The handler catches all errors and returns 401 with message.
    const err1 = res1.errorMessage || ''
    if (res1.statusCode === 401 && !err1.includes('Invalid signature') && !err1.includes('No hash')) {
        console.log(`✅ PASS: Auth passed, failed downstream as expected ("${err1}")`)
    } else if (res1.statusCode === 200) {
        console.log('✅ PASS: Somehow succeeded completely (unexpected but good?)')
    } else {
        console.error('❌ FAIL: Auth logic mismatch. Got:', res1.statusCode, err1)
    }

    // TEST 2: Tampered Hash
    // Expectation: 401 with "Invalid signature"
    console.log('\n🧪 Test 2: Tampered Hash')
    const parts = validInitData.split('&hash=')
    const tamperedInitData = parts[0] + '&hash=deadbeef1234567890abcdef12345678'

    const req2 = { method: 'POST', body: { initData: tamperedInitData } }
    const res2 = new MockRes()

    await handler(req2, res2)

    const err2 = res2.errorMessage || ''
    if (res2.statusCode === 401 && (err2.includes('Invalid signature') || err2.includes('signature mismatch'))) {
        console.log('✅ PASS: Caught invalid signature')
    } else {
        console.error('❌ FAIL: Expected "Invalid signature", got:', res2.statusCode, err2)
    }

    // TEST 3: No initData
    console.log('\n🧪 Test 3: Missing initData')
    const req3 = { method: 'POST', body: {} }
    const res3 = new MockRes()

    await handler(req3, res3)

    if (res3.statusCode === 401 && res3.errorMessage.includes('No authorization data')) {
        console.log('✅ PASS: Caught missing initData')
    } else {
        console.error('❌ FAIL:', res3.statusCode, res3.errorMessage)
    }
}

runTests().catch(e => console.error('FATAL:', e))
