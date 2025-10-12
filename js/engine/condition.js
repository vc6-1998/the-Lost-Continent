
; (function () {
    function normalizeCondition(cond) {
        if (!cond) return null;
        const c = Object.assign({}, cond);
        if (c.requiredFlag && !c.allFlags) c.allFlags = [c.requiredFlag];
        return c;
    }

    function checkCondition(cond, state) {
        const c = normalizeCondition(cond);
        if (!c) return true; 

        const has = (flag) => (state && typeof state.hasFlag === 'function') ? !!state.hasFlag(flag) : false;

        if (Array.isArray(c.allFlags) && !c.allFlags.every(has)) return false;
        if (Array.isArray(c.notFlags) && c.notFlags.some(has)) return false;

        if (Array.isArray(c.itemsAll)) {
            const inv = (state && typeof state.getInventory === 'function') ? state.getInventory() : [];
            const ok = c.itemsAll.every(name => inv.some(it => it && (it.name === name)));
            if (!ok) return false;
        }

        if (Array.isArray(c.itemsNot)) {
            const inv = (state && typeof state.getInventory === 'function') ? state.getInventory() : [];
            const bad = c.itemsNot.some(name => inv.some(it => it && (it.name === name)));
            if (bad) return false;
        }
        if (Array.isArray(c.itemQuantities)) {
            if (!state || typeof state.getItemCount !== 'function') {
                console.warn('[Condition] itemQuantities check failed: state.getItemCount is not a function.');
                return false; 
            }

            for (const req of c.itemQuantities) {
                if (!req || !req.name || !req.op || typeof req.count === 'undefined') {
                    continue; 
                }

                const actualCount = state.getItemCount(req.name);
                const requiredCount = req.count;
                let pass = false;

                switch (req.op) {
                    case '>':  pass = actualCount > requiredCount; break;
                    case '<':  pass = actualCount < requiredCount; break;
                    case '>=': pass = actualCount >= requiredCount; break;
                    case '<=': pass = actualCount <= requiredCount; break;
                    case '==': pass = actualCount == requiredCount; break;
                    case '!=': pass = actualCount != requiredCount; break;
                    default:   console.warn(`[Condition] Unknown operator: ${req.op}`); break;
                }

                if (!pass) {
                    return false;
                }
            }
        }
        if (Array.isArray(c.valueChecks)) {
            if (!window.currentSaveData) {
                console.warn('[Condition] valueChecks failed: window.currentSaveData is not available.');
                return false; 
            }

            
            const currentVirtue = Number(window.currentSaveData.virtue) || 0;
            const currentHistory = Number(window.currentSaveData.history) || 0;

            for (const check of c.valueChecks) {
                if (!check || !check.stat || !check.op || typeof check.value === 'undefined') {
                    continue; 
                }

                let statValue;
                
                switch (check.stat.toLowerCase()) {
                    case 'virtue':
                        statValue = currentVirtue;
                        break;
                    case 'history':
                        statValue = currentHistory;
                        break;
                    default:
                        console.warn(`[Condition] Unknown stat type for valueCheck: ${check.stat}`);
                        continue; 
                }

                const requiredValue = Number(check.value);
                let pass = false;

                
                switch (check.op) {
                    case '>':  pass = statValue > requiredValue; break;
                    case '<':  pass = statValue < requiredValue; break;
                    case '>=': pass = statValue >= requiredValue; break;
                    case '<=': pass = statValue <= requiredValue; break;
                    case '==': pass = statValue == requiredValue; break;
                    case '!=': pass = statValue != requiredValue; break;
                    default:   console.warn(`[Condition] Unknown operator for valueCheck: ${check.op}`); break;
                }

                if (!pass) {
                    return false; 
                }
            }
        }
        return true;
    }

    Object.defineProperty(window, 'checkCondition', {
        value: checkCondition,
        writable: false,
        configurable: false,
        enumerable: true
    });

    if (!window.__DEV__) window.__DEV__ = true;
    if (window.__DEV__) {
        console.log('[Condition] ready: checkCondition(cond, GameState)');
    }
})();
