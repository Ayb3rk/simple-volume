
const DEBOUNCE_DELAY = 300;
let updateTimeout;

async function checkTabHasMedia(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => !!document.querySelector('video, audio'),
    });
    return results?.some(frameResult => frameResult.result) || false;
  } catch (e) {
    // This can happen if the tab is a chrome:// URL or other restricted page
    return false;
  }
}

async function updateAudibleTabs() {
  const allTabs = await chrome.tabs.query({});
  const mediaTabs = [];

  for (const tab of allTabs) {
    if (tab.id && !tab.url.startsWith('chrome://') && (tab.audible || await checkTabHasMedia(tab.id))) {
      mediaTabs.push(tab);
    }
  }

  const currentTabs = await new Promise(resolve => chrome.storage.local.get('mediaTabs', data => resolve(data.mediaTabs || [])));

  // Only update storage if the list of media tabs has actually changed
  if (JSON.stringify(currentTabs) !== JSON.stringify(mediaTabs)) {
    await chrome.storage.local.set({ mediaTabs });
  }
}

function debounceUpdate() {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updateAudibleTabs, DEBOUNCE_DELAY);
}

// Listeners for tab events
chrome.tabs.onCreated.addListener(debounceUpdate);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Update if the tab becomes audible or silent, or if the URL changes
  if (changeInfo.audible !== undefined || changeInfo.status === 'complete') {
    debounceUpdate();
  }
});
chrome.tabs.onRemoved.addListener(debounceUpdate);

// Initial update when the extension starts
updateAudibleTabs();
