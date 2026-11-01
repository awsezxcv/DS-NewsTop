// dsh-hot-list · client 侧（浏览器 bundle）
//
// 由宿主通过 __ModuleLoader__ 加载。注册：
//   - sidebar.panellist 行（id: dsh-hot-list，标签「每日热榜」）
//   - main 主面板（key: dsh-hot-list），渲染多源热搜榜
//
// 只依赖基座注入的 react（platform module table 里必有），其余全部内联。

window.__ModuleLoader__.load({
  id: "dsh-hot-list",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var React = require("react");
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;

    var PANEL_ID = "dsh-hot-list";

    var SOURCES = [
      { id: "appinn-faxian", name: "小众软件", label: "最新发现", icon: "小", color: "#dc7540" },
      { id: "zhihu", name: "知乎", label: "热榜", icon: "知", color: "#286bd8" },
      { id: "v2ex-share", name: "V2EX", label: "最新分享", icon: "V²", color: "#535766" },
      { id: "coolapk", name: "酷安", label: "今日最热", icon: "酷", color: "#0caf65" },
      { id: "sspai", name: "少数派", label: "热门文章", icon: "π", color: "#e84a50" },
      { id: "juejin", name: "稀土掘金", label: "热榜", icon: "掘", color: "#2187f5" },
      { id: "hupu", name: "虎扑", label: "主干道热帖", icon: "虎", color: "#df3b44" },
      { id: "bilibili-hot-search", name: "哔哩哔哩", label: "热搜", icon: "哔", color: "#13a9d6" },
      { id: "weibo", name: "微博", label: "热搜", icon: "微", color: "#ed6547" },
      { id: "baidu", name: "百度", label: "热搜", icon: "百", color: "#5478ed" },
      { id: "douyin", name: "抖音", label: "热点", icon: "♪", color: "#b14a89" },
      { id: "tieba", name: "贴吧", label: "热议", icon: "贴", color: "#4385eb" },
      { id: "toutiao", name: "今日头条", label: "热榜", icon: "头", color: "#ed4b52" },
      { id: "thepaper", name: "澎湃新闻", label: "热榜", icon: "澎", color: "#2798ad" },
    ];

    var DEFAULT_IDS = SOURCES.map(function (source) { return source.id; });
    SOURCES.push(
      { id: "ithome", name: "IT之家", label: "最新资讯", icon: "IT", color: "#d93d3e" },
      { id: "solidot", name: "Solidot", label: "科技资讯", icon: "S", color: "#637d44" },
      { id: "github-trending-today", name: "GitHub", label: "今日趋势", icon: "GH", color: "#586477" },
      { id: "hackernews", name: "Hacker News", label: "热门", icon: "Y", color: "#ed742f" },
      { id: "pcbeta", name: "远景论坛", label: "最新帖子", icon: "远", color: "#397bbb" }
    );
    var SETTINGS_KEY = "dsh-hot-list:settings";
    function readSettings() {
      try {
        var saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        if (saved && Array.isArray(saved.ids)) return {
          version: 2,
          ids: SOURCES.map(function (source) { return source.id; }).filter(function (id) { return saved.ids.includes(id) || (saved.version !== 2 && id === "appinn-faxian"); }),
          mode: ["light", "dark", "auto"].includes(saved.mode) ? saved.mode : "auto",
        };
      } catch (_) {}
      return { version: 2, ids: DEFAULT_IDS, mode: "auto" };
    }

    // 相对 baseURI 解析同源路径，兼容挂在子路径下的部署（同 dshmarket 的做法）。
    function api(path) {
      var relative = path.replace(/^\/+/, "");
      if (typeof document === "undefined") return "/" + relative;
      var url = new URL(relative, document.baseURI);
      return url.pathname + url.search;
    }

    var CSS = `
      .dshhl-root{--hl-bg:var(--dsw-alias-bg-base,#fff);--hl-surface:var(--dsw-alias-bg-layer-1,#fff);--hl-module:var(--dsw-alias-bg-module-platform,#f5f6f7);--hl-fg:var(--dsw-alias-label-primary,#0f1115);--hl-muted:var(--dsw-alias-label-secondary,#61666b);--hl-border:var(--dsw-alias-border-l2,#0000001a);--hl-hover:var(--dsw-alias-interactive-bg-hover,#2631480f);display:flex;flex-direction:column;height:100%;min-height:0;color:var(--hl-fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--hl-bg)}
      .dshhl-root[data-mode=light]{--hl-bg:#fff;--hl-surface:#fff;--hl-module:#f5f6f7;--hl-fg:#0f1115;--hl-muted:#61666b;--hl-border:#0000001a;--hl-hover:#2631480f;color-scheme:light}
      .dshhl-root[data-mode=dark]{--hl-bg:#151517;--hl-surface:#232324;--hl-module:#353638;--hl-fg:#f9fafb;--hl-muted:#cfd3d6;--hl-border:#ffffff1f;--hl-hover:#ffffff14;color-scheme:dark}
      .dshhl-root *{box-sizing:border-box}
      .dshhl-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:26px 28px 22px;flex:none;flex-wrap:wrap}
      .dshhl-title{margin:0;font-size:24px;font-weight:750;letter-spacing:.5px}
      .dshhl-subtitle{margin:5px 0 0;font-size:12px;color:var(--hl-muted)}
      .dshhl-actions{display:flex;align-items:center;gap:8px}
      .dshhl-all-refresh,.dshhl-config-button{display:flex;align-items:center;gap:7px;border:1px solid var(--hl-border);background:transparent;color:inherit;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer;white-space:nowrap}
      .dshhl-all-refresh:hover,.dshhl-config-button:hover{background:var(--hl-hover)}
      .dshhl-config-button[aria-expanded=true]{background:var(--hl-module)}
      .dshhl-settings{flex:none;max-height:45%;overflow:auto;margin:0 28px 20px;padding:18px;border:1px solid var(--hl-border);border-radius:14px;background:var(--hl-surface)}
      .dshhl-settings-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      .dshhl-settings h2{font-size:15px;margin:0;font-weight:650}
      .dshhl-settings p{font-size:12px;color:var(--hl-muted);margin:5px 0 12px}
      .dshhl-modes{display:inline-flex;flex-wrap:wrap;gap:4px;padding:4px;background:var(--hl-module);border-radius:9px;margin-bottom:18px}
      .dshhl-mode{padding:6px 14px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--hl-muted);cursor:pointer;font:inherit}
      .dshhl-mode[aria-pressed=true]{background:var(--hl-surface);border-color:var(--hl-border);color:var(--hl-fg)}
      .dshhl-platforms{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:8px}
      .dshhl-platform{display:flex;align-items:center;gap:9px;padding:10px;border:1px solid var(--hl-border);border-radius:9px;cursor:pointer;background:var(--hl-bg)}
      .dshhl-platform:hover{background:var(--hl-hover)}
      .dshhl-platform input{width:16px;height:16px;margin:0;accent-color:#4176e6;flex:none}
      .dshhl-platform-text{display:flex;flex-direction:column;min-width:0;font-size:13px}
      .dshhl-platform-text small{font-size:11px;color:var(--hl-muted)}
      .dshhl-save-error{color:#dc5656;font-size:12px;margin:0 28px 12px}
      .dshhl-empty{padding:45px 20px;text-align:center;grid-column:1/-1;color:var(--hl-muted)}
      .dshhl-empty button{margin:14px auto 0}
      .dshhl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px;align-content:start;overflow-y:auto;padding:0 28px 28px;min-height:0;flex:1}
      .dshhl-card{height:440px;min-width:0;padding:16px 12px 12px;border:1px solid var(--hl-border);border-radius:18px;background:color-mix(in srgb,var(--card-color) 12%,var(--hl-surface));color:var(--hl-fg);display:flex;flex-direction:column;box-shadow:0 3px 10px #00000008}
      .dshhl-card-header{display:flex;align-items:center;gap:10px;padding:0 4px 12px}
      .dshhl-source-icon{width:34px;height:34px;flex:none;border-radius:11px;display:grid;place-items:center;background:var(--card-color);color:white;font-size:18px;font-weight:800}
      .dshhl-source-heading{flex:1;min-width:0}
      .dshhl-source-line{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .dshhl-source-name{margin:0;font-size:18px;font-weight:750}
      .dshhl-badge{font-size:11px;background:var(--hl-hover);border-radius:4px;padding:1px 5px;color:var(--hl-muted)}
      .dshhl-time{font-size:11px;color:var(--hl-muted);margin-top:2px}
      .dshhl-refresh{width:30px;height:30px;display:grid;place-items:center;flex:none;border:0;border-radius:8px;background:transparent;color:var(--hl-muted);cursor:pointer}
      .dshhl-refresh:hover{background:var(--hl-hover);color:var(--hl-fg)}
      .dshhl-refresh:disabled,.dshhl-all-refresh:disabled{opacity:.5;cursor:wait}
      .dshhl-card-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;border-radius:12px;background:var(--hl-surface);padding:5px;scrollbar-width:thin;scrollbar-color:var(--hl-border) transparent}
      .dshhl-list{list-style:none;margin:0;padding:0}
      .dshhl-link{display:flex;align-items:stretch;gap:8px;padding:5px;border-radius:7px;color:inherit;text-decoration:none}
      .dshhl-link:hover{background:var(--hl-hover)}
      .dshhl-root button:focus-visible,.dshhl-root a:focus-visible,.dshhl-root input:focus-visible{outline:2px solid #5686fe;outline-offset:2px}
      .dshhl-rank{display:flex;align-items:center;justify-content:center;align-self:stretch;flex:none;width:23px;min-height:26px;border-radius:5px;background:var(--hl-hover);color:var(--hl-muted);font-size:12px;font-weight:650;font-variant-numeric:tabular-nums}
      .dshhl-rank-top{background:color-mix(in srgb,var(--card-color) 14%,var(--hl-surface));color:var(--hl-fg)}
      .dshhl-item-content{min-width:0;flex:1;padding:1px 0}
      .dshhl-title-text{font-size:13px;line-height:1.65;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .dshhl-meta{display:block;font-size:11px;color:var(--hl-muted);margin-top:3px}
      .dshhl-note{padding:26px 12px;text-align:center;color:var(--hl-muted);font-size:12px}
      .dshhl-error{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;color:#dc5656;font-size:12px}
      .dshhl-retry{border:0;background:var(--hl-hover);color:inherit;padding:4px 8px;border-radius:5px;cursor:pointer;white-space:nowrap}
      @media(max-width:700px){.dshhl-header{padding:20px 16px 18px}.dshhl-grid{padding:0 16px 20px;gap:16px}.dshhl-settings{margin:0 16px 16px}.dshhl-title{font-size:21px}}
      @media(prefers-reduced-motion:no-preference){.dshhl-loading svg{animation:dshhl-spin 1s linear infinite}@keyframes dshhl-spin{to{transform:rotate(360deg)}}}
    `;

    var styleInjected = false;
    function ensureStyle() {
      if (styleInjected || typeof document === "undefined") return;
      styleInjected = true;
      var el = document.createElement("style");
      el.setAttribute("data-dsh-hot-list", "");
      el.textContent = CSS;
      document.head.appendChild(el);
    }

    // 侧边栏图标：一条折线（趋势/热度）。
    function HotListIcon(owner) {
      var size = (owner && owner.size) || 16;
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
        },
        h("path", { d: "M3 13h3l2.5-6.5 4 12L15 10h6" }),
      );
    }

    // 刷新图标（主面板右上角）。
    function RefreshIcon() {
      return h(
        "svg",
        {
          width: 16,
          height: 16,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
        },
        h("path", {
          d: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6",
        }),
      );
    }

    function updatedLabel(time) {
      if (!time) return "等待更新";
      var minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
      if (minutes < 1) return "刚刚更新";
      if (minutes < 60) return minutes + " 分钟前更新";
      if (minutes < 1440) return Math.floor(minutes / 60) + " 小时前更新";
      return Math.floor(minutes / 1440) + " 天前更新";
    }

    function itemHref(url) {
      try {
        var parsed = new URL(String(url).replace(/&amp;/g, "&"));
        return /^https?:$/.test(parsed.protocol) ? parsed.href : null;
      } catch (_) { return null; }
    }

    function HotListPanel() {
      var settingsState = useState(readSettings);
      var settings = settingsState[0];
      var setSettings = settingsState[1];
      var openState = useState(false);
      var settingsOpen = openState[0];
      var setSettingsOpen = openState[1];
      var saveState = useState(false);
      var saveError = saveState[0];
      var setSaveError = saveState[1];
      var visibleSources = SOURCES.filter(function (source) { return settings.ids.includes(source.id); });
      var state = useState({});
      var cards = state[0];
      var setCards = state[1];
      var requests = React.useRef({});

      async function load(id, force) {
        if (requests.current[id]) return;
        var controller = new AbortController();
        requests.current[id] = controller;
        setCards(function (m) {
          return Object.assign({}, m, { [id]: Object.assign({}, m[id], { loading: true, error: null }) });
        });
        var timeout = setTimeout(function () { controller.abort(); }, 20000);
        try {
          var response = await fetch(api("/dsh-hot-list/items?id=" + encodeURIComponent(id) + (force ? "&refresh=1" : "")), {
            cache: "no-store", signal: controller.signal,
          });
          var json = await response.json();
          if (!response.ok || !Array.isArray(json.items)) throw new Error(json.error || "来源暂时不可用");
          if (requests.current[id] !== controller) return;
          setCards(function (m) {
            return Object.assign({}, m, { [id]: { items: json.items, updatedTime: json.updatedTime || Date.now(), loading: false } });
          });
        } catch (error) {
          if (requests.current[id] !== controller) return;
          setCards(function (m) {
            return Object.assign({}, m, { [id]: Object.assign({}, m[id], { loading: false, error: "更新失败，请重试" }) });
          });
        } finally {
          clearTimeout(timeout);
          if (requests.current[id] === controller) delete requests.current[id];
        }
      }

      useEffect(function () {
        ensureStyle();

        return function () {
          Object.values(requests.current).forEach(function (controller) { controller.abort(); });
          requests.current = {};
        };
      }, []);

      useEffect(function () {
        visibleSources.forEach(function (source) {
          if (!cards[source.id]) load(source.id, false);
        });
      }, [settings.ids.join(",")]);

      useEffect(function () {
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
          setSaveError(false);
        } catch (_) { setSaveError(true); }
      }, [settings]);

      function toggleSource(id) {
        setSettings(function (current) {
          return Object.assign({}, current, { ids: current.ids.includes(id) ? current.ids.filter(function (value) { return value !== id; }) : current.ids.concat(id) });
        });
      }

      var busy = visibleSources.some(function (source) { return cards[source.id] && cards[source.id].loading; });
      return h("div", { className: "dshhl-root", "data-mode": settings.mode },
        h("div", { className: "dshhl-header" },
          h("div", null,
            h("h1", { className: "dshhl-title" }, "每日热榜"),
            h("p", { className: "dshhl-subtitle" }, "此刻热点，一眼尽览 · " + visibleSources.length + " 个平台 · NewsNow / 小众软件社区")
          ),
          h("div", { className: "dshhl-actions" },
          h("button", { className: "dshhl-config-button", "aria-expanded": settingsOpen, "aria-controls": "dshhl-settings", onClick: function () { setSettingsOpen(!settingsOpen); } }, "配置"),
          h("button", {
            className: "dshhl-all-refresh" + (busy ? " dshhl-loading" : ""), disabled: busy || !visibleSources.length,
            onClick: function () { visibleSources.forEach(function (s) { load(s.id, true); }); },
            "aria-label": "刷新全部热榜",
          }, RefreshIcon(), busy ? "更新中" : "刷新全部"))
        ),
        settingsOpen ? h("section", { className: "dshhl-settings", id: "dshhl-settings", "aria-label": "热榜配置" },
          h("div", { className: "dshhl-settings-heading" },
            h("h2", null, "颜色模式"),
            h("button", { className: "dshhl-config-button", onClick: function () { setSettingsOpen(false); } }, "完成")
          ),
          h("div", { className: "dshhl-modes", role: "group", "aria-label": "颜色模式" },
            [{ id: "light", label: "白天" }, { id: "dark", label: "黑夜" }, { id: "auto", label: "自动 · 跟随 DSH" }].map(function (mode) {
              return h("button", { key: mode.id, className: "dshhl-mode", "aria-pressed": settings.mode === mode.id,
                onClick: function () { setSettings(function (current) { return Object.assign({}, current, { mode: mode.id }); }); }
              }, mode.label);
            })
          ),
          h("h2", null, "展示平台 · 已添加 " + visibleSources.length + " 个"),
          h("p", null, "勾选添加，取消勾选移除。修改即时生效并自动保存。"),
          h("div", { className: "dshhl-platforms" }, SOURCES.map(function (source) {
            return h("label", { key: source.id, className: "dshhl-platform" },
              h("input", { type: "checkbox", checked: settings.ids.includes(source.id), "aria-label": "显示" + source.name, onChange: function () { toggleSource(source.id); } }),
              h("span", { className: "dshhl-platform-text" }, source.name, h("small", null, source.label))
            );
          }))
        ) : null,
        saveError ? h("p", { className: "dshhl-save-error", role: "status" }, "配置暂时无法保存，重新打开后可能恢复默认设置。") : null,
        h("div", { className: "dshhl-grid" },
          !visibleSources.length ? h("div", { className: "dshhl-empty" }, "还没有添加平台",
            h("button", { className: "dshhl-config-button", onClick: function () { setSettingsOpen(true); } }, "添加平台")) : null,
          visibleSources.map(function (source) {
          var card = cards[source.id] || {};
          var items = card.items || [];
          return h("section", {
            key: source.id, className: "dshhl-card", "aria-labelledby": "dshhl-" + source.id,
            style: { "--card-color": source.color },
          },
            h("div", { className: "dshhl-card-header" },
              h("span", { className: "dshhl-source-icon", "aria-hidden": true }, source.icon),
              h("div", { className: "dshhl-source-heading" },
                h("div", { className: "dshhl-source-line" },
                  h("h2", { className: "dshhl-source-name", id: "dshhl-" + source.id }, source.name),
                  h("span", { className: "dshhl-badge" }, source.label)
                ),
                h("div", { className: "dshhl-time", title: card.updatedTime ? new Date(card.updatedTime).toLocaleString("zh-CN") : "" },
                  card.loading ? "正在更新…" : updatedLabel(card.updatedTime))
              ),
              h("button", {
                className: "dshhl-refresh" + (card.loading ? " dshhl-loading" : ""), disabled: !!card.loading,
                "aria-label": "刷新" + source.name, title: "刷新" + source.name,
                onClick: function () { load(source.id, true); },
              }, RefreshIcon())
            ),
            h("div", { className: "dshhl-card-body", "aria-busy": !!card.loading, tabIndex: 0, "aria-label": source.name + "榜单" },
              card.error ? h("div", { className: "dshhl-error", role: "status" },
                h("span", null, card.error + (items.length ? "，保留上次内容" : "")),
                h("button", { className: "dshhl-retry", disabled: !!card.loading, onClick: function () { load(source.id, true); } }, "重试")) : null,
              !items.length ? h("div", { className: "dshhl-note" }, card.loading ? "正在获取最新热榜…" : card.error ? "暂时无法获取此平台" : "暂无热榜内容") :
                h("ol", { className: "dshhl-list" }, items.map(function (item, i) {
                  var href = itemHref(item.url);
                  var meta = item.extra && item.extra.info;
                  if (!meta && item.extra && item.extra.date) {
                    var date = new Date(item.extra.date);
                    if (!isNaN(date.getTime())) meta = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) + " 发布";
                  }
                  return h("li", { key: String(item.id || i) + "-" + i },
                    h(href ? "a" : "div", { className: "dshhl-link", href: href || undefined, target: href ? "_blank" : undefined, rel: href ? "noopener noreferrer" : undefined, title: item.title },
                      h("span", { className: "dshhl-rank" + (i < 3 ? " dshhl-rank-top" : "") }, i + 1),
                      h("span", { className: "dshhl-item-content" },
                        h("span", { className: "dshhl-title-text" }, item.title),
                        meta ? h("span", { className: "dshhl-meta" }, String(meta)) : null
                      )
                    )
                  );
                }))
            )
          );
        }))
      );
    }

    exports.name = "dsh-hot-list";
    exports.inject = ["slots"];
    exports.apply = function (ctx) {
      ctx.slots.inject("main", function () {
        return ctx.slots.register(
          {
            name: "main",
            key: PANEL_ID,
            inject: function () {
              return {};
            },
          },
          HotListPanel,
        );
      });
      ctx.slots.inject("sidebar.panellist", function () {
        return ctx.slots.register(
          {
            name: "sidebar.panellist",
            id: PANEL_ID,
            order: 20,
            label: "每日热榜",
          },
          HotListIcon,
        );
      });
    };

    return module.exports;
  },
});
