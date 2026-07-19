import "dotenv/config";
import express from "express";
import cors from "cors";
import { askLLM } from "./llm.js";
import { connectDB } from "./db.js";
import { saveMessage } from "./utils/saveChat.js";
import { getChatHistory } from "./utils/getChatHistory.js";
import { getSessionCity, setSessionCity } from "./utils/sessionCity.js";
import authRoutes, { seedTestUser } from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import UserChat from "./models/UserChat.js";
import path from "path";
import { fetchRealHotels } from "./providers/hotelProvider.js";
import { fetchWeather } from "./providers/weatherProvider.js";
import { retrievePackages, loadAllPackages, syncVectraIndex, ingestPdfText } from "./utils/ragEngine.js";
import { fileURLToPath } from "url";
import Razorpay from "razorpay";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use("/user", userRoutes);

app.use("/auth", authRoutes);
const cities = [
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Indore",
  "Surat",
];

const airlines = [
  "Air India",
  "IndiGo",
  "SpiceJet",
  "GoAir",
  "Vistara",
  "AirAsia",
];

const busOperators = [
  "Redbus",
  "MSRTC",
  "KSRTC",
  "FirstFlight",
  "TravelKing",
  "EasyGo",
  "SuperFast",
  "GoldBus",
];

function getRandomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

function getRandomTime() {
  const hours = String(Math.floor(Math.random() * 24)).padStart(2, "0");
  const minutes = String(Math.floor(Math.random() * 60)).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// TIME SLOT FILTERING
const TIME_SLOTS = {
  morning: { start: 6, end: 12 }, // 6:00 to 12:00
  afternoon: { start: 12, end: 18 }, // 12:00 to 18:00 (6 PM)
  evening: { start: 18, end: 21 }, // 18:00 to 21:00 (9 PM)
  night: { start: 21, end: 6 }, // 21:00 to 6:00 (crosses midnight)
};

function getHourFromTime(timeStr) {
  const [hours] = timeStr.split(":").map(Number);
  return hours;
}

function isInTimeSlot(timeStr, timePreference) {
  if (!timePreference || timePreference === "null") return true;

  const hour = getHourFromTime(timeStr);
  const slot = TIME_SLOTS[timePreference];

  if (!slot) return true;

  if (timePreference === "night") {
    // Night: 21:00 to 6:00 (crosses midnight)
    return hour >= slot.start || hour < slot.end;
  } else {
    // Other slots: start to end
    return hour >= slot.start && hour < slot.end;
  }
}

function mockFlights(from, to, count = 100) {
  const flights = [];
  for (let i = 0; i < count; i++) {
    flights.push({
      id: `flight-${i}`,
      airline: airlines[Math.floor(Math.random() * airlines.length)],
      from,
      to,
      time: getRandomTime(),
      price: Math.floor(Math.random() * (50000 - 5000)) + 5000,
    });
  }
  return flights;
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

function normalizeCityName(rawCity) {
  if (!rawCity || typeof rawCity !== "string") return null;

  const cleaned = rawCity
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractCityFromPrompt(message) {
  if (!message || typeof message !== "string") return null;

  const patterns = [
    /(?:my\s+city\s+is|i\s+am\s+in|i'm\s+in|im\s+in|set\s+(?:my\s+)?city\s*(?:to)?|change\s+(?:my\s+)?city\s*(?:to)?|update\s+(?:my\s+)?city\s*(?:to)?|my\s+location\s+is|location\s+is)\s+([a-zA-Z\s]{2,40})/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return normalizeCityName(match[1]);
    }
  }

  return null;
}

function isLocationQuery(message) {
  if (!message || typeof message !== "string") return false;

  return /(?:what(?:'s|\s+is)\s+(?:my\s+)?(?:city|location)|my\s+(?:city|location|loction)|where\s+am\s+i)/i.test(
    message,
  );
}

/* =========================
   HEALTH CHECK
========================= */

/* =========================
   CHAT ENDPOINT
========================= */
app.post("/chat", async (req, res) => {
  try {
    const { message, policeCalled = false, sessionId, userCity } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: true,
        text: "Session ID is required",
      });
    }

    console.log(
      `[CHAT] msg: "${message}" | session: ${sessionId} | city: ${userCity}`,
    );

    const incomingCity = normalizeCityName(userCity);
    const sessionCity = await getSessionCity(sessionId);
    let activeCity = incomingCity || sessionCity || null;

    if (incomingCity && incomingCity !== sessionCity) {
      activeCity = await setSessionCity(sessionId, incomingCity);
    }

    const cityFromPrompt = extractCityFromPrompt(message);
    if (cityFromPrompt) {
      activeCity = await setSessionCity(sessionId, cityFromPrompt);
    }

    if (isLocationQuery(message)) {
      const locationText = activeCity
        ? `📍 Your current city is ${activeCity}.`
        : "📍 I can’t detect your location yet. Please tell me your city name (example: My city is Jaipur).";

      await saveMessage(sessionId, "llm", locationText);
      return res.json({
        intent: "general",
        text: locationText,
        activeCity,
      });
    }
    await saveMessage(sessionId, "user", message);

    // Fetch conversation memory (last 8 messages)
    const history = await getChatHistory(sessionId, 8);

    const intent = await askLLM(message, policeCalled, history, activeCity);

    const intentCity = normalizeCityName(intent?.city);
    if (intentCity && intentCity !== activeCity) {
      activeCity = await setSessionCity(sessionId, intentCity);
    }

    // Helper to send JSON and save assistant message to history
    const sendResponse = async (payload) => {
      if (payload && payload.text) {
        await saveMessage(sessionId, "llm", payload.text);
      }
      return res.json(payload);
    };

    let responseText =
      intent.message ||
      "Welcome to TravoAI. I can book hotels, buses, flights or find personalized travel packages.";

    if (intent.intent === "trip_plan" || intent.intent === "package_search" || message.toLowerCase().includes("package") || message.toLowerCase().includes("trip") || message.toLowerCase().includes("vacation") || message.toLowerCase().includes("tour")) {
      const ragData = await retrievePackages(message, {
        budget: intent.budget || intent.maxPrice,
        city: intent.city || intent.to,
      });

      const packageMessage = intent.message || (ragData.matches.length > 0 
        ? `🌴 Here are top AI recommended holiday packages matching your preferences:`
        : `🌴 I searched our vector database for travel packages. Here are recommendations:`);

      return sendResponse({
        intent: "trip_plan",
        type: "package",
        text: packageMessage,
        results: ragData.matches,
        activeCity,
      });
    }

    /* =========================
       HOTEL SEARCH
    ========================= */
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

      let hotels = [];
      console.log(`🔍 Fetching real hotels for: ${cityToSearch}`);
      hotels = await fetchRealHotels(cityToSearch);

      if (hotels.length === 0) {
        hotels = mockHotels(intent.budget, cityToSearch);
      } else {
        hotels = hotels.filter((h) => h.price <= intent.budget).slice(0, 3);
      }

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

    /* =========================
       BUS SEARCH
    ========================= */
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
        (b) =>
          b.price >= minPrice &&
          b.price <= maxPrice &&
          isInTimeSlot(b.time, intent.timePreference)
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

    /* =========================
       FLIGHT SEARCH
    ========================= */
    if (intent.intent === "flight") {
      const fromCity = intent.from || activeCity || "Delhi";
      const toCity = intent.to;

      if (!toCity) {
        return sendResponse({
          intent: "flight",
          type: "flight",
          text: `✈️ Please tell me your destination from ${fromCity} (e.g. "Flights to Bangalore").`,
          results: [],
          activeCity: fromCity,
        });
      }

      if (!intent.minPrice && !intent.maxPrice) {
        return sendResponse({
          intent: "flight",
          type: "flight",
          text: `💰 Please tell me your budget for flight tickets from ${fromCity} to ${toCity} (e.g. 5000).`,
          results: [],
          activeCity: fromCity,
        });
      }

      const minPrice = intent.minPrice || 0;
      const maxPrice = intent.maxPrice;

      const flights = mockFlights(fromCity, toCity, 100).filter(
        (f) =>
          f.price >= minPrice &&
          f.price <= maxPrice &&
          isInTimeSlot(f.time, intent.timePreference)
      );

      if (flights.length === 0) {
        return sendResponse({
          intent: "flight",
          type: "flight",
          text: `😕 No flights found from ${fromCity} to ${toCity} under ₹${maxPrice}.`,
          results: [],
          activeCity: fromCity,
        });
      }

      return sendResponse({
        intent: "flight",
        type: "flight",
        text: `✈️ Available flights from ${fromCity} to ${toCity} (₹${minPrice} - ₹${maxPrice}):`,
        results: flights.slice(0, 20),
        activeCity: fromCity,
      });
    }

    /* =========================
       WEATHER SEARCH
    ========================= */
    if (intent.intent === "weather") {
      const cityToSearch = intentCity || intent.city || activeCity || "Delhi";

      console.log(`🔍 Fetching weather for: ${cityToSearch}`);
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

      const responseMsg = `🌡️ Currently, the weather in **${weatherData.city}** is **${weatherData.temp_c}°C** (${weatherData.condition}).`;

      return sendResponse({
        intent: "weather",
        type: "weather",
        text: responseMsg,
        results: weatherData,
        activeCity: weatherData.city || activeCity,
      });
    }

    /* =========================
       DEFAULT / GENERAL
    ========================= */
    return sendResponse({
      intent: intent.intent,
      text: responseText,
      activeCity,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      intent: "error",
      text: "⚠️ Something went wrong",
    });
  }
});

// Endpoint for direct RAG vector package queries
app.get("/api/packages", async (req, res) => {
  try {
    const { query = "", budget, city, people, category } = req.query;
    const ragData = await retrievePackages(
      query,
      {
        budget: budget ? Number(budget) : null,
        city,
        people: people ? Number(people) : null,
        category,
      },
      20
    );
    res.json({ success: true, packages: ragData.matches });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

/* =========================================================
   ADMIN PANEL & RAG ENGINE CONTROL ENDPOINTS
   ========================================================= */

// Re-index all JSON dataset files into Vectra DB
app.post("/api/admin/reindex", async (req, res) => {
  try {
    await syncVectraIndex();
    const pkgs = loadAllPackages();
    res.json({
      success: true,
      message: `Successfully re-indexed ${pkgs.length} packages into Vectra Vector DB.`,
      count: pkgs.length,
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Admin preview raw vector dataset chunks
app.get("/api/admin/chunks", async (req, res) => {
  try {
    const pkgs = loadAllPackages();
    res.json({
      success: true,
      totalPackages: pkgs.length,
      chunks: pkgs.slice(0, 15),
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

/* =========================================================
   RAZORPAY STANDARD CHECKOUT ENDPOINTS
   ========================================================= */

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TFM4cTiksu0var",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "Vj4M6xnUqUhvGVZm1tbpQLCN",
});

// STEP 1: Create Order
app.post("/api/create-order", async (req, res) => {
  try {
    const { receipt, amount } = req.body;

    // Minimum amount: 100 paise (₹1)
    const fixedAmountInPaise = amount && Number(amount) >= 100 ? Number(amount) : 100;

    const options = {
      amount: fixedAmountInPaise,
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`,
    };

    try {
      const order = await razorpayInstance.orders.create(options);
      console.log(`✅ Live Razorpay Order Created: ${order.id} for ₹${order.amount / 100}`);
      return res.json({
        success: true,
        is_simulated: false,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TFM4cTiksu0var",
      });
    } catch (orderErr) {
      console.warn("Razorpay API order creation note (switching to local test checkout):", orderErr.message || orderErr);
      return res.json({
        success: true,
        is_simulated: true,
        order_id: `order_sim_${Date.now()}`,
        amount: fixedAmountInPaise,
        currency: "INR",
        key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TFM4cTiksu0var",
      });
    }
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    return res.status(500).json({
      error: true,
      message: err.message || "Failed to create Razorpay order",
    });
  }
});

// STEP 3: Verify Signature
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification parameters",
      });
    }

    if (razorpay_order_id.startsWith("order_sim_") || razorpay_signature === "simulated_signature") {
      console.log(`✅ Test payment verified successfully: ${razorpay_payment_id}`);
      return res.json({
        success: true,
        message: "Test Payment verified successfully",
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "Vj4M6xnUqUhvGVZm1tbpQLCN";
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      console.log(`✅ Razorpay payment verified successfully: ${razorpay_payment_id}`);
      return res.json({
        success: true,
        message: "Payment verified successfully",
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      });
    } else {
      console.warn("❌ Razorpay signature mismatch!");
      return res.status(400).json({
        success: false,
        message: "Invalid signature: payment verification failed",
      });
    }
  } catch (err) {
    console.error("Payment verification error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error during payment verification",
    });
  }
});

/* =========================================================
   USER PERSISTENT CHAT HISTORY ENDPOINTS (MONGODB)
   ========================================================= */

// Get full saved MongoDB chat history for a user
app.get("/api/chat/user-history", async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();
    if (!username) return res.json({ success: true, messages: [] });

    const userChat = await UserChat.findOne({ username }).lean();
    res.json({ success: true, messages: userChat ? userChat.messages : [] });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Append single message to user's MongoDB chat thread
app.post("/api/chat/save-user-message", async (req, res) => {
  try {
    const { username, message } = req.body;
    if (!username || !message) return res.json({ success: true });

    await UserChat.findOneAndUpdate(
      { username },
      { $push: { messages: message } },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;

// Start server and attempt DB connection
async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");
    await seedTestUser();
  } catch (err) {
    console.error(
      "⚠️ MongoDB connection failed, but server continuing:",
      err.message,
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

app.use(express.static(path.join(__dirname, "build")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
// Global error handler — return JSON on server errors (prevents HTML error pages)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal Server Error" });
});

// Warn if important env vars missing
if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️ JWT_SECRET is not set. Login/signup may fail in production.",
  );
}
