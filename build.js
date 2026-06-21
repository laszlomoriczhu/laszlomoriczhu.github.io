const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const directories = ['2026', '2025', '2024', '2023', '2022', 'Kezdetek'];
const htmlFile = 'index.html';

async function processImages() {
    console.log('Képek feldolgozása indul...');
    const galleryData = [];

    for (const dir of directories) {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            console.log(`Mappa nem található: ${dir}`);
            galleryData.push({ year: dir, images: [] });
            continue;
        }

        const files = fs.readdirSync(dirPath);
        // Keresünk minden jpg/jpeg/png képet, ami NEM a _thumb vagy _full verzió
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f) && !f.includes('_thumb') && !f.includes('_full'));
        
        // Fájlok adatainak kinyerése (EXIF dátum vagy fájl dátum)
        const ExifReader = require('exifreader');
        
        const imagesWithStats = [];
        for (const file of imageFiles) {
            const filePath = path.join(dirPath, file);
            let fileTime = fs.statSync(filePath).mtime.getTime(); // Alapértelmezett: fájl másolásának/módosításának ideje
            let monthIndex = fs.statSync(filePath).mtime.getMonth();

            try {
                // Próbáljuk kiolvasni az EXIF adatot a képből (a fényképezőgép által beégetett igazi dátumot)
                const tags = await ExifReader.load(filePath);
                if (tags['DateTimeOriginal']) {
                    // EXIF formátum: "YYYY:MM:DD HH:MM:SS"
                    const dateStr = tags['DateTimeOriginal'].description;
                    if (dateStr && dateStr.length >= 10) {
                        const parts = dateStr.split(' ')[0].split(':');
                        if (parts.length === 3) {
                            const year = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10) - 1; // JS-ben a hónap 0-tól indul
                            const day = parseInt(parts[2], 10);
                            const exifDate = new Date(year, month, day);
                            if (!isNaN(exifDate.getTime())) {
                                fileTime = exifDate.getTime();
                                monthIndex = month;
                            }
                        }
                    }
                }
            } catch (e) {
                // Ha nincs EXIF adat, marad a fájl dátuma
            }

            imagesWithStats.push({
                file: file,
                time: fileTime,
                monthIndex: monthIndex,
                year: new Date(fileTime).getFullYear()
            });
        }

        // Rendezés dátum szerint (időrendben: régebbitől az újabb felé)
        imagesWithStats.sort((a, b) => a.time - b.time);

        const dirData = { year: dir, images: [] };

        for (const item of imagesWithStats) {
            const file = item.file;
            const ext = path.extname(file);
            const baseName = path.basename(file, ext);
            const inputPath = path.join(dirPath, file);
            
            const thumbName = `${baseName}_thumb.webp`;
            const fullName = `${baseName}_full.webp`;
            const thumbPath = path.join(dirPath, thumbName);
            const fullPath = path.join(dirPath, fullName);

            // Bélyegkép generálása (max 600px széles)
            if (!fs.existsSync(thumbPath)) {
                console.log(`Bélyegkép készítése: ${dir}/${thumbName}`);
                await sharp(inputPath)
                    .resize({ width: 600, withoutEnlargement: true })
                    .webp({ quality: 70 })
                    .toFile(thumbPath);
            }

            // Nagy kép generálása (max 1920px széles)
            if (!fs.existsSync(fullPath)) {
                console.log(`Nagy kép készítése: ${dir}/${fullName}`);
                await sharp(inputPath)
                    .resize({ width: 1920, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toFile(fullPath);
            }

            dirData.images.push({
                thumb: `${dir}/${thumbName}`,
                full: `${dir}/${fullName}`,
                monthIndex: item.monthIndex,
                year: item.year
            });
        }
        galleryData.push(dirData);
    }

    // index.html frissítése
    console.log('index.html frissítése...');
    const htmlPath = path.join(__dirname, htmlFile);
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    const injectionStart = '// --- INJECT DATA START ---';
    const injectionEnd = '// --- INJECT DATA END ---';
    
    const jsonString = JSON.stringify(galleryData, null, 4);
    const newScriptPart = `${injectionStart}\n        const galleryData = ${jsonString};\n        ${injectionEnd}`;

    // Reguláris kifejezés a két marker közötti rész cseréjére
    const regex = new RegExp(`${injectionStart}[\\s\\S]*?${injectionEnd}`);
    if (regex.test(htmlContent)) {
        htmlContent = htmlContent.replace(regex, newScriptPart);
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log('Sikeres frissítés!');
    } else {
        console.error('Hiba: Nem találtam meg az INJECT DATA markereket az index.html-ben!');
    }

    console.log('Kész! Nyisd meg az index.html-t a böngészőben.');
}

processImages().catch(err => console.error('Hiba történt:', err));
