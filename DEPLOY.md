# Deployment Guide

## Step 1: Create GitHub Repository

1. Go to GitHub: https://github.com/new
2. Repository name: `ai-news-aggregator-pub` (or any name you prefer)
3. **Important:** Set to **Public** (required for free GitHub Pages)
4. Do NOT initialize with README (we already have one)
5. Click **Create repository**

## Step 2: Push Code to GitHub

```bash
cd /Users/sparkt/2026C/ai-news-aggregator-pub

# Add your new GitHub repo as remote
git remote add origin git@github.com:sparktsao/ai-news-aggregator-pub.git

# Push code
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repo settings: `https://github.com/sparktsao/ai-news-aggregator-pub/settings/pages`
2. Under **"Source"**:
   - Branch: `main`
   - Folder: `/ (root)`
3. Click **Save**
4. Wait 1-2 minutes for deployment

## Step 4: Access Your Site

Your live site will be at:
```
https://sparktsao.github.io/ai-news-aggregator-pub/
```

## Daily Updates

To update the website with new data:

```bash
# In your PRIVATE repo
cd /Users/sparkt/2026C/ai-news-aggregator
docker exec ai-news-aggregator python3 /app/run_pipeline.py

# Copy new data to PUBLIC repo
cp -r web/data/$(date +%Y-%m-%d) /Users/sparkt/2026C/ai-news-aggregator-pub/data/
cp web/data/index.json /Users/sparkt/2026C/ai-news-aggregator-pub/data/
cp web/data/search-*.json /Users/sparkt/2026C/ai-news-aggregator-pub/data/

# Push updates
cd /Users/sparkt/2026C/ai-news-aggregator-pub
git add .
git commit -m "Update: $(date +%Y-%m-%d) news"
git push
```

## Automated Updates (Optional)

Create a deployment script to automate updates:

```bash
#!/bin/bash
# File: /Users/sparkt/2026C/deploy_to_pub.sh

SOURCE_DIR="/Users/sparkt/2026C/ai-news-aggregator/web"
PUB_DIR="/Users/sparkt/2026C/ai-news-aggregator-pub"
TODAY=$(date +%Y-%m-%d)

echo "📦 Deploying $TODAY to public site..."

# Copy today's data
cp -r "$SOURCE_DIR/data/$TODAY" "$PUB_DIR/data/" 2>/dev/null || echo "No data for $TODAY"

# Copy index and search files
cp "$SOURCE_DIR/data/index.json" "$PUB_DIR/data/"
cp "$SOURCE_DIR/data/search-"*.json "$PUB_DIR/data/"

# Commit and push
cd "$PUB_DIR"
git add .
git commit -m "Update: $TODAY news" && git push

echo "✅ Deployed to https://sparktsao.github.io/ai-news-aggregator-pub/"
```

Make it executable:
```bash
chmod +x /Users/sparkt/2026C/deploy_to_pub.sh
```

Run after pipeline:
```bash
/Users/sparkt/2026C/deploy_to_pub.sh
```

---

## Architecture

```
Private Repo (sparktsao/ai-news-aggregator)
    ├── Python pipeline code (PRIVATE)
    ├── Config files (PRIVATE)
    ├── Docker setup (PRIVATE)
    └── web/ (generated output)
         ↓ copy ↓
Public Repo (sparktsao/ai-news-aggregator-pub)
    ├── Static website files only
    ├── JSON data files
    └── No sensitive code
         ↓ deploy ↓
GitHub Pages (https://sparktsao.github.io/ai-news-aggregator-pub/)
    └── Live website (PUBLIC)
```

## Security Notes

- Pipeline code stays in your private repo
- Only static website files are public
- No API keys or config files in public repo
- No Docker files or Python code exposed

## Next: Add Voting System

After GitHub Pages is live, follow the instructions in `/Users/sparkt/2026C/ai-news-aggregator/UI/README.md` to add voting functionality.
