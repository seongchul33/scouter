// Alchemy NFT API 프록시 (Vercel 서버리스 함수)
// 브라우저는 /api/nft/<method>?... 로 호출하고, vercel.json 의 rewrite 가
// /api/nft?method=<method>&... 로 넘겨준다. API 키는 환경변수 ALCHEMY_API_KEY 에만 둔다.

const ALLOWED = new Set([
  'getFloorPrice',
  'getNFTMetadata',
  'getNFTMetadataBatch',
  'getNFTsForOwner',
  'getOwnersForNFT',
]);

// 응답 CDN 캐시 시간(초). 같은 요청이 몰려도 Alchemy 호출 수를 줄여준다.
const CACHE_SECONDS = {
  getFloorPrice: 60,
  getNFTMetadata: 3600,
  getNFTMetadataBatch: 3600,
  getNFTsForOwner: 30,
  getOwnersForNFT: 60,
};

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const method = url.searchParams.get('method');
  url.searchParams.delete('method');

  if (!ALLOWED.has(method)) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ error: 'unknown method' }));
  }

  const key = process.env.ALCHEMY_API_KEY || 'demo';
  const target =
    'https://eth-mainnet.g.alchemy.com/nft/v3/' + key + '/' + method +
    (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');

  const opt = { method: req.method === 'POST' ? 'POST' : 'GET', headers: {} };
  if (opt.method === 'POST') {
    opt.headers['content-type'] = 'application/json';
    opt.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  }

  try {
    const r = await fetch(target, opt);
    const text = await r.text();
    res.statusCode = r.status;
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json');
    if (r.ok && opt.method === 'GET') {
      const s = CACHE_SECONDS[method];
      res.setHeader('cache-control', `public, s-maxage=${s}, stale-while-revalidate=${s * 5}`);
    }
    res.end(text);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'upstream failed' }));
  }
};
