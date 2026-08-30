import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// gemini-embedding-001 is the current stable embedding model on the free tier
// (text-embedding-004 was retired). Override with GEMINI_EMBED_MODEL.
const GEMINI_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const GEMINI_DIM = 768; // gemini-embedding-001 supports 128–3072; we pin 768
const LOCAL_DIM = 256;

const cachePath = path.join(__dirname, "../vectra_index/embed_cache.json");
const vectraFolder = path.join(__dirname, "../vectra_index");
if (!fs.existsSync(vectraFolder)) fs.mkdirSync(vectraFolder, { recursive: true });

/* ----------------------------------------------------------------
   Disk cache  (sha1(model + text) -> vector)
---------------------------------------------------------------- */
let _cache = null;
let _cacheDirty = false;

function loadCache() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  } catch {
    _cache = {};
  }
  return _cache;
}

export function flushEmbedCache() {
  if (!_cacheDirty) return;
  try {
    fs.writeFileSync(cachePath, JSON.stringify(loadCache()));
    _cacheDirty = false;
  } catch (err) {
    console.warn("embed cache write failed:", err.message);
  }
}
// Best-effort flush on exit.
process.on("exit", flushEmbedCache);

function cacheKey(model, text) {
  return crypto.createHash("sha1").update(`${model}::${text}`).digest("hex");
}

/* ----------------------------------------------------------------
   Provider selection
---------------------------------------------------------------- */
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let _activeProviderLogged = false;
let _geminiDisabled = false;
let _rateLimitWarned = false;
let _degradedCount = 0;
let _consecutive429 = 0;
const MAX_CONSECUTIVE_429 = 4; // quota is clearly gone — stop hammering it

export function embeddingProvider() {
  return geminiKey && !_geminiDisabled ? "gemini" : "local";
}

/** Number of chunks that fell back to a local vector this run (rate limits). */
export function degradedEmbeddingCount() {
  return _degradedCount;
}

function logProviderOnce() {
  if (_activeProviderLogged) return;
  _activeProviderLogged = true;
  console.log(
    embeddingProvider() === "gemini"
      ? `🧠 Embeddings: Gemini ${GEMINI_MODEL} (${GEMINI_DIM}-dim)`
      : `🧠 Embeddings: local fallback (${LOCAL_DIM}-dim hashed n-grams)`,
  );
}

/* ----------------------------------------------------------------
   Local fallback embedding — hashed word + bigram features, tf-weighted,
   L2-normalised. Deterministic, no network. Padded to GEMINI_DIM so vector
   length stays constant across providers within one index.
---------------------------------------------------------------- */
function hashToken(token) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function localEmbedding(text, dim = GEMINI_DIM) {
  const vec = new Array(dim).fill(0);
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s₹]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w.length > 1);

  const bump = (tok, weight) => {
    const idx = hashToken(tok) % dim;
    vec[idx] += weight;
    vec[(idx * 31 + 7) % dim] += weight * 0.5;
  };

  for (let i = 0; i < words.length; i++) {
    bump(words[i], 1);
    if (i + 1 < words.length) bump(`${words[i]}_${words[i + 1]}`, 0.7);
  }

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/* ----------------------------------------------------------------
   Gemini embedding
---------------------------------------------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class RateLimitError extends Error {}
class AuthError extends Error {}

async function geminiEmbedOnce(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: GEMINI_DIM,
    }),
  });
  if (res.status === 429) throw new RateLimitError("429 quota exceeded");
  if (res.status === 401 || res.status === 403) {
    throw new AuthError(`${res.status} ${(await res.text()).slice(0, 120)}`);
  }
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);

  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("empty embedding response");
  }
  // Re-normalise (a custom outputDimensionality is not returned L2-normalised).
  const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0)) || 1;
  return values.map((v) => v / norm);
}

// Retry 429s with exponential backoff before giving up on a single item.
async function geminiEmbed(text) {
  const backoffs = [1000, 4000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await geminiEmbedOnce(text);
    } catch (err) {
      if (err instanceof RateLimitError && attempt < backoffs.length) {
        await sleep(backoffs[attempt]);
        continue;
      }
      throw err;
    }
  }
}

/* ----------------------------------------------------------------
   Public API
---------------------------------------------------------------- */

/**
 * Embed a single string. Uses Gemini when configured, else a local fallback.
 * Results are cached to disk by (provider-model, text).
 */
export async function embedText(text) {
  logProviderOnce();
  const clean = String(text || "").slice(0, 8000).trim() || "empty";
  const provider = embeddingProvider();
  const key = cacheKey(`${provider}:${provider === "gemini" ? GEMINI_MODEL : "local"}`, clean);
  const cache = loadCache();
  if (cache[key]) return cache[key];

  let vector;
  if (provider === "gemini") {
    try {
      vector = await geminiEmbed(clean);
      _consecutive429 = 0;
    } catch (err) {
      if (err instanceof RateLimitError) {
        _degradedCount++;
        if (++_consecutive429 >= MAX_CONSECUTIVE_429 && !_geminiDisabled) {
          _geminiDisabled = true;
          console.warn(
            `Gemini embedding quota exhausted (${_consecutive429} consecutive 429s) — using local embeddings for the rest of this run. Re-run \`npm run reindex -- --force\` when quota resets.`,
          );
        } else if (!_rateLimitWarned) {
          _rateLimitWarned = true;
          console.warn(`Gemini embedding rate-limited (${err.message}) — local fallback for affected chunks.`);
        }
        return localEmbedding(clean);
      }
      if (err instanceof AuthError) {
        // Bad/blocked key — stop trying Gemini for the rest of this run.
        console.warn(`Gemini embedding auth failed (${err.message}) — using local fallback for this run.`);
        _geminiDisabled = true;
        _activeProviderLogged = false;
        logProviderOnce();
      } else {
        console.warn(`Gemini embedding error (${err.message}) — local fallback for this chunk.`);
      }
      _degradedCount++;
      return localEmbedding(clean);
    }
  } else {
    vector = localEmbedding(clean);
  }

  cache[key] = vector;
  _cacheDirty = true;
  return vector;
}

/**
 * Embed many strings with a small concurrency cap. Periodically flushes cache.
 */
export async function embedBatch(texts, { concurrency = 4 } = {}) {
  const out = new Array(texts.length);
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < texts.length) {
      const i = cursor++;
      out[i] = await embedText(texts[i]);
      if (++done % 25 === 0) flushEmbedCache();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, texts.length) }, worker),
  );
  flushEmbedCache();
  return out;
}

export const EMBED_DIM = GEMINI_DIM;
