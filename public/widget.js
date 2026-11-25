/*! GODA.Frame embed widget — https://goda.media
 * Usage (inline):  <div data-goda-frame="your-slug" data-height="720"></div>
 * Usage (button):  <div data-goda-frame="your-slug" data-mode="button" data-label="Tạo avatar ngay"></div>
 *                  <script src="https://YOUR-APP/widget.js" async></script>
 * or put data-campaign on the script tag itself to render right where the script is.
 */
(function () {
  if (window.__godaFrameWidget) return window.__godaFrameWidget.scan();
  var script = document.currentScript;
  var ORIGIN = (function () {
    try { return new URL(script && script.src ? script.src : location.href).origin; } catch (e) { return ""; }
  })();

  function frameSrc(slug, src) {
    return ORIGIN + "/embed/" + encodeURIComponent(slug) + "?src=" + encodeURIComponent(src || "embed:" + location.hostname);
  }

  function iframe(slug, el) {
    var f = document.createElement("iframe");
    f.src = frameSrc(slug, el.getAttribute("data-source"));
    f.title = el.getAttribute("data-title") || "GODA.Frame";
    f.loading = "lazy";
    f.allow = "clipboard-write; web-share; camera";
    f.style.cssText = "display:block;width:100%;border:0;background:transparent;";
    return f;
  }

  function inline(el, slug) {
    var h = Math.max(520, parseInt(el.getAttribute("data-height") || "720", 10));
    var f = iframe(slug, el);
    f.style.height = h + "px";
    f.style.borderRadius = (el.getAttribute("data-radius") || "16") + "px";
    el.appendChild(f);
  }

  var modal;
  function openModal(slug, el) {
    if (modal) modal.remove();
    modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,10,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;";
    var box = document.createElement("div");
    var mobile = window.innerWidth < 640;
    box.style.cssText = "position:relative;background:#fff;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35);" +
      (mobile ? "width:100%;height:100%;" : "width:min(1180px,94vw);height:min(820px,92vh);border-radius:20px;");
    var f = iframe(slug, el);
    f.style.height = "100%";
    var x = document.createElement("button");
    x.type = "button";
    x.setAttribute("aria-label", "Đóng");
    x.innerHTML = "&times;";
    x.style.cssText = "position:absolute;top:10px;right:10px;z-index:2;width:36px;height:36px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font:600 22px/36px system-ui;cursor:pointer;";
    x.onclick = close;
    box.appendChild(f);
    box.appendChild(x);
    modal.appendChild(box);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    document.addEventListener("keydown", esc);
    document.body.appendChild(modal);
    document.documentElement.style.overflow = "hidden";
  }
  function esc(e) { if (e.key === "Escape") close(); }
  function close() {
    if (modal) modal.remove();
    modal = null;
    document.removeEventListener("keydown", esc);
    document.documentElement.style.overflow = "";
  }

  function button(el, slug) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = el.getAttribute("data-label") || "Tạo avatar của bạn";
    var color = el.getAttribute("data-color") || "#FF5A1F";
    b.style.cssText = "display:inline-flex;align-items:center;gap:8px;padding:14px 22px;border:0;border-radius:14px;background:" + color +
      ";color:#fff;font:600 15px/1 system-ui,-apple-system,sans-serif;cursor:pointer;box-shadow:0 10px 24px -10px " + color + ";";
    b.onclick = function () { openModal(slug, el); };
    el.appendChild(b);
  }

  function mount(el) {
    if (el.__goda) return;
    el.__goda = true;
    var slug = el.getAttribute("data-goda-frame") || el.getAttribute("data-campaign");
    if (!slug) return;
    (el.getAttribute("data-mode") === "button" ? button : inline)(el, slug);
  }

  function scan() {
    var nodes = document.querySelectorAll("[data-goda-frame]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  // <script data-campaign="slug"> renders in place
  if (script && script.getAttribute("data-campaign")) {
    var host = document.createElement("div");
    ["data-campaign", "data-mode", "data-height", "data-label", "data-color", "data-radius", "data-source", "data-title"].forEach(function (a) {
      if (script.hasAttribute(a)) host.setAttribute(a === "data-campaign" ? "data-goda-frame" : a, script.getAttribute(a));
    });
    script.parentNode.insertBefore(host, script);
  }

  window.__godaFrameWidget = { scan: scan, open: function (slug) { openModal(slug, document.createElement("div")); }, close: close };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
