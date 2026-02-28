import axios from "axios";

const API_TOKEN = process.env.MAKCORPS_API_TOKEN;

export async function fetchRealHotels(city) {
  if (!city) return [];

  // Clean city name (e.g., remove states or extra info)
  const cleanCity = city.split(",")[0].trim().toLowerCase();
  const url = `https://api.makcorps.com/free/${cleanCity}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `JWT ${API_TOKEN}`,
      },
    });

    if (!Array.isArray(response.data)) return [];

    // Map MakCorps format to TravoAI format
    // TravoAI expects: { name, price, rating }
    return response.data.map((item) => {
      const hotelInfo = item[0];
      const prices = item[1];

      // Get the lowest price from vendors
      let lowestPrice = 0;
      if (Array.isArray(prices) && prices.length > 0) {
        const validPrices = prices
          .map((p) => parseFloat(p.price1 || p.price2 || p.price3 || p.price4))
          .filter((p) => !isNaN(p));
        lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 1000;
      }

      // Convert USD to INR (approx 80) if prices seem small
      if (lowestPrice < 500) {
        lowestPrice = Math.round(lowestPrice * 80);
      }

      return {
        name: hotelInfo.hotelName,
        price: lowestPrice,
        rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1), // API doesn't provide rating in free tier, so mock it realistically
      };
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`ℹ️ City "${cleanCity}" not found in MakCorps free tier. Falling back to mock data.`);
    } else {
      console.error("MakCorps API Error:", error.message);
    }
    return []; // Return empty so we can fallback to mock
  }
}
