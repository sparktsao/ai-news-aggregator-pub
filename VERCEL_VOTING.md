# Alternative: Voting with Vercel (Easier Setup)

If Cloudflare login doesn't work, use Vercel instead!

## Why Vercel?

✅ **GitHub login works reliably**
✅ **Free tier: 100GB bandwidth/month**
✅ **Simpler deployment**
✅ **Built-in KV storage (Vercel KV)**

## Setup (10 minutes)

### Step 1: Create Vercel Account (2 min)

1. Go to: https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel
4. Done!

### Step 2: Create Vote API (5 min)

Create `/Users/sparkt/2026C/vercel-vote-api/` directory:

```bash
mkdir -p /Users/sparkt/2026C/vercel-vote-api/api
cd /Users/sparkt/2026C/vercel-vote-api
```

Create `api/vote.js`:

```javascript
// Vercel Serverless Function - Vote API
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST /api/vote - Submit vote
  if (req.method === 'POST') {
    const { item_id, token, vote_type } = req.body;

    if (!item_id || !token || !vote_type) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Check duplicate
    const voteKey = `vote:${token}:${item_id}`;
    const existing = await kv.get(voteKey);
    if (existing) {
      return res.status(409).json({ error: 'Already voted' });
    }

    // Save vote
    await kv.set(voteKey, vote_type, { ex: 2592000 }); // 30 days

    // Update counts
    const countKey = `${vote_type}:${item_id}`;
    const count = (await kv.get(countKey)) || 0;
    await kv.set(countKey, count + 1);

    // Get totals
    const likes = (await kv.get(`like:${item_id}`)) || 0;
    const dislikes = (await kv.get(`dislike:${item_id}`)) || 0;

    return res.json({
      success: true,
      item_id,
      likes,
      dislikes,
      net_score: likes - dislikes
    });
  }

  // GET /api/vote?item_id=xxx - Get counts
  if (req.method === 'GET') {
    const { item_id } = req.query;

    if (!item_id) {
      return res.status(400).json({ error: 'Missing item_id' });
    }

    const likes = (await kv.get(`like:${item_id}`)) || 0;
    const dislikes = (await kv.get(`dislike:${item_id}`)) || 0;

    return res.json({
      item_id,
      likes,
      dislikes,
      net_score: likes - dislikes
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

Create `package.json`:

```json
{
  "name": "vercel-vote-api",
  "version": "1.0.0",
  "dependencies": {
    "@vercel/kv": "^1.0.0"
  }
}
```

Create `vercel.json`:

```json
{
  "functions": {
    "api/*.js": {
      "memory": 128,
      "maxDuration": 10
    }
  }
}
```

### Step 3: Deploy to Vercel (2 min)

```bash
# Install Vercel CLI
npm install -g vercel

# Login (uses GitHub automatically)
vercel login

# Deploy
vercel

# Follow prompts:
# - Project name: vercel-vote-api
# - Deploy: Yes

# You'll get a URL like:
# https://vercel-vote-api-xxx.vercel.app
```

### Step 4: Add KV Storage (1 min)

1. Go to: https://vercel.com/dashboard
2. Click your project: `vercel-vote-api`
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **KV (Key-Value)**
6. Name: `votes`
7. Click **Create**
8. Click **Connect** to link to your project
9. Redeploy: `vercel --prod`

### Step 5: Update Frontend

Edit `index.html` line 322:

```javascript
const VOTE_API_URL = 'https://vercel-vote-api-xxx.vercel.app';
```

Push to GitHub:

```bash
git add index.html
git commit -m "Connect to Vercel API"
git push
```

### Step 6: Test

Visit: https://sparktsao.github.io/ai-news-aggregator-pub/

Click vote - should work!

---

## Comparison

| Feature | Cloudflare | Vercel |
|---------|-----------|--------|
| **Login** | Email/Social | GitHub (reliable) |
| **Free Tier** | 100k req/day | 100GB/month |
| **Setup** | CLI only | CLI or Web UI |
| **Database** | KV (manual) | KV (one-click) |
| **Easier?** | No | **Yes** ✅ |

---

## Cost

**Free tier includes:**
- 100GB bandwidth/month
- 100 serverless functions
- Unlimited requests
- Built-in KV storage

**You need:** ~1000 votes/day = **totally free!**
