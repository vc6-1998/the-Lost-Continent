

(function() {
    const StatusDisplay = {
        
        virtueValueEl: null,
        virtueBarFillEl: null,
        historyValueEl: null,
        historyBarFillEl: null,
        virtueClasses: ['virtue-color-neg', 'virtue-color-low', 'virtue-color-mid', 'virtue-color-high'],
        historyClasses: ['history-color-neg', 'history-color-low', 'history-color-mid', 'history-color-high'],

        init() {
            
            this.virtueValueEl = document.getElementById('virtue-value');
            this.virtueBarFillEl = document.getElementById('virtue-bar-fill');
            this.historyValueEl = document.getElementById('history-value');
            this.historyBarFillEl = document.getElementById('history-bar-fill');
            console.log('[StatusDisplay] UI Initialized (Asymmetric v1).');
            this.update();
        },

        update() {
            if (!this.virtueValueEl) return; 

            const virtue = window.currentSaveData?.virtue || 0;
            const history = window.currentSaveData?.history || 0;

            this._updateBar(this.virtueValueEl, this.virtueBarFillEl, virtue, this.virtueClasses, [0, 40, 90]);
            this._updateBar(this.historyValueEl, this.historyBarFillEl, history, this.historyClasses, [0, 40, 95]);
        },
        /**
 * 读档/导入状态后调用：用 currentSaveData 立即刷新状态条显示
 */
        refreshFromState() {
            try {
                this.update();
            } catch (e) {
                console.warn('[StatusDisplay] refreshFromState failed:', e);
            }
        },

        
        _updateBar(valueEl, barFillEl, value, colorClasses, thresholds) {
            
            const NEG_RANGE = 40;
            const POS_RANGE = 100;
            const TOTAL_RANGE = NEG_RANGE + POS_RANGE;
            const NEG_PERCENT = (NEG_RANGE / TOTAL_RANGE) * 100; 
            const POS_PERCENT = (POS_RANGE / TOTAL_RANGE) * 100; 

            
            const clampedValue = Math.max(-NEG_RANGE, Math.min(POS_RANGE, value));
            valueEl.textContent = (clampedValue >= 0 ? '+' : '') + clampedValue;

            
            let colorClass;
            if (clampedValue < thresholds[0]) {
                colorClass = colorClasses[0];
            } else if (clampedValue < thresholds[1]) {
                colorClass = colorClasses[1];
            } else if (clampedValue < thresholds[2]) {
                colorClass = colorClasses[2];
            } else {
                colorClass = colorClasses[3];
            }
            barFillEl.classList.remove(...colorClasses);
            barFillEl.classList.add(colorClass);

            
            if (clampedValue >= 0) {
                
                const widthPercent = (clampedValue / POS_RANGE) * POS_PERCENT;
                barFillEl.style.width = widthPercent + '%';
                barFillEl.style.left = NEG_PERCENT + '%';
                barFillEl.style.right = 'auto';

                
                valueEl.style.left = `calc(${NEG_PERCENT}% + 5px)`;
                valueEl.style.right = 'auto';
            } else {
                
                const widthPercent = (Math.abs(clampedValue) / NEG_RANGE) * NEG_PERCENT;
                barFillEl.style.width = widthPercent + '%';
                barFillEl.style.right = POS_PERCENT + '%';
                barFillEl.style.left = 'auto';

                
                valueEl.style.right = `calc(${POS_PERCENT}% + 5px)`;
                valueEl.style.left = 'auto';
            }
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        StatusDisplay.init();
    });

    window.StatusDisplay = StatusDisplay;
})();