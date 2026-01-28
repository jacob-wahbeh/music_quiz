// Script to download real royalty-free music from Incompetech (Kevin MacLeod)
// All tracks are CC BY 4.0 licensed - free to use with attribution
// Run with: npx ts-node scripts/downloadRealMusic.ts

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const PREVIEWS_DIR = path.join(process.cwd(), 'public', 'previews');
const DATA_DIR = path.join(process.cwd(), 'data');

// Base URL for Incompetech MP3s
const INCOMPETECH_BASE = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/';

// Curated list of tracks across genres - real songs by Kevin MacLeod
// Format: [filename, display_name, genre, energy, popularity_estimate]
const TRACKS: [string, string, string, string, number][] = [
    // Pop / Upbeat (Anthems potential)
    ['Cheery%20Monday.mp3', 'Cheery Monday', 'pop', 'high', 92],
    ['Happy%20Happy%20Game%20Show.mp3', 'Happy Happy Game Show', 'pop', 'high', 90],
    ['Carefree.mp3', 'Carefree', 'pop', 'high', 88],
    ['Life%20of%20Riley.mp3', 'Life of Riley', 'pop', 'medium', 85],
    ['Funkorama.mp3', 'Funkorama', 'pop', 'high', 83],
    ['Happy%20Bee.mp3', 'Happy Bee', 'pop', 'high', 80],
    ['Sunshine.mp3', 'Sunshine', 'pop', 'medium', 78],
    ['Sneaky%20Snitch.mp3', 'Sneaky Snitch', 'pop', 'medium', 76],
    ['Fluffing%20a%20Duck.mp3', 'Fluffing a Duck', 'pop', 'medium', 74],
    ['Monkeys%20Spinning%20Monkeys.mp3', 'Monkeys Spinning Monkeys', 'pop', 'high', 95],
    ['Wallpaper.mp3', 'Wallpaper', 'pop', 'medium', 70],
    ['Run%20Amok.mp3', 'Run Amok', 'pop', 'high', 68],

    // Hip Hop / Urban
    ['Funk%20Game%20Loop.mp3', 'Funk Game Loop', 'hip-hop', 'high', 88],
    ['Griphop.mp3', 'Griphop', 'hip-hop', 'high', 85],
    ['Hot%20Swing.mp3', 'Hot Swing', 'hip-hop', 'high', 82],
    ['Backed%20Vibes.mp3', 'Backed Vibes', 'hip-hop', 'medium', 80],
    ['Kool%20Kats.mp3', 'Kool Kats', 'hip-hop', 'medium', 78],
    ['Bass%20Walker.mp3', 'Bass Walker', 'hip-hop', 'high', 75],
    ['Hustle.mp3', 'Hustle', 'hip-hop', 'high', 73],
    ['Hit%20the%20Streets.mp3', 'Hit the Streets', 'hip-hop', 'high', 70],
    ['Protofunk.mp3', 'Protofunk', 'hip-hop', 'medium', 68],
    ['Cold%20Funk.mp3', 'Cold Funk', 'hip-hop', 'medium', 65],
    ['DD%20Groove.mp3', 'DD Groove', 'hip-hop', 'medium', 62],

    // Rock / Energy
    ['Five%20Armies.mp3', 'Five Armies', 'rock', 'high', 90],
    ['Crusade.mp3', 'Crusade', 'rock', 'high', 88],
    ['Aggressor.mp3', 'Aggressor', 'rock', 'high', 85],
    ['Volatile%20Reaction.mp3', 'Volatile Reaction', 'rock', 'high', 82],
    ['Hero%20Down.mp3', 'Hero Down', 'rock', 'high', 80],
    ['Take%20a%20Chance.mp3', 'Take a Chance', 'rock', 'high', 78],
    ['Fearless%20First.mp3', 'Fearless First', 'rock', 'high', 75],
    ['Feral%20Chase.mp3', 'Feral Chase', 'rock', 'high', 73],
    ['Acid%20Trumpet.mp3', 'Acid Trumpet', 'rock', 'high', 70],
    ['Big%20Rock.mp3', 'Big Rock', 'rock', 'high', 68],
    ['Cool%20Rock.mp3', 'Cool Rock', 'rock', 'medium', 65],

    // Indie / Chill
    ['Airport%20Lounge.mp3', 'Airport Lounge', 'indie', 'low', 85],
    ['Gymnopedie%20No.%201.mp3', 'Gymnopedie No. 1', 'indie', 'low', 88],
    ['Smooth%20Sailing.mp3', 'Smooth Sailing', 'indie', 'low', 82],
    ['Feather%20Waltz.mp3', 'Feather Waltz', 'indie', 'low', 80],
    ['Peaceful%20Desolation.mp3', 'Peaceful Desolation', 'indie', 'low', 78],
    ['Dreamer.mp3', 'Dreamer', 'indie', 'low', 75],
    ['Easy%20Lemon.mp3', 'Easy Lemon', 'indie', 'medium', 73],
    ['Rainbows.mp3', 'Rainbows', 'indie', 'medium', 70],
    ['Local%20Forecast.mp3', 'Local Forecast', 'indie', 'low', 68],
    ['Midsummer%20Sky.mp3', 'Midsummer Sky', 'indie', 'low', 65],

    // Electronic / EDM
    ['Synthwave%20E.mp3', 'Synthwave E', 'electronic', 'high', 92],
    ['Neon%20Laser%20Horizon.mp3', 'Neon Laser Horizon', 'electronic', 'high', 90],
    ['Bit%20Quest.mp3', 'Bit Quest', 'electronic', 'high', 88],
    ['Bit%20Shift.mp3', 'Bit Shift', 'electronic', 'high', 85],
    ['Digital%20Lemonade.mp3', 'Digital Lemonade', 'electronic', 'medium', 82],
    ['Laser%20Groove.mp3', 'Laser Groove', 'electronic', 'high', 80],
    ['Disco%20con%20Tutti.mp3', 'Disco con Tutti', 'electronic', 'high', 78],
    ['Electrodoodle.mp3', 'Electrodoodle', 'electronic', 'medium', 75],
    ['Future%20Gladiator.mp3', 'Future Gladiator', 'electronic', 'high', 73],
    ['Controlled%20Chaos.mp3', 'Controlled Chaos', 'electronic', 'high', 70],
    ['Cipher.mp3', 'Cipher', 'electronic', 'medium', 68],

    // Country / Folk
    ['Americana.mp3', 'Americana', 'country', 'medium', 82],
    ['Bama%20Country.mp3', 'Bama Country', 'country', 'medium', 80],
    ['Hillbilly%20Swing.mp3', 'Hillbilly Swing', 'country', 'high', 78],
    ['Folk%20Round.mp3', 'Folk Round', 'country', 'medium', 75],
    ['Old%20Road.mp3', 'Old Road', 'country', 'low', 73],
    ['Porch%20Swing%20Days%20-%20faster.mp3', 'Porch Swing Days', 'country', 'medium', 70],
    ['Cowboy%20Sting.mp3', 'Cowboy Sting', 'country', 'medium', 68],
    ['Fiddles%20McGinty.mp3', 'Fiddles McGinty', 'country', 'high', 65],
    ['Martian%20Cowboy.mp3', 'Martian Cowboy', 'country', 'medium', 62],
    ['Country%20Gardens.mp3', 'Country Gardens', 'country', 'low', 60],

    // Metal / Heavy
    ['Death%20of%20Kings.mp3', 'Death of Kings', 'metal', 'high', 88],
    ['Oppressive%20Gloom.mp3', 'Oppressive Gloom', 'metal', 'high', 85],
    ['Mechanolith.mp3', 'Mechanolith', 'metal', 'high', 82],
    ['Darkest%20Child.mp3', 'Darkest Child', 'metal', 'high', 80],
    ['Gathering%20Darkness.mp3', 'Gathering Darkness', 'metal', 'high', 78],
    ['Nightmare%20Machine.mp3', 'Nightmare Machine', 'metal', 'high', 75],
    ['Grim%20Idol.mp3', 'Grim Idol', 'metal', 'high', 73],
    ['Industrial%20Revolution.mp3', 'Industrial Revolution', 'metal', 'high', 70],
    ['Malicious.mp3', 'Malicious', 'metal', 'high', 68],
    ['Curse%20of%20the%20Scarab.mp3', 'Curse of the Scarab', 'metal', 'high', 65],

    // Classical
    ['Canon%20in%20D%20Major.mp3', 'Canon in D Major', 'classical', 'low', 95],
    ['Moonlight%20Sonata.mp3', 'Moonlight Sonata', 'classical', 'low', 92],
    ['Waltz%20of%20the%20Flowers.mp3', 'Waltz of the Flowers', 'classical', 'medium', 88],
    ['Cello%20Suite%20%231%20in%20G%20-%20Prelude.mp3', 'Cello Suite #1 Prelude', 'classical', 'low', 85],
    ['Prelude%20in%20C%20(BWV%20846).mp3', 'Prelude in C', 'classical', 'low', 82],
    ['Dance%20of%20the%20Sugar%20Plum%20Fairy.mp3', 'Dance of Sugar Plum Fairy', 'classical', 'medium', 80],
    ['Amazing%20Grace%202011.mp3', 'Amazing Grace', 'classical', 'low', 78],
    ['Funeral%20March%20for%20Brass.mp3', 'Funeral March', 'classical', 'low', 75],
    ['Danse%20Macabre.mp3', 'Danse Macabre', 'classical', 'medium', 73],
    ['Hall%20of%20the%20Mountain%20King.mp3', 'Hall of Mountain King', 'classical', 'high', 90],

    // Jazz
    ['Jazzy%20Frenchy.mp3', 'Jazzy Frenchy', 'jazz', 'medium', 85],
    ['Jazz%20Brunch.mp3', 'Jazz Brunch', 'jazz', 'low', 82],
    ['Smooth%20Lovin.mp3', 'Smooth Lovin', 'jazz', 'low', 80],
    ['Night%20on%20the%20Docks%20-%20Sax.mp3', 'Night on the Docks', 'jazz', 'low', 78],
    ['Bossa%20Antigua.mp3', 'Bossa Antigua', 'jazz', 'medium', 75],
    ['Backbay%20Lounge.mp3', 'Backbay Lounge', 'jazz', 'low', 73],
    ['Apero%20Hour.mp3', 'Apero Hour', 'jazz', 'low', 70],
    ['Big%20Mojo.mp3', 'Big Mojo', 'jazz', 'medium', 68],
    ['Slow%20Burn.mp3', 'Slow Burn', 'jazz', 'low', 65],
    ['Swing%20Low.mp3', 'Swing Low', 'jazz', 'medium', 62],
];

function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    file.close();
                    fs.unlinkSync(destPath);
                    return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                }
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            fs.unlinkSync(destPath);
            reject(err);
        });
    });
}

async function main() {
    console.log('🎵 Downloading real royalty-free music from Incompetech...\n');
    console.log('All tracks by Kevin MacLeod (incompetech.com) - Licensed under CC BY 4.0\n');

    // Ensure directories exist
    if (!fs.existsSync(PREVIEWS_DIR)) {
        fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
    }

    const mockTracks: any[] = [];
    const genreCounts: Record<string, number> = {};
    let downloaded = 0;
    let failed = 0;

    for (let i = 0; i < TRACKS.length; i++) {
        const [filename, displayName, genre, energy, popularity] = TRACKS[i];
        const trackId = `real-${genre}-${String(i + 1).padStart(3, '0')}`;
        const destPath = path.join(PREVIEWS_DIR, `${trackId}.mp3`);
        const url = INCOMPETECH_BASE + filename;

        // Count genres
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;

        // Skip if already downloaded
        if (fs.existsSync(destPath)) {
            console.log(`✓ [${i + 1}/${TRACKS.length}] Already have: ${displayName}`);
            mockTracks.push({
                id: trackId,
                name: displayName,
                artist: 'Kevin MacLeod',
                genre,
                popularity,
                energy,
                preview_url: `/previews/${trackId}.mp3`,
                image_url: `/covers/${trackId}.svg`,
            });
            continue;
        }

        try {
            console.log(`↓ [${i + 1}/${TRACKS.length}] Downloading: ${displayName}...`);
            await downloadFile(url, destPath);
            downloaded++;

            mockTracks.push({
                id: trackId,
                name: displayName,
                artist: 'Kevin MacLeod',
                genre,
                popularity,
                energy,
                preview_url: `/previews/${trackId}.mp3`,
                image_url: `/covers/${trackId}.svg`,
            });
        } catch (err) {
            console.log(`✗ [${i + 1}/${TRACKS.length}] Failed: ${displayName} - ${err}`);
            failed++;
        }

        // Small delay to be nice to the server
        await new Promise(r => setTimeout(r, 200));
    }

    // Save the track metadata
    const outputPath = path.join(DATA_DIR, 'mockTracks.json');
    fs.writeFileSync(outputPath, JSON.stringify(mockTracks, null, 2));

    console.log('\n========================================');
    console.log('  DOWNLOAD COMPLETE');
    console.log('========================================\n');
    console.log(`Downloaded: ${downloaded} tracks`);
    console.log(`Failed: ${failed} tracks`);
    console.log(`Total: ${mockTracks.length} tracks\n`);
    console.log('Tracks per genre:');
    Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).forEach(([genre, count]) => {
        console.log(`  ${genre}: ${count}`);
    });
    console.log('\n📝 Attribution: Music by Kevin MacLeod (incompetech.com)');
    console.log('   Licensed under Creative Commons: By Attribution 4.0\n');
}

main().catch(console.error);
