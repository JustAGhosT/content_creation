import {
  PINTEREST_SANDBOX_API_URL,
  PinterestSandboxApiError,
  PinterestSandboxClient,
} from '@/lib/platforms/pinterest/sandbox';

describe('Pinterest Sandbox client', () => {
  const config = { accessToken: 'sandbox-token', boardId: 'board-123' };

  function jsonResponse(payload: unknown, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 403 ? 'Forbidden' : 'OK',
      json: async () => payload,
      clone: () => jsonResponse(payload, status),
    } as Response;
  }

  test('creates an image Pin only against the sandbox host', async () => {
    const request = jest.fn() as jest.MockedFunction<typeof fetch>;
    request.mockResolvedValue(jsonResponse({ id: 'pin-123', link: 'https://example.com' }, 201));

    await expect(
      new PinterestSandboxClient(config, request).createPin({
        title: 'Sandbox contract',
        description: 'Provider-isolated test',
        imageUrl: 'https://cdn.example.com/test.png',
      })
    ).resolves.toEqual({ id: 'pin-123', link: 'https://example.com' });

    expect(request).toHaveBeenCalledWith(
      `${PINTEREST_SANDBOX_API_URL}/pins`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer sandbox-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_id: 'board-123',
          title: 'Sandbox contract',
          description: 'Provider-isolated test',
          media_source: {
            source_type: 'image_url',
            url: 'https://cdn.example.com/test.png',
          },
        }),
      })
    );
  });

  test('supports read and cleanup without switching to production', async () => {
    const request = jest.fn() as jest.MockedFunction<typeof fetch>;
    request
      .mockResolvedValueOnce(jsonResponse({ id: 'pin-123' }))
      .mockResolvedValueOnce(jsonResponse(null, 204));
    const client = new PinterestSandboxClient(config, request);

    await expect(client.getPin('pin-123')).resolves.toEqual({ id: 'pin-123' });
    await expect(client.deletePin('pin-123')).resolves.toBeUndefined();
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      `${PINTEREST_SANDBOX_API_URL}/pins/pin-123`,
      `${PINTEREST_SANDBOX_API_URL}/pins/pin-123`,
    ]);
  });

  test('preserves provider status without exposing credentials', async () => {
    const request = jest.fn() as jest.MockedFunction<typeof fetch>;
    request.mockResolvedValue(jsonResponse({ message: 'Trial access required' }, 403));

    const operation = new PinterestSandboxClient(config, request).createPin({
      title: 'Sandbox contract',
      description: 'Provider-isolated test',
      imageUrl: 'https://cdn.example.com/test.png',
    });

    await expect(operation).rejects.toBeInstanceOf(PinterestSandboxApiError);
    await expect(operation).rejects.toMatchObject({ response: { status: 403 } });
    await expect(operation).rejects.not.toThrow('sandbox-token');
  });

  test('rejects non-HTTPS media before contacting Pinterest', async () => {
    const request = jest.fn() as jest.MockedFunction<typeof fetch>;
    await expect(
      new PinterestSandboxClient(config, request).createPin({
        title: 'Sandbox contract',
        description: 'Provider-isolated test',
        imageUrl: 'http://cdn.example.com/test.png',
      })
    ).rejects.toThrow('Pinterest media URL must use HTTPS');
    expect(request).not.toHaveBeenCalled();
  });
});
