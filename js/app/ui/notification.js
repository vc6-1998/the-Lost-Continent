document.addEventListener('DOMContentLoaded', async () => {
    const NotificationManager = (function() {
        const notificationElement = document.getElementById('item-notification');
        const iconElement = document.getElementById('item-notification-icon');
        const textElement = document.getElementById('item-notification-text');
        let currentTimeout = null; 

        function show(item) {
            
            if (currentTimeout) {
                clearTimeout(currentTimeout);
            }

            const imageUrl = item.image ? `url('${item.image}')` : 'none';
            iconElement.style.backgroundImage = imageUrl || "url('./assets/img/item/file.png')"; 
            textElement.textContent = `获得物品：${item.name} （按B进入背包查看细节）`;

            
            notificationElement.classList.add('visible');

            currentTimeout = setTimeout(() => {
                notificationElement.classList.remove('visible');
                currentTimeout = null; 
            }, 2500); 
        }

        
        return {
            show: show
        };

})();

window.NotificationManager = NotificationManager;
})


