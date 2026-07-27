const fs = require('fs');
const path = require('path');

const jsonPath = 'C:/Users/amage/Downloads/scicomm_edits.json';
console.log('Reading JSON from:', jsonPath);

const edits = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const publicUploads = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(publicUploads)) {
  fs.mkdirSync(publicUploads, { recursive: true });
}

let imageCounter = 0;
function saveBase64Image(base64Str, prefix) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
    return base64Str;
  }
  const matches = base64Str.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches) return base64Str;

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const data = Buffer.from(matches[2], 'base64');
  imageCounter++;
  const filename = prefix + '_' + Date.now() + '_' + imageCounter + '.' + ext;
  const filepath = path.join(publicUploads, filename);
  fs.writeFileSync(filepath, data);
  console.log('Extracted image:', filename, '(' + Math.round(data.length / 1024) + ' KB)');
  return './uploads/' + filename;
}

// Process top-level images
if (edits.heroLogo) edits.heroLogo = saveBase64Image(edits.heroLogo, 'hero_logo');
if (edits.navLogo) edits.navLogo = saveBase64Image(edits.navLogo, 'nav_logo');
if (edits.footerLogo) edits.footerLogo = saveBase64Image(edits.footerLogo, 'footer_logo');
if (edits.heroBgImage) edits.heroBgImage = saveBase64Image(edits.heroBgImage, 'hero_bg');

// Hall of Fame
if (Array.isArray(edits.hallOfFameChampions)) {
  edits.hallOfFameChampions.forEach((champ, ci) => {
    if (Array.isArray(champ.members)) {
      champ.members.forEach((m, mi) => {
        if (m.img) {
          const safeName = (m.name || 'member').toLowerCase().replace(/[^a-z0-9]/g, '_');
          m.img = saveBase64Image(m.img, 'hof_' + safeName);
        }
      });
    }
  });
}

// Team Members
if (Array.isArray(edits.teamMembers)) {
  edits.teamMembers.forEach((tm, i) => {
    if (tm.img) {
      const safeName = (tm.name || 'team').toLowerCase().replace(/[^a-z0-9]/g, '_');
      tm.img = saveBase64Image(tm.img, 'team_' + safeName);
    }
  });
}

// Workshops
if (Array.isArray(edits.workshops)) {
  edits.workshops.forEach((ws, i) => {
    if (ws.img) ws.img = saveBase64Image(ws.img, 'workshop_' + i);
  });
}

// Gallery
if (Array.isArray(edits.galleryImages)) {
  edits.galleryImages = edits.galleryImages.map((img, i) => saveBase64Image(img, 'gallery_' + i));
}

// Collaborators
if (Array.isArray(edits.collaborators)) {
  edits.collaborators.forEach((col, i) => {
    if (col.logo) col.logo = saveBase64Image(col.logo, 'collab_' + i);
  });
}

// About Slides
if (Array.isArray(edits.aboutSlides)) {
  edits.aboutSlides.forEach((slide, i) => {
    if (slide.img) slide.img = saveBase64Image(slide.img, 'about_' + i);
  });
}

console.log('Total extracted images:', imageCounter);
fs.writeFileSync(path.join(__dirname, 'src', 'defaultContent.json'), JSON.stringify(edits, null, 2));
console.log('Saved processed content to src/defaultContent.json successfully!');
