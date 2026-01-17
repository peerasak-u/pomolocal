let socket = null;
const WS_URL = 'ws://127.0.0.1:9999'; // Use IPv4 explicitly to avoid localhost resolution issues

// Static block list as requested
const BLOCKED_DOMAINS = [
    "x.com",
    "twitter.com",
    "facebook.com",
    "youtube.com",
    "instagram.com",
    "reddit.com",
    "linkedin.com",
    "tiktok.com",
    "netflix.com",
    "twitch.tv"
];

function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    try {
        socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.log('Connected to Pomolocal CLI');
            chrome.action.setBadgeText({ text: '...' }); // Connected, waiting for state
            chrome.action.setBadgeBackgroundColor({ color: '#FFC107' }); // Amber
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
            // Normal behavior when CLI is closed
            console.log('Disconnected from CLI (Waiting to reconnect...)');
            chrome.action.setBadgeText({ text: 'OFF' });
            chrome.action.setBadgeBackgroundColor({ color: '#9E9E9E' }); // Grey instead of Red (Error)
            clearRules(); 
            socket = null;
        };
        
        socket.onerror = (e) => {
            // Suppress verbose errors since this is expected when CLI is off
            // Just log a small debug message
            console.debug('CLI unreachable');
        };
    } catch (e) {
        console.log('Connection setup failed:', e);
    }
}

function handleMessage(message) {
    if (message.type === 'STATE_UPDATE') {
        if (message.mode === 'FOCUS') {
            // Use static list + any extra from server if provided
            const domains = BLOCKED_DOMAINS; 
            applyBlockingRules(domains);
            
            chrome.action.setBadgeText({ text: 'ON' });
            chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        } else {
            clearRules();
            
            chrome.action.setBadgeText({ text: 'LZ' }); // Lazy/Relax
            chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
        }
    }
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

chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 }); // Check frequently
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            connect();
        } else if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
        }
    }
});

connect();
