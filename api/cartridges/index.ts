import type { Request, Response } from 'express';
import { AROMA_CHANNELS } from '../../src/data/aromas';

async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// In-memory serverless cache
let currentCartridges = [...AROMA_CHANNELS];

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      count: currentCartridges.length,
      cartridges: currentCartridges
    });
    return;
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    if (Array.isArray(body?.cartridges)) {
      currentCartridges = body.cartridges;
      res.status(200).json({ success: true, count: currentCartridges.length });
    } else {
      res.status(400).json({ error: 'cartridges array is required' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
