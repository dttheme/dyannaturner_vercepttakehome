// Helpers for handling submit flows from the SearchCard component.
// These helpers are intentionally small and accept the setter callbacks so
// the component retains React state ownership while delegating logic.

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

export async function submitWithImages({ text, images, setMessages }) {
  // append user's image question to chat
  setMessages((m) => [...m, { from: "user", text: `${text}` }]);

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
        const reply = await callOpenAI([text], [imageName]);
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
