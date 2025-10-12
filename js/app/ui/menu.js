document.getElementById('menuButton').onclick = toggleMenu;

function toggleMenu() {
    var menuPanel = document.getElementById('menuPanel');
    var overlay = document.getElementById('overlay');
    menuPanel.style.display = (menuPanel.style.display === 'block' ? 'none' : 'block');
    overlay.style.display = (overlay.style.display === 'block' ? 'none' : 'block');
}









function save(){
    
    var now = new Date();
    var timestamp = now.getFullYear() + '-' +
        (now.getMonth() + 1).toString().padStart(2, '0') + '-' +
        now.getDate().toString().padStart(2, '0') + ' ' +
        now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0') + ':' +
        now.getSeconds().toString().padStart(2, '0');

    
    localStorage.setItem('currentSaveTime', timestamp);


        var tempurl
    tempurl=window.location.href
    localStorage.setItem('tempurl',tempurl)
    window.location.href="../xuanze.html"
    
    
    window.location.href = "../xuanze.html";
}

function initializeSlots() {
    document.querySelectorAll('.save-slot').forEach(function(slot, index) {
        var saveTime = localStorage.getItem(`saveSlot${index + 1}`);
        if (saveTime) {
            slot.innerText = `存档${index + 1}: ${saveTime}`;
        } else {
            slot.innerText = `存档${index + 1}（空）`;
        }
    });
}









function goHome() {
    window.location.href = "../../start.html"; 
}

