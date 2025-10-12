

; (function () {
    if (!window.registerAction) {
        console.error('[builtins] ��Ҫ�ȼ��� js/engine/actions/ActionRegistry.js');
        return;
    }

    
    
    registerAction('achievement', async (a, ctx) => {
        // 兼容两种形态：{type:'achievement', id:N} 或 {type:'achievement', params:{id:N}}
        const id = Number(a?.id ?? a?.params?.id);
        if (window.Achievements && Number.isFinite(id)) {
            window.Achievements.grant(id);
        }
    });

    
    
    registerAction('se', (a /* {name, volume, rate, throttle} */, ctx) => {
        if (!a || !a.name || !window.GameAudio) return;
        GameAudio.playSE(a.name, a);
    });

    
    
    
    registerAction('bgm', async (a = {}, ctx) => {
        if (!window.GameAudio) return;
        if (a.name) {
            GameAudio.setBGM(a.name, a);
        } else {
           GameAudio.stopBGM(a);
        }
    });


    registerAction('branch', async (a, ctx) => {
        
        const conditionMet = window.checkCondition(a.condition, ctx?.state || window.GameState);

        let actionsToRun = [];
        if (conditionMet) {
            
            actionsToRun = a.then || [];
        } else {
            
            actionsToRun = a.else || [];
        }

        
        const normalizedActions = window.normalizeActions ? window.normalizeActions(actionsToRun) : actionsToRun;

        
        if (normalizedActions.length > 0) {
            await window.runActions(normalizedActions, ctx);
        }
    });
    
    registerAction('dialog', async (a, ctx) => {
        const dlg = ctx?.ui?.dialogue;
        if (!dlg || typeof dlg.show !== 'function') {
            console.warn('[dialog] ctx.ui.dialogue δע�룬����');
            return;
        }
        await dlg.show({
            text: a.text || '',
            characterImage: a.character ? { src: a.character } : null
        });
    });

    
    registerAction('cg', async (a, ctx) => {
    const cg = ctx?.ui?.cg;
    if (!cg || typeof cg.show !== 'function') {
        console.warn('[cg] ctx.ui.cg 未注册或无效，跳过CG显示。');
        return;
        }
        if (window.GameAudio) GameAudio.playSE('cg_flip', {volume:0.8});
    await cg.show({
        image: a.url ? { src: a.url } : (a.src ? { src: a.src } : null),
        text: a.text || ''
    });
});

    
    registerAction('pickup', async (a, ctx) => {
        const st = ctx?.state;
        const notify = ctx?.ui?.notify;
        if (st && typeof st.addItem === 'function') {
            st.addItem(a.item);
        }
        if (notify && typeof notify.show === 'function') {
            notify.show(a.item || { name: 'aaa' });
        }
    });

    
    registerAction('setFlag', async (a, ctx) => {
        const st = ctx?.state;

        if (st && typeof st.addFlag === 'function' && a.name) {
            st.addFlag(a.name);
            console.log(`Flag set: ${a.name}`); 
        } else {
            console.warn('[setFlag] action failed. Missing name/flag property or state context.', a);
        }
    });

    registerAction('removeFlag', async (a, ctx) => {
        const st = ctx?.state;
        const flagName = a.name || a.flag; // 兼容 name 和 flag 两种写法

        if (st && typeof st.removeFlag === 'function' && flagName) {
            st.removeFlag(flagName);
        } else {
            console.warn('[removeFlag] action failed. Missing name/flag property or state context.', a);
        }
    });

    registerAction('showHint', async (a, ctx) => {
        const hint = ctx?.ui?.hint || ctx?.ui?.dialogue; 
        if (hint && typeof hint.showHint === 'function') {
            hint.showHint({ text: a.text || '' });
            
            await new Promise(r => setTimeout(r, a.ms || 1500));
            if (typeof hint.hideHint === 'function') hint.hideHint();
        }
    });

    
    registerAction('map', async (a, ctx) => {
        const scene = ctx?.scene;
        if (!scene || typeof scene.gotoMap !== 'function') {
            console.error('[map action] 致命錯誤: ctx.scene.gotoMap 方法不存在!');
            return;
        }

        const targetMap = (a && (a.data ?? a.map)) || null;
        if (!targetMap) {
            console.error('[map action] 錯誤: 動作中沒有提供有效的地圖數據。', a);
            return;
        }
        if (window.GameAudio) GameAudio.playSE('map_transition');

        
        await scene.gotoMap(targetMap, a.spawn || null);
    });

    
    registerAction('blockExit', async (_, ctx) => {
        const scene = ctx?.scene;
        if (scene && typeof scene.setExitAllowed === 'function') scene.setExitAllowed(false);
    });

    
    registerAction('allowExit', async (_, ctx) => {
        const scene = ctx?.scene;
        if (scene && typeof scene.setExitAllowed === 'function') scene.setExitAllowed(true);
    });

    
    registerAction('choice', async (a, ctx) => {
        const ch = ctx?.ui?.choice;
        if (!ch || typeof ch.show !== 'function') {
            console.warn('[choice] ctx.ui.choice δע�룬����');
            return;
        }
        const idx = await ch.show(a.prompt || '', a.options || []);
        if (idx >= 0 && a.options && a.options[idx]) {
            const branch = a.options[idx].effects || a.options[idx].actions || [];
            const norm = window.normalizeActions ? window.normalizeActions(branch) : branch;
            if (Array.isArray(norm) && norm.length) {
                await window.runActions(norm, ctx);
            }
        }
    });

    
    
    registerAction('state_change', async (a, ctx) => {
        try {
            if (window.SaveSystem && typeof SaveSystem.updateGameState === 'function') {
                SaveSystem.updateGameState({ virtue: a.virtue, history: a.history });
            if (window.StatusDisplay && typeof window.StatusDisplay.update === 'function') {
                window.StatusDisplay.update();
            }
            }
        } catch (e) {
            console.warn('[state_change] ִ��ʧ�ܣ�', e);
        }
    });

    
    registerAction('effect', async (a, ctx) => {
        const mgr =
            (ctx && ctx.ui && ctx.ui.effect) ||
            ctx?.effectManager ||
            window.effectManager || window.EffectManager || null;

        if (!mgr) {
            console.warn('[effect] δ�ҵ� effectManager��������', a);
            return;
        }

        const name = a.name || a.effect || a.id;
        const params = a.params || {};
        const methods = ['play', 'trigger', 'run', 'start', 'show'];

        for (const m of methods) {
            if (typeof mgr[m] === 'function') {
                const ret = mgr[m](name, params);
                if (ret && typeof ret.then === 'function') await ret;
                return;
            }
        }

        if (name) {
            document.body.classList.add('fx-' + name);
            await new Promise(r => setTimeout(r, a.duration || 600));
            document.body.classList.remove('fx-' + name);
        }
    });

    registerAction('returnMap', async (a, ctx) => {
        if (!ctx?.scene?.returnMap) {
            console.warn('[returnMap] ctx.scene.returnMap �����ڣ��Ѻ���', a);
            return;
        }
        await ctx.scene.returnMap(a || {});
    });

    registerAction('completeInteraction', async (a, ctx) => {
        const mapManager = ctx?.mapManager;
        if (!mapManager || typeof mapManager.completedInteractions?.add !== 'function') {
            console.warn('[completeInteraction] Action must be run from a MapManager context.');
            return;
        }

        const targetId = a.id || ctx?.interaction?.id;

        if (targetId) {
            mapManager.completedInteractions.add(targetId);
            console.log(`[MapManager] Interaction completed via action: ${targetId}`);
        } else {
            console.warn('[completeInteraction] No interaction ID found in context or action parameters.');
        }
    });

    registerAction('setTile', async (a, ctx) => {
        const mapManager = ctx?.mapManager;
        if (!mapManager) {
            console.warn('[setTile] Action must be run from a MapManager context.');
            return;
        }

        const { col, row, img: imgSrc, walkable } = a;
        if (typeof col !== 'number' || typeof row !== 'number') {
            console.warn('[setTile] Missing "col" or "row" parameter.');
            return;
        }

        
        if (typeof walkable === 'boolean') {
            if (mapManager.mapGrid && mapManager.mapGrid[row]) {
                mapManager.mapGrid[row][col] = walkable ? 1 : 0;
                console.log(`[MapManager] Tile [${col},${row}] walkability set to ${walkable}`);
            }
        }

        
        const key = `${col},${row}`;
        if (imgSrc) {
            const img = new Image();
            img.src = imgSrc;
            
            await new Promise(resolve => {
                img.onload = resolve;
                img.onerror = () => {
                    console.warn(`[setTile] Failed to load image: ${imgSrc}`);
                    resolve(); 
                };
            });
            
            mapManager.tileOverlays.set(key, { img, col, row });
            console.log(`[MapManager] Tile [${col},${row}] overlay image set to ${imgSrc}`);
        }
        
    });
    
    registerAction('end_credits', async (a, ctx) => {
        const overlay = document.getElementById('credits-overlay');
        const content = document.getElementById('credits-content');
        if (!overlay || !content) {
            console.warn('[end_credits] Required HTML elements not found.');
            return;
        }

        const lines = a.lines || [];
        const speed = a.speed || 40;

        // 1. Populate the content (This part is from the previous step)
        content.innerHTML = '';
        lines.forEach((line, index) => {
            const p = document.createElement('p');
            if (line.trim() === '') {
                p.innerHTML = '&nbsp;';
            } else {
                p.textContent = line;
            }
            if (index === 0) {
                p.classList.add('credits-title');
            }
            content.appendChild(p);
        });

        // 2. Prepare for animation
        content.style.transition = 'none';
        content.style.transform = 'translateY(100vh)';
        overlay.hidden = false;
        await new Promise(resolve => setTimeout(resolve, 50));
        overlay.style.opacity = 1;

        // 3. Create and manage the Skip Button
        const skipButton = document.createElement('button');
        skipButton.textContent = '跳过 >>';
        skipButton.className = 'credits-skip-button';
        overlay.appendChild(skipButton);

        const showSkipTimeout = setTimeout(() => {
            skipButton.classList.add('visible');
        }, 5000); // Show button after 5 seconds

        // 4. Start the animation and handle completion/skipping
        return new Promise(resolve => {
            let isFinished = false;
            let animationTimeout;

            // This function handles the entire cleanup process
            const finishCredits = () => {
                if (isFinished) return; // Prevent from running twice
                isFinished = true;

                // Clear any pending timers
                clearTimeout(animationTimeout);
                clearTimeout(showSkipTimeout);

                // Animate the fade-out
                overlay.style.opacity = 0;

                // After fade-out, clean up the DOM and resolve the promise
                setTimeout(() => {
                    overlay.hidden = true;
                    if (skipButton.parentNode) {
                        skipButton.parentNode.removeChild(skipButton);
                    }
                    content.style.transition = 'none';
                    content.style.transform = 'translateY(100vh)';
                    resolve(); // The action is now complete
                }, 1500); // Must match CSS opacity transition duration
            };

            // Assign the click handler for the skip button
            skipButton.onclick = finishCredits;

            // Calculate animation duration and set the timeout for natural completion
            const scrollDistance = content.offsetHeight + overlay.offsetHeight;
            const durationMs = (scrollDistance / speed) * 1000;

            content.style.transition = `transform ${durationMs}ms linear`;
            content.style.transform = `translateY(-${content.offsetHeight}px)`;

            // Set the timer that will fire when the credits finish scrolling naturally
            animationTimeout = setTimeout(finishCredits, durationMs);
        });
    });

    registerAction('minigame', async (a, ctx) => {
        const miniGame = ctx?.ui?.minigame;
        if (!miniGame || typeof miniGame.show !== 'function') {
            console.warn('[minigame] ctx.ui.minigame 未注册，跳过');
            return;
        }

        
        
        
        const p = (a && a.params && typeof a.params === 'object') ? { ...a.params } : { ...a };

        
        if (a && a.url != null && p.url == null) p.url = a.url;
        if (a && a.allowSkip != null && p.allowSkip == null) p.allowSkip = a.allowSkip;

        
        const n = (a && typeof a.name === 'string' && a.name)
            || (typeof p.name === 'string' && p.name)
            || 'water_finder';

        
        
        
        console.log(
            '[check:minigame action]',
            'wired=', !!ctx?.ui?.minigame,
            'name=', n,
            'hasUrl=', !!p?.url
        );

        const result = await miniGame.show(n, p);

        
        if (result === 'success') {
            if (Array.isArray(a.onSuccess)) await window.runActions(a.onSuccess, ctx);
            return;
        }

        if (result === 'quit' && Array.isArray(a.onQuit)) {
            await window.runActions(a.onQuit, ctx);
            return;
        }

        
        if (Array.isArray(a.onFailure)) {
            await window.runActions(a.onFailure, ctx);
        }
    });


    if (window.__DEV__) {
        console.log('[builtins] actions registered:',
            Array.from(window.ActionRegistry.keys()));
    }
})();
