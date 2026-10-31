import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  const targetHost = (req.query.target as string) || 'http://192.168.6.155';
  const endpoint = (req.query.endpoint as string) || '/status';

  const cleanHost = targetHost.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${cleanHost}${cleanEndpoint}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'AromaxAI-Bridge/1.0'
    };
    if (req.headers['content-type']) {
      forwardHeaders['Content-Type'] = req.headers['content-type'];
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
      signal: controller.signal
    };

    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      forwardHeaders['Content-Type'] = 'application/json';
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timer);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      error: 'Device bridge unreachable',
      target: targetUrl,
      details: msg
    });
  }
}
