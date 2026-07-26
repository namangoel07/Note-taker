document.addEventListener('DOMContentLoaded', () => {
  let notes = [];
  let reminders = [];

  const notesContainer = document.getElementById('notes-container');
  const calendarSection = document.getElementById('calendarSection');
  const noteForm = document.getElementById('noteForm');
  const boardTitle = document.getElementById('boardTitle');
  const boardHint = document.getElementById('boardHint');

  const TAB_COPY = {
    active:   { title: 'All notes',  hint: "Everything you've jotted down, in one place." },
    archived: { title: 'Archive',    hint: 'Notes you put aside for later.' },
    deleted:  { title: 'Trash',      hint: 'Deleted notes stay here until you remove them for good.' }
  };

  function setActiveTab(id) {
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(id);
    if (btn) btn.classList.add('active');
  }

  function setBoardCopy(status) {
    const copy = TAB_COPY[status] || TAB_COPY.active;
    boardTitle.textContent = copy.title;
    boardHint.textContent = copy.hint;
  }

  // ---------- Data loading ----------
  async function loadNotes() {
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error(`status ${res.status}`);
      notes = await res.json();
      renderNotes('active');
    } catch (err) {
      console.error('Failed to load notes:', err);
      notesContainer.innerHTML = '<p class="empty-msg">Could not load your notes. Try refreshing.</p>';
    }
  }

  async function loadReminders() {
    try {
      const res = await fetch('/api/reminders');
      if (!res.ok) throw new Error(`status ${res.status}`);
      reminders = await res.json();
      renderCalendar();
    } catch (err) {
      console.error('Failed to load reminders:', err);
    }
  }

  // ---------- Rendering ----------
  function renderNotes(status = 'active') {
    setBoardCopy(status);
    notesContainer.style.display = 'flex';
    calendarSection.classList.add('hidden');
    notesContainer.innerHTML = '';

    const filtered = notes.filter(n => n.status === status);

    if (filtered.length === 0) {
      const messages = {
        active: 'No notes yet — write your first one above.',
        archived: 'Nothing archived right now.',
        deleted: 'Trash is empty.'
      };
      notesContainer.innerHTML = `<p class="empty-msg">${messages[status] || 'Nothing here.'}</p>`;
      return;
    }

    filtered.forEach(n => {
      const card = document.createElement('div');
      card.className = `card ${n.color || 'yellow'}`;
      card.innerHTML = `
        <div class="card-menu" data-id="${n.id}">⋮</div>
        <div class="card-title"></div>
        <p></p>
        ${n.date ? `<small>Reminder: ${n.date}</small>` : ''}
      `;
      card.querySelector('.card-title').textContent = n.title;
      card.querySelector('p').textContent = n.content;
      notesContainer.appendChild(card);
    });
  }

  function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendarMonthLabel');
    grid.innerHTML = '';

    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstWeekday = new Date(y, m, 1).getDay();

    label.textContent = d.toLocaleString('default', { month: 'long', year: 'numeric' });

    for (let i = 0; i < firstWeekday; i++) {
      const filler = document.createElement('div');
      grid.appendChild(filler);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      cell.textContent = i;
      const str = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      if (reminders.some(r => r.date === str)) {
        const dot = document.createElement('div');
        dot.className = 'reminder-dot';
        cell.appendChild(dot);
      }
      cell.addEventListener('click', () => showReminderList(str));
      grid.appendChild(cell);
    }
  }

  function showReminderList(date) {
    const list = reminders.filter(r => r.date === date);
    notesContainer.innerHTML = '';
    notesContainer.style.display = 'flex';

    boardTitle.textContent = date;
    boardHint.textContent = 'Reminders for this date.';

    if (list.length === 0) {
      notesContainer.innerHTML = '<p class="empty-msg">No reminders for this date.</p>';
      return;
    }

    list.forEach(r => {
      const div = document.createElement('div');
      div.className = 'card yellow';
      div.innerHTML = `<div class="card-title">Reminder</div><p></p><small>${r.date}</small>`;
      div.querySelector('p').textContent = r.text;
      notesContainer.appendChild(div);
    });
  }

  // ---------- Card context menu ----------
  notesContainer.addEventListener('click', (e) => {
    const trigger = e.target.closest('.card-menu');
    if (!trigger) return;
    e.stopPropagation();
    openMenu(e, trigger.dataset.id);
  });

  function openMenu(e, id) {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    const note = notes.find(n => n.id === id);
    if (!note) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const actions = [['Edit', () => editNote(id)]];
    if (note.status === 'active') {
      actions.push(['Archive', () => updateNoteStatus(id, 'archived')]);
      actions.push(['Delete', () => updateNoteStatus(id, 'deleted')]);
    } else if (note.status === 'archived') {
      actions.push(['Unarchive', () => updateNoteStatus(id, 'active')]);
    } else if (note.status === 'deleted') {
      actions.push(['Restore', () => updateNoteStatus(id, 'active')]);
      actions.push(['Delete forever', () => permanentlyDeleteNote(id)]);
    }

    actions.forEach(([label, handler]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.addEventListener('click', handler);
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }));
  }

  async function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const newTitle = prompt('Edit title:', note.title);
    if (newTitle === null) return;
    const newContent = prompt('Edit content:', note.content);
    if (newContent === null) return;

    note.title = newTitle.trim() || note.title;
    note.content = newContent.trim() || note.content;
    try {
      await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });
      renderNotes(note.status);
    } catch (err) {
      console.error('Failed to update note:', err);
      alert('Could not save your changes — check the server is running and try again.');
    }
  }

  async function updateNoteStatus(id, status) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const previousStatus = note.status;
    note.status = status;
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      renderNotes(previousStatus === 'active' ? 'active' : previousStatus);
    } catch (err) {
      note.status = previousStatus;
      console.error('Failed to update note:', err);
      alert('Could not update the note — check the server is running and try again.');
    }
  }

  async function permanentlyDeleteNote(id) {
    const previous = notes;
    notes = notes.filter(n => n.id !== id);
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      renderNotes('deleted');
    } catch (err) {
      notes = previous;
      console.error('Failed to delete note:', err);
      alert('Could not delete the note — check the server is running and try again.');
    }
  }

  // ---------- Creating notes / reminders ----------
  async function addReminder(date, text) {
    const r = { id: `${Date.now()}-r`, date, text };
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      reminders.push(r);
      renderCalendar();
    } catch (err) {
      console.error('Failed to save reminder:', err);
    }
  }

  async function addNote(title, content, date = '') {
    const note = {
      id: `${Date.now()}`,
      title,
      content,
      date,
      color: ['yellow', 'red', 'blue', 'purple'][Math.floor(Math.random() * 4)],
      status: 'active'
    };

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || `Failed to save note (status ${res.status}).`);
        return;
      }

      notes.push(note);
      renderNotes('active');
      setActiveTab('allNotesBtn');
    } catch (err) {
      console.error('Failed to save note:', err);
      alert('Failed to save note — check the server is running and try again.');
    }
  }

  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const date = document.getElementById('reminderDate').value;

    if (!title || !content) return;

    await addNote(title, content, date);
    if (date) await addReminder(date, `${title} — ${content}`);
    e.target.reset();
  });

  // ---------- Navigation ----------
  document.getElementById('allNotesBtn').addEventListener('click', () => {
    setActiveTab('allNotesBtn');
    renderNotes('active');
  });

  document.getElementById('archiveBtn').addEventListener('click', () => {
    setActiveTab('archiveBtn');
    renderNotes('archived');
  });

  document.getElementById('trashBtn').addEventListener('click', () => {
    setActiveTab('trashBtn');
    renderNotes('deleted');
  });

  document.getElementById('calendarBtn').addEventListener('click', () => {
    setActiveTab('calendarBtn');
    boardTitle.textContent = 'Calendar';
    boardHint.textContent = 'Your reminders, laid out by day.';
    renderCalendar();
    calendarSection.classList.remove('hidden');
    notesContainer.style.display = 'none';
  });

  // ---------- Init ----------
  (async function initApp() {
    await loadNotes();
    await loadReminders();
  })();
});
