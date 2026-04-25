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
    assistantName: "Blog AI",
    welcomeMessage:
      "Hi, I am your Live2D blog assistant. I can search this blog and answer with AI.",
    searchJsonPath: "/search.json",
    localSearchLimit: 3,
    maxHistory: 8,
    requestTimeout: 30000,
    apiUrl: "",
    assetBase: "https://cdn.jsdelivr.net/gh/LuoTian001/live2d-widget-AIChat@main/",
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

  var state = {
    initialized: false,
    resourcesLoaded: false,
    searchIndex: null,
    history: [],
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
      window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      window.setTimeout(run, 400);
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
    ensureToolButton(waifu);

    var panel = waifu.querySelector("#blog-ai-panel");
    if (!panel) {
      panel = createPanel(config);
      waifu.appendChild(panel);
    }

    bindPanel(panel, config);
    syncPanel(config);

    if (config.autoOpenOnFirstVisit && !sessionStorage.getItem("blog-ai-opened")) {
      sessionStorage.setItem("blog-ai-opened", "1");
      setPanelOpen(true);
    }

    if (!state.initialized) {
      addMessage("assistant", config.welcomeMessage, []);
      state.initialized = true;
    }
  }

  function ensureToolButton(waifu) {
    var toolbar = waifu.querySelector("#waifu-tool");
    if (!toolbar || toolbar.querySelector("#waifu-tool-chat")) {
      return;
    }

    var button = document.createElement("span");
    button.id = "waifu-tool-chat";
    button.textContent = "AI";
    button.title = "Open Blog AI";
    button.addEventListener("click", function () {
      setPanelOpen(!state.open);
    });
    toolbar.appendChild(button);
  }

  function createPanel(config) {
    var panel = document.createElement("section");
    panel.id = "blog-ai-panel";
    panel.innerHTML =
      '<div class="blog-ai-panel__header">' +
      '  <div class="blog-ai-panel__title">' +
      "    <strong>" +
      escapeHtml(config.assistantName) +
      "</strong>" +
      '    <div class="blog-ai-panel__status" data-role="status"></div>' +
      "  </div>" +
      '  <button class="blog-ai-panel__close" type="button" data-role="close" aria-label="Close">x</button>' +
      "</div>" +
      '<div class="blog-ai-panel__messages" data-role="messages"></div>' +
      '<div class="blog-ai-panel__footer">' +
      '  <div class="blog-ai-panel__hint" data-role="hint"></div>' +
      '  <div class="blog-ai-panel__composer">' +
      '    <textarea data-role="input" placeholder="Ask me about this blog..."></textarea>' +
      '    <button type="button" data-role="send">Send</button>' +
      "  </div>" +
      "</div>";
    return panel;
  }

  function bindPanel(panel, config) {
    if (panel.dataset.bound === "true") {
      syncPanel(config);
      return;
    }

    var closeButton = panel.querySelector('[data-role="close"]');
    var sendButton = panel.querySelector('[data-role="send"]');
    var input = panel.querySelector('[data-role="input"]');

    closeButton.addEventListener("click", function () {
      setPanelOpen(false);
    });

    sendButton.addEventListener("click", function () {
      submitQuestion(config);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitQuestion(config);
      }
    });

    panel.dataset.bound = "true";
  }

  function syncPanel(config) {
    var panel = document.getElementById("blog-ai-panel");
    if (!panel) {
      return;
    }

    var status = panel.querySelector('[data-role="status"]');
    var hint = panel.querySelector('[data-role="hint"]');
    var mode = getMode(config);

    if (mode === "proxy") {
      status.textContent = isLocalProxy(config.apiUrl)
        ? "Local proxy mode. Blog context is attached automatically."
        : "Secure proxy mode. Blog context is attached automatically.";
      hint.textContent = isLocalProxy(config.apiUrl)
        ? "You are using a local proxy for debugging."
        : "Requests go through your own backend, so the model key stays off the public page.";
    } else {
      status.textContent = "Local search mode only.";
      hint.textContent =
        "No production AI proxy is configured yet. I can still find relevant posts from this blog.";
    }

    panel.classList.toggle("is-open", state.open);
  }

  function getMode(config) {
    if (typeof config.apiUrl === "string" && config.apiUrl.trim()) {
      return "proxy";
    }
    return "local";
  }

  function isLocalProxy(apiUrl) {
    return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(String(apiUrl || ""));
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
      if (input) {
        window.setTimeout(function () {
          input.focus();
        }, 120);
      }
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
    meta.textContent = role === "user" ? "You" : "Assistant";
    item.appendChild(meta);

    if (references && references.length) {
      var refs = document.createElement("div");
      refs.className = "blog-ai-message__refs";

      references.forEach(function (ref) {
        var card = document.createElement("div");
        card.className = "blog-ai-ref";

        var link = document.createElement("a");
        link.href = ref.url || "#";
        link.textContent = ref.title || "Untitled";
        link.target = "_self";

        var desc = document.createElement("p");
        desc.textContent = ref.excerpt || "";

        card.appendChild(link);
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
    button.textContent = sending ? "..." : "Send";
  }

  function submitQuestion(config) {
    if (state.sending) {
      return;
    }

    var panel = document.getElementById("blog-ai-panel");
    if (!panel) {
      return;
    }

    var input = panel.querySelector('[data-role="input"]');
    var question = input.value.trim();
    if (!question) {
      return;
    }

    input.value = "";
    addMessage("user", question, []);
    setPanelOpen(true);
    setSending(true);

    resolveReply(config, question)
      .then(function (result) {
        addMessage("assistant", result.text, result.references || []);
        state.history.push({ role: "user", content: question });
        state.history.push({ role: "assistant", content: result.text });
        state.history = state.history.slice(-config.maxHistory);
      })
      .catch(function (error) {
        console.error("[blog-ai]", error);
        addMessage(
          "assistant",
          "The request failed just now. I can still help with local article search.",
          []
        );
      })
      .finally(function () {
        setSending(false);
      });
  }

  function resolveReply(config, question) {
    return loadSearchIndex(config)
      .then(function (index) {
        var matches = searchPosts(index, question, config.localSearchLimit);
        var mode = getMode(config);

        if (mode === "proxy") {
          return requestProxyReply(config, question, matches).catch(function () {
            return buildLocalReply(matches);
          });
        }

        return Promise.resolve(buildLocalReply(matches));
      })
      .catch(function () {
        var mode = getMode(config);
        if (mode === "proxy") {
          return requestProxyReply(config, question, []);
        }
        return {
          text: "I could not read the local search index just now.",
          references: []
        };
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

  function searchPosts(posts, question, limit) {
    var tokens = buildTokens(question);
    var normalizedQuestion = normalize(question);

    return posts
      .map(function (post) {
        var title = normalize(post.title || "");
        var content = normalize(stripHtml(post.content || ""));
        var categories = normalize((post.categories || []).join(" "));
        var tags = normalize((post.tags || []).join(" "));
        var score = 0;

        if (normalizedQuestion && title.indexOf(normalizedQuestion) !== -1) {
          score += 16;
        }
        if (normalizedQuestion && content.indexOf(normalizedQuestion) !== -1) {
          score += 8;
        }

        tokens.forEach(function (token) {
          score += countMatches(title, token) * 6;
          score += countMatches(categories, token) * 4;
          score += countMatches(tags, token) * 4;
          score += countMatches(content, token);
        });

        return {
          title: post.title || "Untitled",
          url: post.url || "/",
          excerpt: buildExcerpt(post.content || "", tokens),
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

  function buildLocalReply(matches) {
    if (!matches.length) {
      return {
        text:
          "I did not find a strong blog match this time. Try more specific keywords like Hexo, GitHub Actions, or a project name.",
        references: []
      };
    }

    return {
      text:
        "I found a few relevant blog posts. If the AI endpoint is unavailable, these references are still a good starting point.",
      references: matches
    };
  }

  function requestProxyReply(config, question, matches) {
    return requestJson(config.apiUrl, buildProxyPayload(config, question, matches), config.requestTimeout).then(
      function (data) {
        var text = extractReplyText(data);
        if (!text) {
          throw new Error("No reply text found");
        }
        return {
          text: text,
          references: matches
        };
      }
    );
  }

  function buildProxyPayload(config, question, matches) {
    return {
      message: question,
      history: state.history.slice(-config.maxHistory),
      context: matches.map(function (item) {
        return {
          title: item.title,
          url: item.url,
          excerpt: item.excerpt
        };
      }),
      metadata: {
        title: document.title,
        url: window.location.href,
        systemPrompt: config.systemPrompt
      }
    };
  }

  function requestJson(url, payload, timeout, headers) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer =
      controller &&
      window.setTimeout(function () {
        controller.abort();
      }, timeout);

    return fetch(url, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        if (timer) {
          window.clearTimeout(timer);
        }
        if (!response.ok) {
          throw new Error("Remote request failed: " + response.status);
        }
        return response.json();
      });
  }

  function extractReplyText(payload) {
    if (!payload) {
      return "";
    }
    if (typeof payload.reply === "string") {
      return payload.reply;
    }
    if (typeof payload.answer === "string") {
      return payload.answer;
    }
    if (typeof payload.message === "string") {
      return payload.message;
    }
    if (
      Array.isArray(payload.choices) &&
      payload.choices[0] &&
      payload.choices[0].message &&
      typeof payload.choices[0].message.content === "string"
    ) {
      return payload.choices[0].message.content;
    }
    if (Array.isArray(payload.choices) && payload.choices[0] && typeof payload.choices[0].text === "string") {
      return payload.choices[0].text;
    }
    return "";
  }

  function buildExcerpt(content, tokens) {
    var plain = stripHtml(content).replace(/\s+/g, " ").trim();
    var lowered = plain.toLowerCase();
    var index = -1;
    var tokenUsed = "";
    var start;
    var end;

    if (!plain) {
      return "No excerpt available.";
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
      return plain.slice(0, 96) + (plain.length > 96 ? "..." : "");
    }

    start = Math.max(0, index - 26);
    end = Math.min(plain.length, index + tokenUsed.length + 60);
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

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  document.addEventListener("pjax:complete", function () {
    boot();
  });

  window.__BLOG_LIVE2D_AI_REBOOT__ = boot;
  boot();
})();
