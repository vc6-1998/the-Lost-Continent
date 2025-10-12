


(function () {
  const SLOT_COUNT = 3;

  
  const modalOverlay = document.getElementById('custom-modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalButtons = document.getElementById('modal-buttons');

  
  function hideModal() {
    modalOverlay.classList.remove('visible');
  }

  
  function showCustomAlert(message, title = '提示') {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = ''; 

    const okButton = document.createElement('button');
    okButton.textContent = '确定';
    okButton.onclick = hideModal;
    
    modalButtons.appendChild(okButton);
    modalOverlay.classList.add('visible');
  }

  
  
  function showCustomConfirm(message, onConfirm, title = '请确认') {
    modalTitle.textContent = title;
    modalMessage.innerHTML = message; 
    modalButtons.innerHTML = ''; 

    const confirmButton = document.createElement('button');
    confirmButton.textContent = '确认';
    confirmButton.className = 'confirm-btn'; 
    confirmButton.onclick = () => {
        hideModal();
        if (typeof onConfirm === 'function') {
            onConfirm(); 
        }
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.onclick = hideModal;

    modalButtons.appendChild(cancelButton); 
    modalButtons.appendChild(confirmButton); 
    modalOverlay.classList.add('visible');
  }
  


  
  function getStepLabel(index) {
    try {
        const n = Number(index);
        const arr = (window.mainStoryElements || []);
        const total = Array.isArray(arr) ? arr.length : 0;
        if (!isFinite(n) || n < 0) return '未知位置';
        if (total === 0) return `#${n}`;
        if (n >= total) return `#${n}（超出当前版本，将从开头开始）`;
        const step = arr[n];
        if (!step) return `#${n}`;
        const basic = step.type ? `${step.type}` : 'step';
        return step.label ? step.label : `#${n} (${basic})`;
    } catch (e) {
        return `#${index}`;
    }
  }

  
  function renderSlots() {
    const root = document.getElementById('slots');
    const hint = document.getElementById('hint');
    if (!root) return;

    const user = SaveSystem.loadUser && SaveSystem.loadUser();
    const username = SaveSystem.getLoginUser && SaveSystem.getLoginUser();

    if (!username || !user) {
      if (hint) hint.textContent = '未检测到用户，请返回主菜单登录。';
    } else {
      if (hint) hint.textContent = `当前用户：${username}`;
    }

      const slots = SaveSystem.listSlots ? SaveSystem.listSlots(SLOT_COUNT) : new Array(SLOT_COUNT).fill({ hasData: false });


      root.innerHTML = '';
      for (let i = 0; i < SLOT_COUNT; i++) {
          const info = slots[i] || { slot: i, hasData: false, saveDate: '', storyNodeIndex: 0 };

          const card = document.createElement('div');
          card.className = 'card';

          const title = document.createElement('div');
          title.className = 'title';
          title.textContent = info.hasData ? `存档槽位 ${i + 1}` : '空的存档';
          card.appendChild(title);

          const meta = document.createElement('div');
          meta.className = 'meta';
          if (info.hasData) {
              const when = info.saveDate || '(未知时间)';
              const pos = (typeof info.storyNodeIndex === 'number') ? getStepLabel(info.storyNodeIndex) : '未知位置';
              meta.innerHTML = `游戏进度：${pos}<br>保存时间：${when}`;
          } else {
              meta.innerHTML = '这个槽位是空的，<br>可以在游戏中进行保存。';
          }
      card.appendChild(meta);
          if (info.hasData && typeof info.storyNodeIndex === 'number' && Array.isArray(window.mainStoryElements)) {
              const total = window.mainStoryElements.length;
              if (total > 0 && (info.storyNodeIndex < 0 || info.storyNodeIndex >= total)) {
                  const warn = document.createElement('div');
                  warn.className = 'meta';
                  warn.style.color = '#f4c542';
                  warn.style.marginTop = '8px';
                  warn.textContent = '提示：此存档位置已不在当前版本范围，读取后将从开头开始。';
                  card.appendChild(warn);
              }
          }

      const btns = document.createElement('div');
      btns.className = 'btns';
      const btnLoad = document.createElement('button');
      btnLoad.textContent = '读取';
          btnLoad.disabled = !info.hasData || !username;
      btnLoad.addEventListener('click', () => onLoad(i));
      const btnDelete = document.createElement('button');
      btnDelete.textContent = '删除';
          btnDelete.disabled = !info.hasData || !username;
      btnDelete.addEventListener('click', () => onDelete(i));
      btns.appendChild(btnLoad);
      btns.appendChild(btnDelete);
      card.appendChild(btns);
      root.appendChild(card);
    }
  }

  
    function onLoad(slotIndex) {
        try {
            const username = SaveSystem.getLoginUser && SaveSystem.getLoginUser();
            if (!username) {
                showCustomAlert('未登录，无法读取。');
                return;
            }
            if (!window.SaveSystem || typeof SaveSystem.read !== 'function') {
                showCustomAlert('读取失败：保存系统未加载。');
                return;
            }

            const save = SaveSystem.read(slotIndex);
            if (!save) {
                showCustomAlert('该槽位为空或存档损坏。');
                return;
            }

            
            const nodeIndex =
                (save && save.story && typeof save.story.nodeIndex === 'number')
                    ? save.story.nodeIndex
                    : 0;

            sessionStorage.setItem('resume', '1');
            sessionStorage.setItem('currentSaveData', JSON.stringify({ nodeId: nodeIndex }));

            
            sessionStorage.setItem('PENDING_SAVE', JSON.stringify(save));

            
            window.location.href = 'game.html';
        } catch (e) {
            console.warn('[load_page] onLoad error:', e);
            showCustomAlert('读取失败：发生异常。');
        }
    }

  
    function onDelete(slotIndex) {
        const message = `确定要删除 <strong>槽位 ${slotIndex + 1}</strong> 的存档吗？<br>此操作不可撤销。`;

        const deleteAction = () => {
            try {
                if (!window.SaveSystem || typeof SaveSystem._storageKey !== 'function') {
                    showCustomAlert('删除失败：保存系统未加载。');
                    return;
                }
                const key = SaveSystem._storageKey(slotIndex);
                localStorage.removeItem(key);
                renderSlots(); 
            } catch (e) {
                console.warn('[load_page] delete error:', e);
                showCustomAlert('删除失败：发生异常。');
            }
        };

        showCustomConfirm(message, deleteAction, '删除存档');
    }


  
  document.addEventListener('DOMContentLoaded', renderSlots);
})();