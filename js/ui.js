// Small DOM helpers. Elements are built with createElement rather than HTML
// strings so every value is set as text and can never be parsed as markup.
(function (FM) {
  'use strict';

  // h('div.card', 'text') / h('div', child, child) — the tag may carry
  // dot-separated classes, which is most of what these views need.
  function h(spec, content) {
    var parts = spec.split('.');
    var node = document.createElement(parts[0]);
    for (var i = 1; i < parts.length; i++) node.classList.add(parts[i]);

    var rest = Array.prototype.slice.call(arguments, 1);
    rest.forEach(function (item) {
      append(node, item);
    });
    return node;
  }

  function append(node, item) {
    if (item === null || item === undefined || item === false) return;
    if (Array.isArray(item)) {
      item.forEach(function (sub) {
        append(node, sub);
      });
      return;
    }
    if (typeof item === 'string' || typeof item === 'number') {
      node.appendChild(document.createTextNode(String(item)));
      return;
    }
    node.appendChild(item);
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // An uppercase label above a group of controls.
  function sectionLabel(text) {
    return h('h2.section-label', text);
  }

  // A selectable pill. `variant` picks which accent fills it when active.
  function chip(label, active, onClick, variant) {
    var node = h('button.chip', label);
    node.type = 'button';
    if (active) node.classList.add('is-active');
    if (variant) node.classList.add('chip--' + variant);
    node.addEventListener('click', onClick);
    return node;
  }

  // The chunkier button with the 3D bottom edge, carried over from the app.
  function button(label, options) {
    var opts = options || {};
    var node = h('button.btn', label);
    node.type = 'button';
    if (opts.active) node.classList.add('is-active');
    if (opts.variant) node.classList.add('btn--' + opts.variant);
    if (opts.className) node.classList.add(opts.className);
    if (opts.onClick) node.addEventListener('click', opts.onClick);
    return node;
  }

  // A horizontal row of chips built from a list of options.
  function chipRow(items, isActive, onSelect, variant) {
    var row = h('div.chip-row');
    items.forEach(function (item) {
      row.appendChild(
        chip(item.label, isActive(item), function () {
          onSelect(item);
        }, variant)
      );
    });
    return row;
  }

  FM.ui = {
    h: h,
    clear: clear,
    sectionLabel: sectionLabel,
    chip: chip,
    chipRow: chipRow,
    button: button,
  };
})((window.FM = window.FM || {}));
