import "dotenv/config";
import express from "express";
import cors from "cors";
import { askLLM } from "./llm.js";
import { connectDB } from "./db.js";
import { saveMessage } from "./utils/saveChat.js";
import { getChatHistory } from "./utils/getChatHistory.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cors());

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

function mockHotels(max) {
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
    .slice(0, 3);
}

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.status(200).send("TravoAI backend is running");
});

/* =========================
   CHAT ENDPOINT
========================= */
app.post("/chat", async (req, res) => {
  try {
    const { message, policeCalled = false, sessionId } = req.body;
    const history = await getChatHistory(sessionId);

    if (!sessionId) {
      return res.status(400).json({
        error: true,
        text: "Session ID is required",
      });
    }

    // ✅ Save user message
    await saveMessage(sessionId, "user", message);

    const intent = await askLLM(message, policeCalled, history);

    let responseText =
      intent.message ||
      "Welcome to TravoAI. I can book hotels, buses, or plan trips.";
    if (intent.intent === "trip_plan") {
      return res.json({
        intent: "trip_plan",
        text: intent.message,
      });
    }

    /* =========================
                                                                                                                                                                                                                       HOTEL SEARCH
                                                                                                                                                                                                                    ========================= */
    if (intent.intent === "hotel_search") {
      if (!intent.budget) {
        return res.json({
          intent: "hotel_search",
          type: "hotel",
          text: "💰 Please tell me your budget.",
          results: [],
        });
      }

      const hotels = mockHotels(intent.budget);

      if (hotels.length === 0) {
        return res.json({
          intent: "hotel_search",
          type: "hotel",
          text: "😕 No hotels found in this budget. Please increase your budget.",
          results: [],
        });
      }

      return res.json({
        intent: "hotel_search",
        type: "hotel",
        text: `🏨 Top hotels under ₹${intent.budget}`,
        results: hotels,
      });
    }
    if (intent.intent === "bus") {
      if (!intent.from || !intent.to) {
        return res.json({
          intent: "bus",
          type: "bus",
          text: "🚌 Please tell me both source and destination.",
          results: [],
        });
      }

      if (!intent.minPrice && !intent.maxPrice) {
        return res.json({
          intent: "bus",
          type: "bus",
          text: "💰 Please tell me your budget range (e.g., 500 to 5000).",
          results: [],
        });
      }

      // If only maxPrice is provided, set minPrice to 0
      const minPrice = intent.minPrice || 0;
      const maxPrice = intent.maxPrice;

      if (!intent.timePreference) {
        return res.json({
          intent: "bus",
          type: "bus",
          text: "🕐 Please tell me your preferred time: morning (6-12), afternoon (12-18), evening (18-21), or night (21-6).",
          results: [],
        });
      }

      const buses = mockBuses(intent.from, intent.to, 200).filter(
        (b) =>
          b.price >= minPrice &&
          b.price <= maxPrice &&
          isInTimeSlot(b.time, intent.timePreference),
      );

      if (buses.length === 0) {
        return res.json({
          intent: "bus",
          type: "bus",
          text: `😕 No buses found for ${intent.timePreference} (₹${minPrice} - ₹${maxPrice}).`,
          results: [],
        });
      }

      return res.json({
        intent: "bus",
        type: "bus",
        text: `🚌 Available buses from ${intent.from} to ${intent.to} (${intent.timePreference}, ₹${minPrice} - ₹${maxPrice})`,
        results: buses.slice(0, 20),
      });
    }

    if (intent.intent === "flight") {
      if (!intent.from || !intent.to) {
        return res.json({
          intent: "flight",
          type: "flight",
          text: "✈️ Please tell me both source and destination.",
          results: [],
        });
      }

      if (!intent.minPrice && !intent.maxPrice) {
        return res.json({
          intent: "flight",
          type: "flight",
          text: "💰 Please tell me your budget range (e.g., 5000 to 50000).",
          results: [],
        });
      }

      // If only maxPrice is provided, set minPrice to 0
      const minPrice = intent.minPrice || 0;
      const maxPrice = intent.maxPrice;

      if (!intent.timePreference) {
        return res.json({
          intent: "flight",
          type: "flight",
          text: "🕐 Please tell me your preferred time: morning (6-12), afternoon (12-18), evening (18-21), or night (21-6).",
          results: [],
        });
      }

      const flights = mockFlights(intent.from, intent.to, 100).filter(
        (f) =>
          f.price >= minPrice &&
          f.price <= maxPrice &&
          isInTimeSlot(f.time, intent.timePreference),
      );

      if (flights.length === 0) {
        return res.json({
          intent: "flight",
          type: "flight",
          text: `😕 No flights found for ${intent.timePreference} (₹${minPrice} - ₹${maxPrice}).`,
          results: [],
        });
      }

      return res.json({
        intent: "flight",
        type: "flight",
        text: `✈️ Available flights from ${intent.from} to ${intent.to} (${intent.timePreference}, ₹${minPrice} - ₹${maxPrice})`,
        results: flights.slice(0, 20),
      });
    }

    /* =========================
                                                                                                                                                                                                                       DEFAULT / GENERAL
                                                                                                                                                                                                                    ========================= */
    await saveMessage(sessionId, "llm", responseText);

    return res.json({
      intent: intent.intent,
      text: responseText,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      intent: "error",
      text: "⚠️ Something went wrong",
    });
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
  } catch (err) {
    console.error(
      "⚠️ MongoDB connection failed, but server continuing:",
      err.message,
    );
    // Don't exit - server can still run without DB for now
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

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
