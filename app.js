// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE (SUA PARTE)
// ==========================================// Imports CORRETOS para navegador (sem bundler)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCf8UPYEekSfwJkTgWTojvAvli473ip3oM",
  authDomain: "alma-briefing.firebaseapp.com",
  projectId: "alma-briefing",
  storageBucket: "alma-briefing.firebasestorage.app",
  messagingSenderId: "895086378569",
  appId: "1:895086378569:web:ed0c1a6e34ff610ec18998",
  measurementId: "G-N1629LM322"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Variável global para o ID do cliente (anônimo)
let userId = null;

// ==========================================
// 2. QUESTÕES (EDITE AQUI PARA MUDAR O FORM)
// ==========================================
const QUESTIONS = [
    { id: 'estrategia', title: '01. Estratégia', items: [
        { id: 'q1', label: 'Público-alvo', type: 'text' },
        { id: 'q2', label: 'Objetivos', type: 'text-long' },
        { id: 'q3', label: 'Concorrência', type: 'file' } // Exemplo com arquivo
    ]},
    // Adicione mais seções aqui...
];

// ==========================================
// 3. INICIALIZAÇÃO E RENDERIZAÇÃO
// ==========================================
async function init() {
    const btn = document.getElementById('btn-submit');
    btn.textContent = 'Carregando...';
    
    try {
        // Login Anônimo (permite salvar rascunhos sem conta)
        const cred = await signInAnonymously(auth);
        userId = cred.user.uid;
        console.log("Usuário ID:", userId);
        
        renderForm();
        loadDraft(); // Carrega dados salvos
        btn.textContent = 'Enviar Briefing';
    } catch (error) {
        console.error("Erro Firebase:", error);
        btn.textContent = 'Erro ao conectar';
    }
}

function renderForm() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    QUESTIONS.forEach(section => {
        const secTitle = document.createElement('h2');
        secTitle.className = 'section-title';
        secTitle.textContent = section.title;
        app.appendChild(secTitle);

        section.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'question-card';
            
            card.innerHTML = `
                <div class="q-header">
                    <span class="q-num">${item.id.toUpperCase()}</span>
                    <span class="q-label">${item.label}</span>
                </div>
                <div class="input-wrapper">
                    ${item.type === 'text' ? `<input type="text" id="${item.id}" data-type="text" placeholder="Responda...">` : ''}
                    ${item.type === 'text-long' ? `<textarea id="${item.id}" data-type="text" placeholder="Descreva..."></textarea>` : ''}
                    ${item.type === 'file' ? `
                        <div class="file-area" id="area-${item.id}">
                            <div class="file-row"><input type="file" data-file-for="${item.id}"><button class="btn-icon" onclick="addFile('${item.id}')">+</button></div>
                        </div>
                    ` : ''}
                </div>
            `;
            app.appendChild(card);
        });
    });

    // Auto-save ao digitar
    document.querySelectorAll('input[type="text"], textarea').forEach(el => {
        el.addEventListener('input', (e) => saveLocalDraft(e.target.id, e.target.value));
    });
}

// ==========================================
// 4. FUNÇÕES DE ARQUIVO
// ==========================================
window.addFile = function(qId) {
    const area = document.getElementById(`area-${qId}`);
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `<input type="file" data-file-for="${qId}"><button class="btn-icon remove" onclick="this.parentElement.remove()">×</button>`;
    area.appendChild(row);
};

// ==========================================
// 5. LÓGICA DE SALVAR / CARREGAR
// ==========================================
// Salva texto no LocalStorage (Rápido/Offline)
function saveLocalDraft(id, value) {
    const drafts = JSON.parse(localStorage.getItem('alma_draft') || '{}');
    drafts[userId] = drafts[userId] || {};
    drafts[userId][id] = value;
    localStorage.setItem('alma_draft', JSON.stringify(drafts));
}

// Carrega texto do LocalStorage
function loadDraft() {
    const drafts = JSON.parse(localStorage.getItem('alma_draft') || '{}');
    const userData = drafts[userId] || {};
    
    Object.keys(userData).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = userData[key];
    });
}

// Envia TUDO para o Firebase
document.getElementById('btn-submit').addEventListener('click', async () => {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const formData = {
            timestamp: new Date().toISOString(),
            texts: {},
            files: []
        };

        // 1. Coletar Textos
        document.querySelectorAll('[data-type="text"]').forEach(el => {
            formData.texts[el.id] = el.value;
        });

        // 2. Upload de Arquivos
        const fileInputs = document.querySelectorAll('input[type="file"]');
        for (const input of fileInputs) {
            if (input.files.length > 0) {
                const file = input.files[0];
                const qId = input.dataset.fileFor;
                const path = `briefings/${userId}/${qId}/${Date.now()}_${file.name}`;
                
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                
                formData.files.push({ questionId: qId, url: url, name: file.name });
            }
        }

        // 3. Salvar no Banco (Firestore)
        const docRef = doc(db, "briefings", userId);
        await setDoc(docRef, formData, { merge: true }); // Merge para não apagar se atualizar

        alert('✅ Briefing enviado com sucesso!');
        localStorage.removeItem('alma_draft'); // Limpa rascunho local
        location.reload();

    } catch (error) {
        console.error(error);
        alert('❌ Erro ao enviar: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Tentar Novamente';
    }
});

// Iniciar
init();