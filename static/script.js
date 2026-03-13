const tele = window.Telegram.WebApp;
tele.expand();

const STATE = {
    user_id: 7918103039, // Default for testing, will get from tele.initDataUnsafe
    bots: [],
    currentBot: null
};

// UI Elements
const loader = document.getElementById('loader');
const app = document.getElementById('app');
const botsContainer = document.getElementById('bots-container');
const botList = document.getElementById('bot-list');
const botEdit = document.getElementById('bot-edit');
const backBtn = document.getElementById('back-btn');
const pageTitle = document.getElementById('page-title');
const editForm = document.getElementById('edit-form');

// Initialization
async function init() {
    if (tele.initDataUnsafe && tele.initDataUnsafe.user) {
        STATE.user_id = tele.initDataUnsafe.user.id;
    }
    
    await fetchBots();
    renderBotList();
    
    loader.classList.add('hidden');
    app.classList.remove('hidden');
}

async function fetchBots() {
    try {
        const response = await fetch(`/api/bots/${STATE.user_id}`);
        STATE.bots = await response.json();
    } catch (error) {
        console.error("Failed to fetch bots:", error);
        showToast("Error loading bots", "error");
    }
}

function renderBotList() {
    botsContainer.innerHTML = '';
    
    if (STATE.bots.length === 0) {
        botsContainer.innerHTML = '<p class="text-dim">No cloned bots found.</p>';
        return;
    }

    STATE.bots.forEach(bot => {
        const card = document.createElement('div');
        card.className = 'bot-card';
        card.innerHTML = `
            <div class="bot-icon">${bot.name ? bot.name.charAt(0) : '🤖'}</div>
            <div class="bot-name">${bot.name || 'Unnamed Bot'}</div>
            <div class="bot-username">@${bot.username}</div>
        `;
        card.onclick = () => showEditView(bot);
        botsContainer.appendChild(card);
    });
}

function updatePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (input.value && (input.value.startsWith('http') || input.value.startsWith('https'))) {
        preview.src = input.value;
        preview.classList.remove('hidden');
    } else {
        preview.classList.add('hidden');
    }
}

function showEditView(bot) {
    STATE.currentBot = bot;
    
    // Fill form
    document.getElementById('edit-bot-id').value = bot.bot_id;
    document.getElementById('edit-name').value = bot.name || '';
    document.getElementById('edit-support').value = bot.support || '';
    document.getElementById('edit-channel').value = bot.channel || '';
    document.getElementById('edit-start-img').value = bot.start_img || '';
    document.getElementById('edit-ping-img').value = bot.ping_img || '';
    document.getElementById('edit-playlist-img').value = bot.playlist_img || '';
    document.getElementById('edit-start-msg').value = bot.start_msg || '';
    document.getElementById('edit-logchannel').value = bot.logchannel || '';
    document.getElementById('edit-show-owner').checked = bot.show_owner === true;
    document.getElementById('edit-logging').checked = bot.logging !== false;

    // Update initial previews
    updatePreview('edit-start-img', 'preview-start-img');
    updatePreview('edit-ping-img', 'preview-ping-img');
    updatePreview('edit-playlist-img', 'preview-playlist-img');

    // Switch views
    botList.classList.add('hidden');
    botEdit.classList.remove('hidden');
    backBtn.classList.remove('hidden');
    pageTitle.innerText = `Edit @${bot.username}`;
}

// Bind URL change events for live preview
document.getElementById('edit-start-img').oninput = () => updatePreview('edit-start-img', 'preview-start-img');
document.getElementById('edit-ping-img').oninput = () => updatePreview('edit-ping-img', 'preview-ping-img');
document.getElementById('edit-playlist-img').oninput = () => updatePreview('edit-playlist-img', 'preview-playlist-img');

function showListView() {
    botEdit.classList.add('hidden');
    botList.classList.remove('hidden');
    backBtn.classList.add('hidden');
    pageTitle.innerText = "My Cloned Bots";
    STATE.currentBot = null;
}

// Image Upload Logic
async function handleFileUpload(input, targetId) {
    const file = input.files[0];
    if (!file) return;

    showToast("Uploading image...", "info");
    
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById(targetId).value = data.url;
            updatePreview(targetId, targetId.replace('edit-', 'preview-'));
            showToast("Upload successful!", "success");
        } else {
            throw new Error(data.detail);
        }
    } catch (error) {
        console.error("Upload failed:", error);
        showToast("Upload failed", "error");
    }
}

// Bind file inputs
document.getElementById('upload-start-img').onchange = (e) => handleFileUpload(e.target, 'edit-start-img');
document.getElementById('upload-ping-img').onchange = (e) => handleFileUpload(e.target, 'edit-ping-img');
document.getElementById('upload-playlist-img').onchange = (e) => handleFileUpload(e.target, 'edit-playlist-img');

// Form Submit
editForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
        bot_id: parseInt(document.getElementById('edit-bot-id').value),
        user_id: STATE.user_id,
        name: document.getElementById('edit-name').value,
        support: document.getElementById('edit-support').value,
        channel: document.getElementById('edit-channel').value,
        start_img: document.getElementById('edit-start-img').value,
        ping_img: document.getElementById('edit-ping-img').value,
        playlist_img: document.getElementById('edit-playlist-img').value,
        start_msg: document.getElementById('edit-start-msg').value,
        logchannel: document.getElementById('edit-logchannel').value,
        show_owner: document.getElementById('edit-show-owner').checked,
        logging: document.getElementById('edit-logging').checked
    };

    try {
        const response = await fetch('/api/update_bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            showToast("Changes saved!", "success");
            await fetchBots();
            setTimeout(showListView, 1000);
        } else {
            throw new Error(data.detail);
        }
    } catch (error) {
        showToast("Failed to save", "error");
    }
};

function showToast(message, type = "success") {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'success' ? '#10b981' : (type === 'error' ? '#f43f5e' : '#6366f1');
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

backBtn.onclick = showListView;

init();
