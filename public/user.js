(() => {
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('send-btn');
    const closeChat = document.getElementById('close-chat');
    const nameInput = document.getElementById('user-name');
    const textInput = document.getElementById('user-text');
    const conv = document.getElementById('conversation');
  
    // default greeting
    const defaultGreeting = {
      name: "Henry",
      text: "Henry from Norton, How can I help you",
      from: "admin",
      timestamp: Date.now()
    };
  
    // create/reuse user id
    let userId = localStorage.getItem('cp_userId');
    if (!userId) {
      userId = "u_" + Date.now();
      localStorage.setItem('cp_userId', userId);
    }
  
    // show chat box after 1 second
    setTimeout(() => {
      chatBox.classList.remove('hidden');
      appendMessage(defaultGreeting);
      loadMessages();
    }, 1000);
  
    closeChat.addEventListener('click', () => {
      chatBox.classList.add('hidden');
    });
  
    async function sendMessage() {
      const payload = {
        userId,
        name: nameInput.value || "Anonymous",
        text: textInput.value,
        from: "user"
      };
      if (!payload.text.trim()) return;
  
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
  
      const data = await res.json();
      textInput.value = "";
      appendMessage(data);
    }
  
    sendBtn.addEventListener("click", sendMessage);
  
    function appendMessage(msg) {
      const d = document.createElement('div');
      d.className = "msg " + (msg.from === "admin" ? "admin" : "user");
      d.innerHTML = `<div>${escapeHtml(msg.text)}</div>`;
      conv.appendChild(d);
      conv.scrollTop = conv.scrollHeight;
    }
  
    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
    }
  
    async function loadMessages() {
      setInterval(async () => {
        const res = await fetch("/api/messages?userId=" + userId);
        const data = await res.json();
        conv.innerHTML = "";
        appendMessage(defaultGreeting);
        data.forEach(appendMessage);
      }, 2000);
    }
  })();
  