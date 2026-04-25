(function () {
  var isLocalhost = ["127.0.0.1", "localhost"].includes(window.location.hostname);

  // Public sites should point this to your own proxy URL.
  // GitHub Pages is static, so the model key must live in a separate backend.
  var productionApiUrl = "";

  window.BLOG_LIVE2D_AI_CONFIG = {
    enabled: true,
    minWidth: 768,
    autoOpenOnFirstVisit: true,
    assistantName: "Blog AI",
    welcomeMessage:
      "Hi, I am your Live2D blog assistant. I can search this blog and answer with AI.",
    searchJsonPath: "/search.json",
    localSearchLimit: 3,
    maxHistory: 8,
    requestTimeout: 30000,
    apiUrl: isLocalhost ? "http://127.0.0.1:8787/api/blog-ai" : productionApiUrl,
    assetBase: "/live2d/",
    engineBase: "https://cdn.jsdelivr.net/gh/letere-gzj/live2d-widget-v3@main",
    widget: {
      tools: ["hitokoto", "express", "info", "quit"],
      dragEnable: false,
      dragDirection: ["x", "y"],
      switchType: "order"
    },
    systemPrompt:
      "You are the live2d assistant for this blog. Be concise, helpful, and prefer answers grounded in the provided blog context."
  };
})();
