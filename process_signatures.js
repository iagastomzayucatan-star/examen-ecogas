const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const projectDir = 'C:/Users/Equipo 1/.gemini/antigravity/scratch/examen-ecogas';

async function makeSignatureUltraClean(filename, outFilenames) {
  const inputPath = path.join(projectDir, filename);
  
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Find background brightness average from corners
  let cornerSamples = [];
  const sampleSize = Math.min(10, Math.floor(width / 4), Math.floor(height / 4));
  for (let y = 0; y < sampleSize; y++) {
    for (let x = 0; x < sampleSize; x++) {
      const idx1 = (y * width + x) * channels;
      const idx2 = (y * width + (width - 1 - x)) * channels;
      const idx3 = ((height - 1 - y) * width + x) * channels;
      const idx4 = ((height - 1 - y) * width + (width - 1 - x)) * channels;
      cornerSamples.push(0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2]);
      cornerSamples.push(0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2]);
      cornerSamples.push(0.299 * data[idx3] + 0.587 * data[idx3 + 1] + 0.114 * data[idx3 + 2]);
      cornerSamples.push(0.299 * data[idx4] + 0.587 * data[idx4 + 1] + 0.114 * data[idx4 + 2]);
    }
  }
  const bgLum = cornerSamples.reduce((a, b) => a + b, 0) / cornerSamples.length;
  console.log(`${filename} (${width}x${height}) Background Luminance:`, bgLum);

  const outData = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const diff = bgLum - lum;
    const pxX = i % width;
    const pxY = Math.floor(i / width);

    // Clean stray dot in top-left of firma campos.jpg
    if (diff <= 8 || (pxX < 140 && pxY < 42)) {
      // 100% transparent background
      outData[i * 4] = 0;
      outData[i * 4 + 1] = 0;
      outData[i * 4 + 2] = 0;
      outData[i * 4 + 3] = 0;
    } else {
      // Smooth anti-aliased alpha
      const alpha = Math.min(255, Math.max(0, Math.round((diff / 35) * 255)));
      // Premium Royal Blue Ink Color (#122b70)
      outData[i * 4] = 18;      // R
      outData[i * 4 + 1] = 43;   // G
      outData[i * 4 + 2] = 112;  // B
      outData[i * 4 + 3] = alpha;
    }
  }

  for (const outName of outFilenames) {
    const outputPath = path.join(projectDir, outName);
    await sharp(outData, { raw: { width, height, channels: 4 } })
      .trim()
      .png({ compressionLevel: 9 })
      .toFile(outputPath);

    const meta = await sharp(outputPath).metadata();
    console.log(`Created ${outName}: ${meta.width}x${meta.height}, size: ${fs.statSync(outputPath).size} bytes`);
  }
}

async function run() {
  await makeSignatureUltraClean('firma campos.jpg', ['firma_campos_opt.png', 'firma_alberto_opt.png', 'firma_alberto_clean.png']);
}
run().catch(console.error);
