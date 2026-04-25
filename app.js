// ==========================================
// 1. IMPORTS (CDN - Não altere)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// ==========================================
// 2. CONFIGURAÇÃO FIREBASE (SUAS CHAVES)
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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); // <--- Declarado globalmente

let userId = null; // Será preenchido no login

// ==========================================
// 3. CONFIGURAÇÃO DAS QUESTÕES (EDITE AQUI)
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
    // ... adicione o restante das 21 questões aqui
];

// ==========================================
// 4. INICIALIZAÇÃO
// ==========================================
async function init() {
    const btn = document.getElementById('btn-submit');
    if(btn) btn.textContent = 'Conectando...';
    
    try {
        // Login anônimo para identificar o rascunho
        const cred = await signInAnonymously(auth);
        userId = cred.user.uid;
        console.log("✅ Firebase conectado. User ID:", userId);
        
        renderForm();
        loadLocalDraft();
        
        if(btn) {
            btn.textContent = 'Enviar Briefing';
            btn.disabled = false;
        }
    } catch (error) {
        console.error("❌ Erro Firebase:", error);
        if(btn) {
            btn.textContent = 'Erro de conexão';
            btn.disabled = true;
        }
    }
}

// ==========================================
// 5. RENDERIZAÇÃO DINÂMICA
// ==========================================
function renderForm() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';

    QUESTIONS.forEach(section => {
        // Título da seção
        const secTitle = document.createElement('h2');
        secTitle.className = 'section-title';
        secTitle.textContent = section.title;
        app.appendChild(secTitle);

        // Itens da seção
        section.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'question-card';
            
            let inputHTML = '';
            if (item.type === 'text') {
                inputHTML = `<input type="text" id="${item.id}" data-type="text" placeholder="Responda brevemente...">`;
            } else if (item.type === 'text-long') {
                inputHTML = `<textarea id="${item.id}" data-type="text" placeholder="Descreva com detalhes..."></textarea>`;
            } else if (item.type === 'file') {
                inputHTML = `
                    <div class="file-area" id="area-${item.id}">
                        <div class="file-row">
                            <input type="file" data-file-for="${item.id}">
                            <button type="button" class="btn-icon" onclick="addFile('${item.id}')">+</button>
                        </div>
                    </div>`;
            }

            card.innerHTML = `
                <div class="q-header">
                    <span class="q-num">${item.id.toUpperCase()}</span>
                    <span class="q-label">${item.label}</span>
                </div>
                <div class="input-wrapper">${inputHTML}</div>
            `;
            app.appendChild(card);
        });
    });

    // Auto-save para campos de texto
    document.querySelectorAll('input[type="text"], textarea').forEach(el => {
        el.addEventListener('input', (e) => saveLocalDraft(e.target.id, e.target.value));
    });
}

// ==========================================
// 6. FUNÇÃO GLOBAL PARA ADICIONAR ARQUIVOS
// ==========================================
window.addFile = function(qId) {
    const area = document.getElementById(`area-${qId}`);
    if (!area) return;
    
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
        <input type="file" data-file-for="${qId}">
        <button type="button" class="btn-icon remove" onclick="this.parentElement.remove()">×</button>
    `;
    area.appendChild(row);
};

// ==========================================
// 7. AUTO-SAVE LOCAL (TEXTO APENAS)
// ==========================================
function saveLocalDraft(id, value) {
    if (!userId) return;
    const drafts = JSON.parse(localStorage.getItem('alma_draft') || '{}');
    drafts[userId] = drafts[userId] || {};
    drafts[userId][id] = value;
    localStorage.setItem('alma_draft', JSON.stringify(drafts));
    
    // Feedback visual
    const msg = document.getElementById('status-msg');
    if (msg) {
        msg.classList.add('visible');
        setTimeout(() => msg.classList.remove('visible'), 2000);
    }
}

function loadLocalDraft() {
    if (!userId) return;
    const drafts = JSON.parse(localStorage.getItem('alma_draft') || '{}');
    const userData = drafts[userId] || {};
    
    Object.keys(userData).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = userData[key];
    });
}

// ==========================================
// 8. ENVIO PARA FIREBASE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-submit');
    if (btn) {
        btn.addEventListener('click', handleSubmit);
    }
    // Inicia o app
    init();
});

async function handleSubmit() {
    const btn = document.getElementById('btn-submit');
    if (!btn || !userId) return;
    
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const formData = {
            timestamp: new Date().toISOString(),
            userId: userId,
            texts: {},
            files: []
        };

        // Coletar textos
        document.querySelectorAll('[data-type="text"]').forEach(el => {
            formData.texts[el.id] = el.value;
        });

        // Upload de arquivos
        const fileInputs = document.querySelectorAll('input[type="file"]');
        for (const input of fileInputs) {
            if (input.files.length > 0) {
                const file = input.files[0];
                const qId = input.dataset.fileFor;
                const path = `briefings/${userId}/${qId}/${Date.now()}_${file.name}`;
                
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                
                formData.files.push({ 
                    questionId: qId, 
                    url: url, 
                    name: file.name,
                    size: file.size 
                });
            }
        }

        // Salvar no Firestore
        const docRef = doc(db, "briefings", userId);
        await setDoc(docRef, formData, { merge: true });

        alert('✅ Briefing enviado com sucesso!');
        localStorage.removeItem('alma_draft');
        location.reload();

    } catch (error) {
        console.error("Erro ao enviar:", error);
        alert('❌ Erro: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Tentar novamente';
    }
}