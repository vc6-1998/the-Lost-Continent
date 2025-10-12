class DialogueManager {
    constructor(dialogueContainer, characterImage, dialogueText) {
        this.dialogueContainer = dialogueContainer;
        this.characterImage = characterImage;
        this.dialogueText = dialogueText;

        this.typingInterval = null;
        this.currentText = '';
        this.userInputResolve = null;
        this.isHintVisible = false;

        this.hintTimeout = null; // <-- ADD THIS LINE
        this._boundHandleInput = this._handleInput.bind(this);
    }
 
    /**
     * 【修改点】重构了输入处理逻辑
     */
    _handleInput(e) {
        if (this.typingInterval) {
            e.preventDefault();
            clearInterval(this.typingInterval);
            this.typingInterval = null;
            this.dialogueText.textContent = this.currentText;
            return;
        }


        const isAdvanceAction = 
            (e.code === 'Space') || 
            (e.type === 'mousedown' && e.button === 0); 

        if (this.userInputResolve && isAdvanceAction) {
            e.preventDefault();
            this.userInputResolve();
            this.userInputResolve = null;
        }
    }

    _awaitUserInput() {
        return new Promise(resolve => {
            this.userInputResolve = resolve;
            
            document.addEventListener('keydown', this._boundHandleInput);
            document.addEventListener('mousedown', this._boundHandleInput);
        });
    }
    
    _cleanupListeners() {
        document.removeEventListener('keydown', this._boundHandleInput);
        document.removeEventListener('mousedown', this._boundHandleInput);
    }

    async show(dialogData) {
        if (this.isHintVisible) {
            this.hideHint();
        }
        
        this.dialogueContainer.hidden = false;

        if (dialogData.characterImage && dialogData.characterImage.src) {
            this.characterImage.src = dialogData.characterImage.src;
            this.characterImage.hidden = false;
        } else {
            this.characterImage.hidden = true;
        }

        this.typeText(this.dialogueText, dialogData.text);

        await this._awaitUserInput();

        this._cleanupListeners();
    }

    hide() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
        if (this.dialogueContainer) {
            this.dialogueContainer.hidden = true;
            this.dialogueText.textContent = '';
            this.characterImage.src = '';
        }
        if (this.userInputResolve) {
            this.userInputResolve();
            this.userInputResolve = null;
        }
        this._cleanupListeners();
        this.isHintVisible = false;
    }

    typeText(element, text, speed = 30) {
        element.textContent = '';
        this.currentText = text;
        let i = 0;
        if (this.typingInterval) clearInterval(this.typingInterval);

        this.typingInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(this.typingInterval);
                this.typingInterval = null;
            }
        }, speed);
    }
    
    
    showHint(hintData) {
        if (this.isHintVisible) return;
        this.characterImage.hidden = true;
        this.dialogueText.textContent = hintData.text;
        this.dialogueContainer.hidden = false;
        this.dialogueContainer.classList.add('hint-mode'); 
        this.isHintVisible = true;
    }

    hideHint() {
        if (!this.isHintVisible) return;
        this.dialogueContainer.hidden = true;
        this.dialogueText.textContent = '';
        this.dialogueContainer.classList.remove('hint-mode');
        this.isHintVisible = false;
    }
}