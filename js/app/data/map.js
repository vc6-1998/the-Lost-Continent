

class MapData {
    constructor(data) {
        this.name = data.name;
        this.img = data.img;
        this.effectZones = data.effectZones || [];
        this.grid = data.free; 
        this.rows = this.grid.length;
        this.cols = this.grid[0] ? this.grid[0].length : 0;
        
        
        if (Array.isArray(data.enter.pos[0])) {
            this.enterPosition = data.enter.pos[0];
        } else {
            this.enterPosition = data.enter.pos;
        }

        this.exitPositions = new Set(data.exit.pos.map(p => `${p[0]},${p[1]}`));
        this.exitBlock = data.exit.block;
        this.interactions = data.actions || data.interactions || data.interact || data.can_interact || [];
        if (!Array.isArray(this.interactions)) this.interactions = [];
        
        
        this.interactionMap = new Map();
        if (Array.isArray(this.interactions)) {
            for (const interact of this.interactions) {
                if (interact && Array.isArray(interact.pos)) {
                    for (const pos of interact.pos) {
                        const key = `${pos[0]},${pos[1]}`;
                        if (!this.interactionMap.has(key)) {
                            this.interactionMap.set(key, []);
                        }
                        this.interactionMap.get(key).push(interact);
                    }
                }
            }
        }

        
        this._patchGridWithInteractionPositions();
    }

    
    _patchGridWithInteractionPositions() {
        if (!Array.isArray(this.interactions)) return;

        console.log(`[MapData: ${this.name}] 开始用交互点修补通行网格...`);

        for (const interact of this.interactions) {
            if (interact && Array.isArray(interact.pos)  && !interact.trigger) {
                for (const pos of interact.pos) {
                    const col = pos[0]; 
                    const row = pos[1]; 

                    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
                        if (this.grid[row][col] === 1) {
                            this.grid[row][col] = 0;
                        }
                    } else {
                        console.warn(`[MapData: ${this.name}] 警告: 交互点 [${col}, ${row}] 的坐标超出了地图边界。`);
                    }
                }
            }
        }
    }

    getInteractionAt(col, row) {
        return this.interactionMap.get(`${col},${row}`);
    }

    isExitAt(col, row) {
        return this.exitPositions.has(`${col},${row}`);
    }
}