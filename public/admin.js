// admin.js
(() => {
    const usersEl = document.getElementById('users');
    const messagesEl = document.getElementById('messages');
    const chatHeader = document.getElementById('chat-header');
    const adminNameInput = document.getElementById('admin-name');
    const adminText = document.getElementById('admin-text');
    const adminSendBtn = document.getElementById('admin-send');
    const markSeenBtn = document.getElementById('mark-seen');
  
    let selectedUserId = null;
  
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const users = await res.json();
        renderUsers(users);
      } catch (err) {
        console.error(err);
      }
    }
  
    function renderUsers(users) {
      usersEl.innerHTML = '';
      users.forEach(u => {
        const li = document.createElement('li');
        li.textContent = u.name + ' • ' + new Date(u.lastTimestamp).toLocaleString();
        li.dataset.userId = u.userId;
        li.addEventListener('click', () => selectUser(u.userId, u.name));
        usersEl.appendChild(li);
      });
    }
  
    async function selectUser(userId, name) {
      selectedUserId = userId;
      chatHeader.textContent = 'Chat with: ' + (name || userId);
      await loadMessagesForUser(userId);
    }
  
    async function loadMessagesForUser(userId) {
      try {
        const res = await fetch('/api/messages?userId=' + encodeURIComponent(userId));
        const msgs = await res.json();
        messagesEl.innerHTML = '';
        msgs.forEach(renderMessage);
        // mark messages from user as seen (so admin marks seen once loaded)
        for (const m of msgs) {
          if (!m.seen && m.from === 'user') {
            await fetch('/api/messages/' + m.id + '/seen', { method: 'PUT' }).catch(()=>{});
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  
    function renderMessage(m) {
      const d = document.createElement('div');
      d.className = 'msg ' + (m.from === 'admin' ? 'admin' : 'user');
      const when = new Date(m.timestamp);
      d.innerHTML = `<small>${m.name} • ${when.toLocaleString()} ${m.from==='user' && !m.seen ? '<strong>(NEW)</strong>' : ''}</small><div>${escapeHtml(m.text)}</div>`;
      messagesEl.appendChild(d);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  
    function escapeHtml(s) {
      return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
    }
  
    adminSendBtn.addEventListener('click', async () => {
      if (!selectedUserId) return alert('Select a user first.');
      const payload = {
        userId: selectedUserId,
        name: adminNameInput.value || 'Admin',
        text: adminText.value,
        from: 'admin'
      };
      if (!payload.text || !payload.text.trim()) return alert('Enter a message to send.');
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
        const msg = await res.json();
        adminText.value = '';
        await loadMessagesForUser(selectedUserId);
      } catch (err) {
        console.error(err);
        alert('Send failed');
      }
    });
  
    markSeenBtn.addEventListener('click', async () => {
      if (!selectedUserId) return alert('Select a user first.');
      try {
        const res = await fetch('/api/messages?userId=' + encodeURIComponent(selectedUserId));
        const msgs = await res.json();
        const promises = msgs.filter(m => !m.seen).map(m => fetch('/api/messages/' + m.id + '/seen', { method: 'PUT' }));
        await Promise.all(promises);
        await loadMessagesForUser(selectedUserId);
      } catch (err) {
        console.error(err);
      }
    });
  
    // Poll users list and selected user's messages
    setInterval(async () => {
      await fetchUsers();
      if (selectedUserId) await loadMessagesForUser(selectedUserId);
    }, 2000);
  
    // initial
    fetchUsers();
  
  })();
  