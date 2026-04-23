// ── DOM refs ──────────────────────────────────────────────────────────────────
const chatBox         = document.getElementById('chat-box');
const messageFeed     = document.getElementById('message-feed');
const userInput       = document.getElementById('user-input');
const sendBtn         = document.getElementById('send-btn');
const modelSelect     = document.getElementById('model-select');
const modelBtn        = document.getElementById('model-btn');
const modelModal      = document.getElementById('model-modal');
const modelModalBackdrop = document.getElementById('model-modal-backdrop');
const modelList       = document.getElementById('model-list');
const saveModelBtn    = document.getElementById('save-model-btn');
const cancelModelBtn  = document.getElementById('cancel-model-btn');
const newChatBtn      = document.getElementById('new-chat-btn');
const clearAllBtn     = document.getElementById('clear-all-btn');
const settingsBtn     = document.getElementById('settings-btn');
const settingsPanel   = document.getElementById('settings-panel');
const settingsBackdrop= document.getElementById('settings-backdrop');
const closeSettingsBtn= document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const sidebarToggle   = document.getElementById('sidebar-toggle');
const sidebar         = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const chatList        = document.getElementById('chat-list');
const temperatureInput= document.getElementById('temperature');
const topPInput       = document.getElementById('top_p');
const topKInput       = document.getElementById('top_k');
const numPredictInput = document.getElementById('num_predict');
const generatingIndicator = document.getElementById('generating-indicator');

// ── State ─────────────────────────────────────────────────────────────────────
let chats = {};         // { [id]: { id, name, messages: [{role, content, timestamp}], createdAt } }
let currentChatId = null;
let isStreaming = false;
let allModels = [];     // Store all model data from API
let selectedModelName = '';  // Currently selected model
let tempSelectedModel = '';  // Temporary selection for unsaved changes
let abortController = null;  // For canceling fetch requests

let settings = {
    temperature: 0.8,
    top_p: 0.9,
    top_k: 40,
    num_predict: 2048   // FIX: was 128 — that's why stories got cut mid-sentence
};

let tempSettings = {  // Temporary settings for unsaved changes
    temperature: 0.8,
    top_p: 0.9,
    top_k: 40,
    num_predict: 2048
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatTime(isoString) {
    return new Date(isoString).toLocaleString(undefined, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// ── Persistence ───────────────────────────────────────────────────────────────
function saveChats() {
    localStorage.setItem('ollama_chats_v2', JSON.stringify(chats));
}

function saveCurrentChatId() {
    if (currentChatId) localStorage.setItem('ollama_current_chat_v2', currentChatId);
}

function saveSettings() {
    settings.temperature  = parseFloat(temperatureInput.value);
    settings.top_p        = parseFloat(topPInput.value);
    settings.top_k        = parseInt(topKInput.value);
    settings.num_predict  = parseInt(numPredictInput.value);
    localStorage.setItem('ollama_settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('ollama_settings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
        temperatureInput.value = settings.temperature;
        topPInput.value        = settings.top_p;
        topKInput.value        = settings.top_k;
        numPredictInput.value  = settings.num_predict;
    }
}

// ── Chat management ───────────────────────────────────────────────────────────
function createNewChat() {
    const id = generateId();
    chats[id] = {
        id,
        name: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString()
    };
    saveChats();
    switchToChat(id);
    closeSidebar();
    userInput.focus();
    return id;
}

function switchToChat(id) {
    if (!chats[id]) return;
    currentChatId = id;
    saveCurrentChatId();
    renderChatList();
    renderMessages();
    closeSidebar();
}

function deleteChat(id) {
    delete chats[id];
    saveChats();
    const remaining = Object.keys(chats);
    if (remaining.length === 0) {
        createNewChat();
    } else if (currentChatId === id) {
        // Switch to the most recent remaining chat
        const sorted = Object.values(chats).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        switchToChat(sorted[0].id);
    } else {
        renderChatList();
    }
}

function clearAllChats() {
    if (!confirm('Delete all chat history? This cannot be undone.')) return;
    chats = {};
    saveChats();
    createNewChat();
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderChatList() {
    const sorted = Object.values(chats).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (sorted.length === 0) {
        chatList.innerHTML = '<p class="text-xs text-gray-600 text-center px-2 py-4">No chats yet</p>';
        return;
    }

    chatList.innerHTML = sorted.map(chat => `
        <div class="chat-item ${chat.id === currentChatId ? 'active' : ''}" data-id="${chat.id}">
            <span class="chat-item-name" title="${chat.name}">${chat.name}</span>
            <button class="chat-delete-btn" data-id="${chat.id}" title="Delete chat">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `).join('');

    chatList.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-delete-btn')) {
                switchToChat(item.dataset.id);
            }
        });
    });

    chatList.querySelectorAll('.chat-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(btn.dataset.id);
        });
    });
}

function renderMessages() {
    messageFeed.innerHTML = '';
    const chat = chats[currentChatId];
    if (!chat) return;

    if (chat.messages.length === 0) {
        messageFeed.innerHTML = `
            <div class="bg-blue-900/20 border border-blue-800/50 p-2 sm:p-3 rounded-lg text-sm text-blue-200">
                System: New chat. Select a model and start chatting.
            </div>`;
        return;
    }

    chat.messages.forEach(msg => {
        appendMessageToDOM(msg.role, msg.content, msg.timestamp);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

function parseThinkingAndContent(text) {
    const thinkingMatch = text.match(/<(?:thinking|think)>(.*?)<\/(?:thinking|think)>/is);
    if (thinkingMatch) {
        const thinking = thinkingMatch[1].trim();
        const content = text.replace(thinkingMatch[0], '').trim();
        return { thinking, content };
    }
    return { thinking: null, content: text };
}

function createThinkingElement(thinkingText) {
    const section = document.createElement('div');
    section.className = 'thinking-section';
    
    const header = document.createElement('div');
    header.className = 'thinking-header';
    
    const toggle = document.createElement('span');
    toggle.className = 'thinking-toggle';
    toggle.textContent = '▼';
    
    const title = document.createElement('span');
    title.className = 'thinking-title';
    title.textContent = '💭 Model Thinking';
    
    header.appendChild(toggle);
    header.appendChild(title);
    
    const content = document.createElement('div');
    content.className = 'thinking-content';
    content.innerHTML = marked.parse(thinkingText);
    
    section.appendChild(header);
    section.appendChild(content);
    
    header.addEventListener('click', () => {
        toggle.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
    });
    
    return section;
}

function appendMessageToDOM(role, text, timestamp) {
    const div = document.createElement('div');
    div.className = `p-3 sm:p-4 rounded-xl max-w-[95%] sm:max-w-[85%] ${
        role === 'user'
            ? 'bg-blue-600 text-white ml-auto'
            : 'bg-gray-800 text-gray-100 mr-auto'
    }`;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'timestamp';
    timeDiv.innerText = timestamp || '';
    div.appendChild(timeDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (role === 'assistant') {
        const { thinking, content } = parseThinkingAndContent(text);
        
        if (thinking) {
            const thinkingEl = createThinkingElement(thinking);
            div.appendChild(thinkingEl);
        }
        
        contentDiv.innerHTML = content === '...' ? '' : marked.parse(content);
    } else {
        contentDiv.innerText = text;
    }
    
    div.appendChild(contentDiv);
    messageFeed.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

// ── Fetch models ──────────────────────────────────────────────────────────────
async function loadModels() {
    try {
        const res = await fetch('http://localhost:11434/api/tags');
        const data = await res.json();
        if (!data.models || data.models.length === 0) {
            modelList.innerHTML = '<p class="text-gray-400">No models found</p>';
            return;
        }
        allModels = data.models;
        if (allModels.length > 0 && !selectedModelName) {
            selectedModelName = allModels[0].name;
        }
        renderModelModal();
        updateModelButtonText();
    } catch {
        modelList.innerHTML = '<p class="text-red-400">Error connecting to Ollama</p>';
    }
}

function renderModelModal() {
    modelList.innerHTML = allModels.map(model => `
        <div class="model-option ${model.name === tempSelectedModel ? 'selected' : ''}" data-model="${model.name}">
            <input type="radio" class="model-radio" name="model" value="${model.name}" ${model.name === tempSelectedModel ? 'checked' : ''}>
            <div class="model-info">
                <div class="model-name">${model.name}</div>
                <div class="model-details">
                    ${model.details ? `<div><strong>Size:</strong> ${formatBytes(model.details.parameter_size || 0)}</div>` : ''}
                    ${model.details?.quantization_level ? `<div><strong>Quantization:</strong> ${model.details.quantization_level}</div>` : ''}
                    ${model.modified_at ? `<div><strong>Modified:</strong> ${new Date(model.modified_at).toLocaleDateString()}</div>` : ''}
                    ${model.digest ? `<div><strong>Digest:</strong> <code style="font-size: 0.75rem; color: #9ca3af;">${model.digest.substring(0, 16)}...</code></div>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    // Add click handlers to model options
    modelList.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', () => {
            const modelName = option.dataset.model;
            tempSelectedModel = modelName;
            modelList.querySelectorAll('.model-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            option.querySelector('input[type="radio"]').checked = true;
        });
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function openModelModal() {
    // Reset to current saved state
    tempSelectedModel = selectedModelName;
    modelModal.classList.add('show');
    modelModalBackdrop.classList.add('show');
    renderModelModal();
}

function closeModelModal() {
    modelModal.classList.remove('show');
    modelModalBackdrop.classList.remove('show');
}

function updateModelButtonText() {
    if (selectedModelName) {
        modelBtn.textContent = selectedModelName;
    } else {
        modelBtn.textContent = 'Loading models...';
    }
}

function openSettingsModal() {
    // Reset to current saved state
    tempSettings = { ...settings };
    temperatureInput.value = tempSettings.temperature;
    topPInput.value = tempSettings.top_p;
    topKInput.value = tempSettings.top_k;
    numPredictInput.value = tempSettings.num_predict;
    settingsPanel.style.display = 'block';
    settingsBackdrop.style.display = 'block';
}

function closeSettingsModal() {
    settingsPanel.style.display = 'none';
    settingsBackdrop.style.display = 'none';
}


// ── Send message ──────────────────────────────────────────────────────────────
async function stopMessage() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
}

async function sendMessage() {
    if (isStreaming) return;

    const text = userInput.value.trim();
    const model = selectedModelName;
    if (!text || !currentChatId || !model) return;

    const chat = chats[currentChatId];
    const timestamp = formatTime(new Date().toISOString());

    // Auto-name the chat from the first user message
    if (chat.messages.length === 0) {
        chat.name = text.length > 35 ? text.slice(0, 35) + '…' : text;
        renderChatList();
    }

    // Push user message into chat history
    const userMsg = { role: 'user', content: text, timestamp };
    chat.messages.push(userMsg);
    saveChats();

    userInput.value = '';
    userInput.style.height = 'auto';
    appendMessageToDOM('user', text, timestamp);

    // Placeholder for assistant
    const aiTimestamp = formatTime(new Date().toISOString());
    const aiDiv = appendMessageToDOM('assistant', '...', aiTimestamp);
    const aiContent = aiDiv.querySelector('.message-content');


    isStreaming = true;
    updateSendButtonToStop();
    if (generatingIndicator) generatingIndicator.style.display = 'flex';
    
    // Create abort controller for this request
    abortController = new AbortController();

    try {
        // FIX: Use /api/chat instead of /api/generate — this sends full conversation history
        // so the model has context of previous messages in this chat session.
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                // Send full history so the model knows what was said before
                messages: chat.messages.map(m => ({ role: m.role, content: m.content })),
                stream: true,
                options: {
                    temperature:  settings.temperature,
                    top_p:        settings.top_p,
                    top_k:        settings.top_k,
                    num_predict:  settings.num_predict
                }
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let buffer = '';
        let evalCount = 0;
        let evalDuration = 0;
        let thinkingDisplayed = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // FIX: Buffer chunks — a single `value` can contain a partial JSON line
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // Keep the last (potentially incomplete) line in the buffer
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    // /api/chat returns { message: { role, content } }
                    if (json.message?.content) {
                        fullResponse += json.message.content;
                        if (aiContent) {
                            const { thinking, content } = parseThinkingAndContent(fullResponse);
                            
                            // Add thinking section if found and not yet displayed
                            if (thinking && !thinkingDisplayed) {
                                const thinkingEl = createThinkingElement(thinking);
                                aiDiv.insertBefore(thinkingEl, aiContent);
                                thinkingDisplayed = true;
                            }
                            
                            // Update main content
                            aiContent.innerHTML = marked.parse(content);
                        }
                        chatBox.scrollTop = chatBox.scrollHeight;
                    }
                    // Track metrics from final response
                    if (json.eval_count) {
                        evalCount = json.eval_count;
                    }
                    if (json.eval_duration) {
                        evalDuration = json.eval_duration;
                    }
                } catch {
                    // Malformed JSON chunk — skip silently
                }
            }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
            try {
                const json = JSON.parse(buffer);
                if (json.message?.content) {
                    fullResponse += json.message.content;
                    if (aiContent) {
                        const { thinking, content } = parseThinkingAndContent(fullResponse);
                        
                        // Add thinking section if found and not yet displayed
                        if (thinking && !thinkingDisplayed) {
                            const thinkingEl = createThinkingElement(thinking);
                            aiDiv.insertBefore(thinkingEl, aiContent);
                            thinkingDisplayed = true;
                        }
                        
                        // Update main content
                        aiContent.innerHTML = marked.parse(content);
                    }
                }
                // Track metrics from final response
                if (json.eval_count) {
                    evalCount = json.eval_count;
                }
                if (json.eval_duration) {
                    evalDuration = json.eval_duration;
                }
            } catch { /* ignore */ }
        }

        // Calculate and append tokens per second
        let tokensPerSecond = 0;
        if (evalDuration > 0 && evalCount > 0) {
            tokensPerSecond = evalCount / (evalDuration / 1e9); // Convert nanoseconds to seconds
        }
        const tpsText = tokensPerSecond > 0 ? `<div class="text-xs text-gray-500 mt-2">⚡ ${tokensPerSecond.toFixed(2)} tokens/sec</div>` : '';

        // Save assistant reply into history
        if (fullResponse) {
            // Append tokens per second to message display
            if (aiContent && tpsText) {
                aiContent.innerHTML += tpsText;
            }
            chat.messages.push({ role: 'assistant', content: fullResponse, timestamp: aiTimestamp, evalCount, evalDuration });
            saveChats();
        } else {
            if (aiContent) aiContent.innerText = '[No response received]';
        }

    } catch (err) {
        // Don't show error for abort
        if (err.name === 'AbortError') {
            // Keep already generated content and just append stopped indicator
            const fullResponse = messageFeed.querySelector('div:last-of-type .message-content')?.textContent || '';
            if (aiContent && fullResponse) {
                aiContent.innerHTML += `<div class="text-xs text-yellow-400 mt-2 italic">⏹ Generation stopped by user</div>`;
            }
            // Save the partial response
            if (fullResponse && fullResponse.trim()) {
                chat.messages.push({ role: 'assistant', content: fullResponse.replace('⏹ Generation stopped by user', '').trim(), timestamp: aiTimestamp, stopped: true });
                saveChats();
            }
        } else {
            if (aiContent) {
                aiContent.innerHTML = `<span class="text-red-400">Error: ${err.message || 'Make sure Ollama is running (ollama serve).'}</span>`;
            }
            // Remove the failed message from history so it doesn't corrupt context
            if (chat.messages[chat.messages.length - 1]?.role === 'user') {
                chat.messages.pop();
                saveChats();
            }
        }
    } finally {
        isStreaming = false;
        updateSendButtonToSend();
        if (generatingIndicator) generatingIndicator.style.display = 'none';
        abortController = null;
    }
}

function updateSendButtonToStop() {
    sendBtn.classList.add('stop-mode');
    sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="4" width="12" height="12" rx="2"/></svg>';
}

function updateSendButtonToSend() {
    sendBtn.classList.remove('stop-mode');
    sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>';

}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function openSidebar() {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('visible');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('visible');
}

// ── Auto-resize textarea ──────────────────────────────────────────────────────
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 160) + 'px';
});

// ── Event listeners ───────────────────────────────────────────────────────────
sendBtn.addEventListener('click', () => {
    if (isStreaming) {
        stopMessage();
    } else {
        sendMessage();
    }
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Model modal handlers
modelBtn.addEventListener('click', openModelModal);
modelModalBackdrop.addEventListener('click', closeModelModal);
cancelModelBtn.addEventListener('click', closeModelModal);
saveModelBtn.addEventListener('click', () => {
    // Save the temporary selection to the actual state
    selectedModelName = tempSelectedModel;
    updateModelButtonText();
    closeModelModal();
});

// Settings modal handlers
settingsBtn.addEventListener('click', openSettingsModal);
closeSettingsBtn.addEventListener('click', closeSettingsModal);
settingsBackdrop.addEventListener('click', closeSettingsModal);
saveSettingsBtn.addEventListener('click', () => {
    // Save temporary settings to actual settings
    settings.temperature = parseFloat(temperatureInput.value);
    settings.top_p = parseFloat(topPInput.value);
    settings.top_k = parseInt(topKInput.value);
    settings.num_predict = parseInt(numPredictInput.value);
    localStorage.setItem('ollama_settings', JSON.stringify(settings));
    closeSettingsModal();
});

newChatBtn.addEventListener('click', createNewChat);
clearAllBtn.addEventListener('click', clearAllChats);

sidebarToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
});
sidebarBackdrop.addEventListener('click', closeSidebar);

[temperatureInput, topPInput, topKInput, numPredictInput].forEach(input => {
    input.addEventListener('change', () => {
        // Update temp settings but don't save yet
        tempSettings.temperature = parseFloat(temperatureInput.value);
        tempSettings.top_p = parseFloat(topPInput.value);
        tempSettings.top_k = parseInt(topKInput.value);
        tempSettings.num_predict = parseInt(numPredictInput.value);
    });
});

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
    loadSettings();
    loadModels();

    const savedChats = localStorage.getItem('ollama_chats_v2');
    if (savedChats) {
        chats = JSON.parse(savedChats);
    }

    const savedCurrentId = localStorage.getItem('ollama_current_chat_v2');
    if (savedCurrentId && chats[savedCurrentId]) {
        currentChatId = savedCurrentId;
        renderChatList();
        renderMessages();
    } else if (Object.keys(chats).length > 0) {
        const sorted = Object.values(chats).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        currentChatId = sorted[0].id;
        renderChatList();
        renderMessages();
    } else {
        createNewChat();
    }
}

init();
