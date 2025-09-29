import { jest } from "@jest/globals";

// Use jest.mock at the top to ensure the module system uses the mock when handlers import callOpenAI
jest.mock("./openaiClient", () => ({
  callOpenAI: jest.fn(),
}));

describe("submitHandlers", () => {
  let callOpenAI;
  let promptUploadForImages;
  let submitWithImages;

  beforeEach(() => {
    // require modules after mocking so the mocked callOpenAI is used
    callOpenAI = require("./openaiClient").callOpenAI;
    ({ promptUploadForImages, submitWithImages } = require("./submitHandlers"));
    callOpenAI.mockReset();
  });

  test("promptUploadForImages appends user message and bot prompt, clears input", () => {
    let messages = [];
    const setMessages = jest.fn((updater) => {
      messages = typeof updater === "function" ? updater(messages) : updater;
      return messages;
    });
    const setInput = jest.fn();

    promptUploadForImages({ text: "Hi", setMessages, setInput });

    expect(messages.length).toBe(2);
    expect(messages[0]).toEqual({ from: "user", text: "Hi" });
    expect(messages[1].from).toBe("bot");
    expect(messages[1].text).toMatch(/upload up to 4 product photos/i);
    expect(setInput).toHaveBeenCalledWith("");
  });

  test("submitWithImages creates one reply per image and includes imageUrl", async () => {
    let messages = [];
    const setMessages = jest.fn((updater) => {
      messages = typeof updater === "function" ? updater(messages) : updater;
      return messages;
    });

    const images = [
      { id: "img1", url: "http://example.com/a.jpg", name: "a.jpg" },
      { id: "img2", url: "http://example.com/b.jpg", name: "b.jpg" },
    ];

    // Make callOpenAI return a reply that echoes the image name
    callOpenAI.mockImplementation((questions, imageNames) =>
      Promise.resolve(`Reply for ${imageNames[0]}`)
    );

    await submitWithImages({ text: "Is this new?", images, setMessages });

    // final messages should include a user message and two bot replies (non-loading)
    const userMsgs = messages.filter((m) => m.from === "user");
    const botReplies = messages.filter((m) => m.from === "bot" && !m.loading);

    expect(userMsgs.length).toBeGreaterThanOrEqual(1);
    // two image-specific replies
    expect(botReplies.length).toBe(2);
    expect(botReplies[0].text).toBe("Reply for a.jpg");
    expect(botReplies[1].text).toBe("Reply for b.jpg");
    expect(botReplies[0].imageUrl).toBe("http://example.com/a.jpg");
    expect(botReplies[1].imageUrl).toBe("http://example.com/b.jpg");
  });
});
