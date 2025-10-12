

class EffectManager {
    constructor(overlayElement) {
        this.overlay = overlayElement;
        this.body = document.body;
    }

    /**
     * 播放一个指定名称的特效
     * @param {string} effectName - 特效名称 (对应CSS类名)
     * @param {number} duration - 特效持续时间 (毫秒)
     */
    play(effectName, duration = 1000) {
        console.log(`Playing effect: ${effectName}`);
        
        
        if (effectName === 'desaturate') {
            this.body.classList.add('desaturate-active');
            setTimeout(() => {
                this.body.classList.remove('desaturate-active');
            }, duration);
            return;
        }

        
        this.overlay.classList.add(effectName);
        
        setTimeout(() => {
            this.overlay.classList.remove(effectName);
        }, duration);
    }
}