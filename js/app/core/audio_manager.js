


const _fadeTimers = new WeakMap();

 (function (global) {
      
      const HTMLAudio = global.Audio;
      const SUPPORTS_OGG = (function () {
       try {
           const a = document.createElement('audio');
          return !!a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') !== '';
        } catch { return false; }
    })();

    const EXT = SUPPORTS_OGG ? 'ogg' : 'mp3';
    const PATH = {
        se: (name) => `./assets/audio/se/${name}.${EXT}`,
        bgm: (name) => `./assets/audio/bgm/${name}.${EXT}`,
    };

    const state = {
        unlocked: false,
        muted: false,
        volumes: { master: 1.0, bgm: 0.65, se: 0.9 },
        ducking: 1.0,          
        bgmName: null,
        bgmEl: null,
        fadeTimer: null,
        seLastPlayAt: new Map(), 
    };

    
    try {
        const saved = JSON.parse(localStorage.getItem('audio.settings') || 'null');
        if (saved && saved.volumes) state.volumes = { ...state.volumes, ...saved.volumes };
        if (saved && typeof saved.muted === 'boolean') state.muted = saved.muted;
    } catch { }

    function saveSettings() {
        try { localStorage.setItem('audio.settings', JSON.stringify({ volumes: state.volumes, muted: state.muted })); } catch { }
    }

    
    function applyBgmVolume() {
        if (!state.bgmEl) return;
        const v = state.muted ? 0
            : clamp(state.volumes.master * state.volumes.bgm * state.ducking, 0, 1);
        state.bgmEl.volume = v;
    }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

    
    function init() {
        if (state._inited) return;
        state._inited = true;

        const unlock = () => {
            if (state.unlocked) return;
            
            const el = new HTMLAudio();
            el.src = PATH.se('_silent_' + Date.now()); 
            el.volume = 0;
            
            try { el.play().catch(() => { }); } catch { }
            state.unlocked = true;
            window.removeEventListener('click', unlock, true);
            window.removeEventListener('touchstart', unlock, true);
            window.removeEventListener('keydown', unlock, true);
        };
        window.addEventListener('click', unlock, true);
        window.addEventListener('touchstart', unlock, true);
        window.addEventListener('keydown', unlock, true);

        
        document.addEventListener('visibilitychange', () => {
            
        });
    }

    
    function playSE(name, opts = {}) {
        if (!name) return;
        
        const now = performance.now();
        const throttle = opts.throttle ?? 80; 
        const last = state.seLastPlayAt.get(name) || 0;
        if (now - last < throttle) return;
        state.seLastPlayAt.set(name, now);

        const el = new HTMLAudio(PATH.se(name));
        el.preload = 'auto';
        el.loop = false;
        
        try { el.playbackRate = clamp(opts.rate ?? 1.0, 0.5, 2.0); } catch { }
        const vol = state.muted ? 0 : clamp((opts.volume ?? state.volumes.se) * state.volumes.master, 0, 1);
        el.volume = vol;
        
        el.play().catch(() => {/*  */ });
        
        el.addEventListener('ended', () => { el.src = ''; });
    }

    
    function setBGM(name, opts = {}) {
        if (!name) return stopBGM(opts);
        if (state.bgmName === name && state.bgmEl) {
            
            applyBgmVolume();
            try { if (state.bgmEl.paused) state.bgmEl.play().catch(() => { }); } catch { }
            return;
        }
        
        stopBGM({ fade: opts.fade ?? 400 });
        state.bgmName = name;
        const el = new HTMLAudio(PATH.bgm(name));
        el.preload = 'auto';
        el.loop = opts.loop !== false; 
        state.bgmEl = el;
        
        el.volume = 0;
        el.play().catch(() => { });
        fadeTo(el, (opts.volume ?? state.volumes.bgm) * state.volumes.master * state.ducking, opts.fade ?? 600);
    }

    function stopBGM(opts = {}) {
        const el = state.bgmEl;
        state.bgmName = null;
        if (!el) return;
        const done = () => {
            try { el.pause(); el.src = ''; } catch { }
            if (state.bgmEl === el) state.bgmEl = null;
        };
        if (opts.fade && opts.fade > 0) {
            fadeTo(el, 0, opts.fade, done);
        } else {
            done();
        }
    }

     function fadeTo(el, target, ms, onComplete) {
         if (!el) return;
         target = clamp(target, 0, 1);

         
         const prev = _fadeTimers.get(el);
         if (prev) clearInterval(prev);

         const step = 50;
         const n = Math.max(1, Math.round(ms / step));
         let i = 0;
         const start = Number.isFinite(el.volume) ? el.volume : 0;

         const timer = setInterval(() => {
             i++;
             const v = start + (target - start) * (i / n);
             el.volume = clamp(v, 0, 1);
             if (i >= n) {
                 clearInterval(timer);
                 _fadeTimers.delete(el);
                 el.volume = target;
                 if (onComplete) onComplete();
             }
         }, step);

         _fadeTimers.set(el, timer);
     }


    function setVolume(vols = {}) {
        if (typeof vols.master === 'number') state.volumes.master = clamp(vols.master, 0, 1);
        if (typeof vols.bgm === 'number') state.volumes.bgm = clamp(vols.bgm, 0, 1);
        if (typeof vols.se === 'number') state.volumes.se = clamp(vols.se, 0, 1);
        applyBgmVolume();
        saveSettings();
    }
    function mute(flag) {
        state.muted = !!flag;
        applyBgmVolume();
        saveSettings();
    }
    function duck(amount = 0.6) {
        state.ducking = clamp(1 - amount, 0, 1); 
        applyBgmVolume();
    }
    function unduck() {
        state.ducking = 1.0;
        applyBgmVolume();
    }

    global.GameAudio = {
        init, playSE, setBGM, stopBGM, setVolume, mute, duck, unduck,
        
        _state: state
    };
})(window);
