import { GoogleNewsSource } from '../google-news.js';
import { RssSource } from '../rss.js';
import { HackerNewsSource } from '../hackernews.js';
import axios from 'axios';

jest.mock('axios');
const mocked = axios as jest.Mocked<typeof axios>;

describe('GoogleNewsSource', () => {
  it('parseia RSS simples', async () => {
    mocked.get.mockResolvedValueOnce({
      data: `<?xml version="1.0"?>
        <rss><channel>
          <title>Google News</title>
          <item>
            <title>Hello world</title>
            <link>https://example.com/a</link>
            <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
            <source>Example</source>
          </item>
          <item>
            <title>Second item</title>
            <link>https://example.com/b</link>
            <pubDate>Mon, 02 Jan 2024 10:00:00 GMT</pubDate>
          </item>
        </channel></rss>`,
    } as any);

    const src = new GoogleNewsSource();
    const items = await src.fetch('hello', { region: 'US', language: 'en' });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.title).toContain('Hello');
    expect(items[0]?.url).toBe('https://example.com/a');
  });

  it('retorna [] em caso de erro', async () => {
    mocked.get.mockRejectedValueOnce(new Error('net'));
    const src = new GoogleNewsSource();
    const items = await src.fetch('x');
    expect(items).toEqual([]);
  });
});

describe('RssSource', () => {
  it('retorna [] sem feeds', async () => {
    const src = new RssSource([]);
    const items = await src.fetch('x');
    expect(items).toEqual([]);
  });
});

describe('HackerNewsSource', () => {
  it('retorna [] em erro', async () => {
    mocked.get.mockRejectedValueOnce(new Error('net'));
    const src = new HackerNewsSource();
    const items = await src.fetch('x');
    expect(items).toEqual([]);
  });

  it('filtra por query e monta itens', async () => {
    mocked.get.mockResolvedValueOnce({ data: [1, 2] } as any);
    mocked.get
      .mockResolvedValueOnce({ data: { id: 1, title: 'AI is cool', url: 'https://a', time: 1700000000, score: 100 } } as any)
      .mockResolvedValueOnce({ data: { id: 2, title: 'Cars news', url: 'https://b', time: 1700000000, score: 5 } } as any);
    const src = new HackerNewsSource();
    const items = await src.fetch('AI');
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe('AI is cool');
  });
});
