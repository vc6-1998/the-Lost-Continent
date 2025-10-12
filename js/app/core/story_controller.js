

class StoryController {
    constructor(storyData, dialogueManager, cgManager, choiceManager, effectManager, backpack, miniGameManager) {
        this.storyData = [...storyData]; 
        this.dialogueManager = dialogueManager;
        this.cgManager = cgManager;
        this.choiceManager = choiceManager;
        this.effectManager = effectManager;
        this.miniGameManager = miniGameManager;
        this.currentIndex = 0;
        this.backpack = backpack;
        
        this.currentMapManager = null;
        this._ctx = this._buildCtx();
        this.mapStack = []; 
        
        this._pendingMapByName = {};
        
        this._activeMapManager = null;



    }

    
    _buildCtx() {
        const self = this;

        return {
            source: 'StoryController', 
            state: window.GameState,
            ui: {
                dialogue: self.dialogueManager,
                cg: self.cgManager,
                hint: {
                    showHint: (opt) => self.dialogueManager.showHint(opt || { text: '' }),
                    hideHint: () => self.dialogueManager.hideHint()
                },
                notify: window.NotificationManager,
                choice: {
                    show: (prompt, options) => self.choiceManager.show(prompt, options)
                },
                effect: self.effectManager,
                minigame: self.miniGameManager
            },
            scene: {
                async gotoMap(map, spawn) {

                    if (self.dialogueManager?.hide) self.dialogueManager.hide();
                    if (self.cgManager?.hide) await self.cgManager.hide();
                    const mapStack = []; 
                    
                    self.mapStack = mapStack;

                    
                    const mapWindow = document.querySelector('.window');
                    const gameCanvas = document.getElementById('gameCanvas');

                    const mainMapManager = new MapManager({
                        canvas: gameCanvas,
                        mapData: map,
                        dialogueManager: self.dialogueManager,
                        cgManager: self.cgManager,
                        backpack: self.backpack,
                        choiceManager: self.choiceManager,
                        miniGameManager: self.miniGameManager
                    });
                    await mainMapManager._init(spawn);
                    
                    self._activeMapManager = mainMapManager;
                    try {
                        const mname = (map?.name || '').trim();

                        const pending = (self._pendingMapByName && mname) ? self._pendingMapByName[mname] : null;
                        if (pending && typeof mainMapManager.importLayerSnapshot === 'function') {
                            const ok = mainMapManager.importLayerSnapshot(pending);
                            if (ok) delete self._pendingMapByName[mname]; 
                        }
                    } catch (e) {
                        console.warn('[StoryController] apply pending (main) failed:', e);
                    }

                    mapStack.push(mainMapManager);


                    while (mapStack.length > 0) {
                        if (mapWindow) mapWindow.hidden = false;
                        if (gameCanvas) gameCanvas.hidden = false;

                        const currentInstance = mapStack[mapStack.length - 1];
                        
                        self._activeMapManager = currentInstance;

                        
                        const result = await currentInstance.start();
                        await currentInstance.fadeOut();

                        currentInstance.pause();

                        if (result && result.action === 'goto') {
                            const subMapManager = new MapManager({
                                                canvas: gameCanvas,
                                                mapData: result.map,
                                                dialogueManager: self.dialogueManager,
                                                cgManager: self.cgManager,
                                                backpack: self.backpack,
                                                choiceManager: self.choiceManager,
                                                miniGameManager: self.miniGameManager
                                            });
                            await subMapManager._init(result.spawn);
                            
                            self._activeMapManager = subMapManager;
                            try {
                                const m2 = (result?.map?.name || '').trim();

                                const pending2 = (self._pendingMapByName && m2) ? self._pendingMapByName[m2] : null;
                                if (pending2 && typeof subMapManager.importLayerSnapshot === 'function') {
                                    const ok2 = subMapManager.importLayerSnapshot(pending2);
                                    if (ok2) delete self._pendingMapByName[m2];
                                }
                            } catch (e) {
                                console.warn('[StoryController] apply pending (sub) failed:', e);
                            }

                            mapStack.push(subMapManager);
                        } else {
                            mapStack.pop();
                        }
                    }
                    
                    self._activeMapManager = null;

                    if (mapWindow) mapWindow.hidden = true;
                }
            },
            input: { lock: async () => {}, unlock: async () => {} }
        };
    }


    async start() {
        this.currentIndex = 0;
        await this.processCurrentElement();
    }

    
    startFrom(index) {
        const n = Number(index);
        if (Number.isFinite(n) && n >= 0 && n < this.storyData.length) {
            this.currentIndex = n;
        } else {
            this.currentIndex = 0;
        }
        
        return this.processCurrentElement();
    }

    /**
 * 导出当前剧情/地图栈的轻量快照（后续会逐步把地图栈信息补齐）
 * 返回形如：{ story:{ nodeIndex }, maps:{ stack:[ ... ] } }
 */
    exportSnapshot() {
        const total = Array.isArray(this.storyData) ? this.storyData.length : 0;
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

        
        const nodeIndex = clamp(Number(this.currentIndex) || 0, 0, Math.max(0, total - 1));

        
        let stack = [];
        try {
            if (Array.isArray(this.mapStack) && this.mapStack.length > 0) {
                stack = this.mapStack
                    .map(layer => {
                        if (layer && typeof layer.exportLayerSnapshot === 'function') {
                            try { return layer.exportLayerSnapshot(); } catch (e) {
                                console.warn('[StoryController] exportLayerSnapshot failed:', e);
                                return null;
                            }
                        }
                        return null;
                    })
                    .filter(Boolean);
            } else if (this._activeMapManager && typeof this._activeMapManager.exportLayerSnapshot === 'function') {
                
                try {
                    const one = this._activeMapManager.exportLayerSnapshot();
                    if (one) stack.push(one);
                } catch (_) { }
            }
        } catch (e) {
            console.warn('[StoryController] exportSnapshot (maps.stack) error:', e);
            stack = [];
        }


        return {
            story: { nodeIndex },
            maps: { stack }
        };
    }

    /**
     * 从快照恢复剧情位置/地图栈
     * 本步只恢复剧情索引；地图栈会在后续步骤实现
     * @returns {boolean} 是否恢复成功
     */
    importSnapshot(snap) {
        try {
            if (!snap || !snap.story) return false;

            const total = Array.isArray(this.storyData) ? this.storyData.length : 0;
            const n = Number(snap.story.nodeIndex);
            if (Number.isFinite(n)) {
                this.currentIndex = Math.max(0, Math.min(n, Math.max(0, total - 1)));
            } else {
                this.currentIndex = 0;
            }

            
            this.mapStack = [];
            
            this._pendingMapByName = {};
            try {
                const arr = Array.isArray(snap?.maps?.stack) ? snap.maps.stack : [];
                for (const layer of arr) {
                    if (layer && layer.mapName) {
                        this._pendingMapByName[String(layer.mapName).trim()] = layer;

                    }
                }
            } catch (e) {
                console.warn('[StoryController] importSnapshot: pending maps parse failed:', e);
            }


            return true;
        } catch (e) {
            console.warn('[StoryController] importSnapshot failed:', e);
            this.currentIndex = 0;
            this.mapStack = [];
            return false;
        }
    }


    
    async processCurrentElement() {
        if (this.currentIndex >= this.storyData.length) {
        // --- 剧情结束逻辑 ---
        console.log("剧情结束，开始执行游戏结束序列。");

        // 1. 隐藏所有UI元素
        this.dialogueManager.hide();
        await this.cgManager.hide();

        // 2. 停止背景音乐 (BGM)
        if (window.GameAudio && typeof window.GameAudio.stopBGM === 'function') {
            window.GameAudio.stopBGM({ fade: 1500 }); // 1.5秒淡出
        }

        // 3. (可选) 显示一条结束信息
        // 我们复用 dialogueManager 来显示，因为它很简单
        if (this.dialogueManager && typeof this.dialogueManager.show === 'function') {
            // 使用一个特殊的 show 方法，它不等待玩家输入
            // 我们需要临时修改一下 show 方法，或者直接操作DOM
            const dialogueContainer = document.querySelector('.dialogue-container');
            const dialogueText = document.getElementById('dialogue-text');
            if(dialogueContainer && dialogueText) {
                document.getElementById('character-image').hidden = true;
                dialogueText.textContent = '游戏结束，感谢您的游玩...';
                dialogueContainer.hidden = false;
            }
        }
        
        // 4. 等待一段时间，让玩家看到信息并感受音乐淡出
        await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒

        // 5. 跳转回主页面
        window.location.href = './index.html'; // 确保这个路径是正确的

        return; // 结束执行，不再处理后续逻辑
    }


        const currentElement = this.storyData[this.currentIndex];

        
        try {
            if (window.SaveSystem && typeof SaveSystem.markStepComplete === 'function') {
                SaveSystem.markStepComplete(this.currentIndex);
            }
        } catch (e) {
            console.warn('[Story] 标记进度失败：', e);
        }

        
        let actions = null;

        switch (currentElement.type) {
            case 'dialog':
                actions = [{ type: 'dialog', character: currentElement.character, text: currentElement.text }];
                break;

            case 'cg':
                actions = [{ type: 'cg', url: currentElement.url, text: currentElement.text }];
                break;

            case 'pickup':
                actions = [{ type: 'pickup', item: currentElement.item ,image: currentElement.image}];
                break;

            case 'state_change':
                actions = [{
                    type: 'state_change',
                    virtue: currentElement.virtue,
                    history: currentElement.history,
                }];
                break;

            case 'map':
                
                actions = [{ type: 'map', map: currentElement.data, spawn: currentElement.spawn || null }];
                break;

            case 'choice':
                
                actions = [{
                    type: 'choice',
                    prompt: currentElement.prompt,
                    options: currentElement.options
                }];
                break;

            case 'effect':
            case 'effects': {
                
                
                const payload = currentElement.effects || currentElement.actions;
                if (Array.isArray(payload)) {
                    actions = window.normalizeActions ? window.normalizeActions(payload) : payload;
                } else {
                    
                    
                    actions = [currentElement];
                }
                break;
            }
            case 'bgm':
            case 'se':
            case 'showHint':
            case 'minigame':
            case 'achievement':
                
                
            case 'branch': 
                actions = [currentElement];
                break;
            default:
                console.warn(`未知的剧情元素类型: ${currentElement.type}`);
                
                this.currentIndex++;
                await this.processCurrentElement();
                return;
        }

        
        await window.runActions(
            window.normalizeActions ? window.normalizeActions(actions) : actions,
            this._ctx
        );


        
        this.currentIndex++;
        await this.processCurrentElement();
    }

}