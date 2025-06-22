import fs from 'fs-extra';
import path from 'path';

const sourceDir = './dist';
const targetDir = './backend/public';

async function copyBuild() {
  try {
    // Crea la directory target se non esiste
    await fs.ensureDir(targetDir);
    
    // Pulisce la directory target
    await fs.emptyDir(targetDir);
    
    // Copia tutti i file da dist a backend/public
    await fs.copy(sourceDir, targetDir);
    
    console.log('✅ Build files copied successfully!');
    console.log(`📁 Source: ${path.resolve(sourceDir)}`);
    console.log(`📁 Target: ${path.resolve(targetDir)}`);
    
    // Lista dei file copiati
    const files = await fs.readdir(targetDir);
    console.log('📄 Files copied:', files.join(', '));
    
  } catch (error) {
    console.error('❌ Error copying build files:', error);
    process.exit(1);
  }
}

copyBuild();