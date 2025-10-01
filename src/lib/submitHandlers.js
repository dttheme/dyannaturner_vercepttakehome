import { callOpenAI } from "./openaiClient";

export function promptUploadForImages({ text, setMessages, setInput }) {
  setMessages((m) => [
    ...m,
    { from: "user", text },
    {
      from: "bot",
      text: "To help analyze your product, please upload up to 4 product photos using the attach button (camera icon).",
    },
  ]);
  if (setInput) setInput("");
}

// Append only the bot prompt asking the user to upload images. Useful when a
// batch/flow determines we should ask for images instead of running an analysis.
export function promptUploadForImagesBotOnly({ setMessages }) {
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      text: "To help analyze your product, please upload up to 4 product photos using the attach button (camera icon).",
    },
  ]);
}

// Submit one or more queued questions for the provided images. The UI expects
// a per-image reply so we call the OpenAI helper separately for each image.
export async function submitWithImages({
  questions = [],
  images,
  setMessages,
}) {
  const userText = Array.isArray(questions)
    ? questions.join(" \n")
    : String(questions || "");
  // append user's image question(s) to chat
  setMessages((m) => [...m, { from: "user", text: `${userText}` }]);

  const imgs = (images || []).slice(0, 4);

  // Create loading bubbles for each image in one update to preserve order
  const loadingMsgs = imgs.map((img) => ({
    from: "bot",
    loading: true,
    id: Date.now() + Math.random(),
    imageId: img.id,
    imageUrl: img.url,
  }));

  setMessages((prev) => [...prev, ...loadingMsgs]);

  // Call OpenAI for each image concurrently and replace each loading bubble with its reply
  await Promise.all(
    loadingMsgs.map(async (lm, idx) => {
      try {
        const img = imgs[idx];
        const imageName = img.name || img.id;
        const reply = await callOpenAI(questions, [imageName]);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === lm.id ? { ...m, loading: false, text: reply } : m
          )
        );
      } catch (err) {
        console.error("Image-specific OpenAI error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === lm.id
              ? {
                  ...m,
                  loading: false,
                  text: "Error: could not analyze this image.",
                }
              : m
          )
        );
      }
    })
  );
}
