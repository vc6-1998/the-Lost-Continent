; (function () {
    const registry = new Map();

    function registerAction(type, handler) {
        if (!type || typeof handler !== 'function') {
            console.warn('[ActionRegistry] registerAction �������Ϸ�:', type, handler);
            return;
        }
        registry.set(String(type), handler);
    }

    async function runActions(actions, ctx) {
        if (!actions) return;
        const list = Array.isArray(actions) ? actions : [actions];
        for (const action of list) {
            if (!action) continue;
            const type = action.type || action.do;
            const handler = registry.get(type);
            if (!handler) {
                console.warn('[ActionRegistry] δ֪��������:', type, action);
                continue;
            }
            try {
                await handler(action, ctx || {});
            } catch (err) {
                console.error('[ActionRegistry] ����ִ�б���:', type, err);
            }
        }
    }

    Object.defineProperty(window, 'ActionRegistry', { value: registry, enumerable: true });
    Object.defineProperty(window, 'registerAction', { value: registerAction, enumerable: true });
    Object.defineProperty(window, 'runActions', { value: runActions, enumerable: true });

    if (!window.__DEV__) window.__DEV__ = true;
    if (window.__DEV__) {
        console.log('[ActionRegistry] ready');
    }
})();
