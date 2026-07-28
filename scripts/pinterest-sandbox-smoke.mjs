const apiUrl = 'https://api-sandbox.pinterest.com/v5';
const accessToken = process.env.PINTEREST_SANDBOX_ACCESS_TOKEN?.trim();
const boardId = process.env.PINTEREST_SANDBOX_BOARD_ID?.trim();
const imageUrl = process.env.PINTEREST_SANDBOX_IMAGE_URL?.trim();
const retainPin = process.env.PINTEREST_SANDBOX_RETAIN_PIN === 'true';

if (!accessToken || !boardId || !imageUrl) {
  throw new Error(
    'PINTEREST_SANDBOX_ACCESS_TOKEN, PINTEREST_SANDBOX_BOARD_ID, and PINTEREST_SANDBOX_IMAGE_URL are required'
  );
}

if (new URL(imageUrl).protocol !== 'https:') {
  throw new Error('PINTEREST_SANDBOX_IMAGE_URL must use HTTPS');
}

async function request(path, init) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Pinterest Sandbox request failed: ${response.status}`);
  }
  return response;
}

let pinId;
try {
  const create = await request('/pins', {
    method: 'POST',
    body: JSON.stringify({
      board_id: boardId,
      title: 'OmniPost sandbox contract',
      description: 'Controlled provider-isolated integration test',
      media_source: { source_type: 'image_url', url: imageUrl },
    }),
  });
  const created = await create.json();
  if (typeof created.id !== 'string' || !created.id) {
    throw new Error('Pinterest Sandbox create response did not include a Pin ID');
  }
  pinId = created.id;

  const read = await request(`/pins/${encodeURIComponent(pinId)}`, { method: 'GET' });
  const fetched = await read.json();
  if (fetched.id !== pinId) throw new Error('Pinterest Sandbox read-back ID did not match');

  console.log(
    JSON.stringify({
      provider: 'pinterest',
      environment: 'sandbox',
      contract: 'create-read',
      pinId,
      retained: retainPin,
    })
  );
} finally {
  if (pinId && !retainPin) {
    await request(`/pins/${encodeURIComponent(pinId)}`, { method: 'DELETE' });
  }
}
