(function () {
  if (window.__BLOG_LIVE2D_AI_BOOTSTRAPPED__) {
    if (typeof window.__BLOG_LIVE2D_AI_REBOOT__ === "function") {
      window.__BLOG_LIVE2D_AI_REBOOT__();
    }
    return;
  }

  window.__BLOG_LIVE2D_AI_BOOTSTRAPPED__ = true;

  var defaultConfig = {
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

  var state = {
    initialized: false,
    resourcesLoaded: false,
    searchIndex: null,
    open: false,
    sending: false
  };

  function mergeConfig() {
    var userConfig = window.BLOG_LIVE2D_AI_CONFIG || {};
    var widget = Object.assign({}, defaultConfig.widget, userConfig.widget || {});
    return Object.assign({}, defaultConfig, userConfig, {
      widget: widget
    });
  }

  function shouldEnable(config) {
    return config.enabled && window.innerWidth >= config.minWidth;
  }

  function onceResource(key, loader) {
    window.__blogAiResources = window.__blogAiResources || {};
    if (!window.__blogAiResources[key]) {
      window.__blogAiResources[key] = loader();
    }
    return window.__blogAiResources[key];
  }

  function loadCss(url) {
    return onceResource("css:" + url, function () {
      return new Promise(function (resolve, reject) {
        var existing = document.querySelector('link[data-blog-ai-href="' + url + '"]');
        if (existing) {
          resolve(url);
          return;
        }

        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.dataset.blogAiHref = url;
        link.onload = function () {
          resolve(url);
        };
        link.onerror = function () {
          reject(new Error("Failed to load css: " + url));
        };
        document.head.appendChild(link);
      });
    });
  }

  function loadScript(url) {
    return onceResource("js:" + url, function () {
      return new Promise(function (resolve, reject) {
        var existing = document.querySelector('script[data-blog-ai-src="' + url + '"]');
        if (existing) {
          if (existing.dataset.loaded === "true") {
            resolve(url);
            return;
          }
          existing.addEventListener("load", function () {
            resolve(url);
          });
          existing.addEventListener("error", function () {
            reject(new Error("Failed to load script: " + url));
          });
          return;
        }

        var script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.dataset.blogAiSrc = url;
        script.onload = function () {
          script.dataset.loaded = "true";
          resolve(url);
        };
        script.onerror = function () {
          reject(new Error("Failed to load script: " + url));
        };
        document.head.appendChild(script);
      });
    });
  }

  function waitFor(checker, timeout) {
    var started = Date.now();
    return new Promise(function (resolve, reject) {
      (function poll() {
        var result = checker();
        if (result) {
          resolve(result);
          return;
        }
        if (Date.now() - started > timeout) {
          reject(new Error("Wait timed out"));
          return;
        }
        window.setTimeout(poll, 120);
      })();
    });
  }

  function boot() {
    var config = mergeConfig();
    if (!shouldEnable(config)) {
      return;
    }

    if (document.readyState === "complete") {
      scheduleInit(config);
      return;
    }

    window.addEventListener(
      "load",
      function () {
        scheduleInit(config);
      },
      { once: true }
    );
  }

  function scheduleInit(config) {
    var run = function () {
      ensureWidget(config)
        .then(function () {
          mountPanel(config);
        })
        .catch(function (error) {
          console.error("[blog-ai]", error);
        });
    };

    if (window.requestIdleCallback) {
      window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      window.setTimeout(run, 320);
    }
  }

  function ensureWidget(config) {
    if (state.resourcesLoaded && document.getElementById("waifu")) {
      return Promise.resolve();
    }

    var assetBase = config.assetBase.replace(/\/?$/, "/");
    var engineBase = config.engineBase.replace(/\/$/, "");

    return Promise.all([
      loadCss(assetBase + "waifu.css"),
      loadScript(engineBase + "/Core/live2dcubismcore.js"),
      loadScript(engineBase + "/live2d-sdk.js"),
      loadScript(assetBase + "waifu-tips.js")
    ])
      .then(function () {
        return waitFor(function () {
          return typeof window.initWidget === "function";
        }, 8000);
      })
      .then(function () {
        if (!document.getElementById("waifu")) {
          window.initWidget({
            waifuPath: assetBase + "waifu-tips.json",
            cdnPath: assetBase,
            tools: config.widget.tools,
            dragEnable: config.widget.dragEnable,
            dragDirection: config.widget.dragDirection,
            switchType: config.widget.switchType
          });
        }
        return waitFor(function () {
          return document.getElementById("waifu");
        }, 8000);
      })
      .then(function () {
        state.resourcesLoaded = true;
      });
  }

  function mountPanel(config) {
    var waifu = document.getElementById("waifu");
    if (!waifu) {
      return;
    }

    waifu.style.overflow = "visible";
    sanitizeCanvas(waifu);
    ensureToolButtons(waifu, config);

    var panel = waifu.querySelector("#blog-ai-panel");
    if (!panel) {
      panel = createPanel();
      waifu.appendChild(panel);
    }

    bindPanel(panel, config);
    syncPanel(config);

    if (!state.initialized) {
      addMessage("assistant", config.welcomeMessage, []);
      showTip(config.shortWelcome, 7000, 11);
      state.initialized = true;
    }

    if (config.autoOpenOnFirstVisit && !sessionStorage.getItem("blog-ai-opened")) {
      sessionStorage.setItem("blog-ai-opened", "1");
      setPanelOpen(true);
    }
  }

  function ensureToolButtons(waifu, config) {
    var toolbar = waifu.querySelector("#waifu-tool");
    if (!toolbar) {
      return;
    }

    upsertTool(toolbar, "talk", "对话", "打开小月的博客助手面板", function () {
      setPanelOpen(!state.open);
      showTip("有问题就问我，我会只根据博客内容来回答。", 3600, 8);
    });

    upsertTool(toolbar, "expression", "表情", "切换小月的表情", function () {
      if (window.live2d && typeof window.live2d.randomExpression === "function") {
        window.live2d.randomExpression();
        showTip("小月换了个表情，继续陪你逛博客。", 2600, 8);
      }
    });

    upsertTool(toolbar, "action", "动作", "让小月做一个轻量动作", function () {
      playBodyAction();
      showTip("收到，给你一个轻量动作反馈。", 2600, 8);
    });
  }

  function sanitizeCanvas(waifu) {
    var canvas = waifu.querySelector("#live2d");
    if (!canvas) {
      return;
    }

    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("role", "presentation");
    canvas.setAttribute("focusable", "false");
  }

  function upsertTool(toolbar, key, label, title, handler) {
    var id = "waifu-tool-" + key;
    var button = toolbar.querySelector("#" + id);
    if (!button) {
      button = document.createElement("span");
      button.id = id;
      button.className = "blog-ai-tool";
      button.textContent = label;
      toolbar.appendChild(button);
    }
    button.title = title;

    if (button.dataset.bound !== "true") {
      button.addEventListener("click", handler);
      button.dataset.bound = "true";
    }
  }

  function playBodyAction() {
    var canvas = document.getElementById("live2d");
    if (!canvas) {
      return;
    }

    var rect = canvas.getBoundingClientRect();
    var clientX = rect.left + rect.width * 0.56;
    var clientY = rect.top + rect.height * 0.7;

    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: clientX,
        clientY: clientY
      })
    );

    canvas.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        clientX: clientX,
        clientY: clientY
      })
    );
  }

  function createPanel() {
    var panel = document.createElement("section");
    panel.id = "blog-ai-panel";
    panel.innerHTML =
      '<div class="blog-ai-panel__header">' +
      '  <div class="blog-ai-panel__title">' +
      "    <strong>小月</strong>" +
      '    <div class="blog-ai-panel__status">轻量博客助手</div>' +
      "  </div>" +
      '  <button class="blog-ai-panel__close" type="button" data-role="close" aria-label="关闭">×</button>' +
      "</div>" +
      '<div class="blog-ai-panel__intro" data-role="intro"></div>' +
      '<div class="blog-ai-panel__quick" data-role="quick"></div>' +
      '<div class="blog-ai-panel__messages" data-role="messages"></div>' +
      '<div class="blog-ai-panel__footer">' +
      '  <textarea data-role="input" placeholder="输入关键词，例如：量化、Hexo、GitHub Actions"></textarea>' +
      '  <div class="blog-ai-panel__composer">' +
      '    <span class="blog-ai-panel__hint" data-role="hint"></span>' +
      '    <button type="button" data-role="send">发送</button>' +
      "  </div>" +
      "</div>";
    return panel;
  }

  function bindPanel(panel, config) {
    panel.querySelector('[data-role="close"]').onclick = function () {
      setPanelOpen(false);
    };

    panel.querySelector('[data-role="send"]').onclick = function () {
      submitQuestion(config);
    };

    panel.querySelector('[data-role="input"]').onkeydown = function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitQuestion(config);
      }
    };

    renderQuickActions(panel, config);
    panel.dataset.bound = "true";
  }

  function renderQuickActions(panel, config) {
    var quickWrap = panel.querySelector('[data-role="quick"]');
    quickWrap.innerHTML = "";

    (config.quickActions || []).forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "blog-ai-chip";
      button.textContent = item.label;
      button.addEventListener("click", function () {
        askQuestion(config, item.query);
      });
      quickWrap.appendChild(button);
    });
  }

  function syncPanel(config) {
    var panel = document.getElementById("blog-ai-panel");
    if (!panel) {
      return;
    }

    panel.querySelector('[data-role="intro"]').textContent = config.helperDescription;
    panel.querySelector('[data-role="hint"]').textContent = "只回答站内内容，输入关键词就可以。";
    panel.classList.toggle("is-open", state.open);
  }

  function setPanelOpen(open) {
    state.open = open;
    var panel = document.getElementById("blog-ai-panel");
    if (!panel) {
      return;
    }

    panel.classList.toggle("is-open", open);
    if (open) {
      var input = panel.querySelector('[data-role="input"]');
      window.setTimeout(function () {
        input && input.focus();
      }, 80);
    }
  }

  function showTip(text, timeout, priority) {
    if (typeof window.waifuShowMessage === "function") {
      window.waifuShowMessage(text, timeout || 3000, priority || 8);
    }
  }

  function addMessage(role, text, references) {
    var panel = document.getElementById("blog-ai-panel");
    if (!panel) {
      return;
    }

    var messages = panel.querySelector('[data-role="messages"]');
    var item = document.createElement("article");
    item.className = "blog-ai-message blog-ai-message--" + role;

    var bubble = document.createElement("div");
    bubble.className = "blog-ai-message__bubble";
    bubble.textContent = text;
    item.appendChild(bubble);

    var meta = document.createElement("div");
    meta.className = "blog-ai-message__meta";
    meta.textContent = role === "user" ? "你" : "小月";
    item.appendChild(meta);

    if (references && references.length) {
      var refs = document.createElement("div");
      refs.className = "blog-ai-message__refs";

      references.forEach(function (ref) {
        var card = document.createElement("a");
        card.className = "blog-ai-ref";
        card.href = ref.url || "#";
        card.target = "_self";

        var title = document.createElement("strong");
        title.textContent = ref.title || "未命名文章";

        var desc = document.createElement("p");
        desc.textContent = ref.excerpt || "";

        card.appendChild(title);
        card.appendChild(desc);
        refs.appendChild(card);
      });

      item.appendChild(refs);
    }

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function setSending(sending) {
    state.sending = sending;
    var panel = document.getElementById("blog-ai-panel");
    if (!panel) {
      return;
    }

    var button = panel.querySelector('[data-role="send"]');
    var input = panel.querySelector('[data-role="input"]');
    button.disabled = sending;
    input.disabled = sending;
    button.textContent = sending ? "..." : "发送";
  }

  function submitQuestion(config) {
    var panel = document.getElementById("blog-ai-panel");
    if (!panel || state.sending) {
      return;
    }

    var input = panel.querySelector('[data-role="input"]');
    var question = input.value.trim();
    if (!question) {
      return;
    }

    input.value = "";
    askQuestion(config, question);
  }

  function askQuestion(config, question) {
    if (state.sending) {
      return;
    }

    addMessage("user", question, []);
    setPanelOpen(true);
    setSending(true);

    resolveReply(config, question)
      .then(function (result) {
        addMessage("assistant", result.text, result.references || []);
      })
      .catch(function (error) {
        console.error("[blog-ai]", error);
        addMessage(
          "assistant",
          "我刚刚没有顺利读到博客索引，你可以稍后再试试，或者换一个关键词。",
          []
        );
      })
      .finally(function () {
        setSending(false);
      });
  }

  function resolveReply(config, question) {
    return loadSearchIndex(config).then(function (posts) {
      var normalizedPosts = posts.map(normalizePost);

      if (isLatestIntent(question)) {
        return buildLatestReply(normalizedPosts);
      }

      if (isOverviewIntent(question)) {
        return buildOverviewReply(normalizedPosts);
      }

      if (isCategoryIntent(question)) {
        return buildCategoryReply(normalizedPosts);
      }

      if (isRecommendIntent(question)) {
        return buildRecommendReply(normalizedPosts);
      }

      return buildSearchReply(normalizedPosts, question, config.localSearchLimit);
    });
  }

  function loadSearchIndex(config) {
    if (state.searchIndex) {
      return Promise.resolve(state.searchIndex);
    }

    return fetch(config.searchJsonPath, { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load search index");
        }
        return response.json();
      })
      .then(function (payload) {
        state.searchIndex = Array.isArray(payload) ? payload : [];
        return state.searchIndex;
      });
  }

  function normalizePost(post) {
    return {
      title: String(post.title || "未命名文章"),
      url: String(post.url || "/"),
      content: String(post.content || ""),
      categories: normalizeList(post.categories),
      tags: normalizeList(post.tags),
      excerpt: buildExcerpt(post.content || "", []),
      timestamp: parseDateFromUrl(post.url || "")
    };
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list
      .map(function (item) {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item.name === "string") {
          return item.name;
        }
        return "";
      })
      .filter(Boolean);
  }

  function parseDateFromUrl(url) {
    var match = String(url || "").match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (!match) {
      return 0;
    }
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function isLatestIntent(question) {
    return /最新|最近|近期|新文章/.test(question);
  }

  function isOverviewIntent(question) {
    return /写了什么|博客内容|这个博客|介绍一下|有哪些内容/.test(question);
  }

  function isCategoryIntent(question) {
    return /分类|标签|目录|主题/.test(question);
  }

  function isRecommendIntent(question) {
    return /推荐|看看什么|随便逛|先看什么/.test(question);
  }

  function buildLatestReply(posts) {
    var latest = posts
      .slice()
      .sort(function (a, b) {
        return b.timestamp - a.timestamp;
      })
      .slice(0, 3);

    return {
      text: "我帮你看了看，最近更新的文章在这里，先从这几篇开始最合适。",
      references: latest.map(toReference)
    };
  }

  function buildOverviewReply(posts) {
    var categories = uniqueFlat(posts, "categories").slice(0, 6);
    var tags = uniqueFlat(posts, "tags").slice(0, 8);
    var latest = posts
      .slice()
      .sort(function (a, b) {
        return b.timestamp - a.timestamp;
      })
      .slice(0, 2);

    return {
      text:
        "主人的博客现在主要在写这些方向：分类有 " +
        formatList(categories) +
        "；常见标签有 " +
        formatList(tags) +
        "。如果你想快速上手，可以先看我给你挑的这两篇。",
      references: latest.map(toReference)
    };
  }

  function buildCategoryReply(posts) {
    var categories = uniqueFlat(posts, "categories");
    var tags = uniqueFlat(posts, "tags");

    return {
      text:
        "我整理了一下，当前博客常见分类有 " +
        formatList(categories.slice(0, 8)) +
        "；标签有 " +
        formatList(tags.slice(0, 10)) +
        "。你也可以直接输入关键词，我来帮你找更具体的文章。",
      references: []
    };
  }

  function buildRecommendReply(posts) {
    var picks = posts
      .slice()
      .sort(function (a, b) {
        return b.timestamp - a.timestamp;
      })
      .slice(0, 3);

    return {
      text: "如果你只是想先逛逛，我建议从这几篇开始，基本能快速了解主人的博客方向。",
      references: picks.map(toReference)
    };
  }

  function buildSearchReply(posts, question, limit) {
    var matches = searchPosts(posts, question, limit);
    if (!matches.length) {
      return {
        text:
          "我暂时没找到和“" +
          question +
          "”高度相关的内容。你可以试试这些方向：量化、Hexo、GitHub Actions、项目。",
        references: []
      };
    }

    if (matches.length === 1 || matches[0].score >= (matches[1] ? matches[1].score + 8 : 16)) {
      return {
        text:
          "我找到一篇最相关的文章，应该就是你要的方向。先从它开始看，如果还想继续深挖，我再帮你找关联内容。",
        references: matches.map(toReference)
      };
    }

    return {
      text: "我根据关键词“" + question + "”找到了几篇相关博文，你可以先从前两篇看起。",
      references: matches.map(toReference)
    };
  }

  function uniqueFlat(posts, key) {
    var seen = Object.create(null);
    var result = [];

    posts.forEach(function (post) {
      (post[key] || []).forEach(function (item) {
        if (!seen[item]) {
          seen[item] = true;
          result.push(item);
        }
      });
    });

    return result;
  }

  function toReference(item) {
    return {
      title: item.title,
      url: item.url,
      excerpt: item.excerpt
    };
  }

  function formatList(items) {
    if (!items.length) {
      return "暂时还不多";
    }
    return items.join("、");
  }

  function searchPosts(posts, question, limit) {
    var tokens = buildTokens(question);
    var normalizedQuestion = normalize(question);

    return posts
      .map(function (post) {
        var title = normalize(post.title);
        var content = normalize(stripHtml(post.content));
        var categories = normalize((post.categories || []).join(" "));
        var tags = normalize((post.tags || []).join(" "));
        var score = 0;

        if (normalizedQuestion && title.indexOf(normalizedQuestion) !== -1) {
          score += 18;
        }
        if (normalizedQuestion && content.indexOf(normalizedQuestion) !== -1) {
          score += 10;
        }

        tokens.forEach(function (token) {
          score += countMatches(title, token) * 7;
          score += countMatches(categories, token) * 5;
          score += countMatches(tags, token) * 5;
          score += countMatches(content, token);
        });

        return {
          title: post.title,
          url: post.url,
          excerpt: buildExcerpt(post.content, tokens),
          score: score
        };
      })
      .filter(function (item) {
        return item.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, limit);
  }

  function buildTokens(question) {
    var normalized = normalize(question);
    var tokens = new Set();
    var cjkBlocks;

    if (!normalized) {
      return [];
    }

    tokens.add(normalized);
    normalized
      .split(/[^a-z0-9\u4e00-\u9fa5]+/i)
      .filter(function (token) {
        return token.length > 1;
      })
      .forEach(function (token) {
        tokens.add(token);
      });

    cjkBlocks = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    cjkBlocks.forEach(function (block) {
      for (var i = 0; i < block.length - 1; i += 1) {
        tokens.add(block.slice(i, i + 2));
      }
    });

    return Array.from(tokens);
  }

  function buildExcerpt(content, tokens) {
    var plain = stripHtml(content).replace(/\s+/g, " ").trim();
    var lowered = plain.toLowerCase();
    var index = -1;
    var tokenUsed = "";
    var start;
    var end;

    if (!plain) {
      return "这篇文章可以点开查看完整内容。";
    }

    tokens.some(function (token) {
      var found = lowered.indexOf(token);
      if (found !== -1) {
        index = found;
        tokenUsed = token;
        return true;
      }
      return false;
    });

    if (index === -1) {
      return plain.slice(0, 72) + (plain.length > 72 ? "..." : "");
    }

    start = Math.max(0, index - 18);
    end = Math.min(plain.length, index + tokenUsed.length + 42);
    return (start > 0 ? "..." : "") + plain.slice(start, end) + (end < plain.length ? "..." : "");
  }

  function countMatches(text, token) {
    var count = 0;
    var cursor = 0;
    var index;

    if (!text || !token) {
      return 0;
    }

    while (cursor < text.length) {
      index = text.indexOf(token, cursor);
      if (index === -1) {
        break;
      }
      count += 1;
      cursor = index + token.length;
    }
    return count;
  }

  function stripHtml(text) {
    return String(text || "").replace(/<[^>]+>/g, " ");
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  document.addEventListener("pjax:complete", function () {
    boot();
  });

  window.__BLOG_LIVE2D_AI_REBOOT__ = boot;
  boot();
})();
