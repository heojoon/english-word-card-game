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
  const itemArt = item => {
    if (item.art) return `<img src="${item.art}" alt="${item.name} 아이템 아트">`;
    if (!item.id.startsWith('dawn-')) return svg(item.icon);
    const gradientId = `blade-${item.id}`;
    return `<svg class="crystal-blade" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--blade-light)"/><stop offset=".48" stop-color="var(--blade-mid)"/><stop offset="1" stop-color="var(--blade-deep)"/>
        </linearGradient>
      </defs>
      <g class="orbit">
        <circle cx="60" cy="54" r="42"/><path d="M16 54h8M96 54h8M60 10v8M60 90v8"/>
        <circle class="orbit-gem gem-one" cx="21" cy="38" r="4"/><circle class="orbit-gem gem-two" cx="99" cy="70" r="5"/>
      </g>
      <g class="rays"><path d="m60 3 4 13-4 6-4-6 4-13ZM106 37l-11 8-7-1 4-6 14-1ZM15 84l12-6 7 2-5 6-14-2Z"/></g>
      <g class="blade">
        <path class="blade-body" fill="url(#${gradientId})" d="M83 12 70 60 55 75 45 65l15-15 23-38Z"/>
        <path class="blade-facet" d="m83 12-23 38 10 10 13-48ZM60 50l-5 25-10-10 15-15Z"/>
        <path class="blade-ridge" d="M81 15 61 52 48 65"/>
        <path class="guard" d="m39 59 9-9 22 22-9 9-5-8-9 5-8-19Z"/>
        <path class="grip" d="m44 75 7 7-17 24-9-9 19-22Z"/>
        <path class="pommel" d="m26 94 11 11-7 5-9-9 5-7Z"/>
        <path class="crystal core" d="m61 58 7 7-6 10-9-9 8-8Z"/>
        <path class="crystal side-crystal left" d="m42 54-3-12 10 7-7 5Z"/>
        <path class="crystal side-crystal right" d="m73 72 12 3-8-10-4 7Z"/>
        <path class="wing wing-left" d="M38 55 19 42l8 19 12 5Z"/>
        <path class="wing wing-right" d="m73 73 19 13-8-19-12-5Z"/>
        <circle class="legend-gem" cx="60" cy="65" r="5"/>
      </g>
      <g class="sparkles"><path d="m91 24 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5ZM26 72l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z"/></g>
    </svg>`;
  };
  const items = [
    {id:'dawn-4',name:'새벽 결정검',slot:'weapon',icon:'sword',rarity:'unique',stars:4,stat:'ATK',value:16,equipped:true,art:'assets/items/equipment/item_dawn_crystal_sword_unique.webp',desc:'수정 날개와 공명환이 펼쳐지는 유일한 형태의 결정검이에요.'},
    {id:'guardian',name:'수호자의 갑옷',slot:'body',icon:'armor',rarity:'rare',stars:3,stat:'DEF',value:11,equipped:true,art:'assets/items/equipment/item_guardian_crystal_armor_rare.webp',desc:'모험가의 방어력을 높여 주는 맑은 은빛 갑옷이에요.'},
    {id:'crown',name:'별빛 왕관',slot:'head',icon:'crown',rarity:'legendary',stars:5,stat:'LUK',value:8,equipped:true,art:'assets/items/equipment/item_starlight_crown_legendary.webp',desc:'다섯 별의 축복으로 보물 발견 확률을 크게 높이는 왕관이에요.'},
    {id:'boots',name:'질풍의 장화',slot:'body',icon:'boots',rarity:'normal',stars:1,stat:'HP',value:12,equipped:false,art:'assets/items/equipment/item_gale_boots_normal.webp',desc:'가볍고 튼튼한 기본 장화. 오래 탐험할 수 있도록 체력을 높여요.'},
    {id:'charm',name:'민트 기억 부적',slot:'aura',icon:'charm',rarity:'special',stars:2,stat:'MP',value:9,equipped:false,art:'assets/items/equipment/item_mint_memory_charm_special.webp',desc:'새 단어를 기억할 때마다 은은한 민트빛을 내는 특별한 부적이에요.'},
    {id:'cape',name:'용기의 망토',slot:'back',icon:'cape',rarity:'rare',stars:3,stat:'DEF',value:7,equipped:false,art:'assets/items/equipment/item_courage_cape_rare.webp',desc:'다음 도전을 향해 나아갈 용기를 북돋아 주는 희귀 망토예요.'}
  ];
  const rarityName = {normal:'일반',special:'스페셜',rare:'레어',unique:'유니크',legendary:'레전더리'};
  const slotName = {head:'HEAD',body:'BODY',weapon:'WEAPON',back:'BACK',aura:'AURA',pet:'PET'};
  const grid = document.getElementById('inventory-grid');
  const dialog = document.getElementById('item-dialog');
  const content = document.getElementById('dialog-content');
  const toast = document.getElementById('toast');
  let toastTimer;

  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = svg(el.dataset.icon); });
  document.querySelectorAll('[data-nav-icon]').forEach(el => { el.innerHTML = svg(el.dataset.navIcon); });

  function renderItems() {
    grid.innerHTML = items.map(item => `
      <button class="item-card ${item.equipped ? 'equipped' : ''}" type="button" data-item="${item.id}" data-rarity="${item.rarity}">
        <span class="item-badge">${rarityName[item.rarity]}</span>
        ${item.equipped ? '<span class="equipped-badge">장착 중</span>' : ''}
        <span class="item-art"><i class="art-halo"></i>${itemArt(item)}</span>
        <span class="star-rating" aria-label="${item.stars}성 등급">${'★'.repeat(item.stars)}</span>
        <h3>${item.name}</h3>
        <p><span>능력치</span><b>${item.stat} +${item.value}</b></p>
      </button>`).join('');
  }

  function syncSlots() {
    document.querySelectorAll('.gear-slot').forEach(slotButton => {
      const slot = slotButton.dataset.slot;
      const item = items.find(entry => entry.slot === slot && entry.equipped);
      if (slotButton.classList.contains('locked')) return;
      slotButton.classList.remove('normal', 'special', 'rare', 'unique', 'legendary', 'empty');
      if (item) {
        slotButton.classList.add(item.rarity);
        slotButton.querySelector(':scope > span').outerHTML = `<span class="slot-icon" data-icon="${item.icon}">${svg(item.icon)}</span>`;
        slotButton.setAttribute('aria-label', `${slotButton.querySelector('small').textContent} 장비, ${rarityName[item.rarity]} ${item.name} 장착 중`);
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
      <div class="dialog-kicker">${rarityName[item.rarity]} · ${item.stars} STAR · ${slotName[item.slot]}</div>
      <div class="dialog-item" data-rarity="${item.rarity}"><i class="art-halo"></i>${itemArt(item)}</div>
      <div class="dialog-stars" aria-label="${item.stars}성 등급">${'★'.repeat(item.stars)}</div>
      <h2>${item.name}</h2>
      <p class="dialog-desc">${item.desc}</p>
      <div class="compare"><span>${item.equipped ? '현재 적용 능력치' : '장착 시 능력치'}</span><b>${item.stat} +${item.value}</b></div>
      <button class="equip-button" type="button" data-equip="${item.id}">${item.equipped ? '장착 해제' : '이 장비 장착하기'}</button>`;
    dialog.showModal();
  }

  renderItems();
  syncSlots();

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.item) {
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
