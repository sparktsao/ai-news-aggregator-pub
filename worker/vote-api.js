/**
 * Cloudflare Worker - Vote API
 *
 * Minimal backend for collecting votes (like/dislike) from users.
 * Uses Cloudflare KV for storage (no database needed).
 * Includes 60-second caching for improved performance.
 *
 * Endpoints:
 * - POST /vote - Record a vote
 * - GET /votes/batch?ids=id1,id2,id3 - Get vote counts for multiple items (max 200)
 * - GET /votes/:item_id - Get vote counts for a single item
 * - GET /rankings - Get all items ranked by votes
 * - GET /stats - Get overall statistics
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers (allow requests from your site)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      // POST /vote - Record a vote
      if (request.method === 'POST' && url.pathname === '/vote') {
        return await handleVote(request, env, corsHeaders);
      }

      // GET /votes/batch?ids=id1,id2,id3 - Get vote counts for multiple items
      if (request.method === 'GET' && url.pathname === '/votes/batch') {
        const ids = url.searchParams.get('ids');
        return await getBatchVoteCounts(ids, env, corsHeaders);
      }

      // GET /votes/:item_id - Get vote counts
      if (request.method === 'GET' && url.pathname.startsWith('/votes/')) {
        const itemId = url.pathname.split('/')[2];
        return await getVoteCounts(itemId, env, corsHeaders);
      }

      // GET /rankings - Get all items ranked
      if (request.method === 'GET' && url.pathname === '/rankings') {
        return await getRankings(env, corsHeaders);
      }

      // GET /stats - Get overall statistics
      if (request.method === 'GET' && url.pathname === '/stats') {
        return await getStats(env, corsHeaders);
      }

      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);

    } catch (error) {
      console.error('Error:', error);
      return jsonResponse(
        { error: 'Internal server error', message: error.message },
        500,
        corsHeaders
      );
    }
  }
};

/**
 * Handle vote submission
 */
async function handleVote(request, env, corsHeaders) {
  const { item_id, token, vote_type, date } = await request.json();

  // Validate input
  if (!item_id || !token || !vote_type) {
    return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
  }

  if (!['like', 'dislike'].includes(vote_type)) {
    return jsonResponse({ error: 'Invalid vote_type' }, 400, corsHeaders);
  }

  // Check if already voted
  const voteKey = `vote:${token}:${item_id}`;
  const existingVote = await env.VOTES.get(voteKey);

  if (existingVote) {
    return jsonResponse({ error: 'Already voted' }, 409, corsHeaders);
  }

  // Rate limit check (max 50 votes per token per day)
  const today = new Date().toISOString().split('T')[0];
  const rateLimitKey = `rate:${token}:${today}`;
  const voteCount = parseInt(await env.VOTES.get(rateLimitKey) || '0');

  if (voteCount >= 50) {
    return jsonResponse({ error: 'Rate limit exceeded' }, 429, corsHeaders);
  }

  // Record the vote (expires in 30 days)
  await env.VOTES.put(voteKey, vote_type, {
    expirationTtl: 60 * 60 * 24 * 30
  });

  // Increment vote count
  const countKey = `${vote_type}:${item_id}`;
  const currentCount = parseInt(await env.VOTES.get(countKey) || '0');
  await env.VOTES.put(countKey, String(currentCount + 1));

  // Update rate limit counter
  await env.VOTES.put(rateLimitKey, String(voteCount + 1), {
    expirationTtl: 60 * 60 * 24 // 24 hours
  });

  // Store vote metadata for analytics
  const metaKey = `meta:${item_id}:${Date.now()}`;
  await env.VOTES.put(metaKey, JSON.stringify({
    token_hash: token.substring(0, 8), // Store partial for privacy
    vote_type,
    timestamp: Date.now(),
    date: date || today
  }), {
    expirationTtl: 60 * 60 * 24 * 30
  });

  // Get updated counts
  const likes = parseInt(await env.VOTES.get(`like:${item_id}`) || '0');
  const dislikes = parseInt(await env.VOTES.get(`dislike:${item_id}`) || '0');

  return jsonResponse({
    success: true,
    item_id,
    likes,
    dislikes,
    net_score: likes - dislikes
  }, 200, corsHeaders);
}

/**
 * Get vote counts for a specific item (with 60-second cache)
 */
async function getVoteCounts(itemId, env, corsHeaders) {
  if (!itemId) {
    return jsonResponse({ error: 'Missing item_id' }, 400, corsHeaders);
  }

  // Try cache first
  const cacheKey = `cache:votes:${itemId}`;
  const cached = await env.VOTES.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'HIT'
      }
    });
  }

  // Fetch from KV
  const likes = parseInt(await env.VOTES.get(`like:${itemId}`) || '0');
  const dislikes = parseInt(await env.VOTES.get(`dislike:${itemId}`) || '0');

  const result = {
    item_id: itemId,
    likes,
    dislikes,
    net_score: likes - dislikes,
    total_votes: likes + dislikes
  };

  // Cache for 60 seconds
  await env.VOTES.put(cacheKey, JSON.stringify(result), {
    expirationTtl: 60
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS'
    }
  });
}

/**
 * Get vote counts for multiple items in batch (with caching)
 */
async function getBatchVoteCounts(idsParam, env, corsHeaders) {
  if (!idsParam) {
    return jsonResponse({ error: 'Missing ids parameter' }, 400, corsHeaders);
  }

  const itemIds = idsParam.split(',').filter(id => id.trim().length > 0);

  if (itemIds.length === 0) {
    return jsonResponse({ error: 'No valid item IDs provided' }, 400, corsHeaders);
  }

  if (itemIds.length > 200) {
    return jsonResponse({ error: 'Too many IDs (max 200)' }, 400, corsHeaders);
  }

  const results = {};
  let cacheHits = 0;
  let cacheMisses = 0;

  // Process all items in parallel
  await Promise.all(itemIds.map(async (itemId) => {
    const trimmedId = itemId.trim();

    // Try cache first
    const cacheKey = `cache:votes:${trimmedId}`;
    const cached = await env.VOTES.get(cacheKey);

    if (cached) {
      results[trimmedId] = JSON.parse(cached);
      cacheHits++;
    } else {
      // Fetch from KV
      const likes = parseInt(await env.VOTES.get(`like:${trimmedId}`) || '0');
      const dislikes = parseInt(await env.VOTES.get(`dislike:${trimmedId}`) || '0');

      const result = {
        item_id: trimmedId,
        likes,
        dislikes,
        net_score: likes - dislikes,
        total_votes: likes + dislikes
      };

      results[trimmedId] = result;
      cacheMisses++;

      // Cache for 60 seconds
      await env.VOTES.put(cacheKey, JSON.stringify(result), {
        expirationTtl: 60
      });
    }
  }));

  return new Response(JSON.stringify({
    results,
    count: itemIds.length,
    cache_hits: cacheHits,
    cache_misses: cacheMisses
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Get all items ranked by votes
 */
async function getRankings(env, corsHeaders) {
  // List all like count keys
  const list = await env.VOTES.list({ prefix: 'like:' });

  const items = [];

  for (const key of list.keys) {
    const itemId = key.name.replace('like:', '');
    const likes = parseInt(await env.VOTES.get(`like:${itemId}`) || '0');
    const dislikes = parseInt(await env.VOTES.get(`dislike:${itemId}`) || '0');

    items.push({
      item_id: itemId,
      likes,
      dislikes,
      net_score: likes - dislikes,
      total_votes: likes + dislikes
    });
  }

  // Sort by net score (descending)
  items.sort((a, b) => b.net_score - a.net_score);

  return jsonResponse({
    items,
    total_items: items.length,
    generated_at: new Date().toISOString()
  }, 200, corsHeaders);
}

/**
 * Get overall statistics
 */
async function getStats(env, corsHeaders) {
  const list = await env.VOTES.list({ prefix: 'like:' });

  let totalLikes = 0;
  let totalDislikes = 0;
  let totalItems = 0;

  for (const key of list.keys) {
    const itemId = key.name.replace('like:', '');
    const likes = parseInt(await env.VOTES.get(`like:${itemId}`) || '0');
    const dislikes = parseInt(await env.VOTES.get(`dislike:${itemId}`) || '0');

    totalLikes += likes;
    totalDislikes += dislikes;
    totalItems++;
  }

  return jsonResponse({
    total_likes: totalLikes,
    total_dislikes: totalDislikes,
    total_votes: totalLikes + totalDislikes,
    total_items: totalItems,
    like_percentage: totalLikes + totalDislikes > 0
      ? Math.round((totalLikes / (totalLikes + totalDislikes)) * 100)
      : 0,
    generated_at: new Date().toISOString()
  }, 200, corsHeaders);
}

/**
 * Helper: Create JSON response
 */
function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}
