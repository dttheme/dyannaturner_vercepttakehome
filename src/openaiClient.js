// Lightweight OpenAI caller used by the SearchCard UI.
// Reads REACT_APP_OPENAI_API_KEY from the environment and falls back to deterministic mocks.
const OPENAI_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export async function callOpenAI(questions = [], imageNames = []) {
  // If API key is missing, log for developers and fall back to a mock reply.
  const MOCK_RESPONSES = [
    "Mock: I looked over the images and they look good — the stitching and seams look intact.",
    "Mock: Based on the images, this appears to be the medium size; consider sizing down if you prefer a tighter fit.",
    "Mock: Shipping for this item typically takes 3-5 business days; expedited options are available.",
    "Mock: The images show minor wear on the edges; overall condition looks usable.",
  ];

  function getMockReply(questions = [], imageNames = []) {
    // choose a variant based on the number of questions to make it deterministic-ish
    const idx = questions.length % MOCK_RESPONSES.length;
    const base = MOCK_RESPONSES[idx];
    const suffix =
      imageNames && imageNames.length
        ? ` (images: ${imageNames.join(", ")})`
        : "";
    return `${base}${suffix}`;
  }

  if (!OPENAI_KEY) {
    console.error(
      "OpenAI key missing in environment (REACT_APP_OPENAI_API_KEY). Using mock reply for development."
    );
    return getMockReply(questions, imageNames);
  }

  const promptParts = [];
  if (imageNames && imageNames.length) {
    promptParts.push(`Images: ${imageNames.join(", ")}`);
  }
  promptParts.push(
    `User questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
  );

  const system = {
    role: "system",
    content:
      "You are a helpful assistant that answers user questions about product images and product details. Keep answers concise and actionable.",
  };
  const user = { role: "user", content: promptParts.join("\n\n") };

  const body = {
    model: "gpt-3.5-turbo",
    messages: [system, user],
    max_tokens: 600,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      // Log full response for developers and return mock instead of throwing
      console.error("OpenAI API returned non-OK status", {
        status: res.status,
        body: text,
      });
      return getMockReply(questions, imageNames);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return content || getMockReply(questions, imageNames);
  } catch (err) {
    // Catch network or unexpected errors, log details for developers, and return a mock reply
    console.error(
      "Error calling OpenAI API — returning mock reply. Details:",
      err
    );
    return getMockReply(questions, imageNames);
  }
}
