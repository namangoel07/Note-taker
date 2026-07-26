require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  console.warn(`'public/' folder not found at ${publicDir} — static files (index.html, CSS, JS) will 404.`);
}
app.use(express.static(publicDir));

// ========== Safe JSON file helpers ==========
// Reads/writes are resilient to a missing file, an empty (0 byte) file,
// or corrupted JSON — all of which used to crash the route with a 500.
function readJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse ${filePath}, resetting:`, err.message);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const notesPath = path.join(__dirname, 'notes.json');
const remindersPath = path.join(__dirname, 'reminders.json');

// ========== Notes APIs ==========
// Everything is stored locally in notes.json / reminders.json — no
// cloud database, no login, single local user.
app.get('/api/notes', (req, res) => {
  const allNotes = readJSON(notesPath, []);
  res.json(allNotes);
});

app.post('/api/notes', (req, res) => {
  const newNote = req.body;

  if (!newNote || !newNote.title || !newNote.content) {
    return res.status(400).json({ message: 'A note needs a title and content.' });
  }

  const allNotes = readJSON(notesPath, []);
  allNotes.push(newNote);
  writeJSON(notesPath, allNotes);
  console.log('New note saved:', newNote.id);
  res.status(201).json({ message: 'Note saved successfully', note: newNote });
});

// ========== Update Note (Archive, Delete, Restore, etc.) ==========
app.put('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  const updatedFields = req.body;

  const allNotes = readJSON(notesPath, []);
  const index = allNotes.findIndex(note => note.id === noteId);
  if (index === -1) return res.status(404).json({ message: 'Note not found' });

  allNotes[index] = { ...allNotes[index], ...updatedFields };
  writeJSON(notesPath, allNotes);

  res.json({ message: 'Note updated successfully', note: allNotes[index] });
});

// ========== Permanently Delete Note ==========
app.delete('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;

  const allNotes = readJSON(notesPath, []);
  const filtered = allNotes.filter(note => note.id !== noteId);
  writeJSON(notesPath, filtered);

  res.json({ message: 'Note permanently deleted' });
});

// ========== Reminders APIs ==========
app.get('/api/reminders', (req, res) => {
  const allReminders = readJSON(remindersPath, []);
  res.json(allReminders);
});

app.post('/api/reminders', (req, res) => {
  const newReminder = req.body;

  if (!newReminder || !newReminder.date || !newReminder.text) {
    return res.status(400).json({ message: 'A reminder needs a date and text.' });
  }

  const allReminders = readJSON(remindersPath, []);
  allReminders.push(newReminder);
  writeJSON(remindersPath, allReminders);
  res.status(201).json({ message: 'Reminder saved successfully', reminder: newReminder });
});

app.delete('/api/reminders/:id', (req, res) => {
  const reminderId = req.params.id;

  const allReminders = readJSON(remindersPath, []);
  const filtered = allReminders.filter(r => r.id !== reminderId);
  writeJSON(remindersPath, filtered);

  res.json({ message: 'Reminder deleted' });
});

// ========== Start Server ==========
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
