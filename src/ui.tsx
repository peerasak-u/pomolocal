import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { formatTime } from './timer';
import { broadcast, stopServer } from './server';
import { notify, type SoundName } from './sound';

interface AppProps {
    sessionDuration: number;
    relaxDuration: number;
    loopCount: number;
    soundName: SoundName;
}

type Mode = 'FOCUS' | 'RELAX' | 'FINISHED' | 'WARMUP';

export const App: React.FC<AppProps> = ({ sessionDuration, relaxDuration, loopCount, soundName }) => {
    const { exit } = useApp();
    const [mode, setMode] = useState<Mode>('WARMUP');
    const [timeLeft, setTimeLeft] = useState(60);
    const [cycle, setCycle] = useState(1);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        // Initial broadcast
        broadcast({ 
            type: 'STATE_UPDATE', 
            mode: 'WARMUP', 
            blockedDomains: [] 
        });
        notify("Warmup Phase Started", "Pomolocal", soundName);
    }, []);

    useEffect(() => {
        // Heartbeat to sync state with new extension connections
        const syncInterval = setInterval(() => {
             broadcast({ 
                type: 'STATE_UPDATE', 
                mode: mode,
                // We keep sending the list for protocol completeness, even if extension has a fallback
                blockedDomains: ["x.com", "facebook.com", "youtube.com", "instagram.com", "reddit.com"] 
            });
        }, 1000);

        return () => clearInterval(syncInterval);
    }, [mode]);

    useEffect(() => {
        let interval: Timer | null = null;
        if (isActive && mode !== 'FINISHED' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && mode !== 'FINISHED') {
            handleTransition();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, mode, timeLeft]);

    const handleTransition = () => {
        if (mode === 'WARMUP') {
            notify("Warmup Complete - Focus Time", "Pomolocal", soundName);
            setMode('FOCUS');
            setTimeLeft(sessionDuration);
            broadcast({ 
                type: 'STATE_UPDATE', 
                mode: 'FOCUS',
                blockedDomains: ["x.com", "facebook.com", "youtube.com", "instagram.com", "reddit.com"] 
            });
        } else if (mode === 'FOCUS') {
            notify("Focus Session Complete", "Pomolocal", soundName);
            // If we just finished the last cycle
            if (cycle >= loopCount) {
                setMode('FINISHED');
                broadcast({ type: 'STATE_UPDATE', mode: 'FINISHED' });
                // Delay exit slightly to show finished state? Or exit immediately?
                // PRD says "App exits gracefully".
                setTimeout(() => {
                    stopServer();
                    exit();
                }, 1000);
            } else {
                setMode('RELAX');
                setTimeLeft(relaxDuration);
                broadcast({ type: 'STATE_UPDATE', mode: 'RELAX' });
            }
        } else if (mode === 'RELAX') {
            notify("Break Over - Focus Time", "Pomolocal", soundName);
            setMode('FOCUS');
            setCycle(c => c + 1);
            setTimeLeft(sessionDuration);
            broadcast({ 
                type: 'STATE_UPDATE', 
                mode: 'FOCUS',
                blockedDomains: ["x.com", "facebook.com", "youtube.com", "instagram.com", "reddit.com"] 
            });
        }
    };

    useInput((input) => {
        if (input === 'q') {
            broadcast({ type: 'STATE_UPDATE', mode: 'FINISHED' });
            stopServer();
            exit();
        }
        if (input === ' ') {
            setIsActive(!isActive);
        }
        if (input === 's') {
            // Force transition
            setTimeLeft(0); 
        }
    });

    if (mode === 'FINISHED') {
        return (
             <Box flexDirection="column" alignItems="center">
                <Text color="green">All cycles completed!</Text>
            </Box>
        );
    }

    // Gradient colors
    const colors = mode === 'FOCUS' ? 'passion' : (mode === 'WARMUP' ? 'summer' : 'morning');

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height={20}>
            <Gradient name={colors}>
                <BigText text={formatTime(timeLeft)} font="block" />
            </Gradient>
            <Text bold color={mode === 'FOCUS' ? 'red' : (mode === 'WARMUP' ? 'yellow' : 'green')}>
                {mode === 'FOCUS' ? '🍅 FOCUS MODE ENABLED' : (mode === 'WARMUP' ? '🔥 WARMUP PHASE' : '☕ RELAX TIME')}
            </Text>
            <Box marginTop={1}>
                <Text dimColor>Cycle: {cycle}/{loopCount} | [Space] Pause | [s] Skip | [q] Quit</Text>
            </Box>
        </Box>
    );
};
