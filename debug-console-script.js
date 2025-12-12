/**
 * Authentication Debugging Script
 * 
 * Copy and paste this entire script into your browser's console
 * (F12 → Console tab) to quickly check authentication status.
 * 
 * Usage: Just paste and press Enter, then check the output.
 */

(async function debugAuth() {
  console.log('%c🔍 AUTHENTICATION DEBUG CHECK', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
  console.log('='.repeat(50));
  
  const results = {
    localStorage: {},
    cookies: {},
    apiCheck: null,
    errors: []
  };
  
  // Check localStorage
  console.log('\n📦 Checking localStorage...');
  try {
    const localStorageKeys = Object.keys(localStorage);
    const authKeys = localStorageKeys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('sb-')
    );
    
    results.localStorage = {
      totalKeys: localStorageKeys.length,
      authKeysFound: authKeys.length,
      authKeys: authKeys
    };
    
    if (authKeys.length > 0) {
      console.log('✅ Found', authKeys.length, 'auth-related keys in localStorage');
      authKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log('  -', key, ':', value ? `${value.substring(0, 50)}...` : 'empty');
      });
    } else {
      console.log('❌ No auth-related keys found in localStorage');
    }
  } catch (e) {
    results.errors.push('localStorage check failed: ' + e.message);
    console.error('❌ Error checking localStorage:', e);
  }
  
  // Check cookies
  console.log('\n🍪 Checking cookies...');
  try {
    const allCookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
    const authCookies = allCookies.filter(c => {
      const name = c.split('=')[0].toLowerCase();
      return name.includes('auth') || 
             name.includes('supabase') || 
             name.includes('sb-') ||
             name.includes('session');
    });
    
    results.cookies = {
      totalCookies: allCookies.length,
      authCookiesFound: authCookies.length,
      authCookieNames: authCookies.map(c => c.split('=')[0])
    };
    
    if (authCookies.length > 0) {
      console.log('✅ Found', authCookies.length, 'auth-related cookies');
      authCookies.forEach(cookie => {
        const [name] = cookie.split('=');
        console.log('  -', name);
      });
    } else {
      console.log('❌ No auth-related cookies found');
      console.log('   All cookies:', allCookies.length > 0 ? allCookies.map(c => c.split('=')[0]).join(', ') : 'none');
    }
  } catch (e) {
    results.errors.push('Cookie check failed: ' + e.message);
    console.error('❌ Error checking cookies:', e);
  }
  
  // Check API endpoint
  console.log('\n🌐 Checking server-side auth status...');
  try {
    const response = await fetch('/api/debug-auth', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    results.apiCheck = data;
    
    console.log('\n📊 SERVER-SIDE AUTH STATUS:');
    console.log('─'.repeat(50));
    
    if (data.success) {
      // Session info
      console.log('\n📋 Session:');
      console.log('   Exists:', data.session?.exists ? '✅ YES' : '❌ NO');
      if (data.session?.exists) {
        console.log('   User ID:', data.session.userId || 'N/A');
        console.log('   Email:', data.session.email || 'N/A');
      }
      if (data.session?.error) {
        console.log('   ⚠️  Error:', data.session.error);
      }
      
      // User info
      console.log('\n👤 User:');
      console.log('   Exists:', data.user?.exists ? '✅ YES' : '❌ NO');
      if (data.user?.exists) {
        console.log('   User ID:', data.user.userId || 'N/A');
        console.log('   Email:', data.user.email || 'N/A');
        console.log('   Verified:', data.user.verified ? '✅ YES' : '❌ NO');
        if (!data.user.verified) {
          console.log('   ⚠️  Email not verified - this may prevent feedback submission');
        }
      }
      if (data.user?.error) {
        console.log('   ⚠️  Error:', data.user.error);
      }
      
      // Cookie info
      console.log('\n🍪 Cookies (server-side):');
      console.log('   Total cookies:', data.cookies?.count || 0);
      console.log('   Auth cookies found:', data.cookies?.hasAuthCookies ? '✅ YES' : '❌ NO');
      if (data.cookies?.names && data.cookies.names.length > 0) {
        console.log('   Cookie names:', data.cookies.names.join(', '));
      }
    } else {
      console.error('❌ API check failed:', data.error);
      if (data.stack) {
        console.error('Stack trace:', data.stack);
      }
    }
  } catch (e) {
    results.errors.push('API check failed: ' + e.message);
    console.error('❌ Error checking API:', e);
    console.log('\n💡 Tip: Make sure you\'re running the dev server and the /api/debug-auth route exists');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('%c📝 SUMMARY', 'font-size: 14px; font-weight: bold;');
  console.log('─'.repeat(50));
  
  const sessionExists = results.apiCheck?.session?.exists;
  const userExists = results.apiCheck?.user?.exists;
  const userVerified = results.apiCheck?.user?.verified;
  
  if (sessionExists && userExists) {
    console.log('%c✅ You appear to be LOGGED IN', 'color: green; font-weight: bold;');
    if (!userVerified) {
      console.log('%c⚠️  BUT your email is NOT VERIFIED', 'color: orange; font-weight: bold;');
      console.log('   This may prevent feedback submission');
    }
  } else {
    console.log('%c❌ You appear to be NOT LOGGED IN', 'color: red; font-weight: bold;');
    console.log('   Session exists:', sessionExists ? '✅' : '❌');
    console.log('   User exists:', userExists ? '✅' : '❌');
  }
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    results.errors.forEach(err => console.log('  -', err));
  }
  
  console.log('\n💡 Next steps:');
  if (!sessionExists || !userExists) {
    console.log('   1. Try logging out and logging back in');
    console.log('   2. Clear cookies and localStorage');
    console.log('   3. Check if cookies are being blocked by browser settings');
  }
  if (sessionExists && userExists && !userVerified) {
    console.log('   1. Check your email for verification link');
    console.log('   2. Verify your email address');
  }
  
  console.log('\n📋 Full results object:', results);
  
  return results;
})();

