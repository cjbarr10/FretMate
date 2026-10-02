// Settings tab: the three choices that change what the other tabs draw.
(function (FM) {
  'use strict';

  var ui = FM.ui;
  var h = ui.h;

  var FRET_OPTIONS = [15, 18, 22];
  var TUNING_OPTIONS = ['standard', 'dropD', 'openG'];

  function buttonRow(items) {
    var row = h('div.btn-row');
    items.forEach(function (node) {
      row.appendChild(node);
    });
    return row;
  }

  function render(root) {
    var s = FM.store.state.settings;
    var actions = FM.store.settings;

    root.appendChild(h('header.page-head', h('h1.page-title', 'Settings')));

    var panel = h('section.panel');

    panel.appendChild(ui.sectionLabel('Tuning'));
    panel.appendChild(
      buttonRow(
        TUNING_OPTIONS.map(function (key) {
          return ui.button(FM.TUNINGS[key].label, {
            active: s.tuning === key,
            onClick: function () {
              actions.setTuning(key);
            },
          });
        })
      )
    );

    panel.appendChild(ui.sectionLabel('Frets displayed'));
    panel.appendChild(
      buttonRow(
        FRET_OPTIONS.map(function (n) {
          return ui.button(String(n), {
            active: s.frets === n,
            onClick: function () {
              actions.setFrets(n);
            },
          });
        })
      )
    );

    panel.appendChild(ui.sectionLabel('Theme'));
    panel.appendChild(
      buttonRow([
        ui.button('Dark', {
          active: s.themeMode === 'dark',
          onClick: function () {
            actions.setThemeMode('dark');
          },
        }),
        ui.button('Light', {
          active: s.themeMode === 'light',
          onClick: function () {
            actions.setThemeMode('light');
          },
        }),
      ])
    );

    root.appendChild(panel);

    root.appendChild(
      h('p.hint',
        'Tuning and fret count change every fretboard in the app. Choices are ' +
          'saved in this browser.')
    );
  }

  FM.tabs = FM.tabs || {};
  FM.tabs.settings = { render: render };
})((window.FM = window.FM || {}));
