// Script to download popular songs from Deezer's public API
// Deezer provides 30-second previews - we'll use the first 10 seconds
// Run with: npx ts-node scripts/downloadPopularMusic.ts

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const PREVIEWS_DIR = path.join(process.cwd(), 'public', 'previews');
const COVERS_DIR = path.join(process.cwd(), 'public', 'covers');
const DATA_DIR = path.join(process.cwd(), 'data');

// Deezer API endpoints (no auth required)
const DEEZER_API = 'https://api.deezer.com';

interface DeezerTrack {
    id: number;
    title: string;
    artist: { name: string };
    album: {
        title: string;
        cover_big: string;  // 250x250
        cover_xl: string;   // 1000x1000
    };
    preview: string;  // 30-second MP3 preview URL
    rank: number;     // Popularity ranking
}

interface DeezerResponse {
    data: DeezerTrack[];
    total: number;
    next?: string;
}

// Genre mappings for Deezer genre IDs
const GENRE_SEARCHES = [
    { query: 'top hits 2024', genre: 'pop', count: 15 },
    { query: 'hip hop hits', genre: 'hip-hop', count: 12 },
    { query: 'rock hits', genre: 'rock', count: 12 },
    { query: 'indie popular', genre: 'indie', count: 10 },
    { query: 'electronic dance', genre: 'electronic', count: 12 },
    { query: 'country hits', genre: 'country', count: 10 },
    { query: 'metal hits', genre: 'metal', count: 10 },
    { query: 'classical popular', genre: 'classical', count: 10 },
    { query: 'jazz popular', genre: 'jazz', count: 10 },
];

function fetchJSON(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${data.slice(0, 200)}`));
                }
            });
        }).on('error', reject);
    });
}

function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.existsSync(destPath) && fs.unlinkSync(destPath);
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                }
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.existsSync(destPath) && fs.unlinkSync(destPath);
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            fs.existsSync(destPath) && fs.unlinkSync(destPath);
            reject(err);
        });
    });
}

async function searchTracks(query: string, limit: number = 10): Promise<DeezerTrack[]> {
    const url = `${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetchJSON(url);
    return response.data || [];
}

async function getChartTracks(limit: number = 100): Promise<DeezerTrack[]> {
    const url = `${DEEZER_API}/chart/0/tracks?limit=${limit}`;
    const response = await fetchJSON(url);
    return response.data || [];
}

async function main() {
    console.log('🎵 Downloading Popular Music from Deezer...\n');
    console.log('Getting real chart hits with 10-second previews and cover art!\n');

    // Ensure directories exist
    [PREVIEWS_DIR, COVERS_DIR, DATA_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    const allTracks: any[] = [];
    const seenIds = new Set<number>();
    const genreCounts: Record<string, number> = {};

    // First, get the global chart (most popular songs right now)
    console.log('📊 Fetching global chart...');
    const chartTracks = await getChartTracks(30);

    for (const track of chartTracks) {
        if (!track.preview || seenIds.has(track.id)) continue;
        seenIds.add(track.id);

        const genre = 'pop'; // Chart tracks are mostly pop
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;

        allTracks.push({
            deezerTrack: track,
            genre,
            popularity: Math.min(100, Math.floor(track.rank / 10000) + 70),
        });
    }

    // Then search for genre-specific tracks
    for (const { query, genre, count } of GENRE_SEARCHES) {
        console.log(`🔎 Searching: "${query}"...`);
        const tracks = await searchTracks(query, count + 5); // Get extra in case some have no preview

        let added = 0;
        for (const track of tracks) {
            if (!track.preview || seenIds.has(track.id)) continue;
            if (added >= count) break;

            seenIds.add(track.id);
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;

            allTracks.push({
                deezerTrack: track,
                genre,
                popularity: Math.min(100, Math.floor(track.rank / 10000) + 50),
            });
            added++;
        }

        // Rate limit - be nice to the API
        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n📥 Downloading ${allTracks.length} tracks...\n`);

    const mockTracks: any[] = [];
    let downloaded = 0;
    let failed = 0;

    for (let i = 0; i < allTracks.length; i++) {
        const { deezerTrack, genre, popularity } = allTracks[i];
        const trackId = `track-${String(i + 1).padStart(3, '0')}`;
        const previewPath = path.join(PREVIEWS_DIR, `${trackId}.mp3`);
        const coverPath = path.join(COVERS_DIR, `${trackId}.jpg`);

        const displayName = `${deezerTrack.artist.name} - ${deezerTrack.title}`;

        try {
            // Download preview MP3 (full 30 seconds - we'll let the player handle duration)
            if (!fs.existsSync(previewPath)) {
                process.stdout.write(`↓ [${i + 1}/${allTracks.length}] ${displayName.slice(0, 50)}...`);
                await downloadFile(deezerTrack.preview, previewPath);
                process.stdout.write(' ✓\n');
            } else {
                console.log(`✓ [${i + 1}/${allTracks.length}] Already have: ${displayName.slice(0, 50)}`);
            }

            // Download cover art
            if (!fs.existsSync(coverPath)) {
                const coverUrl = deezerTrack.album.cover_xl || deezerTrack.album.cover_big;
                await downloadFile(coverUrl, coverPath);
            }

            mockTracks.push({
                id: trackId,
                name: deezerTrack.title,
                artist: deezerTrack.artist.name,
                album: deezerTrack.album.title,
                genre,
                popularity,
                energy: popularity > 70 ? 'high' : popularity > 40 ? 'medium' : 'low',
                preview_url: `/previews/${trackId}.mp3`,
                image_url: `/covers/${trackId}.jpg`,
                deezer_id: deezerTrack.id,
            });

            downloaded++;
        } catch (err) {
            console.log(`✗ [${i + 1}/${allTracks.length}] Failed: ${displayName} - ${err}`);
            failed++;
        }

        // Small delay between downloads
        await new Promise(r => setTimeout(r, 100));
    }

    // Save track metadata
    const outputPath = path.join(DATA_DIR, 'mockTracks.json');
    fs.writeFileSync(outputPath, JSON.stringify(mockTracks, null, 2));

    console.log('\n========================================');
    console.log('  🎉 DOWNLOAD COMPLETE!');
    console.log('========================================\n');
    console.log(`✓ Downloaded: ${downloaded} tracks`);
    console.log(`✗ Failed: ${failed} tracks`);
    console.log(`📊 Total in dataset: ${mockTracks.length} tracks\n`);
    console.log('Tracks per genre:');
    Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).forEach(([genre, count]) => {
        console.log(`  ${genre}: ${count}`);
    });
    console.log('\n✨ Real popular music ready for VibeCheck!\n');
}

main().catch(console.error);
