import { BLOCKED_DOMAINS } from './config.js';

let socket = null;
const WS_URL = 'ws://127.0.0.1:9999';
let currentMode = 'UNKNOWN';

function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    try {
        socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.log('Connected to Pomolocal CLI');
            chrome.action.setBadgeText({ text: '...' });
            chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
            chrome.storage.local.set({ connectionStatus: 'connected' });
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        };

        socket.onclose = () => {
            console.log('Disconnected from CLI (Waiting to reconnect...)');
            chrome.action.setBadgeText({ text: 'OFF' });
            chrome.action.setBadgeBackgroundColor({ color: '#9E9E9E' });
            clearRules(); 
            socket = null;
            currentMode = 'UNKNOWN';
            chrome.storage.local.set({ connectionStatus: 'disconnected' });
        };
        
        socket.onerror = (e) => {
            console.debug('CLI unreachable');
            chrome.storage.local.set({ connectionStatus: 'disconnected' });
        };
    } catch (e) {
        console.log('Connection setup failed:', e);
    }
}

async function handleMessage(message) {
    if (message.type === 'STATE_UPDATE') {
        currentMode = message.mode;
        if (message.mode === 'FOCUS') {
            await updateBlocking();
            chrome.action.setBadgeText({ text: 'ON' });
            chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        } else {
            clearRules();
            chrome.action.setBadgeText({ text: 'LZ' });
            chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
        }
    }
}

async function updateBlocking() {
    const { blockedSites } = await chrome.storage.local.get('blockedSites');
    const domains = blockedSites || BLOCKED_DOMAINS;
    await applyBlockingRules(domains);
}

async function applyBlockingRules(domains) {
    const rules = domains.map((domain, index) => ({
        id: index + 1,
        priority: 1,
        action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
        condition: { 
            urlFilter: `||${domain}`, 
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'] 
        }
    }));

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: removeRuleIds,
        addRules: rules
    });
    console.log('Blocking enabled for:', domains);
}

async function clearRules() {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: removeRuleIds
    });
    console.log('Blocking disabled');
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.blockedSites && currentMode === 'FOCUS') {
        updateBlocking();
    }
});

chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            connect();
        } else if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RECONNECT') {
        connect();
        sendResponse({ status: 'connecting' });
    }
});

connect();
