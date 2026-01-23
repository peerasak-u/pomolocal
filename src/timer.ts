export function parseDuration(input: string | number): number {
    if (typeof input === 'number') return input * 60; // assume minutes if number
    
    const match = input.match(/^(\d+)([smh]?)$/);
    if (!match) {
        return 25 * 60; // fallback default
    }
    
    const [, quantity, unit] = match;
    const value = parseInt(quantity ?? '0', 10);
    
    switch (unit) {
        case 's': return value;
        case 'h': return value * 3600;
        case 'm': 
        default: return value * 60;
    }
}

export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
