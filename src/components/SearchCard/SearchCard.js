import "./SearchCard.css";

import React, { useState, useRef, useEffect } from "react";
import { callOpenAI } from "../../lib/openaiClient";
import {
  promptUploadForImages,
  submitWithImages,
} from "../../lib/submitHandlers";

function SearchCard() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I can help you with this product." },
    {
      from: "bot",
      text: "Ask me anything about features, sizing, or shipping.",
    },
  ]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState([]); // { id, url, name }
  const fileInputRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const queueRef = useRef([]); // queued user text queries stored in ref
  const batchTimerRef = useRef(null);
  const BATCH_DEBOUNCE = 1200; // ms
  const MAX_BATCH = 4;

  // callOpenAI is provided by ../../lib/openaiClient

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    // If no images have been uploaded, prompt for uploads (delegated)
    if (!images || images.length === 0) {
      promptUploadForImages({ text, setMessages, setInput });
      return;
    }

    // If images have been uploaded, produce an individual bot response for each image
    // so the user sees answers tied directly to each photo.
    if (images && images.length > 0) {
      setInput("");
      await submitWithImages({ text, images, setMessages });
      return; // don't enqueue as regular text-batch
    }
    // add user message and mark as queued
    setMessages((m) => [...m, { from: "user", text, queued: true }]);
    setInput("");

    // add to batching queue (use ref to avoid extra re-renders)
    queueRef.current = [...queueRef.current, text];
    // flush immediately if we hit max batch size
    if (queueRef.current.length >= MAX_BATCH) {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      setTimeout(() => flushBatch(), 0);
    } else {
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(() => flushBatch(), BATCH_DEBOUNCE);
    }

    // per-submit mock response removed — replies are produced via batching
  }

  function flushBatch() {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    const currentQueue = queueRef.current || [];
    if (!currentQueue || currentQueue.length === 0) return;
    const toProcess = [...currentQueue];
    // clear queue
    queueRef.current = [];

    // Mark queued user messages as processed (remove queued flag)
    setMessages((prev) =>
      prev.map((m) =>
        m.from === "user" && m.queued ? { ...m, queued: false } : m
      )
    );

    // Call OpenAI to answer the batched questions (include current image names)
    (async () => {
      const loadingId = Date.now() + Math.random();
      // insert loading bubble
      setMessages((prev) => [
        ...prev,
        { from: "bot", loading: true, id: loadingId },
      ]);
      try {
        const imageNames = (images || [])
          .map((im) => im.name || im.id)
          .slice(0, 4);
        const reply = await callOpenAI(toProcess, imageNames);
        // replace loading bubble with reply text
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId ? { ...m, loading: false, text: reply } : m
          )
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  loading: false,
                  text: `Error calling OpenAI: ${err.message}.`,
                }
              : m
          )
        );
      }
    })();
  }

  // Auto-scroll chat to bottom whenever messages change
  useEffect(() => {
    const el = chatMessagesRef.current;
    if (el) {
      // Scroll to bottom
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function handleFiles(files) {
    const list = Array.from(files).slice(0, 4 - images.length);
    const readers = list.map((file) => {
      return new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () =>
          res({
            id: Date.now() + Math.random(),
            url: reader.result,
            name: file.name,
          });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((newImgs) => {
      setImages((prev) => {
        const updated = [...prev, ...newImgs].slice(0, 4);
        return updated;
      });

      // Add the images as a chat message (so they appear inline in the chat)
      setMessages((m) => [...m, { from: "user", images: newImgs }]);

      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            from: "bot",
            text: `Thanks — I received ${newImgs.length} image(s). Ask me anything about them!`,
          },
        ]);
      }, 500);
    });
  }

  // (Image-question form and handler removed — submitting while images are present
  // is handled inside handleSubmit to treat the text as a single question about all images.)

  function handleFileInputChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      e.target.value = null;
      return;
    }

    // Validate total count
    if (files.length + images.length > 4) {
      setMessages((m) => [
        ...m,
        { from: "bot", text: "Error: You can upload up to 4 images total." },
      ]);
      e.target.value = null;
      return;
    }

    // Validate file types (must be images)
    const invalid = files.filter(
      (f) => !(f.type && f.type.startsWith("image/"))
    );
    if (invalid.length > 0) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: `Error: ${invalid.length} file(s) are not images. Please upload PNG/JPEG/GIF files.`,
        },
      ]);
      e.target.value = null;
      return;
    }

    handleFiles(files);
    e.target.value = null; // reset input
  }

  return (
    <div className="search-card">
      <div className="chat">
        <div className="chat-messages" aria-live="polite" ref={chatMessagesRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-bubble ${m.from === "bot" ? "bot" : "user"}`}
            >
              {m.loading ? (
                <span className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              ) : m.imageUrl ? (
                <div className="reply-with-thumb">
                  <img
                    src={m.imageUrl}
                    alt="reply-thumb"
                    className="reply-thumb"
                  />
                  <div className="reply-text">{m.text}</div>
                </div>
              ) : (
                m.text
              )}
              {m.images && (
                <div className="chat-images">
                  {m.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={img.name}
                      className="chat-image-thumb"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form className="chat-input" onSubmit={handleSubmit}>
          {/* hidden file input used by the chat icon button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />

          <button
            type="button"
            className="icon-btn"
            aria-label="Attach images"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            {/* camera / image SVG icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M21 19V7a2 2 0 0 0-2-2h-3.2l-1.6-2H9.8L8.2 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"
                stroke="#fff"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12.5"
                cy="13.5"
                r="3"
                stroke="#fff"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the product bot..."
            aria-label="Ask the product bot"
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default SearchCard;
