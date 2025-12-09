#!/usr/bin/env node

// Script to execute SQL in Supabase
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MjExMjgsImV4cCI6MjA0ODk5NzEyOH0.r4bFGLJNmrANgRl9uQx7lQYfbKrYZ7sVlN0nKH8uPAQ';

// Read SQL file
const sql = fs.readFileSync('/Users/aleksandrbekk/Desktop/AR-ARENA-REACT/create_add_ar_balance.sql', 'utf8');

console.log('Executing SQL...');
console.log(sql);

// Prepare request data
const postData = JSON.stringify({
  query: sql
});

const options = {
  hostname: 'syxjkircmiwpnpagznay.supabase.co',
  path: '/rest/v1/rpc/sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Length': postData.length
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    console.log('Response body:', data);

    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✓ SQL executed successfully!');

      // Verify the function was created
      console.log('\nVerifying function creation...');

      const verifyData = JSON.stringify({
        query: "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'add_ar_balance';"
      });

      const verifyOptions = {
        hostname: 'syxjkircmiwpnpagznay.supabase.co',
        path: '/rest/v1/rpc/sql',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Length': verifyData.length
        }
      };

      const verifyReq = https.request(verifyOptions, (verifyRes) => {
        let verifyResponseData = '';

        verifyRes.on('data', (chunk) => {
          verifyResponseData += chunk;
        });

        verifyRes.on('end', () => {
          console.log('Verification result:', verifyResponseData);
        });
      });

      verifyReq.on('error', (e) => {
        console.error('Verification error:', e);
      });

      verifyReq.write(verifyData);
      verifyReq.end();
    } else {
      console.error('\n✗ SQL execution failed!');
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});

req.write(postData);
req.end();
