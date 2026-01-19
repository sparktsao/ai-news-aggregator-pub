/**
 * Voting Service
 *
 * Client-side service for interacting with the vote API.
 * Handles vote submission, fetching counts, and rankings.
 */

import { getUserToken } from './fingerprint.js';

// API endpoint (replace with your Cloudflare Worker URL)
let API_BASE_URL = 'https://YOUR_WORKER_NAME.YOUR_SUBDOMAIN.workers.dev';

// Allow setting API URL from outside
export function setApiUrl(url) {
    API_BASE_URL = url;
}

/**
 * Vote for an item
 *
 * @param {string} itemId - Item ID to vote for
 * @param {string} voteType - 'like' or 'dislike'
 * @param {string} date - Date of the news (YYYY-MM-DD)
 * @returns {Promise<Object>} Vote result with updated counts
 */
export async function voteForItem(itemId, voteType, date) {
  if (!['like', 'dislike'].includes(voteType)) {
    throw new Error('Invalid vote type');
  }

  const token = await getUserToken();

  // Check if already voted (client-side check)
  const localKey = `vote:${token}:${itemId}`;
  if (localStorage.getItem(localKey)) {
    throw new Error('Already voted');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item_id: itemId,
        token,
        vote_type: voteType,
        date
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Vote failed');
    }

    const result = await response.json();

    // Save to localStorage to prevent re-voting
    localStorage.setItem(localKey, voteType);
    localStorage.setItem(`vote_time:${token}:${itemId}`, Date.now().toString());

    return result;

  } catch (error) {
    console.error('Vote failed:', error);
    throw error;
  }
}

/**
 * Get vote counts for an item
 *
 * @param {string} itemId - Item ID
 * @returns {Promise<Object>} Vote counts
 */
export async function getVoteCounts(itemId) {
  try {
    const response = await fetch(`${API_BASE_URL}/votes/${itemId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch vote counts');
    }

    return await response.json();

  } catch (error) {
    console.error('Failed to get vote counts:', error);
    return {
      likes: 0,
      dislikes: 0,
      net_score: 0,
      total_votes: 0
    };
  }
}

/**
 * Get vote counts for multiple items in batch (efficient!)
 *
 * @param {string[]} itemIds - Array of item IDs
 * @returns {Promise<Object>} Map of item IDs to vote counts
 */
export async function getBatchVoteCounts(itemIds) {
  if (!itemIds || itemIds.length === 0) {
    return {};
  }

  try {
    const idsParam = itemIds.join(',');
    const response = await fetch(`${API_BASE_URL}/votes/batch?ids=${encodeURIComponent(idsParam)}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data.results || {};

  } catch (error) {
    // Silently handle errors - voting is not critical functionality
    // Just return empty counts for all items
    const emptyResults = {};
    itemIds.forEach(id => {
      emptyResults[id] = {
        likes: 0,
        dislikes: 0,
        net_score: 0,
        total_votes: 0
      };
    });
    return emptyResults;
  }
}

/**
 * Check if user has voted for an item
 *
 * @param {string} itemId - Item ID
 * @returns {Promise<string|null>} Vote type ('like', 'dislike', or null)
 */
export async function getUserVote(itemId) {
  const token = await getUserToken();
  const localKey = `vote:${token}:${itemId}`;
  return localStorage.getItem(localKey);
}

/**
 * Get all items ranked by votes
 *
 * @returns {Promise<Array>} Ranked items
 */
export async function getRankings() {
  try {
    const response = await fetch(`${API_BASE_URL}/rankings`);

    if (!response.ok) {
      throw new Error('Failed to fetch rankings');
    }

    const data = await response.json();
    return data.items;

  } catch (error) {
    console.error('Failed to get rankings:', error);
    return [];
  }
}

/**
 * Get overall voting statistics
 *
 * @returns {Promise<Object>} Statistics
 */
export async function getStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    return await response.json();

  } catch (error) {
    console.error('Failed to get stats:', error);
    return {
      total_likes: 0,
      total_dislikes: 0,
      total_votes: 0,
      total_items: 0,
      like_percentage: 0
    };
  }
}

/**
 * Set API base URL (for configuration)
 *
 * @param {string} url - API base URL
 */
export function setApiBaseUrl(url) {
  API_BASE_URL = url;
}
