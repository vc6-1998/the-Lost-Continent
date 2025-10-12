





const SAVE_SCHEMA_VERSION = 1;

function formatSaveTimeForDisplay(ts) {
    try {
        const d = new Date(ts);
        if (!isFinite(d)) return '';
        return new Intl.DateTimeFormat('zh-CN', {
            timeZone: 'Asia/Shanghai',           
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).format(d);
    } catch {
        return '';
    }
}

function _getAudioSnapshot() {
    try {
        const S = window.GameAudio?._state;
        return {
            bgm: S?.bgmName || null,
            master: S?.volumes?.master ?? 1,
            bgmVol: S?.volumes?.bgm ?? 0.65,
            seVol: S?.volumes?.se ?? 0.9,
            muted: !!S?.muted,
            ducking: typeof S?.ducking === 'number' ? S.ducking : 1
        };
    } catch { return null; }
}


function _restoreAudioFromSnapshot(save) {
    try {
        if (!save || !save.audio || !window.GameAudio) return;
        const a = save.audio;

        
        GameAudio.setVolume({
            master: Number.isFinite(a.master) ? a.master : 1,
            bgm: Number.isFinite(a.bgmVol) ? a.bgmVol : 0.65,
            se: Number.isFinite(a.seVol) ? a.seVol : 0.9
        });
        GameAudio.mute(!!a.muted);

        
        if (a.bgm) {
            GameAudio.setBGM(a.bgm, { loop: true, fade: 0, volume: a.bgmVol ?? 0.65 });
        } else {
            GameAudio.stopBGM({ fade: 0 });
        }

        
        if (typeof a.ducking === 'number' && a.ducking !== 1) {
            GameAudio.unduck();
        }
    } catch { }
}


function getTime(){
    var time=new Date();
	  time.setHours(time.getHours()+8);
    time=time.toISOString().replace('T',' ').substring(0, 19);
	  return time;
}

function clampIndex(n) {
    n = Number(n);
    if (!isFinite(n) || n < 0) return 0;
    return Math.floor(n);
}
function ensureLoggedIn() {
    const u = sessionStorage.getItem('loginUser');
    return (u && typeof u === 'string') ? u : null;
}
function safeSetItem(storage, key, val) {
    try {
        storage.setItem(key, val);
        return true;
    } catch (e) {
        console.error('Storage write failed:', e);
        alert('保存失败：浏览器本地存储不可用或空间不足。\n建议释放存储空间或关闭隐身模式后重试。');
        return false;
    }
}
function sanitizeSaveObject(obj) {
    if (typeof Save === 'function') obj = new Save(obj || {});
    obj.nodeId = clampIndex(obj.nodeId);
    
    obj.virtue = Number(obj.virtue) || 0;
    obj.history = Number(obj.history) || 0;
    if (!Array.isArray(obj.flags)) {
        obj.flags = [];
    }
    
    if (!obj.cg || typeof obj.cg !== 'object') {
        obj.cg = null;
    } else {
        const src = obj.cg;
        obj.cg = {
            visible: !!src.visible,
            image: (src.image && src.image.src) ? { src: String(src.image.src) } : null,
            text: src.text || ''
        };
    }

    
    return obj;
}


(function () {

  function getLoginUser() {
    return sessionStorage.getItem("loginUser") || null;
  }

  function loadUser() {
    const username = getLoginUser();
    if (!username) return null;
    const raw = localStorage.getItem(username);
    if (!raw) return null;

    
    const obj = JSON.parse(raw);
    if (typeof cUser === "function") {
      return new cUser(obj.username || username, obj.password || "", obj);
    }
    return obj;
  }

  function persistUser(user) {
    if (!user || !user.username) return false;
    localStorage.setItem(user.username, JSON.stringify(user));
    return true;
  }

  const SaveSystem = {
    
    getSaves() {
      const user = loadUser();
      const res = [null, null, null];
      if (!user || !Array.isArray(user.saveArray)) return res;
      for (let i = 0; i < 3; i++) res[i] = user.saveArray[i] || null;
      return res;
    },
    writeSave(slot) {
        slot = Number(slot);
        if (!(slot >= 0 && slot <= 2)) {
            alert("保存失败：槽位必须是 0、1 或 2");
            return false;
        }
        const username = ensureLoggedIn();
        if (!username) {
            alert("请先登录后再保存。");
            return false;
        }
        let user = loadUser();
        if (!user) {
            alert("未找到当前用户，请先注册/登录。");
            return false;
        }

        
        
        let src;
        if (window.currentSaveData) {
            src = sanitizeSaveObject(window.currentSaveData);
        } else if (sessionStorage.getItem("currentSaveData")) {
            src = sanitizeSaveObject(JSON.parse(sessionStorage.getItem("currentSaveData")));
        } else {
            src = sanitizeSaveObject({});
        }
        src.saveDate = getTime();
        src.audio = _getAudioSnapshot();

        if (!Array.isArray(user.saveArray)) user.saveArray = [];
        user.saveArray[slot] = src;

        const ok = safeSetItem(localStorage, username, JSON.stringify(user));
        if (!ok) return false;

        safeSetItem(sessionStorage, "currentSaveData", JSON.stringify(src));
        console.log('存档成功:', src); 
        return true;
    },

    
    applySaveToSession(save) { /* ... */ },

    
    markStepComplete(nextIndex) {
        if (typeof Save !== "function") {
            console.warn("缺少 Save 类，无法更新当前进度。");
            return 0;
        }
        if (!window.currentSaveData) window.currentSaveData = new Save();
        window.currentSaveData.nodeId = clampIndex(nextIndex);
        return window.currentSaveData.nodeId;
    },


    
      applySaveToSession(save) {
          if (!save) {
              alert("选择的存档为空。");
              return false;
          }
          const s = sanitizeSaveObject(save);
          const ok1 = safeSetItem(sessionStorage, "currentSaveData", JSON.stringify(s));
          const ok2 = safeSetItem(sessionStorage, "resume", "1");
          return ok1 && ok2;
      },


    
      markStepComplete(nextIndex) {
          if (typeof Save !== "function") {
              console.warn("缺少 Save 类，无法更新当前进度。");
              return 0;
          }
          if (!window.currentSaveData) window.currentSaveData = new Save();
          window.currentSaveData.nodeId = clampIndex(nextIndex);
          return window.currentSaveData.nodeId;
        },
        updateGameState(updates) {
            if (!window.currentSaveData) {
                console.error("无法更新状态：currentSaveData 不存在。");
                return;
            }
            if (updates.virtue) {
                window.currentSaveData.virtue += Number(updates.virtue) || 0;
            }
            if (updates.history) {
                window.currentSaveData.history += Number(updates.history) || 0;
            }
            console.log(`GameState Updated: Virtue=${window.currentSaveData.virtue}, History=${window.currentSaveData.history}`);
        },
        addFlag(flag) {
            if (!window.currentSaveData) {
                console.error("SaveSystem Error: currentSaveData is not initialized.");
                return;
            }
            
            const flagSet = new Set(window.currentSaveData.flags);
            if (!flagSet.has(flag)) {
                flagSet.add(flag);
                
                window.currentSaveData.flags = Array.from(flagSet);
                console.log(`Flag Added: ${flag}`, 'Current Flags:', window.currentSaveData.flags);
            }
        },
        removeFlag(flag) {
             if (!window.currentSaveData) return;
             const flagSet = new Set(window.currentSaveData.flags);
             if (flagSet.has(flag)) {
                 flagSet.delete(flag);
                 window.currentSaveData.flags = Array.from(flagSet);
                 console.log(`Flag Removed: ${flag}`, 'Current Flags:', window.currentSaveData.flags);
             }
        },
        hasFlag(flag) {
            if (!window.currentSaveData) return false;
            
            const flagSet = new Set(window.currentSaveData.flags);
            return flagSet.has(flag);
        },
        getGameState() {
            if (window.currentSaveData) {
                return {
                    virtue: window.currentSaveData.virtue,
                    history: window.currentSaveData.history,
                    flags: window.currentSaveData.flags,
                };
            }
            return { virtue: 0, history: 0, flags: [] };
        },


      getInventory() {
        if (window.currentSaveData && Array.isArray(window.currentSaveData.inventory)) {
            return window.currentSaveData.inventory;
        }
        return []; 
    },

 
    addItem(item) {
        if (!window.currentSaveData) {
            console.error("无法添加物品：当前游戏进度 (currentSaveData) 不存在。");
            return;
        }
        if (!Array.isArray(window.currentSaveData.inventory)) {
            window.currentSaveData.inventory = [];
        }
        window.currentSaveData.inventory.push(item);
        console.log("物品已添加:", item, "当前背包:", window.currentSaveData.inventory);
    },

    removeItem(item) {
        if (!window.currentSaveData || !Array.isArray(window.currentSaveData.inventory)) {
            console.error("无法移除物品：背包不存在。");
            return false;
        }
        const index = window.currentSaveData.inventory.indexOf(item);
        if (index > -1) {
            window.currentSaveData.inventory.splice(index, 1);
            console.log("物品已移除:", item, "当前背包:", window.currentSaveData.inventory);
            return true;
        }
        return false;
    },


    
    getLoginUser() {
      return getLoginUser();
    },

    
    loadUser() {
      return loadUser();
      },

      /**
 * 组装一个完整的保存快照（不落盘）
 * @param {number|string} slot 槽位号（仅用于记录在快照中显示）
 * @returns {object} save 快照对象
 *
 * 结构示例：
 * {
 *   schemaVersion: 1,
 *   slot: 1,
 *   saveDate: '2025-09-08T14:23:11.123Z',
 *   story: { nodeIndex: 17 },
 *   maps: { stack: [ { mapName, player:{col,row,dir}, completedInteractions:[...] }, ... ] },
 *   inventory: [ ...原样数组... ],
 *   virtue: 3,
 *   history: 1,
 *   flags: ['foo','bar'],
 *   vars: { ...可选的kv... }
 * }
 */
      buildSnapshotForSlot(slot) {
          
          let storySnap = { story: { nodeIndex: 0 }, maps: { stack: [] } };
          try {
              
              const sc = (typeof window !== 'undefined') ? window.__story : null;
              if (sc && typeof sc.exportSnapshot === 'function') {
                  const s = sc.exportSnapshot();
                  if (s && s.story && typeof s.story.nodeIndex === 'number') {
                      storySnap = {
                          story: { nodeIndex: s.story.nodeIndex },
                          maps: { stack: Array.isArray(s.maps?.stack) ? s.maps.stack : [] }
                      };
                  }
              } else {
                  
                  const raw = (typeof window !== 'undefined') ? window.currentSaveData : null;
                  const node = raw && typeof raw.nodeId === 'number' ? raw.nodeId : 0;
                  storySnap.story.nodeIndex = node;
              }
          } catch (e) {
              console.warn('[SaveSystem] buildSnapshotForSlot: story export failed:', e);
          }

          
          let stateSnap = { inventory: [], virtue: 0, history: 0, flags: [], vars: {} };
          try {
              if (typeof window !== 'undefined' && window.GameState && typeof window.GameState.exportState === 'function') {
                  stateSnap = window.GameState.exportState();
              } else {
                  
                  const csd = (typeof window !== 'undefined') ? window.currentSaveData : null;
                  if (csd) {
                      stateSnap.inventory = Array.isArray(csd.inventory) ? csd.inventory.slice() : [];
                      stateSnap.virtue = typeof csd.virtue === 'number' ? csd.virtue : 0;
                      stateSnap.history = typeof csd.history === 'number' ? csd.history : 0;
                      stateSnap.flags = Array.isArray(csd.flags) ? csd.flags.slice() : [];
                      stateSnap.vars = {};
                  }
              }
          } catch (e) {
              console.warn('[SaveSystem] buildSnapshotForSlot: state export failed:', e);
          }

          
          let iso = '';
          try {
              iso = new Date().toISOString(); 
          } catch (_) {
              iso = '';
          }
          
          let cgSnap = null;
          try {
              const sc = (typeof window !== 'undefined') ? window.__story : null;
              const mgr = sc && sc.cgManager;
              if (mgr && typeof mgr.exportSnapshot === 'function') {
                  const c = mgr.exportSnapshot();
                  
                  if (c && ((c.image && c.image.src) || c.visible === false)) {
                      cgSnap = {
                          visible: !!c.visible,
                          image: (c.image && c.image.src) ? { src: String(c.image.src) } : null,
                          text: c.text || ''
                      };
                  }
              }
          } catch (e) {
              console.warn('[SaveSystem] buildSnapshotForSlot: cg export failed:', e);
          }


          
          const save = {
              schemaVersion: SAVE_SCHEMA_VERSION,
              slot: Number(slot) || 0,
              saveDate: iso,
              story: { nodeIndex: Number(storySnap.story?.nodeIndex) || 0 },
              maps: { stack: Array.isArray(storySnap.maps?.stack) ? storySnap.maps.stack : [] },
              inventory: Array.isArray(stateSnap.inventory) ? stateSnap.inventory.slice() : [],
              virtue: Number(stateSnap.virtue) || 0,
              history: Number(stateSnap.history) || 0,
              flags: Array.isArray(stateSnap.flags) ? stateSnap.flags.slice() : [],
              vars: (stateSnap.vars && typeof stateSnap.vars === 'object') ? { ...stateSnap.vars } : {},
              cg: cgSnap,
              audio: _getAudioSnapshot()

          };

          return save;
      },
      /**
 * 内部：给某个槽位生成本地存储的 key
 * 例：save.v1.slot.1
 */
      _storageKey(slot) {
          const s = Number(slot) || 0;
          return `save.v${SAVE_SCHEMA_VERSION}.slot.${s}`;
      },

      /**
       * 写入（持久化）一个存档快照到 localStorage
       * - snapshot 可传入（通常来自 buildSnapshotForSlot），也可不传则自动构建
       * - 返回 true/false 表示成功与否
       */
      write(slot, snapshot) {
          try {
              const s = Number(slot) || 0;

              
              const saveObj = (snapshot && typeof snapshot === 'object')
                  ? { ...snapshot }
                  : this.buildSnapshotForSlot(s);

              
              saveObj.schemaVersion = SAVE_SCHEMA_VERSION;
              saveObj.slot = s;
              if (!saveObj.saveDate) {
                  try { saveObj.saveDate = new Date().toISOString(); } catch (_) { }
              }

              const key = this._storageKey(s);
              localStorage.setItem(key, JSON.stringify(saveObj));
              return true;
          } catch (e) {
              console.warn('[SaveSystem] write failed:', e);
              return false;
          }
      },

      /**
       * 读取（反序列化）某个槽位的存档对象
       * - 找不到则返回 null
       * - JSON 损坏会返回 null，并在控制台给出警告
       */
      read(slot) {
          try {
              const key = this._storageKey(slot);
              const raw = localStorage.getItem(key);
              if (!raw) return null;
              const obj = JSON.parse(raw);
              return obj || null;
          } catch (e) {
              console.warn('[SaveSystem] read failed:', e);
              return null;
          }
      },
   
      /**
     * 列出若干槽位的元信息（用于读档页展示）
     * @param {number} maxSlots 默认为 3
     * @returns {Array<{slot:number, hasData:boolean, saveDate:string, saveDateRaw:string, storyNodeIndex:number}>}
     */
      listSlots(maxSlots = 3) {
          const out = [];
          try {
              const n = Math.max(1, Number(maxSlots) || 3);
              for (let i = 0; i < n; i++) {
                  const obj = (typeof this.read === 'function') ? this.read(i) : null;
                  if (obj) {
                      const raw = (typeof obj.saveDate === 'string') ? obj.saveDate : '';
                      out.push({
                          slot: i,
                          hasData: true,
                          saveDate: formatSaveTimeForDisplay(raw), 
                          saveDateRaw: raw,                        
                          storyNodeIndex: (obj.story && typeof obj.story.nodeIndex === 'number') ? obj.story.nodeIndex : 0
                      });
                  } else {
                      out.push({
                          slot: i,
                          hasData: false,
                          saveDate: '',
                          saveDateRaw: '',
                          storyNodeIndex: 0
                      });
                  }
              }
          } catch (e) {
              console.warn('[SaveSystem] listSlots failed:', e);
          }
          return out;
      },
      /**
 * 读档进入游戏后，在 GameAudio.init() 之后调用本方法，
 * 按 sessionStorage 里的 currentSaveData 恢复 BGM/音量/静音。
 */
      restoreAudioFromSession() {
          try {
              const raw = sessionStorage.getItem('currentSaveData');
              if (!raw) return;
              const save = JSON.parse(raw);
              _restoreAudioFromSnapshot(save);
          } catch { }
      },




  };

  
  window.SaveSystem = SaveSystem;
})();
