class MapManager {
    /**
     * @param {object} config - 配置对象
     * @param {HTMLCanvasElement} config.canvas - 游戏画布
     * @param {MapData} config.mapData - 地图数据类的实例
     * @param {DialogueManager} config.dialogueManager - 对话管理器实例
     * @param {CGManager} config.cgManager - CG管理器实例
     */
    constructor(config) {
        
        this.canvas = config.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.mapData = config.mapData;
        this.mapData.name = String(this.mapData?.name || '').trim(); 

        this.backpack = config.backpack;
        this.dialogueManager = config.dialogueManager;
        this.cgManager = config.cgManager;
        this.choiceManager = config.choiceManager;
        this.miniGameManager = config.miniGameManager;
        this.parentCtx = config.parentCtx;
        this._ctx = this._buildCtx();
        
        this._touchCooldown = new Map();  
        this._actionRunning = false;      

        this.tileOverlays = new Map();
        
        this.isActive = false;
        this.isPlayerInputLocked = false;
        this.keyState = {};
        this.isBackpackOpen = false;
        this.completedInteractions = new Set();
        this.animationFrameId = null;
        this.onExitCallback = null;
        this.currentHintObject = null; 

        
        this.mapImage = new Image();
        this.TILE_SIZE = 32;
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.mapGrid = this.mapData.grid;

        
        this.player = {
            x: 0, y: 0,
            width: 32, height: 32 * 1.8,
            speed: 240,
            direction: 'down',
            inventory: [],
            alpha: 1.0
        };
        this.playerImages = {
            up: new Image(), down: new Image(), left: new Image(), right: new Image()
        };
         this.effectZones = this.mapData.effectZones || [];
         this.activeEffectZone = null; 

        
        this.view = {
            x: 0, y: 0,
            width: this.canvas.width, height: this.canvas.height
        };
        
        
        this.fadeEffect = {
            alpha: 1,
            speed: 0.03,
            isFading: false
        };

         this.isExitHintVisible = false;
         this.lastTimestamp = 0;

        
    }

    async start(spawn) {
        if (spawn) {
            const startPos = spawn;
            this.player.x = (startPos[0] + 0.5) * this.TILE_SIZE;
            this.player.y = (startPos[1] + 0.5) * this.TILE_SIZE;
        }

        if (this.isActive) {
            return new Promise(resolve => { this.onExitCallback = resolve; });
        }

        this._play();
        return new Promise(resolve => { this.onExitCallback = resolve; });
    }

    pause() {
        this.isActive = false;
        this._removeEventListeners();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    
    _buildCtx() {
        return {
            source: 'MapManager', 
            mapManager: this,
            state: window.GameState,
            ui: {
            dialogue: this.dialogueManager,
            cg: this.cgManager,
            hint: {
                showHint: (opt) => this.dialogueManager.showHint(opt || { text: '' }),
                hideHint: () => this.dialogueManager.hideHint()
            },
            notify: window.NotificationManager,
            choice: this.choiceManager,
            minigame: this.miniGameManager,
        },
            
            scene: 
            {
                gotoMap: async (map, spawn) => {
                
                if (this.onExitCallback) {
                    this.onExitCallback({ action: 'goto', map, spawn });
                }
            }
            },
            input: {
                lock: async () => { this.isPlayerInputLocked = true; },
                unlock: async () => { this.isPlayerInputLocked = false; }
            }
        };
    }


    
    
    

    _play() {
        this.isActive = true;
        this._addEventListeners();
        this._gameLoop();
        this.fadeIn();
    }
    
    _gameLoop(timestamp) {
        if (!this.isActive) {
            this.lastTimestamp = 0; 
            return;
        }

        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }
        
        const deltaTime = (timestamp - this.lastTimestamp) / 1000; 
        this.lastTimestamp = timestamp;

        this._update(deltaTime); 
        this._render();
        this.animationFrameId = requestAnimationFrame((ts) => this._gameLoop(ts));
    }

    

    _update(deltaTime) {
        
        this._updateInteractionHint();
        this._checkTouchInteractions(); 
        this._updateExitHint();
        this._checkAutoExit();

        
        if (this.isPlayerInputLocked || this.isBackpackOpen) {
            return; 
        }
        
        this._updatePlayerMovement(deltaTime);
        this._updateViewFollowPlayer();
        this._updatePlayerEffects(deltaTime);
    }

    _updatePlayerEffects(deltaTime) {
        const playerCol = this.pixelToTileCol(this.player.x);
        const playerRow = this.pixelToTileRow(this.player.y);
        let currentlyInZone = null;
        
        for (const zone of this.effectZones) {
            const { from, to } = zone.area;
            
            if (
                playerCol >= from[0] && playerCol <= to[0] &&
                playerRow >= from[1] && playerRow <= to[1]
            ) {
                currentlyInZone = zone;
                break; 
            }
        }

        
        if (currentlyInZone && currentlyInZone.effect === 'fadePlayer') {
            this.activeEffectZone = currentlyInZone;
            const params = this.activeEffectZone.params || {};
            const targetAlpha = params.targetAlpha ?? 0.2;
            const fadeSpeed = (params.fadeSpeed ?? 1.5) * deltaTime;

            
            if (this.player.alpha > targetAlpha) {
                this.player.alpha = Math.max(targetAlpha, this.player.alpha - fadeSpeed);
            }
        } else {
            
            this.activeEffectZone = null;
            const fadeSpeed = 1.5 * deltaTime; 

            
            if (this.player.alpha < 1.0) {
                this.player.alpha = Math.min(1.0, this.player.alpha + fadeSpeed);
            }
        }
    }


    
    
    

    _addEventListeners() {
        this._boundKeyHandler = this._handleKeyEvent.bind(this);
        window.addEventListener('keydown', this._boundKeyHandler);
        window.addEventListener('keyup', this._boundKeyHandler);
    }

    _removeEventListeners() {
        window.removeEventListener('keydown', this._boundKeyHandler);
        window.removeEventListener('keyup', this._boundKeyHandler);
    }

    _handleKeyEvent(e) {
        
        this.keyState[e.key.toLowerCase()] = (e.type === 'keydown');

        
        if (e.type !== 'keydown') return;

        
        if (e.key.toLowerCase() === 'f' && !this.isPlayerInputLocked && !this.isBackpackOpen) {
            if (this.currentHintObject) {
                 this._triggerInteraction(this.currentHintObject);
            }
        }

         
        if (e.key.toLowerCase() === 'b') {
            if (this.isPlayerInputLocked) return;
            this._toggleBackpack();
        }

        
        if (e.key === 'Escape' && this.isBackpackOpen) {
            this._toggleBackpack();
        }
    }

    _updateInteractionHint() {
        if (this.isPlayerInputLocked) {
            if (this.currentHintObject) {
                this.dialogueManager.hideHint();
                this.currentHintObject = null;
            }
            return;
        }

        const interaction = this._getInteractionInFront();

        
        
        
        
        if (interaction && !this.completedInteractions.has(interaction.id) && this._checkInteractionConditions(interaction)) {
            
            
            if (interaction !== this.currentHintObject) {
                if (this.currentHintObject) {
                    this.dialogueManager.hideHint();
                }
                const hintObj = interaction.hint || interaction.tips || null; 
                if (hintObj && hintObj.text) {
                    this.dialogueManager.showHint(hintObj);
                }

                this.currentHintObject = interaction;
            }
        } 
        
        else {
            if (this.currentHintObject) {
                this.dialogueManager.hideHint();
                this.currentHintObject = null;
            }
        }
    }
    _updateExitHint() {
        
        if (this.isPlayerInputLocked) {
            if (this.isExitHintVisible) {
                this.dialogueManager.hideHint();
                this.isExitHintVisible = false;
            }
            return;
        }

        const playerCol = this.pixelToTileCol(this.player.x);
        const playerRow = this.pixelToTileRow(this.player.y);

        const isOnExit = this.mapData.isExitAt(playerCol, playerRow);
        
        
        const canLeave = this._canPlayerExit();

        
        if (isOnExit && !canLeave && !this.isExitHintVisible) {
            this.dialogueManager.showHint(this.mapData.exitBlock); 
            this.isExitHintVisible = true;
        } 
        
        else if ((!isOnExit || canLeave) && this.isExitHintVisible) {
            this.dialogueManager.hideHint();
            this.isExitHintVisible = false;
        }
    }

    _checkInteractionConditions(interaction) {
        if (!interaction || !interaction.condition) return true;

        if (typeof window.checkCondition === 'function') {
            return window.checkCondition(interaction.condition, window.GameState);
        }

        const c = interaction.condition;
        if (Array.isArray(c.requiredFlags) && !c.requiredFlags.every(f => SaveSystem.hasFlag(f))) return false;
        if (Array.isArray(c.forbiddenFlags) && c.forbiddenFlags.some(f => SaveSystem.hasFlag(f))) return false;
        return true;
    }



    _toggleBackpack() {
        this.isBackpackOpen = !this.isBackpackOpen;

        if (this.isBackpackOpen) {
            console.log("Opening backpack...");
            
            this.backpack.show(() => {
                this.isBackpackOpen = false;
                console.log("Backpack closed via callback, player unlocked.");
            }); 
            
        } else {
            console.log("Closing backpack...");
            this.backpack.hide();
        }
    }
    
    async _triggerInteraction(interaction) { 
        
        if (!interaction) return;

        
        interaction = window.normalizeInteraction ? window.normalizeInteraction(interaction) : interaction;

        
        if (interaction.trigger === 'touch') {
            const now = Date.now();
            const key =
                interaction.id ||
                JSON.stringify(interaction.pos || interaction.area || interaction);
            const last = this._touchCooldown.get(key) || 0;
            if (now - last < 600) return; 
            this._touchCooldown.set(key, now);
        }

        
        if (this._actionRunning) return;
        this._actionRunning = true;

        const mapWindow = this.canvas.closest('.window');

        
        try {
            
            this.isPlayerInputLocked = true; 

            
            if (this._ctx?.ui?.hint?.hideHint) this._ctx.ui.hint.hideHint();
            this.currentHintObject = null;

            
            const pass = (typeof window.checkCondition === 'function')
                ? window.checkCondition(interaction.condition, window.GameState)
                : true;

            if (pass) {
                
                const raw = window.getInteractionActions
                    ? window.getInteractionActions(interaction)
                    : (interaction.actions || interaction.interact || []);
                const actions = window.normalizeActions ? window.normalizeActions(raw) : raw;

                const actionCtx = {
                    ...this._ctx,
                    interaction: interaction 
                };
                for (const action of actions) {
                    if (action.type === 'cg') {
                        if (mapWindow) mapWindow.hidden = true;
                    }
                    console.log('[check map ctx] has ui.minigame =', !!this._ctx?.ui?.minigame, 'action=', action?.type);

                    await window.runActions([action], actionCtx); 
                }

                if (this.dialogueManager?.hide) this.dialogueManager.hide();
                if (this.cgManager?.hide) await this.cgManager.hide();

                
            } else {
                if (interaction.denied) {
                    const deniedCtx = { ...this._ctx, interaction: interaction };
                    await window.runActions(interaction.denied, deniedCtx);
                }
            }
        } finally {
            if (mapWindow) mapWindow.hidden = false;

            this._actionRunning = false;
            
            
            this.isPlayerInputLocked = false; 
        }
    }

    _checkTouchInteractions() {
        
        if (this._actionRunning || this.isPlayerInputLocked) {
            return;
        }

        const playerCol = this.pixelToTileCol(this.player.x);
        const playerRow = this.pixelToTileRow(this.player.y);

        
        const interactionsOnTile = this.mapData.getInteractionAt(playerCol, playerRow);

        if (!interactionsOnTile || interactionsOnTile.length === 0) {
            return;
        }

        
        for (let i = interactionsOnTile.length - 1; i >= 0; i--) {
            const interaction = interactionsOnTile[i];

            
            if (
                interaction.trigger === 'touch' &&
                !this.completedInteractions.has(interaction.id) &&
                this._checkInteractionConditions(interaction)
            ) {
                
                console.log(`[MapManager] Auto-triggering touch interaction: ${interaction.id}`);
                this._triggerInteraction(interaction);
                
                return; 
            }
        }
    }

    _canPlayerExit() {
        
        const allDefinedInteractions = this.mapData.interactions || [];

        
        const possibleInteractions = allDefinedInteractions.filter(interaction =>
            window.checkCondition(interaction.condition, window.GameState)
        );

        
        const allPossibleCompleted = possibleInteractions.every(interaction =>
            interaction.id && this.completedInteractions.has(interaction.id)
        );
        
        return allPossibleCompleted;
    }

    
    async _checkAutoExit() {
        const playerCol = this.pixelToTileCol(this.player.x);
        const playerRow = this.pixelToTileRow(this.player.y);

        if (this.mapData.isExitAt(playerCol, playerRow)) {
            
            if (this._canPlayerExit()) {
                if (this.onExitCallback) this.onExitCallback({ action: 'exit' });
            }
        }
    }

        _getInteractionInFront() {
        const playerCol = this.pixelToTileCol(this.player.x);
        const playerRow = this.pixelToTileRow(this.player.y);
        let frontCol = playerCol, frontRow = playerRow;

        switch (this.player.direction) {
            case 'up':    frontRow--; break;
            case 'down':  frontRow++; break;
            case 'left':  frontCol--; break;
            case 'right': frontCol++; break;
        }

        const possibleInteractions = this.mapData.getInteractionAt(frontCol, frontRow);

        if (!possibleInteractions || possibleInteractions.length === 0) {
            return null;
        }

        for (let i = possibleInteractions.length - 1; i >= 0; i--) {
            const interaction = possibleInteractions[i];

            if (interaction.trigger !== 'touch' && window.checkCondition(interaction.condition, window.GameState)) {
                return interaction;
            }
        }

        return null;
    }
    
    async _init(spawn) { 
        this.playerImages.up.src = './assets/img/player_up.png';
        this.playerImages.down.src = './assets/img/player_down.png';
        this.playerImages.left.src = './assets/img/player_left.png';
        this.playerImages.right.src = './assets/img/player_right.png';

        await this._loadMapImage(this.mapData.img);
        this.TILE_SIZE = this.mapWidth / this.mapData.cols;
        console.log(this.TILE_SIZE);
        this.player.width = this.TILE_SIZE*0.8;
        this.player.height = this.TILE_SIZE*0.8 * 1.8;

        
        const startPos = spawn || this.mapData.enterPosition;
        this.player.x = (startPos[0] + 0.5) * this.TILE_SIZE;
        this.player.y = (startPos[1] + 0.5) * this.TILE_SIZE;
    }

    _render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        
        this.ctx.drawImage(
            this.mapImage,
            this.view.x, this.view.y, this.view.width, this.view.height,
            0, 0, this.view.width, this.view.height
        );
        
        
        
        if (this.tileOverlays.size > 0) {
            for (const [key, overlay] of this.tileOverlays.entries()) {
                
                if (overlay.img && overlay.img.complete) {
                    const overlayDrawX = Math.round(overlay.col * this.TILE_SIZE - this.view.x);
                    const overlayDrawY = Math.round(overlay.row * this.TILE_SIZE - this.view.y);
                    
                    
                    this.ctx.drawImage(overlay.img, overlayDrawX, overlayDrawY, this.TILE_SIZE, this.TILE_SIZE);
                }
            }
        }
        
        
        const drawX = Math.round(this.player.x - this.view.x - this.player.width / 2);
        const drawY = Math.round(this.player.y - this.view.y - this.player.height);
        const playerImg = this.playerImages[this.player.direction];
        if (playerImg && playerImg.complete) {
            
            
            this.ctx.globalAlpha = this.player.alpha;
            this.ctx.drawImage(playerImg, drawX, drawY, this.player.width, this.player.height);
            
            this.ctx.globalAlpha = 1.0;
            
        }
        

        
        if (this.fadeEffect.alpha > 0) {
            this.ctx.globalAlpha = this.fadeEffect.alpha;
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1;
        }
    }

    _updatePlayerMovement(deltaTime) {
        const moveDistance = this.player.speed * deltaTime;
        const canMoveTo = (newX, newY) => {
            const collideWidth = this.player.width * 0.9;
            const collideHeight = this.player.width * 0.5;
            const collideLeft = newX - collideWidth / 2;
            const collideTop = newY - collideHeight / 2;
            const collideRight = newX + collideWidth / 2;
            const collideBottom = newY + collideHeight / 2;

            const points = [
                { x: collideLeft, y: collideTop }, { x: collideRight, y: collideTop },
                { x: collideLeft, y: collideBottom }, { x: collideRight, y: collideBottom }
            ];

            for (const p of points) {
                if (this.tileTypeAtPixel(p.x, p.y) === 0) return false;
            }
            return true;
        };

        const tryMoveBy = (dx, dy) => {
            if (canMoveTo(this.player.x + dx, this.player.y)) this.player.x += dx;
            if (canMoveTo(this.player.x, this.player.y + dy)) this.player.y += dy;
        };

        let moved = false;
        if (this.keyState['w']) { tryMoveBy(0, -moveDistance); this.player.direction = 'up';    moved = true; }
        if (this.keyState['s']) { tryMoveBy(0, moveDistance);  this.player.direction = 'down';  moved = true; }
        if (this.keyState['a']) { tryMoveBy(-moveDistance, 0); this.player.direction = 'left';  moved = true; }
        if (this.keyState['d']) { tryMoveBy(moveDistance, 0);  this.player.direction = 'right'; moved = true; }
    }

    _updateViewFollowPlayer() {
        if (!this.mapWidth || !this.mapHeight) return;
        const desiredX = this.player.x - this.view.width / 2;
        const desiredY = this.player.y - this.view.height / 2;
        const maxViewX = Math.max(0, this.mapWidth - this.view.width);
        const maxViewY = Math.max(0, this.mapHeight - this.view.height);
        this.view.x = Math.max(0, Math.min(desiredX, maxViewX));
        this.view.y = Math.max(0, Math.min(desiredY, maxViewY));
        const halfFootWidth = (this.player.width * 0.9) / 2;
        const halfFootHeight = (this.player.width * 0.1) / 2;
        this.player.x = Math.max(halfFootWidth, Math.min(this.player.x, this.mapWidth - halfFootWidth));
        this.player.y = Math.max(halfFootHeight, Math.min(this.player.y, this.mapHeight - halfFootHeight));
    }
    _loadMapImage(src) {
        return new Promise((resolve, reject) => {
            this.mapImage.onload = () => {
                this.mapWidth = this.mapImage.width;
                this.mapHeight = this.mapImage.height;
                resolve();
            };
            this.mapImage.onerror = reject;
            this.mapImage.src = src;
        });
    }
    async fadeIn() {
        return new Promise(resolve => {
            this.fadeEffect.isFading = true;
            this.fadeEffect.alpha = 1;

            const fade = () => {
                if (this.fadeEffect.alpha > 0) {
                    this.fadeEffect.alpha -= this.fadeEffect.speed;
                    if (this.fadeEffect.alpha < 0) this.fadeEffect.alpha = 0;
                    requestAnimationFrame(fade);
                } else {
                    this.fadeEffect.isFading = false;
                    resolve();
                }
            };
            fade();
        });
    }

    async fadeOut() {
        return new Promise(resolve => {
            this.fadeEffect.isFading = true;
            this.fadeEffect.alpha = 0;

            const fade = () => {
                if (this.fadeEffect.alpha < 1) {
                    this.fadeEffect.alpha += this.fadeEffect.speed;
                    if (this.fadeEffect.alpha > 1) this.fadeEffect.alpha = 1;
                    requestAnimationFrame(fade);
                } else {
                    this.fadeEffect.isFading = false;
                    resolve();
                }
            };
            fade();
        });
    }
    
    
    pixelToTileCol(x) {
        return Math.floor(x / this.TILE_SIZE);
    }

    pixelToTileRow(y) {
        return Math.floor(y / this.TILE_SIZE);
    }

    tileTypeAtPixel(x, y) {
        if (!this.mapGrid || x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) return 0;
        const col = this.pixelToTileCol(x);
        const row = this.pixelToTileRow(y);
        return this.mapGrid[row]?.[col] || 0;
    }
    /**
 * 导出当前地图层的轻量快照
 * 返回形如：
 * {
 *   mapName: '明镜广场',
 *   player: { col: 10, row: 5, dir: 'right' },
 *   completedInteractions: ['well_interaction','document_pickup']
 * }
 */
    exportLayerSnapshot() {
        try {
            const name = (this?.mapData?.name || '').trim();

            const col = this.pixelToTileCol(this.player.x);
            const row = this.pixelToTileRow(this.player.y);
            const dir = this.player?.direction || 'down';
            const completed = Array.from(this.completedInteractions || []);

            const overlays = [];
            if (this.tileOverlays && this.tileOverlays.size > 0) {
                for (const [key, overlay] of this.tileOverlays.entries()) {
                    overlays.push({
                        col: overlay.col,
                        row: overlay.row,
                        src: overlay.img.src 
                    });
            }
        }

            return {
                mapName: String(name),
                player: { col, row, dir },
                completedInteractions: completed,
                overlays: overlays
            };
        } catch (e) {
            console.warn('[MapManager] exportLayerSnapshot failed:', e);
            return {
                mapName: this?.mapData?.name || '',
                player: { col: 0, row: 0, dir: 'down' },
                completedInteractions: [],
                overlays: []
            };
        }
    }

    /**
     * 从快照恢复当前地图层
     * 注意：应当在本层已完成 _init(mapData) 之后调用（确保 TILE_SIZE/网格已就绪）
     * @param {object} layer 形如 exportLayerSnapshot() 的返回对象
     * @returns {boolean} 是否恢复成功
     */
    importLayerSnapshot(layer) {
        try {
            if (!layer || typeof layer !== 'object') return false;

            
            const snapName = String(layer.mapName || '').trim();
            const curName = String(this?.mapData?.name || '').trim();

            if (snapName && curName && snapName !== curName) {
                console.warn(`[MapManager] importLayerSnapshot: mapName mismatch. snapshot=${snapName}, current=${curName}`);
            }

            
            const p = layer.player || {};
            const col = Math.max(0, Number(p.col) | 0);
            const row = Math.max(0, Number(p.row) | 0);
            const dir = p.dir || 'down';

            
            this.player.x = (col + 0.5) * this.TILE_SIZE;
            this.player.y = (row + 0.5) * this.TILE_SIZE;
            this.player.direction = dir;
            this._updateViewFollowPlayer(); 


            
            const arr = Array.isArray(layer.completedInteractions) ? layer.completedInteractions : [];
            this.completedInteractions = new Set(arr);

            this.tileOverlays.clear();
            const overlayData = Array.isArray(layer.overlays) ? layer.overlays : [];
            for (const data of overlayData) {
                if (data && typeof data.col === 'number' && typeof data.row === 'number' && data.src) {
                    const img = new Image();
                    img.src = data.src;
                    const key = `${data.col},${data.row}`;
                    this.tileOverlays.set(key, {
                        img: img,
                        col: data.col,
                        row: data.row
                    });
                }
            }

            
            if (this.dialogueManager && typeof this.dialogueManager.hideHint === 'function') {
                this.dialogueManager.hideHint();
            }
            this.currentHintObject = null;
            this.isExitHintVisible = false;

            return true;
        } catch (e) {
            console.warn('[MapManager] importLayerSnapshot failed:', e);
            return false;
        }
    }

}