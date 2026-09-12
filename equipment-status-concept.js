(() => {
  'use strict';

  const paths = {
    crown:'<path d="m3 7 4 4 5-7 5 7 4-4-3 13H6L3 7Z"/><path d="M6 16h12"/>',
    armor:'<path d="m8 3-5 4 3 5 2-1v10h8V11l2 1 3-5-5-4c0 4-8 4-8 0Z"/><path d="M12 8v13"/>',
    sword:'<path d="m14 3 7-1-1 7-11 11-5-5L14 3Z"/><path d="m3 13 8 8M4 18l-3 3"/>',
    cape:'<path d="M8 3h8l5 18-9-3-9 3L8 3Z"/><path d="M8 3c0 5 8 5 8 0"/>',
    aura:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
    pet:'<path d="M3 16c0-14 18-14 18 0 0 7-18 7-18 0Z"/><path d="M8 13v2m8-2v2m-6 2q2 2 4 0"/>',
    boots:'<path d="M5 3h6v10l4 2v5H3v-5l2-2V3Zm9 0h5v10l2 2v5h-7"/>',
    charm:'<path d="M12 3 8 8l4 4 4-4-4-5Zm0 9v9m-4-5h8"/>',
    home:'<path d="M3 10 12 3l9 7v10H5V10M9 20v-7h6v7"/>',
    gear:'<path d="m8 3-5 4 3 5 2-1v10h8V11l2 1 3-5-5-4c0 4-8 4-8 0Z"/>',
    battle:'<path d="m4 3 13 13M3 3l1 5 11 11 4-4L8 4 3 3Zm11 14 5 5m-5-1 7-7M21 3 9 15"/>',
    shop:'<path d="M3 9h18l-2-6H5L3 9Zm1 1v11h16V10M9 21v-7h6v7"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.aura}</svg>`;
  const items = [
    {id:'frostblade',name:'서리 결정검',slot:'weapon',filter:'weapon',icon:'sword',rarity:'epic',bonus:'ATK +8',equipped:true,desc:'정답 콤보가 이어질수록 검에 푸른 결정빛이 모여요.'},
    {id:'guardian',name:'수호자의 갑옷',slot:'body',filter:'armor',icon:'armor',rarity:'rare',bonus:'DEF +11',equipped:true,desc:'모험가의 방어력을 높여 주는 맑은 은빛 갑옷이에요.'},
    {id:'crown',name:'별빛 왕관',slot:'head',filter:'armor',icon:'crown',rarity:'rare',bonus:'LUK +2',equipped:true,desc:'보물상자에서 더 많은 크리스털을 발견할 행운을 줘요.'},
    {id:'boots',name:'질풍의 장화',slot:'body',filter:'armor',icon:'boots',rarity:'normal',bonus:'HP +12',equipped:false,desc:'가볍고 튼튼한 장화. 오래 탐험할 수 있도록 체력을 높여요.'},
    {id:'charm',name:'민트 기억 부적',slot:'aura',filter:'magic',icon:'charm',rarity:'epic',bonus:'MP +9',equipped:false,desc:'새 단어를 기억할 때마다 은은한 민트빛을 내는 부적이에요.'},
    {id:'cape',name:'용기의 망토',slot:'back',filter:'magic',icon:'cape',rarity:'normal',bonus:'DEF +4',equipped:false,desc:'다음 도전을 향해 나아갈 용기를 북돋아 주는 망토예요.'}
  ];
  const rarityName = {normal:'일반',rare:'레어',epic:'에픽'};
  const grid = document.getElementById('inventory-grid');
  const dialog = document.getElementById('item-dialog');
  const content = document.getElementById('dialog-content');
  const toast = document.getElementById('toast');
  let toastTimer;
  let filter = 'all';

  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = svg(el.dataset.icon); });
  document.querySelectorAll('[data-nav-icon]').forEach(el => { el.innerHTML = svg(el.dataset.navIcon); });

  function renderItems() {
    grid.innerHTML = items.filter(item => filter === 'all' || item.filter === filter).map(item => `
      <button class="item-card ${item.equipped ? 'equipped' : ''}" type="button" data-item="${item.id}" data-rarity="${item.rarity}">
        <span class="item-badge">${item.equipped ? '장착 중' : rarityName[item.rarity]}</span>
        <span class="item-art">${svg(item.icon)}</span>
        <h3>${item.name}</h3>
        <p><span>${item.slot === 'weapon' ? '무기' : item.slot === 'body' ? '방어구' : item.slot === 'head' ? '머리' : item.slot === 'back' ? '등' : '마법'}</span><b>${item.bonus}</b></p>
      </button>`).join('');
  }

  function syncSlots() {
    document.querySelectorAll('.gear-slot').forEach(slotButton => {
      const slot = slotButton.dataset.slot;
      const item = items.find(entry => entry.slot === slot && entry.equipped);
      if (slotButton.classList.contains('locked')) return;
      slotButton.classList.remove('rare', 'epic', 'empty');
      if (item) {
        slotButton.classList.add(item.rarity);
        slotButton.querySelector(':scope > span').outerHTML = `<span class="slot-icon" data-icon="${item.icon}">${svg(item.icon)}</span>`;
        slotButton.setAttribute('aria-label', `${slotButton.querySelector('small').textContent} 장비, ${item.name} 장착 중`);
      } else {
        slotButton.classList.add('empty');
        slotButton.querySelector(':scope > span').outerHTML = '<span class="plus">＋</span>';
        slotButton.setAttribute('aria-label', `${slotButton.querySelector('small').textContent} 장비 비어 있음`);
      }
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function showItem(item) {
    content.innerHTML = `
      <div class="dialog-kicker">${rarityName[item.rarity]} · ${item.slot.toUpperCase()}</div>
      <div class="dialog-item">${svg(item.icon)}</div>
      <h2>${item.name}</h2>
      <p class="dialog-desc">${item.desc}</p>
      <div class="compare"><span>${item.equipped ? '현재 적용 효과' : '장착 시 능력치 변화'}</span><b>${item.bonus}</b></div>
      <button class="equip-button" type="button" data-equip="${item.id}">${item.equipped ? '장착 해제' : '이 장비 장착하기'}</button>`;
    dialog.showModal();
  }

  renderItems();
  syncSlots();

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.filter) {
      filter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(tab => tab.setAttribute('aria-selected', String(tab === button)));
      renderItems();
    } else if (button.dataset.item) {
      showItem(items.find(item => item.id === button.dataset.item));
    } else if (button.dataset.slot) {
      const equipped = items.find(item => item.slot === button.dataset.slot && item.equipped);
      if (equipped) showItem(equipped);
      else showToast(button.classList.contains('locked') ? 'LV.15에 펫 슬롯이 열려요' : `${button.querySelector('small').textContent} 슬롯에 장비를 장착해 보세요`);
    } else if (button.dataset.equip) {
      const item = items.find(entry => entry.id === button.dataset.equip);
      const willEquip = !item.equipped;
      if (willEquip) items.filter(entry => entry.slot === item.slot).forEach(entry => { entry.equipped = false; });
      item.equipped = willEquip;
      dialog.close();
      renderItems();
      syncSlots();
      showToast(willEquip ? `${item.name} 장착 완료!` : `${item.name} 장착을 해제했어요`);
    } else if (button.hasAttribute('data-close')) {
      dialog.close();
    } else if (button.dataset.toast) {
      showToast(button.dataset.toast);
    }
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
})();
