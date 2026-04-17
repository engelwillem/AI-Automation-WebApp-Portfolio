import fetch from 'node-fetch'; // If not using Node 18+, but Node 18+ has it global. 
// Actually package.json doesn't list node-fetch. I'll use global fetch.

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:8000';

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

async function testEndpoint(name, path, method = 'POST') {
  process.stdout.write(`Testing ${colors.cyan}${name.padEnd(30)}${colors.reset} ... `);
  
  try {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    const status = response.status;
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.data?.status) {
      const shareStatus = data.data.status;
      if (shareStatus === 'ready' || shareStatus === 'pending') {
         console.log(`${colors.green}PASS${colors.reset} [HTTP ${status}] (AI Status: ${shareStatus})`);
         return true;
      }
    }

    console.log(`${colors.red}FAIL${colors.reset} [HTTP ${status}] ${JSON.stringify(data)}`);
    return false;
  } catch (err) {
    console.log(`${colors.red}ERROR${colors.reset} ${err.message}`);
    return false;
  }
}

async function runVerification() {
  console.log(`\n${colors.bold}AI SHARING FLOW VERIFICATION${colors.reset}`);
  console.log(`Target: ${colors.yellow}${BASE_URL}${colors.reset}\n`);

  let summary = { pass: 0, fail: 0 };

  // 1. Fetch some discovery data
  console.log(`${colors.bold}STEP 1: Discovering Test Subjects...${colors.reset}`);
  
  let communityPostId = null;
  let renunganToken = null;
  let verseSlug = 'kej-1-1'; // Default fallback

  try {
    const booksRes = await fetch(`${BASE_URL}/api/v1/versehub/id/books`);
    const booksData = await booksRes.json();
    const firstBook = booksData.data?.[0]?.code || 'kej';
    verseSlug = `${firstBook}-1-1`;
    console.log(`- Found VerseHub Book: ${firstBook}`);
  } catch (e) {
    console.log(`${colors.yellow}- Failed to discover versehub books, using fallback ${verseSlug}${colors.reset}`);
  }

  try {
    const commRes = await fetch(`${BASE_URL}/api/v1/community/posts`);
    const commData = await commRes.json();
    communityPostId = commData.posts?.[0]?.id || commData.data?.posts?.[0]?.id;
    if (communityPostId) console.log(`- Found Community Post: ${communityPostId}`);
  } catch (e) {
    console.log(`${colors.yellow}- Failed to discover community post, using fallback if possible${colors.reset}`);
  }

  try {
    const todayRes = await fetch(`${BASE_URL}/api/v1/today`);
    const todayData = await todayRes.json();
    renunganToken = todayData.data?.token || todayData.token;
    if (renunganToken) console.log(`- Found Renungan Token: ${renunganToken}`);
  } catch (e) {
    console.log(`${colors.yellow}- Failed to discover renungan token${colors.reset}`);
  }

  console.log("");

  // 2. Test Endpoints
  console.log(`${colors.bold}STEP 2: Testing Verification Endpoints...${colors.reset}`);

  const tests = [];

  if (communityPostId) {
    tests.push({ name: 'Community Prepare', path: `/api/v1/community/posts/${communityPostId}/share-assets/prepare` });
  } else {
    console.log(`${colors.yellow}SKIPPING Community Prepare (No ID found)${colors.reset}`);
  }

  if (renunganToken) {
    tests.push({ name: 'Renungan Prepare', path: `/api/v1/renungan/share/${renunganToken}/prepare` });
  } else {
    console.log(`${colors.yellow}SKIPPING Renungan Prepare (No Token found)${colors.reset}`);
  }

  tests.push({ name: 'VerseHub Prepare', path: `/api/v1/versehub/id/${verseSlug}/share-assets/prepare` });

  for (const test of tests) {
    const success = await testEndpoint(test.name, test.path);
    if (success) summary.pass++;
    else summary.fail++;
  }

  // 3. Summary
  console.log(`\n${colors.bold}VERIFICATION SUMMARY${colors.reset}`);
  console.log(`-----------------------------------`);
  console.log(`TOTAL TESTS: ${tests.length}`);
  console.log(`PASS:        ${colors.green}${summary.pass}${colors.reset}`);
  console.log(`FAIL:        ${summary.fail > 0 ? colors.red : colors.reset}${summary.fail}${colors.reset}`);
  console.log(`-----------------------------------\n`);

  if (summary.fail > 0) {
    process.exit(1);
  }
}

runVerification();
