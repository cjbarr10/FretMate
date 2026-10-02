// Boot, tab routing and the one render pass.
//
// There is no virtual DOM here: any state change rebuilds the active tab from
// scratch. These views are small enough that it's imperceptible, and it means a
// tab is always a plain function of the store rather than a pile of update
// rules. The metronome is the single exception — it paints its own beat dots so
// a running click never depends on a re-render.

// IIFE (immediately-invoked function expression). The bottom line creates
// window.FM if no earlier script has, then calls this function with it, so `FM`
// in here IS the one shared namespace object. Everything declared inside stays
// private unless explicitly attached to FM.
(function (FM) {
  // Opt into strict mode: typos become errors instead of silently creating
  // globals. Scoped to this function, so it can't affect other files.
  'use strict';

  // The tab bar, in display order. `key` doubles as the URL hash (#chords) and
  // as the lookup into FM.tabs, so adding a tab means adding an entry here and
  // registering FM.tabs.<key> = { render } in its own file.
  var TABS = [
    { key: 'chords', label: 'Chords' },
    { key: 'scales', label: 'Scales' },
    { key: 'metronome', label: 'Metronome' },
    { key: 'settings', label: 'Settings' },
  ];

  // --- module state ---------------------------------------------------------
  // These three live for the lifetime of the page. They're module-private:
  // nothing outside this file can read or write them.

  // Which tab is showing. Overwritten from the URL hash in init().
  var current = TABS[0].key;

  // key -> the <button> element for that tab, so paintTabBar() can flip classes
  // without touching the DOM again. Filled once, in buildTabBar().
  var tabNodes = {};

  // The <main id="view"> element every tab renders into. Null until init() runs,
  // because the DOM doesn't exist yet while the scripts are being parsed.
  var view = null;

  /**
   * Is this string one of our tab keys?
   * Guards against junk in the URL hash — someone could type #banana.
   *
   * @param {string} key
   * @returns {boolean}
   */
  function isTab(key) {
    // .some() returns true as soon as any element matches.
    return TABS.some(function (t) {
      return t.key === key;
    });
  }

  /**
   * Read the current tab out of the URL, falling back to the first tab.
   * The hash is the single source of truth for routing, so this is the only
   * place that decides which tab "should" be showing.
   *
   * @returns {string} a valid tab key, never garbage
   */
  function fromHash() {
    // location.hash includes the leading '#', so strip it: '#scales' -> 'scales'
    var key = window.location.hash.replace(/^#/, '');
    if (isTab(key)) return key;
    return TABS[0].key; // no hash, or an unknown one -> Chords
  }

  /**
   * Navigate to a tab. This is the public way to change tabs — the tab buttons
   * use it, and so does the Scales tab when it sends you to a chord.
   *
   * Note it does NOT render anything itself.
   *
   * @param {string} key one of the TABS keys, e.g. 'chords'
   */
  function goTo(key) {
    // writing the hash fires hashchange, which is what actually re-renders —
    // so back/forward and a pasted #scales link all take the same path
    window.location.hash = key;
  }

  /**
   * Push the saved theme onto the <html> element as data-theme="dark" | "light".
   * The CSS keys all its colour variables off that attribute, so this one line
   * reskins the entire app.
   */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', FM.store.state.settings.themeMode);
  }

  /**
   * Highlight the active tab button and clear the other three.
   *
   * This is the one bit of UI that is NOT torn down and rebuilt: the tab
   * buttons are created once in buildTabBar() and then mutated in place, so
   * their click listeners survive and the bar never flickers.
   */
  function paintTabBar() {
    TABS.forEach(function (t) {
      if (current === t.key) {
        tabNodes[t.key].classList.add('is-active');       // CSS hook
        tabNodes[t.key].setAttribute('aria-current', 'page'); // screen readers
      } else {
        tabNodes[t.key].classList.remove('is-active');
        tabNodes[t.key].removeAttribute('aria-current');
      }
    });
  }

  /**
   * The single render pass. Wipes <main id="view"> and asks the active tab to
   * rebuild its entire contents from the current store state.
   *
   * Called on boot, on every tab change, and — via the store subscription in
   * init() — after literally any state change. That's the whole update model:
   * there is no partial update path, so a tab's output is always a pure
   * function of the store.
   */
  function rerender() {
    applyTheme();     // theme may have changed in Settings
    paintTabBar();    // active tab may have changed
    FM.ui.clear(view);                 // remove every child of <main>
    FM.tabs[current].render(view);     // hand the empty <main> to the tab
  }

  /**
   * hashchange handler — fires on tab clicks (because goTo writes the hash),
   * on browser back/forward, and on a pasted deep link.
   */
  function onHashChange() {
    var next = fromHash();
    // Guard against redundant work: the hash can change to the same value, and
    // a re-render here would throw away scroll position for nothing.
    if (next === current) return;
    current = next;
    window.scrollTo(0, 0); // new tab starts at the top
    rerender();
  }

  /**
   * Build the four tab buttons into <nav id="tabs">. Runs exactly once.
   * After this, tabNodes holds every button so paintTabBar() can restyle them
   * without rebuilding or re-binding anything.
   */
  function buildTabBar() {
    var nav = document.getElementById('tabs'); // the empty <nav> from index.html
    TABS.forEach(function (t) {
      // h('button.tab', label) => <button class="tab">Chords</button>, detached.
      var node = FM.ui.h('button.tab', t.label);
      node.type = 'button'; // without this a <button> defaults to submit
      node.addEventListener('click', function () {
        // closure: each listener captures its own `t`
        goTo(t.key);
      });
      tabNodes[t.key] = node; // remember it for paintTabBar()
      nav.appendChild(node);  // attach to the live DOM -> now on screen
    });
  }

  /**
   * Boot. Called at the bottom of this file, which is the last script in
   * index.html — so by now every other file has registered its piece on FM and
   * the DOM is fully parsed.
   */
  function init() {
    view = document.getElementById('view'); // live handle to <main id="view">
    buildTabBar();
    current = fromHash();                   // honour a deep link like /#scales
    window.addEventListener('hashchange', onHashChange);
    // Wire the store to the renderer: any action that calls update() in
    // store.js ends up calling rerender() here. This is the whole data flow.
    FM.store.subscribe(rerender);
    rerender();                             // first paint
  }

  // Public surface. Other files call FM.app.goTo() to switch tabs, and
  // FM.app.rerender() to force a repaint outside the normal store flow.
  FM.app = { goTo: goTo, rerender: rerender };

  init();

  // Create-or-reuse the namespace, then run everything above with it.
})((window.FM = window.FM || {}));
