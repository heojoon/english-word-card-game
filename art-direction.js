(function () {
  'use strict';

  var names = {
    crystal: '01 · 크리스털 퀘스트',
    arcade: '02 · 아케이드 길드',
    storybook: '03 · 마법책 연대기'
  };
  var current = 'crystal';
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.concept-tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-concept-panel]'));
  var tableRows = Array.prototype.slice.call(document.querySelectorAll('.comparison .tr[data-concept]'));
  var selectedName = document.getElementById('selectedName');
  var savedMessage = document.getElementById('savedMessage');
  var selectButton = document.getElementById('selectButton');

  function show(key, scroll) {
    if (!names[key]) return;
    current = key;
    tabs.forEach(function (tab) {
      var active = tab.dataset.concept === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    panels.forEach(function (panel) {
      panel.classList.toggle('is-active', panel.dataset.conceptPanel === key);
    });
    selectedName.textContent = names[key];
    selectButton.classList.remove('saved');
    selectButton.textContent = '이 방향으로 선택';
    savedMessage.textContent = '카드를 비교한 뒤 방향을 확정해 주세요.';
    if (scroll) document.querySelector('.concept-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { show(tab.dataset.concept, false); });
  });
  tableRows.forEach(function (row) {
    row.addEventListener('click', function () { show(row.dataset.concept, true); });
  });
  selectButton.addEventListener('click', function () {
    localStorage.setItem('wordoria-art-direction', current);
    selectButton.classList.add('saved');
    selectButton.textContent = '✓ 선택 저장됨';
    savedMessage.textContent = names[current] + ' 방향이 이 브라우저에 저장되었습니다.';
  });

  var requested = new URLSearchParams(window.location.search).get('concept');
  var saved = localStorage.getItem('wordoria-art-direction');
  show(names[requested] ? requested : (names[saved] ? saved : current), false);
}());
