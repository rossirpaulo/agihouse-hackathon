import fs from 'fs/promises';
import path from 'path';

async function convertToTxt() {
  try {
    // Define source and destination directories
    const sourceDir = path.join(process.cwd(), 'Internal 4');
    const destDir = path.join(process.cwd(), 'src', 'data');

    // Ensure destination directory exists
    await fs.mkdir(destDir, { recursive: true });

    // Read all files from source directory
    const files = await fs.readdir(sourceDir);

    for (const file of files) {
      if (file.startsWith('.')) continue; // Skip hidden files

      const sourcePath = path.join(sourceDir, file);
      const stats = await fs.stat(sourcePath);

      if (stats.isFile()) {
        // Read the source file
        const content = await fs.readFile(sourcePath, 'utf-8');

        // Create destination filename (replace original extension with .txt)
        const baseName = path.parse(file).name;
        const destPath = path.join(destDir, `${baseName}.txt`);

        // Write content to new txt file
        await fs.writeFile(destPath, content, 'utf-8');
        console.log(`Converted ${file} to ${baseName}.txt`);
      }
    }

    console.log('All files have been converted successfully!');
  } catch (error) {
    console.error('Error converting files:', error);
  }
}

// Run the conversion
convertToTxt();