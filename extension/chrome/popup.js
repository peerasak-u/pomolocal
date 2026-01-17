import { BLOCKED_DOMAINS } from './config.js';

const storage = chrome.storage.local;
const listContainer = document.getElementById('site-list');

async function init() {
    const { blockedSites } = await storage.get('blockedSites');
    const enabledSites = blockedSites || BLOCKED_DOMAINS;

    BLOCKED_DOMAINS.forEach(domain => {
        const isEnabled = enabledSites.includes(domain);
        const item = createSiteItem(domain, isEnabled);
        listContainer.appendChild(item);
    });
}

function createSiteItem(domain, isEnabled) {
    const li = document.createElement('div');
    li.className = 'site-item';

    const img = document.createElement('img');
    img.className = 'site-icon';
    img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    li.appendChild(img);

    const name = document.createElement('span');
    name.className = 'site-name';
    name.textContent = domain;
    li.appendChild(name);

    const label = document.createElement('label');
    label.className = 'switch';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isEnabled;
    input.addEventListener('change', () => toggleSite(domain, input.checked));
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    label.appendChild(input);
    label.appendChild(slider);
    li.appendChild(label);

    return li;
}

async function toggleSite(domain, isChecked) {
    const { blockedSites } = await storage.get('blockedSites');
    let newSites = blockedSites || [...BLOCKED_DOMAINS];

    if (isChecked) {
        if (!newSites.includes(domain)) {
            newSites.push(domain);
        }
    } else {
        newSites = newSites.filter(d => d !== domain);
    }

    await storage.set({ blockedSites: newSites });
}

init();
