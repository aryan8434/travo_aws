import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LocalIndex } from "vectra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataRootDir = path.join(__dirname, "../data");
const packagesSubDir = path.join(__dirname, "../data/packages");
const singlePackagesFilePath = path.join(__dirname, "../data/packages.json");
const uploadsDir = path.join(__dirname, "../uploads");
const vectraFolder = path.join(__dirname, "../vectra_index");

// Ensure directories exist
[dataRootDir, packagesSubDir, uploadsDir, vectraFolder].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Initialize Vectra Local Vector Database Index
const index = new LocalIndex(vectraFolder);

/**
 * Recursively scans directory to load all JSON files
 */
function scanJsonFiles(dirPath) {
  let results = [];
  if (!fs.existsSync(dirPath)) return results;

  const list = fs.readdirSync(dirPath);
  list.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat && stat.isDirectory()) {
      results = results.concat(scanJsonFiles(fullPath));
    } else if (file.endsWith(".json") && file !== "metadata.json") {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const parsed = JSON.parse(raw || "[]");
        if (Array.isArray(parsed)) {
          results = results.concat(parsed);
        } else if (typeof parsed === "object") {
          results.push(parsed);
        }
      } catch (err) {
        console.warn(`Error reading JSON file ${fullPath}:`, err.message);
      }
    }
  });
  return results;
}

/**
 * Loads all packages from data/packages/ hierarchy and data/packages.json
 */
export function loadAllPackages() {
  const map = new Map();

  // 1. Read from modular folder hierarchy (data/packages/...)
  const modularPkgs = scanJsonFiles(packagesSubDir);
  for (const pkg of modularPkgs) {
    if (pkg && (pkg.package_id || pkg.title)) {
      const id = pkg.package_id || pkg.title.toLowerCase().replace(/\s+/g, "-");
      map.set(id, { ...pkg, package_id: id });
    }
  }

  // 2. Read from single master packages.json if present
  if (fs.existsSync(singlePackagesFilePath)) {
    try {
      const raw = fs.readFileSync(singlePackagesFilePath, "utf-8");
      const singleList = JSON.parse(raw || "[]");
      for (const pkg of singleList) {
        if (pkg && (pkg.package_id || pkg.title)) {
          const id = pkg.package_id || pkg.title.toLowerCase().replace(/\s+/g, "-");
          if (!map.has(id)) {
            map.set(id, { ...pkg, package_id: id });
          }
        }
      }
    } catch (e) {
      console.warn("Reading packages.json warning:", e.message);
    }
  }

  return Array.from(map.values());
}

/**
 * Generates local 128-dim normalized embedding vector
 */
function generateLocalEmbedding(text) {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const vector = new Array(128).fill(0);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let c = 0; c < word.length; c++) {
      const charCode = word.charCodeAt(c);
      const idx = (charCode + i * 7) % 128;
      vector[idx] += 1;
    }
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Builds rich composite text chunk for embeddings
 */
function buildCompositeText(pkg) {
  const itineraryText = (pkg.itinerary || [])
    .map((day) => `Day ${day.day}: ${day.title} - ${(day.activities || []).join(", ")} ${day.description || ""}`)
    .join(". ");

  const faqsText = (pkg.faqs || []).map((f) => `Q: ${f.question} A: ${f.answer}`).join(" ");
  const tipsText = (pkg.travel_tips || []).join(". ");
  const highlightsText = (pkg.highlights || []).join(". ");
  const tagsText = (pkg.tags || []).join(" ");

  return `
    Package ID: ${pkg.package_id}
    Title: ${pkg.title}
    Destination: ${pkg.destination}, ${pkg.state || ""}, ${pkg.country || "India"}
    Category: ${pkg.category || ""}
    Price: ${pkg.price_inr || pkg.price} INR
    Duration: ${pkg.days || 3} Days ${pkg.nights || 2} Nights
    Hotel: ${pkg.hotel_name || ""} (${pkg.hotel_tier || ""})
    Rating: ${pkg.rating || 4.5} Stars
    Best Months: ${(pkg.best_months || []).join(", ")}
    Weather: ${pkg.weather || ""}
    Description: ${pkg.description || ""}
    Highlights: ${highlightsText}
    Itinerary: ${itineraryText}
    Travel Tips: ${tipsText}
    Cancellation Policy: ${pkg.cancellation_policy || ""}
    FAQs: ${faqsText}
    Tags: ${tagsText}
  `.trim();
}

/**
 * Synchronizes Vectra Vector Database Index with data packages
 */
export async function syncVectraIndex() {
  try {
    if (!(await index.isIndexCreated())) {
      await index.createIndex();
    }

    const packages = loadAllPackages();
    console.log(`⚡ Indexing ${packages.length} packages into Vectra Vector DB...`);

    for (const pkg of packages) {
      const richText = buildCompositeText(pkg);
      const vector = generateLocalEmbedding(richText);

      await index.insertItem({
        vector,
        metadata: {
          package_id: pkg.package_id,
          title: pkg.title,
          destination: pkg.destination,
          price_inr: pkg.price_inr || pkg.price,
          category: pkg.category,
          rating: pkg.rating,
          rawPackage: JSON.stringify(pkg),
        },
      });
    }

    console.log(`✅ Vectra Vector DB sync completed successfully (${packages.length} items).`);
  } catch (err) {
    console.warn("Vectra Vector DB Sync Warning:", err.message);
  }
}

// Auto-sync on startup
syncVectraIndex().catch(() => {});

/**
 * Hybrid Search Pipeline: Metadata Filtering -> Vector Search -> Scoring & Reranking -> AI Reasoning
 */
export async function retrievePackages(query = "", filters = {}, topK = 6) {
  const allPackages = loadAllPackages();
  if (allPackages.length === 0) {
    return { matches: [], contextText: "No packages available in vector database." };
  }

  // STEP 1: Metadata Filtering
  let candidates = [...allPackages];

  if (filters.city || filters.destination) {
    const targetCity = (filters.city || filters.destination).toLowerCase();
    const cityMatches = candidates.filter(
      (pkg) =>
        pkg.destination?.toLowerCase().includes(targetCity) ||
        pkg.state?.toLowerCase().includes(targetCity) ||
        pkg.country?.toLowerCase().includes(targetCity)
    );
    if (cityMatches.length > 0) candidates = cityMatches;
  }

  if (filters.budget) {
    const budgetNum = Number(filters.budget);
    const budgetMatches = candidates.filter(
      (pkg) => (pkg.price_inr || pkg.price || 0) <= budgetNum * 1.25
    );
    if (budgetMatches.length > 0) candidates = budgetMatches;
  }

  if (filters.category && filters.category !== "ALL") {
    const catLower = filters.category.toLowerCase();
    const catMatches = candidates.filter(
      (pkg) =>
        pkg.category?.toLowerCase().includes(catLower) ||
        (pkg.tags && pkg.tags.some((t) => t.toLowerCase().includes(catLower)))
    );
    if (catMatches.length > 0) candidates = catMatches;
  }

  // STEP 2: Vector Similarity Search
  const queryVector = generateLocalEmbedding(query || `${filters.city || ''} ${filters.category || ''}`);
  let vectorResults = [];

  try {
    const results = await index.queryItems(queryVector, topK * 3);
    if (results && results.length > 0) {
      vectorResults = results
        .map((r) => {
          try {
            const pkg = JSON.parse(r.item.metadata.rawPackage);
            return { pkg, score: r.score || 0.8 };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
    }
  } catch (err) {
    console.warn("Vector query warning:", err.message);
  }

  // Combine metadata candidate pool with vector search results
  const candidateMap = new Map();
  for (const item of vectorResults) {
    candidateMap.set(item.pkg.package_id, { pkg: item.pkg, vectorScore: item.score });
  }
  for (const pkg of candidates) {
    if (!candidateMap.has(pkg.package_id)) {
      candidateMap.set(pkg.package_id, { pkg, vectorScore: 0.6 });
    }
  }

  // STEP 3: Composite Scoring & Reranking Engine
  // Score = (Vector Similarity * 40%) + (Budget Match * 20%) + (Rating * 20%) + (Season Match * 20%)
  const scoredItems = Array.from(candidateMap.values()).map(({ pkg, vectorScore }) => {
    let budgetScore = 1.0;
    const price = pkg.price_inr || pkg.price || 0;
    if (filters.budget) {
      if (price <= filters.budget) {
        budgetScore = 1.0;
      } else if (price <= filters.budget * 1.2) {
        budgetScore = 0.7;
      } else {
        budgetScore = 0.4;
      }
    }

    const ratingScore = (pkg.rating || 4.5) / 5.0;

    // Season match (e.g. December)
    let seasonScore = 0.8;
    const currentMonth = new Date().toLocaleString("en-US", { month: "long" });
    if (pkg.best_months && pkg.best_months.includes(currentMonth)) {
      seasonScore = 1.0;
    }

    const finalScore = vectorScore * 0.4 + budgetScore * 0.2 + ratingScore * 0.2 + seasonScore * 0.2;
    const matchPercentage = Math.round(Math.min(99, Math.max(75, finalScore * 100)));

    // STEP 4: AI Recommendation Reasoning Explanation
    const reasons = [];
    if (filters.budget && price <= filters.budget) {
      reasons.push(`Fits your budget under ₹${filters.budget.toLocaleString("en-IN")}`);
    }
    if (pkg.best_months && pkg.best_months.includes(currentMonth)) {
      reasons.push(`Ideal weather for ${currentMonth} travel`);
    }
    if (pkg.hotel_tier) {
      reasons.push(`Includes ${pkg.hotel_tier}`);
    }
    if (pkg.rating >= 4.8) {
      reasons.push(`Top rated (${pkg.rating}★)`);
    }

    const matchReason = reasons.length > 0 ? reasons.join(" • ") : "Matches your travel preferences & vector query.";

    return {
      ...pkg,
      match_score: matchPercentage,
      match_reason: matchReason,
    };
  });

  // Sort descending by final recommendation score
  scoredItems.sort((a, b) => b.match_score - a.match_score);
  const finalMatches = scoredItems.slice(0, topK);

  const contextText = finalMatches
    .map(
      (pkg, idx) =>
        `[RAG Chunk ${idx + 1}] ID: ${pkg.package_id} | Score: ${pkg.match_score}% | Title: "${pkg.title}" | Destination: ${pkg.destination} | Price: ₹${pkg.price_inr} | Hotel: ${pkg.hotel_name || "Luxury Stay"} | Highlights: ${(pkg.highlights || []).slice(0, 2).join(", ")} | Description: ${pkg.description}`
    )
    .join("\n\n");

  return {
    matches: finalMatches,
    contextText,
    vectorDbUsed: "Vectra Hybrid Vector Search",
  };
}

/**
 * PDF Brochure Ingestion Engine (Extracts & Embeds Document Chunks)
 */
export async function ingestPdfText(pdfFilename, pdfText) {
  if (!pdfText || pdfText.trim().length === 0) return 0;

  // Chunk text into 500-char segments with 50-char overlap
  const chunkSize = 500;
  const overlap = 50;
  const chunks = [];

  for (let i = 0; i < pdfText.length; i += chunkSize - overlap) {
    const chunk = pdfText.slice(i, i + chunkSize);
    if (chunk.trim().length > 20) {
      chunks.push(chunk.trim());
    }
  }

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunkText = chunks[idx];
    const vector = generateLocalEmbedding(chunkText);

    await index.insertItem({
      vector,
      metadata: {
        package_id: `PDF-${path.basename(pdfFilename)}-chunk-${idx + 1}`,
        title: `Brochure: ${path.basename(pdfFilename)} (Part ${idx + 1})`,
        destination: "Document RAG",
        rawPackage: JSON.stringify({
          package_id: `PDF-${idx + 1}`,
          title: `📄 Brochure Document: ${pdfFilename}`,
          destination: "Travel PDF Brochure",
          description: chunkText,
          isPdfChunk: true,
          pdfFilename,
        }),
      },
    });
  }

  return chunks.length;
}
