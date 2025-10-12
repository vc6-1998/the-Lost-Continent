class ChoiceManager {
    constructor(container, promptElement, optionsElement) {
        this.container = container;
        this.promptElement = promptElement;
        this.optionsElement = optionsElement;
        this.choiceResolve = null;

        this._boundHandleClick = this._handleClick.bind(this);
    }

    /**
     * 【已修正】现在 Promise 会返回被选中的选项的索引 (index)
     * @param {string} prompt
     * @param {Array<object>} options
     * @returns {Promise<number>}
     */
    show(prompt, options) {
        this.promptElement.textContent = prompt;
        this.optionsElement.innerHTML = '';

        
        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.textContent = option.text;
            
            button.dataset.choiceIndex = index; 
            this.optionsElement.appendChild(button);
        });

        this.container.hidden = false;
        
        this.optionsElement.addEventListener('mousedown', this._boundHandleClick);

        return new Promise(resolve => {
            this.choiceResolve = resolve;
        });
    }

    hide() {
        this.container.hidden = true;
        this.optionsElement.removeEventListener('mousedown', this._boundHandleClick);
    }

    _handleClick(e) {
        if (e.target.classList.contains('choice-button')) {
            
            const chosenIndex = parseInt(e.target.dataset.choiceIndex, 10);

            if (this.choiceResolve) {
                
                this.choiceResolve(chosenIndex); 
                this.choiceResolve = null;
            }
            
            this.hide();
        }
    }
}