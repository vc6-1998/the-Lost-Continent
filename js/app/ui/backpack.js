class Backpack {
    constructor(saveSystem) {

        this.bag = document.getElementById('bag');
        this.detailImage = document.getElementById('detailImage');
        this.detailName = document.getElementById('detailName');
        this.detailType = document.getElementById('detailType');
        this.detailDescription = document.getElementById('detailDescription');
        this.itemsGrid = document.querySelector('.items-grid');
        this.closeBtn = document.querySelector('.close-btn');

        this.saveSystem = saveSystem;
        this.onClose = null;
        if (this.closeBtn) this.closeBtn.setAttribute('data-no-click-sound', '1')
        this.closeBtn.addEventListener('click', () => {
            this.hide();
        });
    }

    updateItemDetails(item) {
        if (item && item.name) {
            
            const imageUrl = item.image ? `url('${item.image}')` : 'none';
            
            this.detailImage.style.backgroundImage = imageUrl;
            this.detailName.textContent = item.name;
            this.detailType.textContent = item.type || '';
            this.detailDescription.textContent = item.description || '';
        } else {
            
            this.detailImage.style.backgroundImage = 'none';
            this.detailName.textContent = '';
            this.detailType.textContent = '';
            this.detailDescription.textContent = '';
        }
    }

    renderItems() {
        this.itemsGrid.innerHTML = '';
        
        const items = this.saveSystem.getInventory();

        for (let i = 0; i < 12; i++) {
            const itemElement = document.createElement('div');
            itemElement.className = 'item';

            const currentItem = items[i];

            if (currentItem) {
                
                const imageUrl = currentItem.image ? `url('${currentItem.image}')` : 'none';
                
                itemElement.innerHTML = `
                    <div class="item-image" style="background-image: ${imageUrl}"></div>
                    ${currentItem.count > 1 ? `<div class="item-count">${currentItem.count}</div>` : ''}
                `;

                itemElement.addEventListener('click', () => {
                    this.itemsGrid.querySelectorAll('.item').forEach(el => el.classList.remove('selected'));
                    itemElement.classList.add('selected');
                    this.updateItemDetails(currentItem);
                });
            }

            this.itemsGrid.appendChild(itemElement);
        }
        
        const firstItem = items[0] || null;
        if (firstItem) {
            const firstItemElement = this.itemsGrid.querySelector('.item:not(:empty)');
            if (firstItemElement) firstItemElement.classList.add('selected');
            this.updateItemDetails(firstItem);
        } else {
            this.updateItemDetails(null);
        }
    }
    /**
 * 读档/导入状态后调用：根据 SaveSystem.currentSaveData 重新渲染背包
 */
    refreshFromState() {
        try {
            this.renderItems();
        } catch (e) {
            console.warn('[Backpack] refreshFromState failed:', e);
        }
    }

    
    show(onCloseCallback) {
        
        if (typeof onCloseCallback === 'function') {
            this.onClose = onCloseCallback;
        }

        this.renderItems(); 
        this.bag.hidden = false;
        if (window.GameAudio && typeof GameAudio.playSE === 'function') {
                 GameAudio.playSE('backpack_open', { throttle: 150 });
                }
    }

    /**
     * 【已修改】hide 方法现在会触发回调
     */
    hide() {
        if (this.bag.hidden) return; 

        this.bag.hidden = true;
        if (window.GameAudio && typeof GameAudio.playSE === 'function') {
                  GameAudio.playSE('backpack_close', { throttle: 150 });
               }
        
        if (this.onClose) {
            this.onClose();
        }

        
        this.onClose = null;
    }
}
