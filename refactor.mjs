import fs from 'fs';
import path from 'path';

const dir = './src';
const exts = ['.js', '.jsx', '.css', '.html'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

let files = getAllFiles(dir);
files.push('./index.html');

// First replace contents
files.forEach(file => {
  if (!exts.includes(path.extname(file))) return;
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // FTMyTraining -> FTMyCompetition
  newContent = newContent.replace(/FTMyTraining/g, 'FTMyCompetition');
  
  // Training -> Competition
  newContent = newContent.replace(/Training/g, 'Competition');
  newContent = newContent.replace(/training/g, 'competition');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated content in: ' + file);
  }
});

// Rename files
files.forEach(file => {
  let basename = path.basename(file);
  let newBasename = basename;
  
  newBasename = newBasename.replace(/Training/g, 'Competition');
  newBasename = newBasename.replace(/training/g, 'competition');

  if (basename !== newBasename) {
    let newPath = path.join(path.dirname(file), newBasename);
    fs.renameSync(file, newPath);
    console.log(`Renamed: ${file} -> ${newPath}`);
  }
});
