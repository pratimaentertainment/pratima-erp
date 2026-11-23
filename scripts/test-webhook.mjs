

async function main() {
  const url = 'http://localhost:3000/api/webhooks/inquiries';
  
  const payload = {
    clientName: "Sneha Kulkarni",
    clientPhone: "9876543322",
    sourceCode: "FACEBOOK_ADS",
    eventType: "Pre-Wedding",
    notes: "Saw your ad on FB, looking for a pre-wedding shoot.",
    eventDate: "2026-12-15T00:00:00.000Z"
  };

  console.log(`Sending POST request to ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_secret_key_123'
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    console.log(`Status: ${status}`);
    console.log(`Response:`, data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
