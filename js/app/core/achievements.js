
; (function (global) {
    const STORAGE_KEY = 'achievements';
    const TOTAL = 8; 

    function loadSaved() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            
            return Array.isArray(arr) ? arr : [];
        } catch { return []; }
    }

    function save(arr) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        
    }

    function ensureLength(arr) {
        
        for (let i = 0; i < TOTAL; i++) {
            if (!arr[i]) arr[i] = { unlocked: false };
            else if (typeof arr[i].unlocked !== 'boolean') arr[i].unlocked = !!arr[i].unlocked;
        }
        return arr;
    }

    
    function grant(id) {
        if (typeof id !== 'number' || id < 1 || id > TOTAL) return false;
        const idx = id - 1;
        const saved = ensureLength(loadSaved());
        if (saved[idx].unlocked) return false; 
        saved[idx].unlocked = true;
        save(saved);
        return true;
    }

    
    function isUnlocked(id) {
        const idx = id - 1;
        const saved = ensureLength(loadSaved());
        return !!saved[idx]?.unlocked;
    }

    global.Achievements = { grant, isUnlocked };
})(window);
