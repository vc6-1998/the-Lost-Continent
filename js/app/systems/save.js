class Save {
    constructor() {
        if (arguments.length == 1) {
            const src = arguments[0] || {}; 
            
            this.cg = (src.cg && typeof src.cg === 'object') ? {
                visible: !!src.cg.visible,
                image: (src.cg.image && src.cg.image.src) ? { src: String(src.cg.image.src) } : null,
                text: src.cg.text || ''
            } : null;

            this.saveDate = src.saveDate || 0; 
            this.nodeId = src.nodeId || 0;     
            this.inventory = Array.isArray(src.inventory) ? src.inventory : []; 

            this.virtue = src.virtue || 0;   
            this.history = src.history || 0; 
            
            this.flags = Array.isArray(src.flags) ? src.flags : [];

        } else {
            
            this.saveDate = 0;
            this.nodeId = 0;
            this.inventory = [];
            this.virtue = 0;
            this.history = 0;
            this.flags = [];
            this.cg = null;

        }
    }
}
window.currentSaveData = new Save();
window.currentSaveData.saveDate = 1;