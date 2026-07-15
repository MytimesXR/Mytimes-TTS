const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.resolve(__dirname, '..');
const input = path.join(root, 'build', 'icon.svg');
const pngOutput = path.join(root, 'build', 'icon.png');
const icoOutput = path.join(root, 'build', 'icon.ico');
const sizes = [16, 24, 32, 48, 64, 128, 256];

function createIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  const header = Buffer.alloc(headerSize + entrySize * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;

  images.forEach(({ size, data }, index) => {
    const entry = headerSize + index * entrySize;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await window.loadFile(input);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const captured = await window.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  const png256 = captured.resize({ width: 256, height: 256, quality: 'best' }).toPNG();
  fs.writeFileSync(pngOutput, png256);

  const images = sizes.map((size) => ({
    size,
    data: captured.resize({ width: size, height: size, quality: 'best' }).toPNG(),
  }));
  fs.writeFileSync(icoOutput, createIco(images));
  window.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
