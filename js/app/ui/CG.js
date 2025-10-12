class CGManager {
    constructor(background, animateElement) {
        this.background = background;
        this.animateElement = animateElement;
        this.userInputResolve = null;
        this.transitionDuration = 500; 

        this._boundHandleInput = this._handleInput.bind(this);
    }

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _handleInput(e) {
        const isAdvanceAction = 
            (e.code === 'Space') || 
            (e.type === 'click' && e.button === 0); 

        if (this.userInputResolve && isAdvanceAction) {
            e.preventDefault();
            this.userInputResolve();
            this.userInputResolve = null;
        }
    }

    _awaitUserInput() {
        return new Promise(resolve => {
            this.userInputResolve = resolve;
            
            document.addEventListener('click', this._boundHandleInput);
            document.addEventListener('keydown', this._boundHandleInput);
        });
    }
    
    _cleanupListeners() {
        document.removeEventListener('click', this._boundHandleInput);
        document.removeEventListener('keydown', this._boundHandleInput);
    }

    async show(cgData) {
        if (this.background.classList.contains('visible')) {
            this.background.classList.remove('visible');
            await this._wait(this.transitionDuration);
        }

        this.updateAnimationText(cgData.text);
        if (cgData.image && cgData.image.src) {
            this.background.style.backgroundImage = `url('${cgData.image.src}')`;
        }
        
        this.background.hidden = false;

        await new Promise(resolve => setTimeout(resolve, 20)); 
        this.background.classList.add('visible');
        await this._wait(this.transitionDuration);

        await this._awaitUserInput();
        this._cleanupListeners();
    }

    async hide() {
        if (this.background.classList.contains('visible')) {
            this.background.classList.remove('visible');
            await this._wait(this.transitionDuration);
        }
        this.background.hidden = true;
    }

    updateAnimationText(text) {
        if (!this.animateElement) return;

        
        const animationClass = 'animated';
        const animationNameClass = 'flipIn';

        
        this.animateElement.textContent = text || '';
        this.animateElement.classList.remove(animationClass, animationNameClass);

        
        if (text) {
            
            
            setTimeout(() => {
                if (this.animateElement) { 
                    this.animateElement.classList.add(animationClass, animationNameClass);
                }
            }, 50); 
        }
    }
    
    exportSnapshot() {
        try {
            const visible = !this.background.hidden && this.background.classList.contains('visible');
            
            const bg = this.background && this.background.style ? this.background.style.backgroundImage || '' : '';
            let url = null;
            const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
            if (m && m[1]) url = m[1];
            const text = this.animateElement ? (this.animateElement.textContent || '') : '';
            return {
                visible: !!visible,
                image: url ? { src: String(url) } : null,
                text: text
            };
        } catch (e) {
            console.warn('[CG] exportSnapshot failed:', e);
            return { visible: false, image: null, text: '' };
        }
    }

    
    async importSnapshot(s) {
        try {
            if (!s || s.visible === false || !(s.image && s.image.src)) {
                
                if (this.background.classList.contains('visible')) {
                    this.background.classList.remove('visible');
                    await this._wait(this.transitionDuration);
                }
                this.background.hidden = true;
                this.updateAnimationText('');
                return;
            }
            
            this.updateAnimationText(s.text || '');
            this.background.style.backgroundImage = `url('${s.image.src}')`;
            this.background.hidden = false;
            await new Promise(r => setTimeout(r, 20));
            if (!this.background.classList.contains('visible')) {
                this.background.classList.add('visible');
            }
        } catch (e) {
            console.warn('[CG] importSnapshot failed:', e);
        }
    }


}