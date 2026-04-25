// ==========================================
// 1. CONFIGURAÇÃO (Edite aqui!)
// ==========================================
const QUESTIONS = [
    { id: 'estrategia', title: '01. Estratégia', items: [
        { id: 'q1', label: 'Público-alvo', type: 'text' },
        { id: 'q2', label: 'Objetivos', type: 'text-long' },
        { id: 'q3', label: 'Concorrência', type: 'text' }
    ]},
    { id: 'marca', title: '02. Marca', items: [
        { id: 'q4', label: 'Valores', type: 'text' },
        { id: 'q5', label: 'Personalidade', type: 'text' },
        { id: 'q6', label: 'Posicionamento', type: 'text' }
    ]},
    { id: 'visual', title: '03. Visual', items: [
        { id: 'q7', label: 'Cores', type: 'text' },
        { id: 'q8', label: 'Tipografia', type: 'text' },
        { id: 'q9', label: 'Referências', type: 'file' } // Exemplo de módulo focado em arquivo
    ]},
    // ... Adicione o restante das 21 questões aqui seguindo o padrão ...
];

// ==========================================
// 2. RENDERIZAÇÃO
// ==========================================
const app = document.getElementById('app');

function renderForm() {
    app.innerHTML = '';
    const savedData = loadDraft();

    QUESTIONS.forEach(section => {
        // Título da Seção
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = section.title;
        app.appendChild(sectionTitle);

        // Itens da Seção
        section.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'question-card';
            
            // Cabeçalho (Número + Label)
            const header = document.createElement('div');
            header.className = 'q-header';
            header.innerHTML = `<span class="q-num">${item.id.toUpperCase()}</span><span class="q-label">${item.label}</span>`;
            card.appendChild(header);

            // Input Dinâmico
            if (item.type === 'text') {
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `input-${item.id}`;
                input.placeholder = 'Responda brevemente...';
                input.value = savedData[item.id] || ''; // Restaura dado salvo
                card.appendChild(input);
            } else if (item.type === 'text-long') {
                const area = document.createElement('textarea');
                area.id = `input-${item.id}`;
                area.placeholder = 'Descreva com detalhes...';
                area.value = savedData[item.id] || '';
                card.appendChild(area);
            } else if (item.type === 'file') {
                const fileArea = document.createElement('div');
                fileArea.className = 'file-area';
                fileArea.innerHTML = `
                    <div class="file-row">
                        <input type="file" id="input-${item.id}-0">
                        <button class="btn-icon" onclick="addFileField('${item.id}')">+</button>
                    </div>
                `;
                card.appendChild(fileArea);
            }

            // Listener para Auto-Save
            card.querySelectorAll('input, textarea').forEach(el => {
                el.addEventListener('input', () => saveDraft());
            });

            app.appendChild(card);
        });
    });
}

// ==========================================
// 3. LÓGICA DE ARQUIVOS DINÂMICOS
// ==========================================
// Torna a função global para o HTML acessar via onclick
window.addFileField = function(questionId) {
    const area = document.querySelector(`#input-${questionId}-0`).closest('.file-area');
    const count = area.querySelectorAll('.file-row').length;
    
    const newRow = document.createElement('div');
    newRow.className = 'file-row';
    newRow.innerHTML = `
        <input type="file" id="input-${questionId}-${count}">
        <button class="btn-icon remove" onclick="this.parentElement.remove()">×</button>
    `;
    area.appendChild(newRow);
};

// ==========================================
// 4. AUTO-SAVE (LOCALSTORAGE)
// ==========================================
const DRAFT_KEY = 'alma_briefing_draft';

function saveDraft() {
    const data = {};
    // Pega valores de texto
    document.querySelectorAll('input[type="text"], textarea').forEach(el => {
        data[el.id] = el.value;
    });
    // Nota: Arquivos não são salvos no localstorage (muito pesado), apenas textos.
    // Para persistir arquivos no rascunho, precisaríamos de IndexedDB (mais complexo).
    
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    
    // Feedback visual
    const msg = document.getElementById('status-msg');
    msg.classList.add('visible');
    setTimeout(() => msg.classList.remove('visible'), 2000);
}

function loadDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
}

// ==========================================
// 5. ENVIO (Placeholder para Firebase)
// ==========================================
document.getElementById('btn-submit').addEventListener('click', async () => {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    // Coletar dados finais
    const finalData = {};
    document.querySelectorAll('input[type="text"], textarea').forEach(el => {
        finalData[el.id] = el.value;
    });

    console.log("Dados prontos para envio:", finalData);
    // AQUI ENTRARIA A LÓGICA DO FIREBASE
    
    setTimeout(() => {
        alert('Simulação: Enviado com sucesso!');
        btn.disabled = false;
        btn.textContent = 'Enviar Briefing';
        localStorage.removeItem(DRAFT_KEY); // Limpa rascunho
    }, 1500);
});

// Inicializa
renderForm();