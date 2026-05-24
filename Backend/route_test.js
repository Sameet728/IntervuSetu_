const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const payload = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Starting Route Tests...");

  // 1. Test Org Auth Registration (Invalid payload to test validation)
  console.log("\n[1] POST /org/auth/register (Empty payload)");
  const orgRegRes = await request('POST', '/org/auth/register', {});
  console.log(`Status: ${orgRegRes.status}, Response:`, orgRegRes.body);

  // 2. Test Org Auth Login (Invalid credentials)
  console.log("\n[2] POST /org/auth/login (Invalid credentials)");
  const orgLogRes = await request('POST', '/org/auth/login', { email: 'fake@example.com', password: 'password123' });
  console.log(`Status: ${orgLogRes.status}, Response:`, orgLogRes.body);

  // 3. Test Candidate Auth Registration (Empty payload)
  console.log("\n[3] POST /auth/register (Empty payload)");
  const candRegRes = await request('POST', '/auth/register', {});
  console.log(`Status: ${candRegRes.status}, Response:`, candRegRes.body);

  // 4. Test Missing Route
  console.log("\n[4] GET /invalid-route");
  const invRes = await request('GET', '/invalid-route');
  console.log(`Status: ${invRes.status}, Response:`, invRes.body);
  
  console.log("\nRoute tests completed.");
}

runTests();
