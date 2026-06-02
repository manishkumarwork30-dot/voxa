import 'dotenv/config';

async function testLogin() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'superadmin@example.com',
      password: 'SuperAdmin@123'
    })
  });
  
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Data:", data);
}

testLogin();
