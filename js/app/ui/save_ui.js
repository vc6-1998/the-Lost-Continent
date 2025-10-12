



(function () {
  let overlayOpen = false;

  
  function movementKey(code) {
    return (
      code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight' ||
      code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
      code === 'Space'
    );
  }

  function openOverlay() {
    const ov = document.getElementById('pauseOverlay');
    if (!ov) return;
    ov.style.display = 'flex';
    ov.setAttribute('aria-hidden', 'false');
    overlayOpen = true;
    
  }

  function closeOverlay() {
    const ov = document.getElementById('pauseOverlay');
    if (!ov) return;
    ov.style.display = 'none';
    ov.setAttribute('aria-hidden', 'true');
    overlayOpen = false;
    hideSlotPicker();
    setMsg('');
    
  }

  function toggleOverlay() {
    overlayOpen ? closeOverlay() : openOverlay();
  }

  function showSlotPicker() {
    const sp = document.getElementById('slotPicker');
    if (sp) sp.style.display = 'block';
  }
  function hideSlotPicker() {
    const sp = document.getElementById('slotPicker');
    if (sp) sp.style.display = 'none';
  }

  function setMsg(text) {
    const m = document.getElementById('saveMsg');
    if (m) m.textContent = text || '';
  }

  
  function saveToSlot(slotIndex) {
      try {
          const username = (window.SaveSystem && SaveSystem.getLoginUser) ? SaveSystem.getLoginUser() : null;
          if (!username) {
              alert('未登录，无法保存。请返回主菜单登录。');
              return;
          }

      if (!window.SaveSystem) {
        alert('保存系统未加载。');
        return;
      }
      
      if (!window.currentSaveData) {
        if (typeof Save === 'function') {
          window.currentSaveData = new Save();
          window.currentSaveData.nodeId = 0;
        } else {
          alert('缺少 Save 定义。');
          return;
        }
          }
          
          try {
              const mgr = window.__story && window.__story.cgManager;
              if (mgr && typeof mgr.exportSnapshot === 'function') {
                  const cgSnap = mgr.exportSnapshot(); 
                  if (cgSnap) {
                      window.currentSaveData = window.currentSaveData || {};
                      window.currentSaveData.cg = cgSnap;
                  }
              }
          } catch (e) {
              console.warn('[save_ui] export CG failed:', e);
          }

          const ok = SaveSystem.write(slotIndex); 
          if (ok) {
              const s = SaveSystem.read(slotIndex); 
              const when = s?.saveDate || '';
              const pos = (typeof s?.story?.nodeIndex === 'number') ? s.story.nodeIndex : '?';
              setMsg(`已保存到「槽位 ${slotIndex + 1}」\n时间：${when}\n位置索引：#${pos}`);
              hideSlotPicker();
          }
      }
     catch (e) {
      console.error(e);
      alert('保存失败：' + e.message);
    }
  }

  
  function initUI() {
    const btnSave = document.getElementById('btnSave');
    const btnLoad = document.getElementById('btnLoad');
    const btnHome = document.getElementById('btnHome');
    const btnResume = document.getElementById('btnResume');
    const btnCancelSlot = document.getElementById('btnCancelSlot');
    const overlay = document.getElementById('pauseOverlay');

      if (!overlay) return; 

      
      const username = (window.SaveSystem && SaveSystem.getLoginUser) ? SaveSystem.getLoginUser() : null;
      if (!username && btnSave) {
          btnSave.disabled = true;
          setMsg('未登录，无法保存。请返回主菜单登录。');
      }

      
      ['click', 'mousedown', 'mouseup'].forEach(evt => {
          overlay.addEventListener(evt, (ev) => {
              if (!overlayOpen) return;
              const inPanel = ev.target.closest('#pausePanel'); 
              if (!inPanel) {
                  ev.stopPropagation();
                  ev.preventDefault(); 
              }
          }, true); 
      });

      
      ['click', 'mousedown', 'mouseup'].forEach(evt => {
          overlay.addEventListener(evt, (ev) => {
              if (!overlayOpen) return;
              ev.stopPropagation(); 
          }, false); 
      });

      
      [btnSave, btnLoad, btnHome, btnResume, btnCancelSlot].forEach(b => {
          if (!b) return;
          b.addEventListener('click', (ev) => {
              ev.stopPropagation();
          });
      });

      btnSave && btnSave.addEventListener('click', () => {
          setMsg('');
          showSlotPicker();
      });
      btnLoad && btnLoad.addEventListener('click', () => {
          window.location.href = 'load.html';
      });
      


    btnSave && btnSave.addEventListener('click', () => {
      setMsg('');
      showSlotPicker();
    });
    btnLoad && btnLoad.addEventListener('click', () => {
      window.location.href = 'load.html';
    });
    btnHome && btnHome.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    btnResume && btnResume.addEventListener('click', () => {
      closeOverlay();
    });
    btnCancelSlot && btnCancelSlot.addEventListener('click', () => {
      hideSlotPicker();
    });

    
    const sp = document.getElementById('slotPicker');
    if (sp) {
      sp.querySelectorAll('button[data-slot]').forEach(btn => {
        btn.addEventListener('click', () => {
          const slot = Number(btn.getAttribute('data-slot'));
          saveToSlot(slot);
        });
      });
    }


      
      function handleKeyEvent(ev) {
          
          if (ev.type === 'keydown' && ev.key === 'Escape') {
              ev.preventDefault();
              ev.stopPropagation();
              toggleOverlay();
              return;
          }

          if (!overlayOpen) return;

          const k = (ev.key || '').toLowerCase();
          const code = ev.code || '';

          
          if (k === 's') {
              ev.preventDefault();
              ev.stopPropagation();
              
              if (ev.type === 'keydown') { setMsg(''); showSlotPicker(); }
              return;
          }
          if (k === 'l') {
              ev.preventDefault();
              ev.stopPropagation();
              if (ev.type === 'keydown') { window.location.href = 'load.html'; }
              return;
          }
          if (k === 'm') {
              ev.preventDefault();
              ev.stopPropagation();
              if (ev.type === 'keydown') { window.location.href = 'index.html'; }
              return;
          }

          
          if (movementKey(code)) {
              ev.preventDefault();
              ev.stopPropagation();
              return;
          }
      }

      
      ['keydown', 'keyup', 'keypress'].forEach(type => {
          document.addEventListener(type, handleKeyEvent, true);
      });

  }

  document.addEventListener('DOMContentLoaded', initUI);

  
  window.SaveUI = {
    open: openOverlay,
    close: closeOverlay,
    saveToSlot,
  };
})();
