// Script to generate mock audio previews and cover art
// Run with: npx ts-node scripts/generateMockAssets.ts

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PREVIEWS_DIR = path.join(process.cwd(), 'public', 'previews');
const COVERS_DIR = path.join(process.cwd(), 'public', 'covers');

interface MockTrack {
    id: string;
    name: string;
    artist: string;
    genre: string;
    popularity: number;
    energy: string;
    preview_url: string;
    image_url: string;
}

// Genre color palettes for cover art
const GENRE_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
    'pop': { primary: '#FF6B9D', secondary: '#C44569', accent: '#FFE66D' },
    'hip-hop': { primary: '#2C3E50', secondary: '#E74C3C', accent: '#F39C12' },
    'rock': { primary: '#1A1A2E', secondary: '#E94560', accent: '#0F3460' },
    'indie': { primary: '#F8B500', secondary: '#FF6F61', accent: '#5B5EA6' },
    'electronic': { primary: '#00D9FF', secondary: '#BD00FF', accent: '#00FF94' },
    'country': { primary: '#D4A574', secondary: '#8B4513', accent: '#228B22' },
    'metal': { primary: '#1C1C1C', secondary: '#8B0000', accent: '#C0C0C0' },
    'classical': { primary: '#F5E6D3', secondary: '#8B7355', accent: '#DAA520' },
    'jazz': { primary: '#2C1810', secondary: '#D4AF37', accent: '#8B4513' },
};

// Generate a simple WAV header for a silent/tone audio file
function generateWavHeader(dataSize: number, sampleRate: number = 44100, channels: number = 1, bitsPerSample: number = 16): Buffer {
    const buffer = Buffer.alloc(44);

    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // ByteRate
    buffer.writeUInt16LE(channels * bitsPerSample / 8, 32); // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
}

// Generate a simple tone audio preview (15 seconds)
function generateAudioPreview(frequency: number = 440, durationSec: number = 15): Buffer {
    const sampleRate = 44100;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample

    const header = generateWavHeader(dataSize, sampleRate);
    const data = Buffer.alloc(dataSize);

    // Generate a simple sine wave with fade in/out
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const fadeIn = Math.min(1, t / 0.5); // 0.5s fade in
        const fadeOut = Math.min(1, (durationSec - t) / 0.5); // 0.5s fade out
        const envelope = fadeIn * fadeOut;

        // Add some variation - frequency modulation
        const modFreq = frequency * (1 + 0.1 * Math.sin(2 * Math.PI * 0.5 * t));
        const sample = Math.sin(2 * Math.PI * modFreq * t) * 0.3 * envelope;

        // Convert to 16-bit signed integer
        const intSample = Math.floor(sample * 32767);
        data.writeInt16LE(intSample, i * 2);
    }

    return Buffer.concat([header, data]);
}

// Generate SVG cover art
function generateCoverSvg(track: MockTrack): string {
    const colors = GENRE_COLORS[track.genre] || GENRE_COLORS['pop'];
    const hash = track.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    // Different patterns based on genre
    let pattern = '';
    const patternType = hash % 5;

    switch (patternType) {
        case 0: // Circles
            for (let i = 0; i < 5; i++) {
                const cx = 250 + Math.cos(i * Math.PI * 2 / 5) * 100;
                const cy = 250 + Math.sin(i * Math.PI * 2 / 5) * 100;
                pattern += `<circle cx="${cx}" cy="${cy}" r="${40 + (hash % 30)}" fill="${colors.accent}" opacity="0.5"/>`;
            }
            break;
        case 1: // Diagonal lines
            for (let i = 0; i < 10; i++) {
                pattern += `<line x1="${i * 50}" y1="0" x2="${i * 50 + 500}" y2="500" stroke="${colors.accent}" stroke-width="3" opacity="0.3"/>`;
            }
            break;
        case 2: // Grid
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 5; j++) {
                    if ((i + j) % 2 === 0) {
                        pattern += `<rect x="${i * 100}" y="${j * 100}" width="100" height="100" fill="${colors.accent}" opacity="0.2"/>`;
                    }
                }
            }
            break;
        case 3: // Waves
            pattern += `<path d="M0,250 Q125,${200 + hash % 100} 250,250 T500,250" stroke="${colors.accent}" stroke-width="20" fill="none" opacity="0.4"/>`;
            pattern += `<path d="M0,300 Q125,${250 + hash % 100} 250,300 T500,300" stroke="${colors.accent}" stroke-width="15" fill="none" opacity="0.3"/>`;
            break;
        case 4: // Triangles
            pattern += `<polygon points="250,50 450,400 50,400" fill="${colors.accent}" opacity="0.3"/>`;
            pattern += `<polygon points="250,100 400,350 100,350" fill="${colors.secondary}" opacity="0.3"/>`;
            break;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.secondary}"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="url(#bg)"/>
  ${pattern}
  <text x="250" y="420" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" font-weight="bold">${escapeXml(track.name.substring(0, 20))}</text>
  <text x="250" y="455" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">${escapeXml(track.artist.substring(0, 25))}</text>
</svg>`;
}

function escapeXml(str: string): string {
    return str.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

async function main() {
    console.log('🎵 Generating mock music assets...\n');

    // Ensure directories exist
    [PREVIEWS_DIR, COVERS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // Load track data
    const tracksPath = path.join(DATA_DIR, 'mockTracks.json');
    const tracks: MockTrack[] = JSON.parse(fs.readFileSync(tracksPath, 'utf-8'));

    console.log(`📀 Processing ${tracks.length} tracks...\n`);

    const genreCounts: Record<string, number> = {};
    let coversGenerated = 0;
    let audioGenerated = 0;

    for (const track of tracks) {
        // Count genres
        genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;

        // Generate audio preview (WAV format for simplicity)
        const audioPath = path.join(PREVIEWS_DIR, `${track.id}.wav`);
        if (!fs.existsSync(audioPath)) {
            // Use different base frequencies for different genres
            const baseFreqs: Record<string, number> = {
                'pop': 440, 'hip-hop': 220, 'rock': 330, 'indie': 392,
                'electronic': 523, 'country': 294, 'metal': 196,
                'classical': 440, 'jazz': 349
            };
            const freq = baseFreqs[track.genre] || 440;
            const audioData = generateAudioPreview(freq + (track.popularity % 100), 15);
            fs.writeFileSync(audioPath, audioData);
            audioGenerated++;
        }

        // Generate cover art (SVG)
        const coverPath = path.join(COVERS_DIR, `${track.id}.svg`);
        if (!fs.existsSync(coverPath)) {
            const svg = generateCoverSvg(track);
            fs.writeFileSync(coverPath, svg);
            coversGenerated++;
        }
    }

    // Update track URLs in JSON to use .wav and .svg
    const updatedTracks = tracks.map(t => ({
        ...t,
        preview_url: `/previews/${t.id}.wav`,
        image_url: `/covers/${t.id}.svg`
    }));

    fs.writeFileSync(tracksPath, JSON.stringify(updatedTracks, null, 2));

    console.log('✅ Asset generation complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total tracks: ${tracks.length}`);
    console.log(`   Audio files generated: ${audioGenerated}`);
    console.log(`   Cover images generated: ${coversGenerated}`);
    console.log('\n📁 Tracks per genre:');
    Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).forEach(([genre, count]) => {
        console.log(`   ${genre}: ${count}`);
    });
    console.log('\n✨ All assets ready for gameplay!');
}

main().catch(console.error);
