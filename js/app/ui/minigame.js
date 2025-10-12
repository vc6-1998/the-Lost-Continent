
class MiniGameManager {
    constructor() {
        this.overlay = document.getElementById('minigame-overlay');
        this.promptEl = document.getElementById('minigame-prompt');
        this.gridEl = document.getElementById('minigame-grid');
        this.optionsEl = document.getElementById('minigame-options');
        this.timerContainerEl = document.getElementById('minigame-timer-container');
        this.timerBarEl = document.getElementById('minigame-timer-bar');

        this.gameResolve = null;
        this.gameLogic = null;
    }

    show(gameName, params) {
        this.overlay.hidden = false;
        
        this.overlay.classList.add('open');   // ← 新增

        Object.assign(this.overlay.style, {
            position: 'fixed',
            top: '0', left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '9999',
            background: 'rgba(0,0,0,0.0)', 
            display: 'block',
            margin: '0', padding: '0'
        });
        const winEl = document.getElementById('minigame-window');
        if (winEl) {
            Object.assign(winEl.style, {
                position: 'relative',
                width: '100%',
                height: '100%',
                margin: '0', padding: '0',
                overflow: 'hidden',
                display: 'block'
            });
        }
        
        document.body.style.overflow = 'hidden';
        
        // 识别“保持主BGM”的开关（兼容 params 或 params.params 两种写法）
        const __eff = (params && params.params) ? params.params : params;
        this.__mg_keepMainBGM = !!(__eff && (__eff.keepMainBGM === true || __eff.bgmPolicy === 'keep'));

        // 默认行为：除非 keepMainBGM=true，否则静音主BGM（原先是 duck(1)）
        if (!this.__mg_keepMainBGM && window.GameAudio && typeof GameAudio.duck === 'function') {
            GameAudio.duck(1);
        }



        this.gridEl.hidden = true;
        this.optionsEl.hidden = true;
        this.timerContainerEl.style.visibility = 'hidden';

        
        const eff = (params && params.url) ? params
            : (params && params.params) ? params.params
                : params;

        if (eff && eff.url) {
            this.gameLogic = this._runExternalGame(eff);
        } else if (gameName === 'water_finder') {
            this.gameLogic = this._runWaterFinderGame(eff);
        } else {
            console.error(`Unknown minigame: ${gameName}`);
            return Promise.resolve('failure');
        }



        return new Promise(resolve => {
            this.gameResolve = resolve;
        });
    }

    hide() {
        if (!this.__mg_keepMainBGM && window.GameAudio && typeof GameAudio.unduck === 'function') {
            GameAudio.unduck();
        }
        this.__mg_keepMainBGM = false; // 下次弹小游戏时默认按正常策略处理
        this.overlay.classList.remove('open'); 
        this.overlay.hidden = true;
        
        document.body.style.overflow = '';

        if (this.gameLogic && this.gameLogic.cleanup) {
            this.gameLogic.cleanup();
        }
    }

    _endGame(result) {
        if (this.gameResolve) {
            this.gameResolve(result);
            this.gameResolve = null;
        }
        
        setTimeout(() => this.hide(), 1500);
    }

    _runExternalGame(params = {}) {
        const winEl = document.getElementById('minigame-window');
        
        if (winEl) {
            Object.assign(winEl.style, {
                position: 'relative',
                width: '100%',
                height: '100%',
                margin: '0', padding: '0',
                overflow: 'hidden',
                display: 'block'
            });
        }

        
        const baseUrl = String(params.url || '').trim();
        const hasQuery = baseUrl.includes('?');
        const q = [];
        
        q.push('embed=1');

        
        if (params && params.autoStart === true) {
            q.push('autostart=1');
        }
        
        const allowSkip = (params.allowSkip !== false);
        if (allowSkip) q.push('allowSkip=1');
        
        let target = '*';
        try {
            const o = window.location.origin;
            if (o && o !== 'null' && /^https?:\/\//i.test(o)) target = o;
        } catch (e) { }
        q.push('parentOrigin=' + encodeURIComponent(target));
        const finalUrl = baseUrl + (hasQuery ? '&' : '?') + q.join('&');


        
        const iframe = document.createElement('iframe');
        iframe.setAttribute('id', 'mg-external-frame');
        iframe.setAttribute('title', 'minigame');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'autoplay'); 
        iframe.allow = 'autoplay; fullscreen; clipboard-write';
        iframe.allowFullscreen = true;

        
        Object.assign(iframe.style, {
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
        });
        iframe.src = finalUrl;
        winEl.appendChild(iframe);
        // —— 一次性将用户的下一次手势“转发”给子页，帮助其在手势上下文内启动音频 —— 
        const primeOnce = () => {
            try { iframe.contentWindow?.postMessage({ type: 'mg:primeAudio' }, '*'); } catch { }
            window.removeEventListener('pointerdown', primeOnce, true);
            window.removeEventListener('keydown', primeOnce, true);
        };
        window.addEventListener('pointerdown', primeOnce, true);
        window.addEventListener('keydown', primeOnce, true);

        iframe.addEventListener('load', () => {
            try {
                // contentWindow 是指向iframe内部window对象的引用
                iframe.contentWindow.focus();
            } catch (e) {
                // 如果因为跨域等原因直接聚焦失败，尝试聚焦iframe元素本身
                // 这在某些浏览器上也能起作用
                iframe.focus();
                console.warn('Direct focus on iframe contentWindow failed, fallback to iframe element.', e);
            }
        });
        
        const onMessage = (evt) => {
            const data = evt && evt.data;
            if (!data || data.type !== 'mg:done') return;
            
            try {
                
                this._endGame(data.result === 'success' ? 'success' : 'failure');

            } finally {
                cleanup();
            }
        };
        window.addEventListener('message', onMessage);

        
        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            window.removeEventListener('pointerdown', primeOnce, true);
            window.removeEventListener('keydown', primeOnce, true);

            if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        };

        
        return { cleanup };
    }

    
    _runWaterFinderGame(params) {
        this.gridEl.hidden = false;
        this.gridEl.innerHTML = '';
        
        const size = params.size || 5;
        const waterSourcesCount = params.count || 4;
        let remainingClicks = params.clicks || 10;
        
        this.promptEl.textContent = `探测开始！标记 ${waterSourcesCount} 个水源。剩余探测次数: ${remainingClicks}`;

        this.gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        const btnSize = 50;
        this.gridEl.style.width = `${size * (btnSize + 10)}px`;
        this.gridEl.style.height = `${size * (btnSize + 10)}px`;

        const board = Array(size * size).fill(0);
        const waterLocations = new Set();
        
        while(waterLocations.size < waterSourcesCount) {
            const randomIndex = Math.floor(Math.random() * board.length);
            waterLocations.add(randomIndex);
        }

        const getNeighbors = (index) => {
            const neighbors = [];
            const x = index % size;
            const y = Math.floor(index / size);
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const newX = x + j;
                    const newY = y + i;
                    if (newX >= 0 && newX < size && newY >= 0 && newY < size) {
                        neighbors.push(newY * size + newX);
                    }
                }
            }
            return neighbors;
        };

        const buttons = [];
        for (let i = 0; i < board.length; i++) {
            const button = document.createElement('button');
            button.className = 'minigame-grid-btn water-game';
            button.dataset.index = i;
            button.style.width = `${btnSize}px`;
            button.style.height = `${btnSize}px`;
            
            button.addEventListener('click', () => {
                if (button.classList.contains('revealed') || button.classList.contains('flagged')) return;
                
                remainingClicks--;
                
                if (waterLocations.has(i)) {
                    this.promptEl.textContent = `致命错误！直接触碰到了高压水脉！`;
                    revealAll();
                    this._endGame('failure');
                    return;
                }
                
                const neighbors = getNeighbors(i);
                const waterCount = neighbors.filter(n => waterLocations.has(n)).length;
                button.textContent = waterCount > 0 ? waterCount : '';
                button.classList.add('revealed');
                
                updatePrompt();
            });

            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (button.classList.contains('revealed')) return;
                button.classList.toggle('flagged');
                checkWinCondition();
            });

            this.gridEl.appendChild(button);
            buttons.push(button);
        }

        const updatePrompt = () => {
            if (remainingClicks <= 0 && !checkWinCondition(true)) {
                this.promptEl.textContent = '探测次数耗尽！';
                revealAll();
                this._endGame('failure');
                return;
            }
            this.promptEl.textContent = `标记 ${waterSourcesCount} 个水源。剩余探测次数: ${remainingClicks}`;
        };

        const checkWinCondition = (silent = false) => {
            const flaggedButtons = buttons.filter(b => b.classList.contains('flagged'));
            if (flaggedButtons.length !== waterSourcesCount) return false;

            const allCorrect = flaggedButtons.every(b => waterLocations.has(parseInt(b.dataset.index)));
            if (allCorrect) {
                if(!silent) {
                    this.promptEl.textContent = '成功！所有水源都已定位！';
                    revealAll();
                    this._endGame('success');
                }
                return true;
            }
            return false;
        };

        const revealAll = () => {
            buttons.forEach((button, index) => {
                button.disabled = true;
                if (waterLocations.has(index)) {
                    button.classList.add('water-source');
                }
            });
        };
        
        return { cleanup: () => {} };
    }
}