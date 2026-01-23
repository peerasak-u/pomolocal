import { BLOCKED_DOMAINS, WS_PORTS, HANDSHAKE_KEY } from './config.js';

let socket = null;
let currentPortIndex = 0;
let isVerified = false;
let currentMode = 'UNKNOWN';
let reconnectTimer = null;
let reconnectDelay = 500; // Start faster for port scanning
const MAX_RECONNECT_DELAY = 10000;

function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    const port = WS_PORTS[currentPortIndex];
    const wsUrl = `ws://127.0.0.1:${port}`;
    console.debug(`Attempting connection to ${wsUrl}`);

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('Socket open, sending handshake...');
            socket.send(JSON.stringify({ type: 'HANDSHAKE', key: HANDSHAKE_KEY }));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'HANDSHAKE_ACK') {
                    console.log('Handshake verified. Connected to Pomolocal CLI.');
                    isVerified = true;
                    chrome.action.setBadgeText({ text: '...' });
                    chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
                    chrome.storage.local.set({ connectionStatus: 'connected' });
                    reconnectDelay = 1000; // Reset delay on success
                } else if (isVerified) {
                    handleMessage(data);
                }
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        };

        socket.onclose = () => {
            handleDisconnect();
        };
        
        socket.onerror = (e) => {
            // console.debug('CLI unreachable on port', port);
        };
    } catch (e) {
        console.log('Connection setup failed:', e);
        handleDisconnect();
    }
}

function handleDisconnect() {
    const wasVerified = isVerified;
    if (wasVerified) {
        console.log(`Disconnected. Reconnecting...`);
    }
    
    isVerified = false;
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#9E9E9E' });
    clearRules(); 
    socket = null;
    currentMode = 'UNKNOWN';
    chrome.storage.local.set({ connectionStatus: 'disconnected' });

    // Try next port
    currentPortIndex = (currentPortIndex + 1) % WS_PORTS.length;

    if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            // Scan ports faster if we are just scanning (not previously connected)
            // If we were connected, use the backoff delay
            if (wasVerified) {
                 reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
            } else {
                 reconnectDelay = 500; // Fast scan
            }
            connect();
        }, reconnectDelay);
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

chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
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
