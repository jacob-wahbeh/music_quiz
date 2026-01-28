// Script to download simple sound effects
// Run with: npx ts-node scripts/downloadSoundEffects.ts

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const SOUNDS_DIR = path.join(process.cwd(), 'public', 'sounds');

// Direct links to simple free sound effects (Creative Commons 0 or similar public domain)
// Using reliable sources for short UI sounds
const SOUNDS = [
    {
        name: 'ding.mp3',
        url: 'https://freesound.org/data/previews/171/171671_2437358-lq.mp3' // Simple bell/chime
    },
    {
        name: 'buzzer.mp3',
        url: 'https://freesound.org/data/previews/336/336998_4939433-lq.mp3' // Simple wrong/buzz sound
    }
];

// Alternate sources if the above fail (Freesound sometimes needs auth for full quality, previews are usually fine but direct links can expire)
// Using a more stable CDN or simple generated tone might be safer. 
// Let's use some reliable public domain github hosted assets or similar.
// actually, let's use a very simple approach: create empty files if download fails, but try to download first.
// Better: using standard test sounds from a reliable repo.

const ALTERNATE_SOUNDS = [
    {
        name: 'ding.mp3',
        url: 'https://github.com/maykbrito/sounds/raw/master/notification.mp3'
    },
    {
        name: 'buzzer.mp3',
        url: 'https://github.com/maykbrito/sounds/raw/master/button-press.mp3' // Placeholder
    }
];

function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                }
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
}

async function main() {
    console.log('🔊 Downloading sound effects...\n');

    if (!fs.existsSync(SOUNDS_DIR)) {
        fs.mkdirSync(SOUNDS_DIR, { recursive: true });
    }

    for (const sound of ALTERNATE_SOUNDS) {
        const destPath = path.join(SOUNDS_DIR, sound.name);

        try {
            console.log(`Downloading ${sound.name}...`);
            await downloadFile(sound.url, destPath);
            console.log(`✓ ${sound.name} ready`);
        } catch (err) {
            console.error(`✗ Failed to download ${sound.name}:`, err);
        }
    }

    console.log('\n✨ Sounds ready!');
}

main().catch(console.error);
