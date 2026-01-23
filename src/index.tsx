#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { App } from './ui';
import { startServer } from './server';
import { parseDuration } from './timer';
import type { SoundName } from './sound';

const cli = meow(`
	Usage
	  $ pomolocal

	Options
	  --session, -s  Duration of focus sessions (e.g., 25m, 45m). Default: 25m.
	  --relax, -r    Duration of short breaks (e.g., 5m, 10m). Default: 5m.
	  --loop, -l     Number of Focus/Relax cycles. Default: 4.
	  --sound        Sound name. Default: Glass.

	Examples
	  $ pomolocal --session 25m --relax 5m --loop 4
`, {
	importMeta: import.meta,
	flags: {
		session: {
			type: 'string',
			shortFlag: 's',
			default: '25m'
		},
		relax: {
			type: 'string',
			shortFlag: 'r',
			default: '5m'
		},
		loop: {
			type: 'number',
			shortFlag: 'l',
			default: 4
		},
		sound: {
			type: 'string',
			default: 'Glass'
		}
	}
});

// Start Server
startServer();

// Parse args
const sessionDuration = parseDuration(cli.flags.session);
const relaxDuration = parseDuration(cli.flags.relax);
const loopCount = cli.flags.loop;
const soundName = cli.flags.sound as SoundName;

render(
    <App 
        sessionDuration={sessionDuration} 
        relaxDuration={relaxDuration} 
        loopCount={loopCount} 
        soundName={soundName} 
    />
);
