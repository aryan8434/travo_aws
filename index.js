import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { askLLM } from "./llm.js";
import { connectDB } from "./db.js";
import { saveMessage } from "./utils/saveChat.js";
import { getChatHistory } from "./utils/getChatHistory.js";
import {
  getSessionCity,
  setSessionCity,
  getSlots,
  saveSlots,
  mergeIntent,
} from "./utils/sessionContext.js";
import authRoutes, { seedTestUser } from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import auth from "./utils/auth.js";
import adminAuth from "./utils/adminAuth.js";
import UserChat from "./models/UserChat.js";
import path from "path";
import { fetchRealHotels } from "./providers/hotelProvider.js";
import { fetchWeather } from "./providers/weatherProvider.js";
import {
  retrievePackages,
  loadAllPackages,
  syncVectraIndex,
  budgetTier,
  resolvePackageLocation,
  packageLocationOptions,
} from "./utils/ragEngine.js";
import {
  buildFlights,
  listAirports,
  listAirportCities,
  resolveAirport,
  nearestAirportFor,
  findAirportsInText,
} from "./utils/flightEngine.js";
import { fileURLToPath } from "url";
import Razorpay from "razorpay";
import crypto from "crypto";
import { buildInvoice, TOKEN_PAYMENT_PAISE, TOKEN_PAYMENT_RUPEES } from "./utils/invoice.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   BOOT-TIME CONFIG GUARDS
========================================================= */
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    "❌ JWT_SECRET is missing or too short (min 16 chars). Auth endpoints will fail. Set it in .env",
  );
}

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const paymentsConfigured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

// PAYMENTS_MODE: "live" (default when keys present) runs the full Razorpay flow.
// "test" (default when keys absent) completes the ₹1 confirmation without a real
// gateway call — clearly labelled, still raises the full invoice. Every charge
// is only ₹1 either way.
const PAYMENTS_MODE =
  (process.env.PAYMENTS_MODE || (paymentsConfigured ? "live" : "test")).toLowerCase() === "test"
    ? "test"
    : "live";

if (PAYMENTS_MODE === "test") {
  console.warn("⚠️ PAYMENTS_MODE=test — ₹1 confirmations complete without a real gateway charge.");
} else if (!paymentsConfigured) {
  console.warn("⚠️ Payments in live mode but RAZORPAY keys are not set — endpoints return 503.");
}

const razorpayInstance = paymentsConfigured
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

/* =========================================================
   APP + MIDDLEWARE
========================================================= */
const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
];
const allowedOrigins = corsOrigins.length ? corsOrigins : defaultDevOrigins;

app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / curl / server-to-server (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
  }),
);

app.use(express.json({ limit: "1mb" }));

/* Rate limiters */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes." },
});
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    intent: "error",
    error: true,
    text: "🔌 **API tokens exhausted** — too many requests in a short time. Please wait a moment and try again.",
  },
});
const paymentLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.use("/auth", authLimiter, authRoutes);
app.use("/user", userRoutes);

/* =========================================================
   MOCK DATA HELPERS (buses / hotels)
========================================================= */
const busOperators = ["Redbus", "MSRTC", "KSRTC", "Zingbus", "TravelKing", "IntrCity", "SuperFast", "GoldBus"];

function getRandomTime() {
  const h = String(Math.floor(Math.random() * 24)).padStart(2, "0");
  const m = String(Math.floor(Math.random() * 60)).padStart(2, "0");
  return `${h}:${m}`;
}

const TIME_SLOTS = {
  morning: { start: 6, end: 12 },
  afternoon: { start: 12, end: 18 },
  evening: { start: 18, end: 21 },
  night: { start: 21, end: 6 },
};

function isInTimeSlot(timeStr, pref) {
  if (!pref || pref === "null") return true;
  const hour = Number(timeStr.split(":")[0]);
  const slot = TIME_SLOTS[pref];
  if (!slot) return true;
  return pref === "night" ? hour >= slot.start || hour < slot.end : hour >= slot.start && hour < slot.end;
}

function mockBuses(from, to, count = 200) {
  const buses = [];
  for (let i = 0; i < count; i++) {
    buses.push({
      id: `bus-${i}`,
      operator: busOperators[Math.floor(Math.random() * busOperators.length)],
      from,
      to,
      time: getRandomTime(),
      price: Math.floor(Math.random() * (5000 - 500)) + 500,
    });
  }
  return buses;
}

function mockHotels(max, targetCity = "Delhi") {
  const hotels = [
    { name: "Hotel Watan Residency", price: 1000, rating: 4.1 },
    { name: "Super Collection O RBS", price: 1000, rating: 4.5 },
    { name: "Footprint Hostel", price: 1438, rating: 4.7 },
    { name: "FabHotel Jansi Deluxe", price: 1463, rating: 3.0 },
    { name: "Garuda Suites", price: 1464, rating: 4.0 },
    { name: "Hotel Keys Delight", price: 1680, rating: 4.5 },
    { name: "FabHotel Royal International", price: 2095, rating: 3.6 },
    { name: "FabHotel Srishoin", price: 2268, rating: 4.7 },
    { name: "Hotel Vanson Villa", price: 2430, rating: 4.2 },
    { name: "Cyber Pride", price: 2600, rating: 4.1 },
    { name: "FabHotel Neelkamal", price: 2900, rating: 4.5 },
    { name: "Country Inn & Suites", price: 3668, rating: 4.4 },
    { name: "Hotel Anjushree", price: 4500, rating: 4.6 },
    { name: "Hotel Shivay", price: 4900, rating: 4.1 },
    { name: "Deltin Suites Goa", price: 5190, rating: 4.2 },
    { name: "Radisson Blu New Delhi", price: 6102, rating: 4.4 },
    { name: "The Lalit New Delhi", price: 8000, rating: 4.0 },
    { name: "Holiday Inn Chennai", price: 9285, rating: 5.0 },
    { name: "Oakwood Residence Prestige", price: 9900, rating: 5.0 },
  ];
  return hotels
    .filter((h) => h.price <= max)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)
    .map((h) => ({ ...h, city: targetCity }));
}

/* =========================================================
   CITY / LOCATION PARSING
========================================================= */
function normalizeCityName(rawCity) {
  if (!rawCity || typeof rawCity !== "string") return null;
  const cleaned = rawCity.replace(/[^a-zA-Z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function extractCityFromPrompt(message) {
  if (!message || typeof message !== "string") return null;
  const pattern =
    /(?:my\s+city\s+is|i\s+am\s+in|i'm\s+in|im\s+in|set\s+(?:my\s+)?city\s*(?:to)?|change\s+(?:my\s+)?city\s*(?:to)?|update\s+(?:my\s+)?city\s*(?:to)?|my\s+location\s+is|location\s+is)\s+([a-zA-Z\s]{2,40})/i;
  const match = message.match(pattern);
  return match?.[1] ? normalizeCityName(match[1]) : null;
}

function isLocationQuery(message) {
  if (!message || typeof message !== "string") return false;
  return /(?:what(?:'s|\s+is)\s+(?:my\s+)?(?:city|location)|my\s+(?:city|location|loction)|where\s+am\s+i)/i.test(message);
}

/* =========================================================
   CHAT ENDPOINT
========================================================= */
app.post("/chat", chatLimiter, async (req, res) => {
  try {
    const { message, policeCalled = false, sessionId, userCity } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: true, text: "Session ID is required" });
    }
    if (typeof message !== "string" || !message.trim() || message.length > 2000) {
      return res.status(400).json({ error: true, text: "Message must be 1-2000 characters" });
    }

    const incomingCity = normalizeCityName(userCity);
    const sessionCity = await getSessionCity(sessionId);
    let activeCity = incomingCity || sessionCity || null;

    if (incomingCity && incomingCity !== sessionCity) {
      activeCity = await setSessionCity(sessionId, incomingCity);
    }

    const cityFromPrompt = extractCityFromPrompt(message);
    if (cityFromPrompt) activeCity = await setSessionCity(sessionId, cityFromPrompt);

    if (isLocationQuery(message)) {
      const locationText = activeCity
        ? `📍 Your current city is ${activeCity}.`
        : "📍 I can’t detect your location yet. Please tell me your city name (example: My city is Jaipur).";
      await saveMessage(sessionId, "llm", locationText);
      return res.json({ intent: "general", text: locationText, activeCity });
    }

    // Read the last 8 turns BEFORE storing the current one, so the model gets
    // the conversation so far plus this message exactly once.
    const history = await getChatHistory(sessionId, 8);
    await saveMessage(sessionId, "user", message);

    const rawIntent = await askLLM(message, policeCalled, history, activeCity);

    // Merge over the slots we remember, so follow-ups like "kolkata" or "5000"
    // keep the flow (and the route) from the previous turn.
    const previousSlots = await getSlots(sessionId);
    const intent = mergeIntent(previousSlots, rawIntent);
    await saveSlots(sessionId, intent);

    const intentCity = normalizeCityName(intent?.city);
    if (intentCity && intentCity !== activeCity) {
      activeCity = await setSessionCity(sessionId, intentCity);
    }

    const sendResponse = async (payload) => {
      if (payload?.text) await saveMessage(sessionId, "llm", payload.text);
      return res.json(payload);
    };

    const responseText =
      intent.message ||
      "Welcome to TravoAI. I can book hotels, buses, flights or find personalized travel packages.";

    const lower = message.toLowerCase();
    const wantsPackage =
      intent.intent === "trip_plan" ||
      intent.intent === "package_search" ||
      ["package", "trip", "vacation", "tour", "holiday", "itinerary"].some((k) => lower.includes(k));

    if (wantsPackage) {
      // A package location must be explicitly chosen by the user — the
      // geolocated activeCity does NOT count. Try what they said this turn,
      // then whatever we remembered from an earlier turn of this flow.
      const locHint =
        intent.city ||
        intent.to ||
        intent.cityCandidate ||
        previousSlots.packageLocation ||
        null;
      const loc = locHint ? resolvePackageLocation(locHint) : null;

      if (!loc) {
        // Ask which state / destination — list only what we actually stock.
        const { states, destinations } = packageLocationOptions();
        const topStates = states.slice(0, 14).map((s) => `${s.name} (${s.count})`);
        const popular = destinations.slice(0, 12).map((d) => d.name);

        const notStocked =
          locHint && intent.awaitingPackageLocation
            ? `I don't have holiday packages for **${locHint}** yet. `
            : "";

        await saveSlots(sessionId, {
          ...intent,
          intent: "trip_plan",
          awaitingPackageLocation: true,
          packageLocation: null,
        });

        return sendResponse({
          intent: "trip_plan",
          type: "package",
          text:
            `🌴 ${notStocked}Which **destination or state** would you like a holiday package for?\n\n` +
            `**States we cover:** ${topStates.join(", ")}\n\n` +
            `**Popular spots:** ${popular.join(", ")}\n\n` +
            `_Reply with one — e.g. "Rajasthan" or "Goa" — and I'll show only those packages._`,
          results: [],
          activeCity,
        });
      }

      // Remember the resolved location so budget/tier follow-ups stay scoped.
      await saveSlots(sessionId, {
        ...intent,
        intent: "trip_plan",
        awaitingPackageLocation: false,
        packageLocation: loc.value,
      });

      const hasBudgetPref = Boolean(
        intent.budgetTier || intent.budgetMax || intent.maxPrice || intent.budget || intent.budgetMin,
      );

      const ragData = await retrievePackages(
        intent.awaitingPackageLocation ? loc.value : message,
        {
          budget: intent.budget || intent.maxPrice,
          budgetMin: intent.budgetMin ?? null,
          budgetMax: intent.budgetMax ?? intent.maxPrice ?? null,
          budgetTier: intent.budgetTier || null,
          city: loc.value,
          strictCity: true,
          softBudget: true, // location is the hard filter; budget only ranks
        },
        16,
      );

      const scopeLabel =
        loc.kind === "state" ? `${loc.value} state`
        : loc.kind === "country" ? loc.value
        : loc.value;

      const prefNote = hasBudgetPref
        ? ` — best matches for your budget first`
        : ``;

      const packageMessage = ragData.matches.length
        ? `🌴 Holiday packages in **${scopeLabel}** (${ragData.matches.length})${prefNote}:`
        : `🌴 I don't have any packages for **${scopeLabel}** right now. Pick another destination or state.`;

      return sendResponse({
        intent: "trip_plan",
        type: "package",
        text: packageMessage,
        results: ragData.matches,
        vectorDbUsed: ragData.vectorDbUsed,
        packageLocation: loc.value,
        activeCity,
      });
    }

    /* ---------- HOTEL SEARCH ---------- */
    if (intent.intent === "hotel_search") {
      const cityToSearch = intentCity || intent.city || activeCity || "Delhi";
      if (!intent.budget) {
        return sendResponse({
          intent: "hotel_search",
          type: "hotel",
          text: `💰 Please tell me your budget for hotels in ${cityToSearch}.`,
          results: [],
          activeCity: cityToSearch,
        });
      }

      let hotels = await fetchRealHotels(cityToSearch);
      hotels =
        hotels.length === 0
          ? mockHotels(intent.budget, cityToSearch)
          : hotels.filter((h) => h.price <= intent.budget).slice(0, 3);

      if (hotels.length === 0) {
        return sendResponse({
          intent: "hotel_search",
          type: "hotel",
          text: `😕 No hotels found under ₹${intent.budget} in ${cityToSearch}. Please try a higher budget.`,
          results: [],
          activeCity: cityToSearch,
        });
      }

      return sendResponse({
        intent: "hotel_search",
        type: "hotel",
        text: `🏨 Showing hotels under ₹${intent.budget} in ${cityToSearch}:`,
        results: hotels,
        activeCity: cityToSearch,
      });
    }

    /* ---------- BUS SEARCH ---------- */
    if (intent.intent === "bus") {
      const fromCity = intent.from || activeCity || "Delhi";
      const toCity = intent.to;
      if (!toCity) {
        return sendResponse({
          intent: "bus",
          type: "bus",
          text: `🚌 Please tell me where you want to travel from ${fromCity} (e.g. "Buses to Jaipur").`,
          results: [],
          activeCity: fromCity,
        });
      }
      if (!intent.minPrice && !intent.maxPrice) {
        return sendResponse({
          intent: "bus",
          type: "bus",
          text: `💰 Please tell me your budget for bus tickets from ${fromCity} to ${toCity} (e.g., 500 to 3000).`,
          results: [],
          activeCity: fromCity,
        });
      }

      const minPrice = intent.minPrice || 0;
      const maxPrice = intent.maxPrice;
      const buses = mockBuses(fromCity, toCity, 200).filter(
        (b) => b.price >= minPrice && b.price <= maxPrice && isInTimeSlot(b.time, intent.timePreference),
      );

      if (buses.length === 0) {
        return sendResponse({
          intent: "bus",
          type: "bus",
          text: `😕 No buses found from ${fromCity} to ${toCity} under ₹${maxPrice}.`,
          results: [],
          activeCity: fromCity,
        });
      }

      return sendResponse({
        intent: "bus",
        type: "bus",
        text: `🚌 Available buses from ${fromCity} to ${toCity} (₹${minPrice} - ₹${maxPrice}):`,
        results: buses.slice(0, 20),
        activeCity: fromCity,
      });
    }

    /* ---------- FLIGHT SEARCH (distance-based pricing) ---------- */
    if (intent.intent === "flight") {
      // Cities named in THIS message always win over a remembered/echoed slot,
      // so a stale detected city can never trap the conversation in a loop.
      const spoken = findAirportsInText(message);

      let originHint = intent.from || activeCity || null;
      let toCity = intent.to;

      if (spoken.length >= 2) {
        originHint = spoken[0].city;
        toCity = spoken[1].city;
      } else if (spoken.length === 1) {
        const said = spoken[0];
        const knownOrigin = resolveAirport(intent.from || "");

        if (!knownOrigin) {
          // Origin was missing/unusable — the city they just named is the origin.
          originHint = said.city;
          if (resolveAirport(toCity || "")?.iata === said.iata) toCity = null;
        } else if (knownOrigin.iata !== said.iata) {
          // A different city named alongside a known origin is the destination.
          toCity = said.city;
        }
        // Same city as the origin: nothing new to assign — fall through and ask.
      }

      // Resolve the origin first — a detected city with no airport (e.g. Kota)
      // must ask for a departure city, not blame the destination.
      const originAirport = originHint ? resolveAirport(originHint) : null;

      if (!originAirport) {
        const nearby = originHint ? nearestAirportFor(originHint) : null;
        const askOrigin = nearby
          ? `✈️ ${originHint} doesn't have its own airport — the nearest one is **${nearby.city} (${nearby.iata})**. Which city are you flying **from**? (reply "${nearby.city}" to use it)`
          : originHint
            ? `✈️ I couldn't find an airport for **${originHint}**. Which city are you flying **from**? I cover ${listAirportCities().length} Indian airport cities — e.g. ${listAirportCities().slice(0, 8).join(", ")}…`
            : `✈️ Which city are you flying **from**?`;

        // Drop the unusable origin so the next reply is treated as the origin.
        await saveSlots(sessionId, { ...intent, from: null });

        return sendResponse({
          intent: "flight",
          type: "flight",
          text: askOrigin,
          results: [],
          activeCity,
        });
      }

      if (!toCity) {
        const examples = ["Delhi", "Mumbai", "Bengaluru", "Chennai", "Goa"]
          .filter((c) => c.toLowerCase() !== originAirport.city.toLowerCase())
          .slice(0, 3)
          .join(", ");
        return sendResponse({
          intent: "flight",
          type: "flight",
          text: `✈️ Where would you like to fly **to** from ${originAirport.city} (${originAirport.iata})? (e.g. ${examples})`,
          results: [],
          activeCity,
        });
      }

      const destAirport = resolveAirport(toCity);

      if (destAirport && destAirport.iata === originAirport.iata) {
        await saveSlots(sessionId, { ...intent, to: null });
        return sendResponse({
          intent: "flight",
          type: "flight",
          text: `✈️ Departure and destination are both ${originAirport.city} — where would you like to fly **to**?`,
          results: [],
          activeCity,
        });
      }

      if (!destAirport) {
        const nearbyDest = nearestAirportFor(toCity);
        const askDest = nearbyDest
          ? `✈️ ${toCity} doesn't have its own airport — the nearest one is **${nearbyDest.city} (${nearbyDest.iata})**. Shall I search flights to ${nearbyDest.city}?`
          : `✈️ I couldn't find an airport for **${toCity}**. Where would you like to fly to? I cover ${listAirportCities().length} Indian airport cities — e.g. ${listAirportCities().slice(0, 12).join(", ")}…`;

        await saveSlots(sessionId, { ...intent, to: null });

        return sendResponse({
          intent: "flight",
          type: "flight",
          text: askDest,
          results: [],
          activeCity,
        });
      }

      const result = buildFlights(originAirport.city, destAirport.city, 60);
      if (!result.ok) {
        return sendResponse({
          intent: "flight",
          type: "flight",
          text: `✈️ ${result.error} Please give me a different departure or destination city.`,
          results: [],
          activeCity,
        });
      }

      if (!intent.minPrice && !intent.maxPrice) {
        return sendResponse({
          intent: "flight",
          type: "flight",
          text: `✈️ ${result.from.city} (${result.from.iata}) → ${result.to.city} (${result.to.iata}) is about **${result.distanceKm} km**. Fares are calculated at ₹2.0–₹2.5 per km. What's your budget? (e.g. 5000 to 12000)`,
          results: [],
          activeCity,
        });
      }

      const minPrice = intent.minPrice || 0;
      const maxPrice = intent.maxPrice || Number.MAX_SAFE_INTEGER;
      const flights = result.flights
        .filter((f) => f.price >= minPrice && f.price <= maxPrice && isInTimeSlot(f.time, intent.timePreference))
        .sort((a, b) => a.price - b.price)
        .slice(0, 20);

      if (flights.length === 0) {
        // Say WHY nothing matched — cheapest/dearest actually on the route.
        const fares = result.flights.map((f) => f.price);
        const cheapest = Math.min(...fares);
        const dearest = Math.max(...fares);
        const rupees = (n) => `₹${n.toLocaleString("en-IN")}`;

        const why =
          cheapest > maxPrice
            ? `The cheapest fare on this ${result.distanceKm} km route is ${rupees(cheapest)} — a little above your ${rupees(maxPrice)} ceiling.`
            : dearest < minPrice
              ? `Good news — every fare on this ${result.distanceKm} km route is **below** your ₹${minPrice.toLocaleString("en-IN")} minimum, from ${rupees(cheapest)} to ${rupees(dearest)}. Want me to show those?`
              : `Fares on this ${result.distanceKm} km route run ${rupees(cheapest)}–${rupees(dearest)}.`;

        return sendResponse({
          intent: "flight",
          type: "flight",
          text: `😕 Nothing between ₹${minPrice.toLocaleString("en-IN")} and ₹${maxPrice.toLocaleString("en-IN")} for ${result.from.city} → ${result.to.city}. ${why}`,
          results: [],
          activeCity,
        });
      }

      return sendResponse({
        intent: "flight",
        type: "flight",
        text: `✈️ ${result.from.city} → ${result.to.city} · ${result.distanceKm} km · fares ₹2.0–₹2.5/km (₹${minPrice} - ₹${maxPrice}):`,
        results: flights,
        activeCity,
      });
    }

    /* ---------- WEATHER ---------- */
    if (intent.intent === "weather") {
      const cityToSearch = intentCity || intent.city || activeCity || "Delhi";
      const weatherData = await fetchWeather(cityToSearch);
      if (!weatherData) {
        return sendResponse({
          intent: "weather",
          type: "weather",
          text: `😕 Sorry, I couldn't find weather data for ${cityToSearch}.`,
          results: null,
          activeCity: cityToSearch,
        });
      }
      return sendResponse({
        intent: "weather",
        type: "weather",
        text: `🌡️ Currently, the weather in **${weatherData.city}** is **${weatherData.temp_c}°C** (${weatherData.condition}).`,
        results: weatherData,
        activeCity: weatherData.city || activeCity,
      });
    }

    /* ---------- DEFAULT ---------- */
    return sendResponse({ intent: intent.intent, text: responseText, activeCity });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(503).json({
      intent: "error",
      error: true,
      text: "🔌 **API tokens exhausted** — the AI service quota for this session has run out. Please try again in a few minutes.",
    });
  }
});

/* =========================================================
   PACKAGE / RAG QUERY ENDPOINTS
========================================================= */
app.get("/api/packages", async (req, res) => {
  try {
    const { query = "", budget, budgetMin, budgetMax, city, people, category, tier } = req.query;
    const ragData = await retrievePackages(
      query,
      {
        budget: budget ? Number(budget) : null,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        budgetTier: tier && tier !== "ALL" ? String(tier).toLowerCase() : null,
        city,
        people: people ? Number(people) : null,
        category,
      },
      24,
    );
    res.json({ success: true, packages: ragData.matches, vectorDbUsed: ragData.vectorDbUsed });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.get("/api/airports", (req, res) => {
  res.json({ success: true, count: listAirports().length, airports: listAirports() });
});

/* =========================================================
   ADMIN — RAG ENGINE CONTROL (protected)
========================================================= */
app.post("/api/admin/reindex", adminAuth, async (req, res) => {
  try {
    await syncVectraIndex({ force: req.query.force === "1" });
    const pkgs = loadAllPackages();
    res.json({
      success: true,
      message: `Re-indexed ${pkgs.length} packages into Vectra Vector DB.`,
      count: pkgs.length,
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.get("/api/admin/chunks", adminAuth, async (req, res) => {
  try {
    const pkgs = loadAllPackages();
    res.json({
      success: true,
      totalPackages: pkgs.length,
      byTier: pkgs.reduce((acc, p) => {
        const t = p.budget_tier || budgetTier(p.price_inr || p.price);
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {}),
      chunks: pkgs.slice(0, 15),
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

/* =========================================================
   RAZORPAY — flat ₹1 confirmation charge, strict verification.
   PAYMENTS_MODE=test completes the ₹1 step without a real gateway call.
========================================================= */
function requirePayments(req, res, next) {
  if (PAYMENTS_MODE === "live" && !paymentsConfigured) {
    return res.status(503).json({
      error: true,
      message: "Payments are not configured on this server.",
    });
  }
  next();
}

const TEST_ORDER_PREFIX = "order_tmtest_";

// STEP 1: Create the ₹1 confirmation order.
// The full value travels in `notes.nominal_amount` for the invoice later.
app.post("/api/create-order", paymentLimiter, requirePayments, async (req, res) => {
  const nominalAmount = Math.max(0, Math.round(Number(req.body?.nominalAmount ?? req.body?.amount) || 0));
  const description = String(req.body?.description || "TravoAI booking").slice(0, 120);
  const kind = req.body?.kind === "wallet" ? "wallet" : "booking";

  // Test mode — no gateway round-trip.
  if (PAYMENTS_MODE === "test") {
    const orderId = `${TEST_ORDER_PREFIX}${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    return res.json({
      success: true,
      test_mode: true,
      order_id: orderId,
      amount: TOKEN_PAYMENT_PAISE,
      token_charge_rupees: TOKEN_PAYMENT_RUPEES,
      nominal_amount: nominalAmount,
      currency: "INR",
      key_id: RAZORPAY_KEY_ID || "rzp_test_unset",
      _notes: { nominal_amount: nominalAmount, description, kind },
    });
  }

  try {
    const order = await razorpayInstance.orders.create({
      amount: TOKEN_PAYMENT_PAISE, // ₹1 always
      currency: "INR",
      receipt: String(req.body?.receipt || `rcpt_${Date.now()}`).slice(0, 40),
      notes: {
        nominal_amount: String(nominalAmount),
        description,
        kind,
      },
    });

    console.log(`✅ Razorpay order ${order.id} — ₹${TOKEN_PAYMENT_RUPEES} token charge (nominal ₹${nominalAmount})`);
    return res.json({
      success: true,
      order_id: order.id,
      amount: order.amount, // 100 paise
      token_charge_rupees: TOKEN_PAYMENT_RUPEES,
      nominal_amount: nominalAmount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const rzpMsg = err?.error?.description || err?.message || String(err);
    console.error("Razorpay order creation failed:", err?.statusCode || "", rzpMsg);
    const authFail = err?.statusCode === 401 || /authentication/i.test(rzpMsg);
    return res.status(502).json({
      error: true,
      message: authFail
        ? "Payment gateway rejected the API keys. Set valid RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (test keys are fine)."
        : "Could not create payment order. Please try again.",
    });
  }
});

// STEP 2: Verify signature + confirm the payment really was captured.
app.post("/api/verify-payment", paymentLimiter, requirePayments, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    // Test mode — accept the ₹1 confirmation, raise the full invoice, label it.
    if (PAYMENTS_MODE === "test" && String(razorpay_order_id || "").startsWith(TEST_ORDER_PREFIX)) {
      const notes = req.body?.notes || {};
      const nominalAmount = Math.round(Number(notes.nominal_amount) || Number(req.body?.nominalAmount) || 0);
      const invoice = buildInvoice({
        nominalAmount,
        description: notes.description || req.body?.description || "TravoAI booking",
        kind: notes.kind || req.body?.kind || "booking",
        paymentId: razorpay_payment_id || `pay_test_${Date.now()}`,
        orderId: razorpay_order_id,
        customer: req.body?.customer || "Guest",
      });
      invoice.gateway = "TravoAI Test Mode";
      invoice.settlement_note = `Test mode — no real gateway charge. Invoice raised for the full ${invoice.nominal_amount_display}.`;
      console.log(`✅ Test payment confirmed · invoice ${invoice.invoice_no} for ₹${nominalAmount}`);
      return res.json({
        success: true,
        test_mode: true,
        message: "Test payment confirmed",
        payment_id: invoice.payment_id,
        order_id: razorpay_order_id,
        amount: TOKEN_PAYMENT_PAISE,
        nominal_amount: nominalAmount,
        invoice,
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(String(razorpay_signature));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn("❌ Razorpay signature mismatch");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Cross-check with Razorpay: payment must belong to the order, be paid,
    // and be exactly the ₹1 token charge.
    const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    if (
      !payment ||
      payment.order_id !== razorpay_order_id ||
      !["captured", "authorized"].includes(payment.status)
    ) {
      return res.status(400).json({ success: false, message: "Payment not captured for this order" });
    }
    if (Number(payment.amount) !== TOKEN_PAYMENT_PAISE) {
      return res.status(400).json({ success: false, message: "Unexpected payment amount" });
    }

    // Recover the nominal (full) value from the order to raise the invoice.
    let nominalAmount = 0;
    let description = "TravoAI booking";
    let kind = "booking";
    try {
      const order = await razorpayInstance.orders.fetch(razorpay_order_id);
      nominalAmount = Math.round(Number(order?.notes?.nominal_amount) || 0);
      description = order?.notes?.description || description;
      kind = order?.notes?.kind || kind;
    } catch {
      /* order notes are best-effort */
    }

    const invoice = buildInvoice({
      nominalAmount,
      description,
      kind,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      customer: req.body?.customer || "Guest",
    });

    console.log(`✅ Payment verified: ${razorpay_payment_id} (₹${payment.amount / 100} token · invoice ${invoice.invoice_no} for ₹${nominalAmount})`);
    return res.json({
      success: true,
      message: "Payment verified successfully",
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount: payment.amount,
      nominal_amount: nominalAmount,
      invoice,
    });
  } catch (err) {
    console.error("Payment verification error:", err?.message || err);
    return res.status(500).json({ success: false, message: "Server error during verification" });
  }
});

/* =========================================================
   USER PERSISTENT CHAT HISTORY (auth-scoped, no IDOR)
========================================================= */
app.get("/api/chat/user-history", auth, async (req, res) => {
  try {
    const userChat = await UserChat.findOne({ username: req.username }).lean();
    res.json({ success: true, messages: userChat ? userChat.messages : [] });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.post("/api/chat/save-user-message", auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "object") return res.status(400).json({ error: true });

    await UserChat.findOneAndUpdate(
      { username: req.username },
      { $push: { messages: { $each: [message], $slice: -200 } } },
      { upsert: true, new: true },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

/* =========================================================
   STATIC FRONTEND + SPA FALLBACK
========================================================= */
app.use(
  express.static(path.join(__dirname, "build"), {
    maxAge: "7d",
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

app.get(/^\/(?!api|auth|user|chat).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

/* Global error handler */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = /CORS/.test(err.message) ? 403 : err.status || 500;
  console.error("Unhandled error:", err.message);
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

/* =========================================================
   SERVER START
========================================================= */
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await seedTestUser();
  } catch (err) {
    console.error("⚠️ MongoDB connection failed, server continuing:", err.message);
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
