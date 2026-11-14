/*
 * PhantomJS runs this file in its own ES5/CommonJS host, not in Node or Bun.
 * It is an optional regression probe for old WebKit, not a Tizen emulator.
 * Only load the local, trusted export served by the parent test.
 */
var system = require("system");
var webpage = require("webpage");
var origin = system.args[1];
var tasks = [
  { path: "/", width: 320, interaction: "mobile-keyboard" },
  { path: "/", width: 375, interaction: "mobile-navigation" },
  { path: "/", width: 375, interaction: "mobile-keyboard" },
  { path: "/", width: 375, interaction: "mobile-seo-navigation" },
  { path: "/", width: 375, interaction: "mobile-machine-navigation" },
  { path: "/", width: 768 },
  { path: "/", width: 1024 },
  { path: "/", width: 1250 },
  { path: "/", width: 1251 },
  { path: "/", width: 1280, interaction: "favicon" },
  { path: "/", width: 1280, interaction: "seo-navigation" },
  { path: "/", width: 1280, interaction: "machine-navigation" },
  { path: "/", width: 1400 },
  { path: "/", width: 1401 },
  { path: "/", width: 1920 },
  { path: "/projects/", width: 320 },
  { path: "/projects/", width: 1280 },
  { path: "/docs/", width: 375, interaction: "docs-navigation" },
  { path: "/docs/", width: 1280 },
  { path: "/packages/", width: 320, interaction: "registry-filter" },
  { path: "/packages/", width: 1280 },
  { path: "/search/", width: 375 },
  { path: "/seo/feed/", width: 375 },
  { path: "/seo/pages/", width: 375 },
  { path: "/404.html", width: 375 },
];
var completed = 0;

function fail(task, message, details) {
  console.error(task.path + " @ " + task.width + "px: " + message);
  if (details) console.error(JSON.stringify(details));
  phantom.exit(1);
}

function check(task, condition, message, details) {
  if (!condition) fail(task, message, details);
}

function inspect(page) {
  return page.evaluate(function () {
    function box(selector) {
      var element = document.querySelector(selector);
      if (!element) return null;
      var rect = element.getBoundingClientRect();
      var style = getComputedStyle(element);
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        display: style.display,
        color: style.color,
        background: style.backgroundColor,
      };
    }
    var probe = document.createElement("div");
    probe.style.cssText = "display:grid;color:var(--legacy-probe)";
    var cards = Array.prototype.map.call(document.querySelectorAll(".project-card"), function (card) {
      var rect = card.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    var docsCards = Array.prototype.map.call(
      document.querySelectorAll(".docs-home .docs-prose > ul:first-of-type > li"),
      function (card) {
        var rect = card.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }
    );
    var fallback = document.querySelector(".search-fallback, .site-file-fallback");
    return {
      width: document.documentElement.scrollWidth,
      supportsGrid: probe.style.display === "grid",
      supportsVariables: probe.style.color !== "",
      html: box("html"),
      header: box(".site-header"),
      brand: box(".site-brand"),
      actions: box(".site-header-actions"),
      desktopNav: box(".site-nav"),
      mobileNav: box(".site-mobile-menu"),
      mobileSummary: box(".site-mobile-menu > summary"),
      mobileSearch: box(".site-mobile-search"),
      theme: box(".theme-toggle"),
      skip: box(".skip-link"),
      atlas: box(".atlas-preview"),
      intro: box(".atlas-intro"),
      art: box(".atlas-preview-art"),
      primary: box(".button.primary, .markdown-button.primary, .not-found-home"),
      cards: cards,
      docsCards: docsCards,
      logo: box(".footer-brand .terrain-logo"),
      sidebar: box(".docs-sidebar"),
      docsMobile: box(".docs-mobile-nav"),
      article: box(".docs-article"),
      searchFallback: fallback ? fallback.textContent : "",
      rawLink: !!document.querySelector('.site-file-fallback a[href="/feed.rss"]'),
      projectFallback: !!document.querySelector(".project-directory-noscript"),
      dialog: box(".search-palette"),
    };
  });
}

function verify(task, result) {
  check(task, result && !result.supportsGrid && !result.supportsVariables, "probe needs old WebKit", result);
  check(task, result.width <= task.width, "page overflows the viewport", result);
  check(task, result.html.background === "rgb(248, 249, 246)", "missing day background", result.html);
  check(task, result.html.color === "rgb(32, 45, 39)", "missing day text color", result.html);
  check(task, result.skip.bottom < 0, "skip link covers the header before focus", result.skip);
  if (result.dialog) check(task, result.dialog.display === "none", "closed search dialog is visible", result.dialog);
  if (task.width <= 1250) {
    check(task, result.mobileNav.display !== "none", "mobile menu is hidden", result.mobileNav);
    check(task, result.mobileSearch.display !== "none", "mobile search is hidden", result.mobileSearch);
    check(task, result.mobileSearch.left - result.theme.right >= 4, "mobile controls touch", result);
    check(task, result.mobileSummary.left - result.mobileSearch.right >= 4, "mobile controls touch", result);
  } else {
    check(task, result.desktopNav.display !== "none", "desktop navigation is hidden", result.desktopNav);
    check(task, result.desktopNav.bottom <= result.header.bottom, "navigation overlaps the content", result.desktopNav);
    check(task, result.brand.right <= result.desktopNav.left && result.desktopNav.right <= result.actions.left,
      "desktop header items overlap", result);
    check(task, result.actions.right <= task.width, "desktop header actions are clipped", result.actions);
  }
  if (result.atlas) {
    check(task, result.atlas.background === "rgb(232, 238, 229)", "atlas background is missing", result.atlas);
    check(task, result.intro.width > 0 && result.art.width > 0, "atlas content is missing", result);
    check(task, result.art.left >= 0 && result.art.right <= task.width, "atlas art is clipped", result.art);
    if (task.width <= 700) check(task, result.art.top >= result.intro.bottom, "mobile atlas overlaps", result);
  }
  if (result.primary) {
    check(task, result.primary.background === "rgb(53, 91, 66)", "primary button background is missing", result.primary);
    check(task, result.primary.color === "rgb(255, 255, 255)", "primary button text is unreadable", result.primary);
  }
  if (result.cards.length) {
    var first = result.cards[0];
    var second = result.cards[1];
    check(task, first.right <= task.width && first.bottom > first.top, "project card is clipped", first);
    if (second && task.width <= 700) check(task, second.top >= first.bottom, "mobile project cards overlap", result.cards);
    if (second && task.width >= 1280) check(task, second.left >= first.right, "desktop project cards overlap", result.cards);
    check(task, result.logo.width <= 60 && result.logo.height <= 45, "footer logo is oversized", result.logo);
  }
  if (task.path === "/projects/") check(task, result.projectFallback, "static project list has no explanation", result);
  if (result.article) {
    check(task, result.article.width > 0, "documentation article is missing", result.article);
    if (task.width > 900) check(task, result.sidebar.right <= result.article.left, "documentation columns overlap", result);
    else check(task, result.docsMobile.display !== "none", "mobile documentation navigation is missing", result);
    if (result.docsCards.length > 1 && task.width <= 700) {
      check(task, result.docsCards[1].top - result.docsCards[0].bottom >= 8, "mobile documentation cards touch", result.docsCards);
    }
    if (result.docsCards.length > 1 && task.width >= 1280) {
      check(task, result.docsCards[1].left - result.docsCards[0].right >= 8, "desktop documentation cards touch", result.docsCards);
    }
  }
  if (task.path === "/search/") check(task, /supported browser/.test(result.searchFallback), "search fallback is missing", result);
  if (task.path === "/seo/feed/") check(task, result.rawLink, "raw feed fallback is missing", result);
  if (task.path === "/seo/pages/") check(task, /cannot run it/.test(result.searchFallback), "inspector fallback is missing", result);
}

function click(page, selector) {
  var point = page.evaluate(function (query) {
    var element = document.querySelector(query);
    if (!element) return null;
    element.scrollIntoView();
    var rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, selector);
  if (!point) return false;
  page.sendEvent("click", point.x, point.y);
  return true;
}

function interact(task, page, done) {
  if (task.interaction === "favicon") {
    page.evaluate(function () {
      var image = new Image();
      window.__legacyFaviconResult = null;
      window.__legacyFaviconImage = image;
      image.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          var context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          var visible = 0;
          var transparent = 0;
          for (var index = 3; index < pixels.length; index += 4) {
            if (pixels[index] === 0) transparent++;
            else visible++;
          }
          window.__legacyFaviconResult = {
            width: canvas.width, height: canvas.height, visible: visible, transparent: transparent
          };
        } catch (error) {
          window.__legacyFaviconResult = { error: String(error) };
        }
      };
      image.onerror = function () { window.__legacyFaviconResult = { error: "image failed to load" }; };
      image.src = "/favicon.ico";
    });
    var attempts = 0;
    var timer = setInterval(function () {
      var result = page.evaluate(function () { return window.__legacyFaviconResult; });
      if (result) {
        clearInterval(timer);
        check(task, !result.error && result.width > 48 && result.width === result.height &&
          result.visible > 0 && result.transparent > 0, "old WebKit could not render the favicon", result);
        done();
      } else if (++attempts >= 100) {
        clearInterval(timer);
        fail(task, "old WebKit favicon check timed out");
      }
    }, 100);
    return;
  }
  if (task.interaction === "mobile-navigation" || task.interaction === "mobile-keyboard") {
    if (task.interaction === "mobile-keyboard") {
      var focused = page.evaluate(function () {
        var trigger = document.querySelector(".site-mobile-menu > summary");
        trigger.focus();
        return document.activeElement === trigger;
      });
      check(task, focused, "mobile menu trigger is not keyboard focusable");
      page.sendEvent("keypress", page.event.key.Enter);
    } else {
      check(task, click(page, ".site-mobile-menu > summary"), "mobile menu trigger is missing");
    }
    var state = page.evaluate(function () {
      var menu = document.querySelector(".site-mobile-menu");
      var link = menu.querySelector('a[href="/projects/"]');
      var rect = link.getBoundingClientRect();
      return { open: menu.open, top: rect.top, bottom: rect.bottom };
    });
    check(task, state.open && state.top >= 0 && state.bottom < 800, "mobile menu opens off screen", state);
    page.onLoadFinished = function (status) {
      page.onLoadFinished = null;
      check(task, status === "success" && /\/projects\/$/.test(page.url), "mobile link did not navigate", page.url);
      check(task, page.evaluate(function () { return !!document.querySelector(".project-card"); }), "destination has no projects");
      done();
    };
    if (task.interaction === "mobile-keyboard") {
      page.sendEvent("keypress", page.event.key.Tab);
      page.sendEvent("keypress", page.event.key.Tab);
      check(task, page.evaluate(function () {
        return document.activeElement.getAttribute("href") === "/projects/";
      }), "project link is not reachable by keyboard");
      page.sendEvent("keypress", page.event.key.Enter);
    } else {
      check(task, click(page, '.site-mobile-menu a[href="/projects/"]'), "project link is missing");
    }
    return;
  }
  if (task.interaction === "seo-navigation" || task.interaction === "mobile-seo-navigation" ||
      task.interaction === "machine-navigation" || task.interaction === "mobile-machine-navigation") {
    var mobile = task.interaction.indexOf("mobile-") === 0;
    var machine = task.interaction.indexOf("machine-navigation") !== -1;
    var group = machine ? "machine" : "seo";
    var target = machine ? "/seo/feed/" : "/seo/robots/";
    var parent = mobile ? ".site-mobile-menu" : ".site-nav";
    var selector = parent + ' [data-resource-menu="' + group + '"]';
    if (mobile) check(task, click(page, ".site-mobile-menu > summary"), "mobile menu trigger is missing");
    check(task, click(page, selector + " .site-seo-menu-trigger"), group + " menu trigger is missing");
    var resource = page.evaluate(function (query) {
      var menu = document.querySelector(query);
      var trigger = menu.querySelector("summary");
      var label = menu.querySelector(".site-seo-menu-copy strong");
      var description = menu.querySelector(".site-seo-menu-copy small");
      var icon = menu.querySelector(".site-seo-menu-icon");
      var svg = icon.querySelector("svg");
      function rect(element) { return element.getBoundingClientRect(); }
      var left = rect(trigger.children[0]);
      var right = rect(trigger.children[1]);
      var frame = rect(icon);
      var art = rect(svg);
      return {
        open: menu.open,
        triggerHeight: rect(trigger).height,
        triggerAlignment: Math.abs((left.top + left.bottom - right.top - right.bottom) / 2),
        labelBottom: rect(label).bottom,
        descriptionTop: rect(description).top,
        iconAlignment: Math.abs((frame.left + frame.right - art.left - art.right) / 2),
        labelColor: getComputedStyle(label).color,
        llmsLink: !!menu.querySelector('a[href="/llms.txt"]'),
        robotsLink: !!menu.querySelector('a[href="/seo/robots/"]'),
      };
    }, selector);
    check(task, resource.open && resource.triggerHeight < 50 && resource.triggerAlignment < 3, group + " trigger is misaligned", resource);
    check(task, resource.labelBottom <= resource.descriptionTop && resource.iconAlignment < 3, group + " menu items overlap", resource);
    check(task, resource.labelColor === "rgb(32, 45, 39)", group + " menu text is unreadable", resource);
    check(task, resource.llmsLink === machine && resource.robotsLink !== machine, "resource groups are mixed", resource);
    page.onLoadFinished = function (status) {
      page.onLoadFinished = null;
      check(task, status === "success" && page.url.indexOf(target) !== -1, group + " link did not navigate", page.url);
      done();
    };
    check(task, click(page, selector + ' .site-seo-menu-list a[href="' + target + '"]'), group + " link is missing");
    return;
  }
  if (task.interaction === "docs-navigation") {
    check(task, click(page, ".docs-mobile-nav > summary"), "documentation menu trigger is missing");
    check(task, page.evaluate(function () { return document.querySelector(".docs-mobile-nav").open; }), "documentation menu did not open");
  }
  if (task.interaction === "registry-filter") {
    check(task, click(page, 'label[for="registry-filter-npm"]'), "npm filter is missing");
    var selected = page.evaluate(function () {
      return document.querySelector("#registry-filter-npm").checked &&
        getComputedStyle(document.querySelector('[data-registry="npm"]')).display !== "none" &&
        getComputedStyle(document.querySelector('[data-registry="pypi"]')).display === "none" &&
        getComputedStyle(document.querySelector('[data-registry="prefix"]')).display === "none";
    });
    check(task, selected, "CSS-only registry filter did not work");
    var family = page.evaluate(function () {
      return document.querySelector('tr[data-package="@archont561/qgis-sdk"]').getAttribute("data-family");
    });
    check(task, click(page, 'label[for="family-filter-' + family + '"]'), "family filter is missing");
    check(task, click(page, 'label[for="relation-filter-alias"]'), "relation filter is missing");
    var filtered = page.evaluate(function () {
      var rows = document.querySelectorAll("tr.package-row");
      var visible = 0;
      for (var index = 0; index < rows.length; index++) {
        if (rows[index].getBoundingClientRect().height > 0) visible++;
      }
      var focused = document.querySelector("#relation-filter-alias");
      focused.focus();
      return {
        count: visible,
        checked: focused.checked,
        focus: document.activeElement === focused
      };
    });
    check(task, filtered.checked && filtered.count === 2 && filtered.focus,
      "combined CSS-only filters or keyboard focus failed", filtered);
    check(task, click(page, 'label[for="relation-filter-reserved"]'), "reserved filter is missing");
    var empty = page.evaluate(function () {
      return getComputedStyle(document.querySelector(".package-empty")).display !== "none";
    });
    check(task, empty, "no-match message is missing");
    check(task, click(page, ".package-filter-reset"), "filter reset is missing");
    var reset = page.evaluate(function () {
      var rows = document.querySelectorAll("tr.package-row");
      var visible = 0;
      for (var index = 0; index < rows.length; index++) {
        if (rows[index].getBoundingClientRect().height > 0) visible++;
      }
      return document.querySelector("#registry-filter-all").checked &&
        document.querySelector("#family-filter-all").checked &&
        document.querySelector("#relation-filter-all").checked && visible === rows.length;
    });
    check(task, reset, "native filter reset did not restore all entries");
  }
  done();
}

function next() {
  if (completed === tasks.length) {
    console.log("Old WebKit passed " + completed + " exported-page checks (" + system.os.name + ").");
    phantom.exit(0);
    return;
  }
  var task = tasks[completed];
  var page = webpage.create();
  // The Next.js bundles use newer syntax; this probe deliberately tests their static fallback.
  page.onError = function () {};
  // QtWebKit can stall on Bun's persistent connections when many pages are opened.
  page.customHeaders = { Connection: "close" };
  page.settings.resourceTimeout = 10000;
  page.onResourceTimeout = function (resource) {
    fail(task, "resource timed out", resource.url);
  };
  page.viewportSize = { width: task.width, height: 800 };
  page.open(origin + task.path, function (status) {
    check(task, status === "success", "could not load the exported page", status);
    verify(task, inspect(page));
    interact(task, page, function () {
      page.close();
      completed += 1;
      next();
    });
  });
}

if (!origin || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  console.error("A local export server URL is required.");
  phantom.exit(1);
} else {
  setTimeout(function () {
    console.error("Old WebKit probe timed out after " + completed + " checks.");
    phantom.exit(1);
  }, 90000);
  next();
}
