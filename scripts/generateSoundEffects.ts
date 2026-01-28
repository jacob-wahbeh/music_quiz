// Script to generate simple WAV sound effects (ding and buzzer)
// Run with: npx ts-node scripts/generateSoundEffects.ts

import * as fs from 'fs';
import * as path from 'path';

const SOUNDS_DIR = path.join(process.cwd(), 'public', 'sounds');

// Helper to write a WAV file
function writeWav(filename: string, durationSec: number, frequency: number, type: 'sine' | 'square' | 'sawtooth') {
    const sampleRate = 44100;
    const numSamples = durationSec * sampleRate;
    const bytesPerSample = 2; // 16-bit
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * bytesPerSample;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = numSamples * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = Buffer.alloc(totalSize);

    // RIFF chunk
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(totalSize - 8, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // BitsPerSample

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Generate samples
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        // Ding: Softer, higher pitch sine wave with bell-like envelope
        if (filename.includes('ding')) {
            // Primary tone + slight overtone for "bell" effect
            sample = Math.sin(2 * Math.PI * frequency * t) * 0.5 +
                Math.sin(2 * Math.PI * (frequency * 2) * t) * 0.2;

            // Exponential decay envelope (percussive)
            const decay = Math.exp(-5 * t);
            sample *= decay;
        }
        // Buzzer: Lower pitch sine wave with slight dissonance, no harsh sawtooth
        else if (filename.includes('buzzer')) {
            // Two sine waves slightly out of tune
            sample = Math.sin(2 * Math.PI * frequency * t) * 0.5 +
                Math.sin(2 * Math.PI * (frequency * 0.95) * t) * 0.5;

            // Softer attack/release
            const envelope = Math.min(1, t / 0.05) * Math.min(1, (durationSec - t) / 0.1);
            sample *= envelope;
        }
        else {
            // Default sine
            sample = Math.sin(2 * Math.PI * frequency * t);
        }

        // Convert to 16-bit signed integer
        // Reduce volume overall to avoid clipping/harshness
        const sampleInt = Math.floor(sample * 20000);
        buffer.writeInt16LE(sampleInt, 44 + i * 2);
    }

    const filePath = path.join(SOUNDS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Generated ${filename}`);
}

async function main() {
    console.log('🔊 Generating local sound effects...\n');

    if (!fs.existsSync(SOUNDS_DIR)) {
        fs.mkdirSync(SOUNDS_DIR, { recursive: true });
    }

    // Ding: High pitched sine wave (success)
    writeWav('ding.mp3', 0.5, 880, 'sine'); // File extension mp3 but content is WAV (browsers handle this fine usually, or just rename to wav)
    // Actually, let's use .mp3 extension since the code expects it, but standard WAV header. Browser <audio> is smart enough.
    // Or better, update code to look for .wav if .mp3 fails, but keeping filename .mp3 with wav content is a quick hack that usually works.

    // Buzzer: Low pitched square/sawtooth (failure)
    writeWav('buzzer.mp3', 0.4, 150, 'sawtooth');

    console.log('\n✨ Sounds generated!');
}

main().catch(console.error);
