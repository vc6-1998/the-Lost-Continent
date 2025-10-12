
; (function () {
    function ensureArray(x) {
        if (!x) return [];
        return Array.isArray(x) ? x : [x];
    }

    function normalizeInteraction(inter) {
        if (!inter || typeof inter !== 'object') return inter;
        const n = Object.assign({}, inter);

        if (!n.actions && n.interact) n.actions = ensureArray(n.interact);

        if (n.condition && n.condition.requiredFlag && !n.condition.allFlags) {
            n.condition = Object.assign({}, n.condition, { allFlags: [n.condition.requiredFlag] });
        }
        return n;
    }

    function getInteractionActions(inter) {
        if (!inter) return [];
        const acts = inter.actions || inter.interact;
        return ensureArray(acts);
    }

    function normalizeAction(a) {
        if (!a) return null;

        if (Array.isArray(a)) {
            return a.map(normalizeAction).filter(Boolean);
        }

        const t = a.type || a.do;
        if (t === 'map') {
            return {
                type: 'map',
                map: a.map ?? a.data ?? null,
                spawn: a.spawn ?? null,
                fadeMs: a.fadeMs
            };
        }

        if (t === 'branch') {
            const copy = { ...a, type: 'branch' };
            
            if (copy.then) {
                copy.then = normalizeActions(copy.then);
            }
            if (copy.else) {
                copy.else = normalizeActions(copy.else);
            }
            return copy;
        }

        if (t === 'choice' && Array.isArray(a.options)) {
            const opt = a.options.map(op => {
                const copy = Object.assign({}, op);
                const branch = copy.effects ?? copy.actions ?? [];
                const normBranch = normalizeActions(branch);
    
                copy.actions = normBranch;
                return copy;
            });
            const copy = Object.assign({}, a);
            copy.options = opt;
            copy.type = 'choice';
            return copy;
        }

        const copy = Object.assign({}, a);
        copy.type = t;
        return copy;
    }

    function normalizeActions(actions) {
        const arr = ensureArray(actions);
        return arr.map(normalizeAction).flat().filter(Boolean);
    }

    Object.defineProperty(window, 'normalizeInteraction', {
        value: normalizeInteraction, enumerable: true
    });
    Object.defineProperty(window, 'getInteractionActions', {
        value: getInteractionActions, enumerable: true
    });
    Object.defineProperty(window, 'normalizeAction', {
        value: normalizeAction, enumerable: true
    });
    Object.defineProperty(window, 'normalizeActions', {
        value: normalizeActions, enumerable: true
    });

    if (!window.__DEV__) window.__DEV__ = true;
    if (window.__DEV__) {
        console.log('[Normalize] ready (interaction + actions)');
    }
})();
