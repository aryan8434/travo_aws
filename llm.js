import groq from "./groqClient.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

/*
  Set in .env:
  LLM_PROVIDER=groq   OR   LLM_PROVIDER=gemini
*/

const LLM_PROVIDER = process.env.LLM_PROVIDER || "groq";

/* =========================
   GEMINI CLIENT
========================= */
const genAI =
    LLM_PROVIDER === "gemini" ?
    new GoogleGenerativeAI(process.env.GEMINI_API_KEY) :
    null;

/* =========================
   MAIN FUNCTION
========================= */
export async function askLLM(message, policeCalled = false, history = []) {
    let systemPrompt = `
You are an intent extractor and response generator for a travel app.

Return ONLY valid JSON. No text, no explanation.
Strictly follow this schema:
{
  "intent": "hotel_search | police | bus | flight | trip_plan | general",
  "budget": number | null,
  "minPrice": number | null,
  "maxPrice": number | null,
  "city": string | null,
  "from": string | null,
  "to": string | null,
  "timePreference": "morning | afternoon | evening | night | null",
  "message": string | null
}

TIME SLOTS:
- morning: 6:00 to 12:00
- afternoon: 12:00 to 18:00 (6 PM)
- evening: 18:00 to 21:00 (9 PM)
- night: 21:00 to 6:00

Rules:
1. If the user asks to PLAN A TRIP:
   - intent = "trip_plan"
   - message = full plan OR say general that I need more details. User may dark more for like day1 to day 10, you have authority to decide based on previous messages

2. If the user asks to book/search hotels:
   - intent = "hotel_search"
   - if budget not mentioned then ask for budget 
   - message = null
   - Extract budget as single number

3. If the user asks about buses or bus tickets:
   - intent = "bus"
   - extract "from" and "to"
   - if price range mentioned (e.g., 5000 to 10000), extract minPrice and maxPrice
   - if ONLY one price mentioned (e.g., "buses under 5000" or "5000 buses"), set minPrice = 0 and maxPrice to that number
   - if price range not mentioned at all, ask for price range
   - if time preference mentioned (morning/afternoon/evening/night), extract timePreference
   - if time preference not mentioned, ask for time preference
   - message = null

4. If the user asks about flights or flight tickets:
   - intent = "flight"
   - extract "from" and "to"
   - if price range mentioned (e.g., 5000 to 10000), extract minPrice and maxPrice
   - if ONLY one price mentioned (e.g., "flights under 5000" or "5000 flights"), set minPrice = 0 and maxPrice to that number
   - if price range not mentioned at all, ask for price range
   - if time preference mentioned (morning/afternoon/evening/night), extract timePreference
   - if time preference not mentioned, ask for time preference
   - message = null

5. If the user asks for police or emergency help:
   - intent = "police"
   - ALWAYS include message according to you whatever you like

6. Otherwise:
   - intent = "general"
   and answer based on previous chat like a friend, You should give best user experience and guide user as a friend

7. Even if the user is asking for booking you can reply as a general intent and correct the user as a friend.
8. If police is on the way you can set intent general and talk to the user.
9. for bus/flight booking if user say only one city name then ask in general for please tell destination too and set intent to general
10. if user just reply number like 5000,10000 check previous message if user asking for flight or bus or hotel, 
11. for any price mentioned only numbers like 1000, 2000 then assume lower range to be 0

`;

    let userMessage = message;

    /* =========================
                                               🚨 POLICE CONTEXT
                                            ========================= */
    if (policeCalled) {
        systemPrompt = `
You are an intent extractor and response generator for a travel app.

Return ONLY valid JSON.
Schema:
{
  "intent": "hotel_search | police | bus | flight | trip_plan | general",
  "budget": number | null,
  "minPrice": number | null,
  "maxPrice": number | null,
  "city": string | null,
  "from": string | null,
  "to": string | null,
  "timePreference": "morning | afternoon | evening | night | null",
  "message": string | null
}

TIME SLOTS:
- morning: 6:00 to 12:00
- afternoon: 12:00 to 18:00 (6 PM)
- evening: 18:00 to 21:00 (9 PM)
- night: 21:00 to 6:00

If police already called and user asks again:
- intent MUST be "police"
- message MUST be:
"🚓 Police is already on their way to your location. Please stay safe and wait for assistance."

Otherwise, process normally.
Rules:
1. If the user asks to PLAN A TRIP:
   - intent = "trip_plan"
   - message = just say 3 day trip plan if there is no more details like day1- visit some places day2- visit more places and quote some famous places name

2. If the user asks to book/search hotels:
   - intent = "hotel_search"
   - if budget not mentioned then ask for budget 
   - message = null
   - Extract budget as single number

3. If the user asks about buses or bus tickets:
   - intent = "bus"
   - extract "from" and "to"
   - if price range mentioned (e.g., 5000 to 10000), extract minPrice and maxPrice
   - if ONLY one price mentioned (e.g., "buses under 5000" or "5000 buses"), set minPrice = 0 and maxPrice to that number
   - if price range not mentioned at all, ask for price range
   - if time preference mentioned (morning/afternoon/evening/night), extract timePreference
   - if time preference not mentioned, ask for time preference
   - message = null

4. If the user asks about flights or flight tickets:
   - intent = "flight"
   - extract "from" and "to"
   - if price range mentioned (e.g., 5000 to 10000), extract minPrice and maxPrice
   - if ONLY one price mentioned (e.g., "flights under 5000" or "5000 flights"), set minPrice = 0 and maxPrice to that number
   - if price range not mentioned at all, ask for price range
   - if time preference mentioned (morning/afternoon/evening/night), extract timePreference
   - if time preference not mentioned, ask for time preference
   - message = null

5. If the user asks for police or emergency help:
   - intent = "police"
   - ALWAYS include message according to you whatever you like

6. Otherwise:
   - intent = "general"
   and answer based on previous chat like a friend, You should give best user experience and guide user as a friend

7. Even if the user is asking for booking you can reply as a general intent and correct the user as a friend.
8. If police is on the way you can set intent general and talk to the user.
9. for bus/flight booking if user say only one city name then ask in general for please tell destination too and set intent to general
10. if user just reply number like 5000,10000 check previous message if user asking for flight or bus or hotel, 
11. for any price mentioned only numbers like 1000, 2000 then assume lower range to be 0

`;

        userMessage = `IMPORTANT CONTEXT: Police has already been called.

User message: "${message}"`;
    }

    /* =========================
                                               BUILD MESSAGES
                                            ========================= */
    const messages = [...history, { role: "user", content: userMessage }];

    let rawResponse;

    /* =========================
                                               🔁 PROVIDER SWITCH
                                            ========================= */
    if (LLM_PROVIDER === "gemini") {
        rawResponse = await callGemini(systemPrompt, messages);
    } else {
        rawResponse = await callGroq(systemPrompt, messages);
    }

    return JSON.parse(rawResponse);
}

/* =========================
   GROQ CALL
========================= */
async function callGroq(systemPrompt, messages) {
    const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
    });

    return completion.choices[0].message.content;
}

/* =========================
   GEMINI CALL
========================= */
async function callGemini(systemPrompt, messages) {
    const model = genAI.getGenerativeModel({
        model: "gemini-pro",
        generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
        },
    });

    const prompt = `
${systemPrompt}

Conversation:
${messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}