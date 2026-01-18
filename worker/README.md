# Vote API - Cloudflare Worker

Backend for the voting system.

## Quick Deploy

```bash
# 1. Install Wrangler (one-time)
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Create KV database
wrangler kv:namespace create "VOTES"
# Copy the ID from output

# 4. Update wrangler.toml
# Replace YOUR_KV_NAMESPACE_ID with the ID from step 3

# 5. Deploy
wrangler deploy

# 6. Copy the Worker URL and update index.html
```

## Files

- `vote-api.js` - Main API code (POST /vote, GET /votes/:id, GET /stats)
- `wrangler.toml` - Worker configuration
- `package.json` - Dependencies

## API Endpoints

### POST /vote
Submit a vote

**Request:**
```json
{
  "item_id": "abc123",
  "token": "user_fingerprint",
  "vote_type": "like",
  "date": "2026-01-18"
}
```

**Response:**
```json
{
  "success": true,
  "likes": 42,
  "dislikes": 5,
  "net_score": 37
}
```

### GET /votes/:item_id
Get vote counts for an item

**Response:**
```json
{
  "item_id": "abc123",
  "likes": 42,
  "dislikes": 5,
  "net_score": 37,
  "total_votes": 47
}
```

### GET /stats
Get overall statistics

**Response:**
```json
{
  "total_likes": 1234,
  "total_dislikes": 567,
  "total_votes": 1801,
  "total_items": 89,
  "like_percentage": 68
}
```

## Features

- ✅ Duplicate vote prevention (one vote per user per item)
- ✅ Rate limiting (50 votes per user per day)
- ✅ Vote expiration (30 days)
- ✅ CORS enabled
- ✅ Free tier (100k requests/day)

## Testing Locally

```bash
wrangler dev
```

Your API runs at `http://localhost:8787`

## View Logs

```bash
wrangler tail
```

## Check Deployments

```bash
wrangler deployments list
```
