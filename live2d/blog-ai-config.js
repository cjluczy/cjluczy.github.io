(function () {
  window.BLOG_LIVE2D_AI_CONFIG = {
    enabled: true,
    minWidth: 768,
    autoOpenOnFirstVisit: true,
    assistantName: "小月",
    shortWelcome:
      "你好，欢迎来到主人的博客，我是博客助手“小月”。想找文章、看分类或随便逛逛，都可以点我。",
    welcomeMessage:
      "你好，欢迎来到主人的博客，我是主人的博客助手“小月”，有什么需要帮助的吗？\n我可以帮您：浏览文章、查找博文、推荐相关内容、看看分类和标签。",
    helperDescription: "我只会根据主人的博客内容回答，不接外部通用对话。",
    searchJsonPath: "/search.json",
    localSearchLimit: 4,
    quickActions: [
      { label: "最新文章", query: "最新文章" },
      { label: "博客写了什么", query: "这个博客写了什么" },
      { label: "分类和标签", query: "有哪些分类和标签" },
      { label: "帮我推荐", query: "帮我推荐几篇文章" }
    ],
    assetBase: "/live2d/",
    engineBase: "https://cdn.jsdelivr.net/gh/letere-gzj/live2d-widget-v3@main",
    widget: {
      tools: [],
      dragEnable: false,
      dragDirection: ["x", "y"],
      switchType: "order"
    }
  };
})();
