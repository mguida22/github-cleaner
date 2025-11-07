// GitHub PR Cleaner
// Hides any timeline/comment block whose text matches the phrase regex

(function () {
  const PHRASE_RE = /deployed\s+to/i;
  const HIDDEN_ATTR = "data-github-pr-cleaner-hidden";

  function shouldHide(el) {
    try {
      // Avoid re-checking nodes we've already processed
      if (el.getAttribute && el.getAttribute(HIDDEN_ATTR)) return false;
      const text = el.textContent || "";
      return PHRASE_RE.test(text);
    } catch (_) {
      return false;
    }
  }

  function hideNode(el) {
    el.style.display = "none";
    el.setAttribute && el.setAttribute(HIDDEN_ATTR, "true");
  }

  function queryCandidateBlocks(root = document) {
    // Cover common PR/issue/timeline containers on GitHub
    const selectors = [
      ".js-timeline-item",
      ".TimelineItem",
      ".TimelineItem-body",
    ];
    const context = root && root.querySelectorAll != null ? root : document;
    return context.querySelectorAll(selectors.join(","));
  }

  function sweep(root = document) {
    const blocks = queryCandidateBlocks(root);
    for (const el of blocks) {
      if (shouldHide(el)) hideNode(el);
    }
  }

  // Debounced mutation handling (GitHub is SPA-y and loads content lazily)
  let sweepScheduled = false;
  const scheduleSweep = () => {
    if (sweepScheduled) return;
    sweepScheduled = true;
    requestAnimationFrame(() => {
      sweep();
      sweepScheduled = false;
    });
  };

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "childList") {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          // Fast-path: check the node itself and its subtree lazily
          if (shouldHide(node)) hideNode(node);
        }
        scheduleSweep();
      } else if (m.type === "characterData") {
        scheduleSweep();
      }
    }
  });

  function init() {
    sweep();
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    // Re-scan on soft navigations (pjax/turbo-like)
    document.addEventListener("pjax:end", sweep);
    document.addEventListener("turbo:load", sweep);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
