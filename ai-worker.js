// AI worker intentionally disabled for the GitHub Pages deploy.
// The full worker bundles a provider API key, so it is not shipped here.
// The IDE (including the API tester split-pane panel) works without it;
// only the in-browser AI features are unavailable on this static deploy.
self.onmessage = (e) => {
  try {
    self.postMessage({
      type: "error",
      id: e && e.data && e.data.id,
      error: "AI features are disabled on the GitHub Pages deploy.",
    });
  } catch (_) {}
};
