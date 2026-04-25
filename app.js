// ==========================================
// 1. IMPORTS (CDN)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// ==========================================
// 2. CONFIG FIREBASE (SUAS CHAVES)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCf8UPYEekSfwJkTgWTojvAvli473ip3oM",
  authDomain: "alma-briefing.firebaseapp.com",
  projectId: "alma-briefing",
  storageBucket: "alma-briefing.firebasestorage.app",
  messagingSenderId: "895086378569",
  appId: "1:895086378569:web:ed0c1a6e34ff610ec18998",
  measurementId: "G-N1629LM322"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ID único do rascunho (persiste no navegador)
const DRAFT_KEY = 'alma_draft_id';
let draftId = localStorage.getItem(DRAFT_KEY) || 
             (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
localStorage.setItem(DRAFT_KEY, draftId);

// ==========================================
// 3. QUESTÕES (EDITE AQUI)
// ==========================================
const QUESTIONS = [
    { id: 'estrategia', title: '01. Estratégia', items: [
        { id: 'q1', label: 'Público-alvo', type: 'text' },
        { id: 'q2', label: 'Objetivos', type: 'text-long' },
        { id: 'q3', label: 'Concorrência', type: 'file' }
    ]},
    { id: 'marca', title: '02. Marca', items: [
        { id: 'q4', label: 'Valores', type: 'text' },
        { id: 'q5', label: 'Personalidade', type: 'text' },
        { id: 'q6', label: 'Posicionamento', type: 'text' }
    ]},
    { id: 'visual', title: '03. Visual', items: [
        { id: 'q7', label: 'Cores', type: 'text' },
        { id: 'q8', label: 'Tipografia', type: 'text' },
        { id: 'q9', label: 'Referências', type: 'file' }
    ]}
    // Complete até a q21...
];

// ==========================================
// 4. RENDERIZAÇÃO
// ==========================================
function renderForm() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = '';
    const saved = JSON.parse(localStorage.getItem(`alma_data_${draftId}`) || '{}');

    QUESTIONS.forEach(sec => {
        const h2 = document.createElement('h2');
        h2.className = 'section-title';
        h2.textContent = sec.title;
        appEl.appendChild(h2);

        sec.items.forEach(q => {
            const card = document.createElement('div');
            card.className = 'question-card';
            
            let input = '';
            if(q.type === 'text') input = `<input type="text" id="${q.id}" data-type="text" placeholder="Responda...">`;
            if(q.type === 'text-long') input = `<textarea id="${q.id}" data-type="text" placeholder="Descreva..."></textarea>`;
            if(q.type === 'file') input = `<div class="file-area" id="area-${q.id}"><div class="file-row"><input type="file" data-file-for="${q.id}"><button type="button" class="btn-icon" onclick="addFile('${q.id}')">+</button></div></div>`;

            card.innerHTML = `
                <div class="q-header"><span class="q-num">${q.id.toUpperCase()}</span><span class="q-label">${q.label}</span></div>
                <div class="input-wrapper">${input}</div>`;
            appEl.appendChild(card);
        });
    });

    // Restaura valores salvos
    Object.keys(saved).forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = saved[id];
    });

    // Auto-save
    document.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', saveDraft);
    });
}

function saveDraft() {
    const data = {};
    document.querySelectorAll('[data-type="text"]').forEach(el => data[el.id] = el.value);
    localStorage.setItem(`alma_data_${draftId}`, JSON.stringify(data));
    
    const msg = document.getElementById('status-msg');
    if(msg) { msg.classList.add('visible'); setTimeout(() => msg.classList.remove('visible'), 2000); }
}

// ==========================================
// 5. ARQUIVOS DINÂMICOS
// ==========================================
window.addFile = function(qId) {
    const area = document.getElementById(`area-${qId}`);
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `<input type="file" data-file-for="${qId}"><button type="button" class="btn-icon remove" onclick="this.parentElement.remove()">×</button>`;
    area.appendChild(row);
};

// ==========================================
// 6. ENVIO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    renderForm();
    
    document.getElementById('btn-submit').addEventListener('click', async () => {
        const btn = document.getElementById('btn-submit');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        try {
            const payload = { draftId, timestamp: new Date().toISOString(), texts: {}, files: [] };
            
            // Textos
            document.querySelectorAll('[data-type="text"]').forEach(el => payload.texts[el.id] = el.value);
            
            // Arquivos
            for(const input of document.querySelectorAll('input[type="file"]')) {
                if(input.files.length > 0) {
                    const file = input.files[0];
                    const path = `briefings/${draftId}/${input.dataset.fileFor}/${Date.now()}_${file.name}`;
                    const sRef = ref(storage, path);
                    await uploadBytes(sRef, file);
                    payload.files.push({ qId: input.dataset.fileFor, url: await getDownloadURL(sRef), name: file.name });
                }
            }

            await setDoc(doc(db, "briefings", draftId), payload);
            alert('✅ Enviado!');
            localStorage.removeItem(`alma_data_${draftId}`);
            localStorage.removeItem(DRAFT_KEY);
            location.reload();
        } catch(e) {
            alert('❌ Erro: ' + e.message);
            btn.disabled = false;
            btn.textContent = 'Tentar novamente';
        }
    });
});