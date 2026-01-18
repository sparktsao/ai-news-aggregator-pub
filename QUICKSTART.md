# Quick Start - Enable Voting in 10 Minutes

Everything you need is now in this repo!

## 📁 Your Directory Structure

```
/Users/sparkt/2026C/ai-news-aggregator-pub/
├── index.html              ← Frontend (already deployed on GitHub Pages)
├── fingerprint.js          ← User identification
├── voting-service.js       ← API client
├── worker/                 ← Backend (needs deployment)
│   ├── vote-api.js
│   ├── wrangler.toml
│   └── package.json
└── data/                   ← Your news data
```

---

## 🚀 Enable Voting (4 Steps)

### Step 1: Install Wrangler (1 min)

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare (1 min)

```bash
wrangler login
```

This opens a browser. Use **email signup** if social login fails.

### Step 3: Deploy Backend (3 min)

```bash
cd /Users/sparkt/2026C/ai-news-aggregator-pub/worker

# Create database
wrangler kv:namespace create "VOTES"

# Output shows: id = "abc123..."
# Copy that ID!

# Edit wrangler.toml - replace YOUR_KV_NAMESPACE_ID with the ID
nano wrangler.toml  # or use any editor

# Deploy
wrangler deploy

# Output shows: https://news-vote-api.YOURNAME.workers.dev
# Copy that URL!
```

### Step 4: Connect Frontend (2 min)

```bash
cd /Users/sparkt/2026C/ai-news-aggregator-pub

# Edit index.html line 322
nano index.html

# Change:
const VOTE_API_URL = 'https://YOUR-WORKER.workers.dev';

# To your actual URL:
const VOTE_API_URL = 'https://news-vote-api.YOURNAME.workers.dev';

# Save and push
git add index.html
git commit -m "Connect to Worker"
git push
```

### Step 5: Test (2 min)

1. Wait 2 minutes for GitHub Pages
2. Visit: https://sparktsao.github.io/ai-news-aggregator-pub/
3. Click 👍 or 👎
4. See: "✅ Vote recorded!"

---

## ✅ Done!

Your voting system is live:
- Users can vote on news items
- Votes persist globally
- Free forever (100k votes/day)

---

## 🔍 Check Status

```bash
# View deployments
wrangler deployments list

# View logs (real-time)
wrangler tail

# View statistics
curl https://news-vote-api.YOURNAME.workers.dev/stats
```

---

## 🐛 Troubleshooting

### Can't login to Cloudflare?
See `VERCEL_VOTING.md` for alternative using Vercel (easier GitHub login)

### Vote buttons don't work?
1. Check `index.html` has correct Worker URL (line 322)
2. Hard refresh: Cmd+Shift+R
3. Check browser console (F12) for errors

### Votes don't save?
1. Check KV namespace is created: `wrangler kv:namespace list`
2. Check `wrangler.toml` has correct ID
3. Redeploy: `wrangler deploy`

---

## 💰 Cost

**$0/month** - Cloudflare free tier includes:
- 100,000 requests/day
- 1 GB storage
- Unlimited workers

---

## 📚 More Info

- `VOTING_SETUP.md` - Detailed guide
- `VERCEL_VOTING.md` - Alternative backend
- `worker/README.md` - API documentation
