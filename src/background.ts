const COMMAND_NAME = "open-monitor";
const TARGET_PAGE = "monitor.html";

chrome.commands.onCommand.addListener((command) => {
  if (command !== COMMAND_NAME) {
    return;
  }

  const targetUrl = chrome.runtime.getURL(TARGET_PAGE);

  chrome.tabs.query({}, (tabs) => {
    const existing = tabs.find((tab) => tab.url === targetUrl);

    if (existing?.id) {
      chrome.tabs.update(existing.id, { active: true });
      if (typeof existing.windowId === "number") {
        chrome.windows.update(existing.windowId, { focused: true });
      }
      return;
    }

    chrome.tabs.create({ url: targetUrl });
  });
});