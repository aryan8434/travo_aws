# ✈️ TravoAI — AI-Powered Travel Booking Assistant

<div align="center">

![TravoAI Banner](https://img.shields.io/badge/TravoAI-Smart%20Travel%20Assistant-blue?style=for-the-badge&logo=airplane)

**Book flights, buses & hotels through simple chat — powered by AI.**

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-65.1.131.213%3A5000-brightgreen?style=for-the-badge)](http://65.1.131.213:5000/)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![Groq](https://img.shields.io/badge/Groq%20LLM-AI%20Powered-orange?style=flat)

</div>

---

## 🚀 Live Demo

👉 **[http://65.1.131.213:5000/](http://65.1.131.213:5000/)**

> Try it out instantly — no installation required! Use the **Guest Login** to explore without creating an account.

---

## 📌 What is TravoAI?

TravoAI is a conversational travel assistant that lets you **search and book flights, buses, and hotels** just by chatting — no forms, no filters. Simply tell it what you need, and it handles the rest.

```
User: "Book a flight from Delhi to Mumbai under ₹8000 in the morning"
TravoAI: ✈️ Here are the available flights...
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **AI Chat Interface** | Natural language booking powered by Groq LLM |
| ✈️ **Flight Search** | Filter by route, budget range & time of day |
| 🚌 **Bus Search** | Filter by route, budget range & time slot |
| 🏨 **Hotel Search** | Find hotels within your budget with ratings |
| 🗺️ **Trip Planner** | Get AI-generated itineraries for any destination |
| 💰 **Wallet System** | Add funds & pay for bookings in-app |
| 📑 **Booking History** | Track all your confirmed bookings |
| 🚨 **Emergency Feature** | One-tap emergency police contact |
| 👤 **Guest Mode** | Try everything without signing up |
| 🔐 **JWT Auth** | Secure login & signup with token-based auth |

---

## 🛠️ Tech Stack

### Frontend
- **React** (Vite) — Single-page application
- **Tailwind CSS** — Utility-first styling
- **React Router** — Client-side navigation

### Backend
- **Node.js + Express.js** — REST API server
- **MongoDB + Mongoose** — Database & ODM
- **Groq SDK** — LLM inference for intent extraction
- **JWT + bcrypt** — Authentication & password hashing

---

## 🗂️ Project Structure

```
TravoAI/
├── backend/
│   ├── index.js          # Express server + all API routes
│   ├── llm.js            # LLM integration & intent parsing
│   ├── groqClient.js     # Groq SDK client
│   ├── db.js             # MongoDB connection
│   ├── models/           # Mongoose schemas (User, Chat)
│   ├── routes/           # Auth & user routes
│   └── utils/            # Chat history helpers
└── frontend/
    └── src/
        ├── App.jsx        # Root component + routing
        ├── pages/         # Home, Bookings, Wallet, Login, Signup
        └── components/    # Reusable UI components
```

---

## ⚙️ Running Locally

### Prerequisites
- Node.js ≥ 18
- MongoDB instance (local or Atlas)
- Groq API key → [console.groq.com](https://console.groq.com)

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
```

```bash
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://localhost:5000
```

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login and receive JWT |
| `GET` | `/user/me` | Get current user profile |
| `POST` | `/user/wallet/add` | Add funds to wallet |
| `POST` | `/chat` | Send a message to the AI |

---

## 💡 How It Works

1. **User sends a message** via the chat interface (e.g. *"Book a bus from Pune to Mumbai under ₹1000 in the evening"*)
2. **Backend extracts intent** using the Groq LLM — identifying the booking type, route, budget, and time preference
3. **Mock data is filtered** to match the extracted parameters
4. **Results are returned** with booking cards — user can confirm and pay from their wallet

---

## 🙋 Author

Built by **Aryan** — [GitHub](https://github.com/aryan8434)

---

<div align="center">
  <sub>Made with ❤️ and a lot of ☕</sub>
</div>
