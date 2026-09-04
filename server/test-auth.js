const app = require('./src/app');
const http = require('http');

const PORT = 5001;
const server = http.createServer(app);

const runTests = async () => {
  console.log('--- Starting Auth Tests ---');
  let managerToken = '';
  let techToken = '';

  try {
    // 1. Missing Token
    const res1 = await fetch(`http://localhost:${PORT}/api/protected/manager`);
    console.log('1. Missing Token:', res1.status, await res1.text());

    // 2. Invalid Token
    const res2 = await fetch(`http://localhost:${PORT}/api/protected/manager`, {
      headers: { Authorization: 'Bearer invalidtoken123' }
    });
    console.log('2. Invalid Token:', res2.status, await res2.text());

    // 3. Login as Manager (valid)
    const res3 = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@fleet.com', password: 'password123' })
    });
    const data3 = await res3.json();
    managerToken = data3.token;
    console.log('3. Valid Manager Login:', res3.status, managerToken ? 'Token received' : 'No token');

    // 4. Wrong password
    const res4 = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@fleet.com', password: 'wrongpassword' })
    });
    console.log('4. Wrong Password Login:', res4.status, await res4.text());

    // 5. Manager endpoint as Manager
    const res5 = await fetch(`http://localhost:${PORT}/api/protected/manager`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    console.log('5. Manager endpoint as Manager:', res5.status, await res5.text());

    // 6. Login as Tech
    const res6 = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'techa@fleet.com', password: 'password123' })
    });
    const data6 = await res6.json();
    techToken = data6.token;
    
    // 7. Manager endpoint as Technician (should be 403)
    const res7 = await fetch(`http://localhost:${PORT}/api/protected/manager`, {
      headers: { Authorization: `Bearer ${techToken}` }
    });
    console.log('7. Manager endpoint as Technician:', res7.status, await res7.text());

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    server.close();
    process.exit(0);
  }
};

server.listen(PORT, () => {
  runTests();
});
