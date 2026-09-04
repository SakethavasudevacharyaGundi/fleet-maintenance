const app = require('./src/app');
const http = require('http');

const PORT = 5001;
const server = http.createServer(app);

const runTests = async () => {
  console.log('--- Starting Comprehensive Auth Tests ---');
  let managerToken = '';
  let techToken = '';

  try {
    // ✓ unauthenticated protected endpoint = 401
    // ✓ missing token
    const resMissing = await fetch(`http://localhost:${PORT}/api/protected/manager`);
    console.log('✓ missing token / unauthenticated protected endpoint:', resMissing.status === 401 ? 'PASS' : 'FAIL', resMissing.status);

    // ✓ invalid token
    const resInvalid = await fetch(`http://localhost:${PORT}/api/protected/manager`, {
      headers: { Authorization: 'Bearer invalidtoken123' }
    });
    console.log('✓ invalid token:', resInvalid.status === 401 ? 'PASS' : 'FAIL', resInvalid.status);

    // ✓ valid manager login
    const resManagerLogin = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@fleet.com', password: 'password123' })
    });
    const dataManager = await resManagerLogin.json();
    managerToken = dataManager.token;
    console.log('✓ valid manager login:', (resManagerLogin.status === 200 && managerToken) ? 'PASS' : 'FAIL', resManagerLogin.status);

    // ✓ valid technician login
    const resTechLogin = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'techa@fleet.com', password: 'password123' })
    });
    const dataTech = await resTechLogin.json();
    techToken = dataTech.token;
    console.log('✓ valid technician login:', (resTechLogin.status === 200 && techToken) ? 'PASS' : 'FAIL', resTechLogin.status);

    // ✓ wrong password
    const resWrongPw = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@fleet.com', password: 'wrongpassword' })
    });
    console.log('✓ wrong password:', resWrongPw.status === 401 ? 'PASS' : 'FAIL', resWrongPw.status);

    // ✓ manager → manager endpoint = allowed
    const resManagerToManager = await fetch(`http://localhost:${PORT}/api/protected/manager`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    console.log('✓ manager → manager endpoint = allowed:', resManagerToManager.status === 200 ? 'PASS' : 'FAIL', resManagerToManager.status);

    // ✓ technician → manager endpoint = 403
    const resTechToManager = await fetch(`http://localhost:${PORT}/api/protected/manager`, {
      headers: { Authorization: `Bearer ${techToken}` }
    });
    console.log('✓ technician → manager endpoint = 403:', resTechToManager.status === 403 ? 'PASS' : 'FAIL', resTechToManager.status);

    // ✓ client cannot escalate technician → manager
    const resRegisterManager = await fetch(`http://localhost:${PORT}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newmanager@fleet.com', password: 'password123', role: 'MANAGER' })
    });
    console.log('✓ client cannot escalate technician → manager via register:', resRegisterManager.status === 403 ? 'PASS' : 'FAIL', resRegisterManager.status);

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
