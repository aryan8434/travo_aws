import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import ChatBox from './components/Chat/ChatBox';
import RightSidebar from './components/Sidebar/RightSidebar';
import LeftDrawer from './components/Sidebar/LeftDrawer';
import AuthModal from './components/Auth/AuthModal';

// Pages
import PackagesView from './components/Pages/PackagesView';
import TransactionsView from './components/Pages/TransactionsView';
import BookingsView from './components/Pages/BookingsView';
import SupportView from './components/Pages/SupportView';
import AboutView from './components/Pages/AboutView';
import AdminView from './components/Pages/AdminView';
import WalletView from './components/Pages/WalletView';
import RagArchitectureModal from './components/Pages/RagArchitectureModal';

// Storage
import { getStoredTransactions, getStoredBookings, getWalletBalance } from './utils/storage';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCity, setActiveCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substr(2, 9));

  // User Auth & Modal state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('travoai_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRagModalOpen, setIsRagModalOpen] = useState(false);

  // Navigation & Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(() => getWalletBalance());

  // Data lists
  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Refresh storage data whenever view changes
  useEffect(() => {
    setTransactions(getStoredTransactions());
    setBookings(getStoredBookings());
    setWalletBalance(getWalletBalance());
  }, [currentView, isDrawerOpen]);

  // Load MongoDB saved chat history whenever user changes
  useEffect(() => {
    if (currentUser?.username) {
      loadUserChatHistory(currentUser.username);
    }
  }, [currentUser]);

  const loadUserChatHistory = async (username) => {
    try {
      const res = await axios.get(`/api/chat/user-history?username=${username}`);
      if (res.data && res.data.messages && res.data.messages.length > 0) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.warn("MongoDB chat history fetch error:", err);
    }
  };

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    localStorage.setItem('travoai_user', JSON.stringify(userObj));
    if (userObj.walletBalance) {
      setWalletBalance(userObj.walletBalance);
    }
    loadUserChatHistory(userObj.username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('travoai_user');
  };

  const handleBookingComplete = (booking) => {
    setWalletBalance(getWalletBalance());

    const isWallet = booking.paid_via_wallet;
    const headerTitle = isWallet ? "🎉 **Booking Confirmed via TravoAI Wallet Balance!**" : "🎉 **Booking Confirmed!**";
    const paymentLine = isWallet
      ? `* **Deducted from Wallet**: ₹${Number(booking.actual_price).toLocaleString('en-IN')}\n* **Remaining Balance**: ₹${Number(booking.remaining_wallet_balance || 0).toLocaleString('en-IN')}`
      : `* **Total Amount Paid**: ₹${Number(booking.actual_price).toLocaleString('en-IN')}`;

    const botMsg = {
      sender: 'bot',
      text: `${headerTitle}\n\n* **Item**: ${booking.item_name}\n* **PNR Number**: \`${booking.pnr}\`\n* **Ticket Number**: \`${booking.ticket_number}\`\n* **Booking ID**: \`${booking.booking_id}\`\n* **Transaction ID**: \`${booking.txn_id || 'TXN-CONFIRMED'}\`\n${paymentLine}\n\nYour verified digital pass with an interactive QR code has been generated! You can view or download your ticket anytime under **My Bookings** in the top-left menu.`,
      booking: booking
    };

    setMessages((prev) => [...prev, botMsg]);

    if (currentUser?.username) {
      axios.post('/api/chat/save-user-message', { username: currentUser.username, message: botMsg }).catch(e => e);
    }
  };

  const handleBookingError = (err) => {
    const failedBooking = err?.booking;
    const reason = err?.message || 'Payment cancelled or failed';
    const txnId = failedBooking?.txn_id || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    const botMsg = {
      sender: 'bot',
      text: `❌ **Booking Payment Failed / Cancelled**\n\n* **Item**: ${failedBooking?.item_name || 'Travel Booking'}\n* **Transaction ID**: \`${txnId}\`\n* **Status**: \`FAILED\`\n* **Reason**: *${reason}*\n\nYour payment attempt was logged under **Transaction History** in the top-left menu. No ticket pass was generated.`
    };

    setMessages((prev) => [...prev, botMsg]);

    if (currentUser?.username) {
      axios.post('/api/chat/save-user-message', { username: currentUser.username, message: botMsg }).catch(e => e);
    }
  };

  // Request location permission on startup
  useEffect(() => {
    const initializeAppLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const geoData = await geoRes.json();
              const detectedCity =
                geoData.address?.city ||
                geoData.address?.town ||
                geoData.address?.state_district ||
                'Delhi';

              setActiveCity(detectedCity);

              // Fetch live weather for detected location
              let weatherInfo = '';
              try {
                const weatherRes = await axios.post('/chat', {
                  message: `weather in ${detectedCity}`,
                  sessionId: 'init_location_session',
                  userCity: detectedCity
                });
                if (weatherRes.data && weatherRes.data.results) {
                  const w = weatherRes.data.results;
                  const condText = w.condition || 'Clear';
                  const humText = w.humidity !== undefined ? `${w.humidity}% Humidity` : '55% Humidity';
                  const windText = w.wind_kph !== undefined ? `${w.wind_kph} km/h wind` : '12 km/h wind';
                  weatherInfo = `\n🌤️ **Live Weather**: **${w.temp_c}°C, ${condText}** (${humText}, ${windText})`;
                }
              } catch (e) {
                console.warn('Weather fetch error on startup:', e);
              }

              if (!currentUser?.username) {
                setMessages([
                  {
                    sender: 'bot',
                    text: `👋 Hi there! I'm **TravoAI**, your AI travel concierge powered by **Groq LLM** and **Vectra Vector Database**.\n\n📍 **Location Detected**: **${detectedCity}**${weatherInfo}\n\nAsk me anything like:\n* *'Need a hotel in ${detectedCity} under ₹5000'*\n* *'Book me a bus from ${detectedCity} to Jaipur tomorrow after 6 PM'*\n* *'Suggest a beach vacation under ₹40,000 for 4 people'*`
                  }
                ]);
              }
            } catch (err) {
              fallbackDefaultGreeting('Delhi');
            }
          },
          (error) => {
            console.warn('Geolocation denied/failed:', error.message);
            if (!currentUser?.username) {
              setMessages([
                {
                  sender: 'bot',
                  text: "👋 Hi there! I'm **TravoAI**, your AI travel concierge powered by **Groq LLM** and **Vectra Vector Database**.\n\n⚠️ **Location Permission Denied / Disabled**: Please share your current city (e.g. *'My city is Jaipur'*) so I can display live weather & local travel options for you!\n\nAsk me anything like:\n* *'Show hotels under ₹5000 in Jaipur'*\n* *'Book me a bus from Delhi to Jaipur tomorrow evening'*"
                }
              ]);
            }
            setActiveCity('Delhi');
          }
        );
      } else {
        fallbackDefaultGreeting('Delhi');
      }
    };

    const fallbackDefaultGreeting = (defaultCity) => {
      setActiveCity(defaultCity);
      if (!currentUser?.username) {
        setMessages([
          {
            sender: 'bot',
            text: `👋 Hi there! I'm **TravoAI**, your AI travel concierge powered by **Groq LLM** and **Vectra Vector Database**.\n\n📍 Default City: **${defaultCity}**\n\nAsk me anything like:\n* *'Need a hotel in ${defaultCity} under ₹5000'*\n* *'Suggest a holiday package for 4 people under ₹40,000'*`
          }
        ]);
      }
    };

    initializeAppLocation();
  }, []);

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    setCurrentView('home');
    if (category === 'all') return;

    setLoading(true);
    try {
      if (category === 'package') {
        const res = await axios.get('/api/packages');
        const pkgs = res.data?.packages || [];
        setMessages((prev) => [
          ...prev,
          {
            sender: 'user',
            text: '🌴 Show all RAG Holiday Packages (Vectra Vector DB Proof)'
          },
          {
            sender: 'bot',
            text: '⚡ **Vectra Vector DB Proof**: Here are the retrieved travel package vector embeddings stored in our local Vectra Vector Database:',
            type: 'package',
            results: pkgs
          }
        ]);
      }
    } catch (err) {
      console.error('Category query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (userText) => {
    if (!userText.trim()) return;

    const userMsg = { sender: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    if (currentUser?.username) {
      axios.post('/api/chat/save-user-message', { username: currentUser.username, message: userMsg }).catch(e => e);
    }

    try {
      const response = await axios.post('/chat', {
        message: userText,
        sessionId: sessionId,
        userCity: activeCity
      });

      const data = response.data;
      if (data.activeCity) {
        setActiveCity(data.activeCity);
      }

      const botMsg = {
        sender: 'bot',
        text: data.text || "Here are the options I found for you:",
        intent: data.intent,
        type: data.type,
        results: data.results || []
      };

      setMessages((prev) => [...prev, botMsg]);

      if (currentUser?.username) {
        axios.post('/api/chat/save-user-message', { username: currentUser.username, message: botMsg }).catch(e => e);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errBotMsg = {
        sender: 'bot',
        text: "⚠️ Connection error: Please check if the backend server (`node index.js`) is running."
      };
      setMessages((prev) => [...prev, errBotMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f17] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <Header
        onToggleDrawer={() => setIsDrawerOpen(true)}
        activeCity={activeCity}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleCategorySelect}
        walletBalance={walletBalance}
        onOpenWallet={() => setCurrentView('wallet')}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenRagModal={() => setIsRagModalOpen(true)}
      />

      {/* Sliding YouTube-style Left Navigation Drawer */}
      <LeftDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* RAG Architecture Modal */}
      <RagArchitectureModal
        isOpen={isRagModalOpen}
        onClose={() => setIsRagModalOpen(false)}
      />

      {/* Main Container Views */}
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'home' && (
          <>
            {/* Left / Center Chat Column */}
            <main className="flex-1 overflow-hidden">
              <ChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                loading={loading}
                onBookingComplete={handleBookingComplete}
                onBookingError={handleBookingError}
                onGoToBookings={() => setCurrentView('bookings')}
                currentUser={currentUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            </main>

            {/* Right Sidebar Widgets */}
            <RightSidebar
              activeCity={activeCity}
              onCityChange={setActiveCity}
            />
          </>
        )}

        {currentView === 'wallet' && (
          <WalletView
            onBackToHome={() => setCurrentView('home')}
            onBalanceUpdate={(newBal) => setWalletBalance(newBal)}
          />
        )}

        {currentView === 'packages' && (
          <PackagesView
            onBackToHome={() => setCurrentView('home')}
            onBookingComplete={handleBookingComplete}
            onBookingError={handleBookingError}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentView === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'bookings' && (
          <BookingsView
            bookings={bookings}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'admin' && (
          <AdminView
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'support' && (
          <SupportView
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'about' && (
          <AboutView
            onBackToHome={() => setCurrentView('home')}
          />
        )}
      </div>
    </div>
  );
}
