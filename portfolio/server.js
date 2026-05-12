const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
// Sert les assets récupérés via Cursor (pour afficher les logos sans les copier dans public/).
const cursorAssetsDir = path.join(
  os.homedir(),
  '.cursor',
  'projects',
  'c-Users-papar-Downloads-portfolio-matthieu-lopes',
  'assets'
);
app.use('/cursor-assets', express.static(cursorAssetsDir));
app.use(express.json());

// Route contact form
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  console.log(`📩 Message de ${name} (${email}): ${message}`);
  res.json({ success: true, message: 'Message reçu !' });
});

// Express 5 n'accepte pas toujours le pattern '*' pour le catch-all.
// On utilise un middleware "app.use" en dernier pour servir la SPA (single page).
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Portfolio en ligne → http://localhost:${PORT}`);
});
