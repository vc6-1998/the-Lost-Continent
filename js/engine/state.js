; (() => {
    const _fallback = {
        vars: {},
        kv: {},
        inventory: [],
    };

    const GameState = {
        hasFlag(flag) {
            if (window.SaveSystem && typeof window.SaveSystem.hasFlag === 'function') {
                return !!window.SaveSystem.hasFlag(flag);
            }
            const flags = (_fallback.vars.flags ||= new Set());
            return flags.has(flag);
        },

        addFlag(flag) {
            if (window.SaveSystem && typeof window.SaveSystem.addFlag === 'function') {
                return window.SaveSystem.addFlag(flag);
            }
            const flags = (_fallback.vars.flags ||= new Set());
            flags.add(flag);
        },
        removeFlag(flag) {
        if (window.SaveSystem && typeof window.SaveSystem.removeFlag === 'function') {
            return window.SaveSystem.removeFlag(flag);
        }
        // 作为备用方案，也处理一下 _fallback 的情况
        const flags = (_fallback.vars.flags ||= new Set());
        flags.delete(flag);
    },
        getVar(key) {
            if (window.SaveSystem && typeof window.SaveSystem.getVar === 'function') {
                return window.SaveSystem.getVar(key);
            }
            return _fallback.vars[key];
        },

        setVar(key, value) {
            if (window.SaveSystem && typeof window.SaveSystem.setVar === 'function') {
                return window.SaveSystem.setVar(key, value);
            }
            _fallback.vars[key] = value;
        },

        getInventory() {
            if (window.SaveSystem && typeof window.SaveSystem.getInventory === 'function') {
                return window.SaveSystem.getInventory();
            }
            if (window.SaveSystem && Array.isArray(window.SaveSystem.inventory)) {
                return window.SaveSystem.inventory;
            }
            return _fallback.inventory;
        },
        getItemCount(itemName) {
            const inventory = this.getInventory();
            if (!inventory || !Array.isArray(inventory)) {
                return 0;
            }
            
            return inventory.reduce((total, item) => {
                if (item && item.name === itemName) {
                    
                    return total + (item.count || 1);
                }
                return total;
            }, 0);
        },
        addItem(item) {
            if (window.SaveSystem && typeof window.SaveSystem.addItem === 'function') {
                return window.SaveSystem.addItem(item);
            }
            _fallback.inventory.push(item);
            return _fallback.inventory;
        },

        set(key, value) {
            if (window.SaveSystem && typeof window.SaveSystem.set === 'function') {
                return window.SaveSystem.set(key, value);
            }
            _fallback.kv[key] = value;
        },

        get(key) {
            if (window.SaveSystem && typeof window.SaveSystem.get === 'function') {
                return window.SaveSystem.get(key);
            }
            return _fallback.kv[key];
        },

        setLastMap(id, spawn) {
            const payload = { id, spawn, ts: Date.now() };
            if (window.SaveSystem && typeof window.SaveSystem.set === 'function') {
                return window.SaveSystem.set('lastMap', payload);
            }
            _fallback.kv['lastMap'] = payload;
        },
        /**
 * 导出当前全局状态（背包/美德/历史/旗标/vars）
 * 返回：{ inventory:[], virtue:number, history:number, flags:[], vars:{} }
 */
        exportState() {
            
            const csd = (typeof window !== 'undefined' && window.currentSaveData) ? window.currentSaveData : null;

            const inventory = (csd && Array.isArray(csd.inventory)) ? csd.inventory.slice()
                : Array.isArray(_fallback.inventory) ? _fallback.inventory.slice()
                    : [];

            const virtue = (csd && typeof csd.virtue === 'number') ? csd.virtue : (this.get('virtue') || 0);
            const history = (csd && typeof csd.history === 'number') ? csd.history : (this.get('history') || 0);

            let flagsArr = [];
            if (csd && Array.isArray(csd.flags)) {
                flagsArr = csd.flags.slice();
            } else {
                const set = _fallback.vars.flags instanceof Set ? _fallback.vars.flags : new Set();
                flagsArr = Array.from(set);
            }

            const varsCopy = {};
            if (_fallback && _fallback.kv) {
                for (const k in _fallback.kv) varsCopy[k] = _fallback.kv[k];
            }

            return {
                inventory,
                virtue: Number(virtue) || 0,
                history: Number(history) || 0,
                flags: flagsArr,
                vars: varsCopy
            };
        },

        /**
         * 从快照恢复全局状态（覆盖式导入）
         * @param {object} snap 形如 exportState() 的返回对象
         * @returns {boolean} 是否成功
         */
        importState(snap) {
            try {
                if (!snap || typeof snap !== 'object') return false;
                const csd = (typeof window !== 'undefined' && window.currentSaveData) ? window.currentSaveData : null;

                
                const inv = Array.isArray(snap.inventory) ? snap.inventory : [];
                if (csd) {
                    csd.inventory = inv.slice();
                } else {
                    _fallback.inventory = inv.slice();
                }

                
                const v = Number(snap.virtue) || 0;
                const h = Number(snap.history) || 0;
                if (csd) {
                    csd.virtue = v;
                    csd.history = h;
                } else {
                    this.set('virtue', v);
                    this.set('history', h);
                }

                
                const flagsArr = Array.isArray(snap.flags) ? snap.flags.slice() : [];
                if (csd) {
                    csd.flags = flagsArr;
                } else {
                    _fallback.vars.flags = new Set(flagsArr);
                }

                
                if (snap.vars && typeof snap.vars === 'object') {
                    for (const k in snap.vars) {
                        this.set(k, snap.vars[k]);
                    }
                }

                
                return true;
            } catch (e) {
                console.warn('[GameState] importState failed:', e);
                return false;
            }
        },

    };

    Object.defineProperty(window, 'GameState', {
        value: GameState,
        writable: false,
        configurable: false,
        enumerable: true,
    });

    if (!window.__DEV__) window.__DEV__ = true;
    if (window.__DEV__) {
        console.log('[GameState] ready. Methods:', Object.keys(GameState));
    }
})();
