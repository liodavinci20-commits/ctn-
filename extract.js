const fs = require('fs');
const html = fs.readFileSync('../cahier_texte_numerique.html', 'utf8');
const match = html.match(/<style>([\s\S]*?)<\/style>/i);
if (match) {
  const css = match[1].trim();
  fs.writeFileSync('src/index.css', `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');\n\n` + css);
  console.log('CSS extracted');
} else {
  console.log('No style block found');
}
