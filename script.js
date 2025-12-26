// Configurações
const CONFIG = {
    API_URL: 'https://seu-n8n-webhook.com/webhook/agendamentos',
    MAX_CHARS: 500,
    STORAGE_KEY: 'calcados_agendamentos'
};

// Elementos DOM
const elements = {
    form: document.getElementById('disparoForm'),
    data: document.getElementById('data'),
    hora: document.getElementById('hora'),
    mensagem: document.getElementById('mensagem'),
    charCount: document.getElementById('charCount'),
    destinatario: document.getElementById('destinatario'),
    btnSubmit: document.getElementById('btnSubmit'),
    btnPreview: document.getElementById('btnPreview'),
    btnRefresh: document.getElementById('btnRefresh'),
    scheduleList: document.getElementById('scheduleList'),
    previewModal: document.getElementById('previewModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    previewDateTime: document.getElementById('previewDateTime'),
    previewMessage: document.getElementById('previewMessage'),
    toast: document.getElementById('toast'),
    statusIndicator: document.getElementById('statusIndicator')
};

// Estado da aplicação
const state = {
    agendamentos: [],
    isSubmitting: false,
    connectionStatus: true
};

// Inicialização
function init() {
    setupEventListeners();
    loadFromStorage();
    setupDefaultDateTime();
    updateScheduleList();
}

// Configura listeners de eventos
function setupEventListeners() {
    // Contador de caracteres
    elements.mensagem.addEventListener('input', updateCharCount);
    
    // Validação em tempo real
    elements.data.addEventListener('change', validateDateTime);
    elements.hora.addEventListener('change', validateDateTime);
    
    // Envio do formulário
    elements.form.addEventListener('submit', handleSubmit);
    
    // Pré-visualização
    elements.btnPreview.addEventListener('click', showPreview);
    
    // Fechar modal
    elements.btnCloseModal.addEventListener('click', () => {
        elements.previewModal.classList.remove('active');
    });
    
    // Fechar modal ao clicar fora
    elements.previewModal.addEventListener('click', (e) => {
        if (e.target === elements.previewModal) {
            elements.previewModal.classList.remove('active');
        }
    });
    
    // Atualizar lista
    elements.btnRefresh.addEventListener('click', updateScheduleList);
    
    // Tooltip de dicas
    document.querySelector('.btn-tooltip').addEventListener('click', showTips);
    
    // Teclas de atalho
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Configura data/hora padrão
function setupDefaultDateTime() {
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const proximaHora = new Date(agora.getTime() + 60 * 60 * 1000);
    const horaFormatada = proximaHora.toTimeString().slice(0, 5);
    
    elements.data.value = dataHoje;
    elements.data.min = dataHoje;
    elements.hora.value = horaFormatada;
}

// Atualiza contador de caracteres
function updateCharCount() {
    const length = elements.mensagem.value.length;
    elements.charCount.textContent = length;
    
    // Atualiza classes para feedback visual
    elements.charCount.className = '';
    if (length > CONFIG.MAX_CHARS * 0.9) {
        elements.charCount.classList.add('danger');
    } else if (length > CONFIG.MAX_CHARS * 0.75) {
        elements.charCount.classList.add('warning');
    }
}

// Valida data e hora
function validateDateTime() {
    if (!elements.data.value || !elements.hora.value) return true;
    
    const dataSelecionada = new Date(`${elements.data.value}T${elements.hora.value}`);
    const agora = new Date();
    
    if (dataSelecionada <= agora) {
        alert('⚠️ Por favor, selecione uma data e hora futuras!');
        elements.data.value = '';
        elements.hora.value = '';
        return false;
    }
    
    return true;
}

// Mostra pré-visualização
function showPreview() {
    if (!validateDateTime()) return;
    
    const dataFormatada = formatDate(elements.data.value);
    const horaFormatada = elements.hora.value;
    
    elements.previewDateTime.textContent = `${dataFormatada} às ${horaFormatada}`;
    elements.previewMessage.textContent = elements.mensagem.value || 'Nenhuma mensagem informada';
    
    elements.previewModal.classList.add('active');
}

// Formata data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Manipula envio do formulário
async function handleSubmit(e) {
    e.preventDefault();
    
    // Validações
    if (!validateDateTime()) return;
    if (elements.mensagem.value.length === 0) {
        alert('⚠️ Por favor, digite uma mensagem!');
        elements.mensagem.focus();
        return;
    }
    
    // Prepara dados
    const agendamento = {
        id: Date.now(),
        data: elements.data.value,
        hora: elements.hora.value,
        mensagem: elements.mensagem.value,
        destinatario: elements.destinatario.value,
        timestamp: new Date(`${elements.data.value}T${elements.hora.value}`).toISOString(),
        status: 'agendado',
        criadoEm: new Date().toISOString()
    };
    
    // Atualiza interface durante envio
    setSubmittingState(true);
    
    try {
        // Envia para o n8n (simulação)
        const success = await sendToN8N(agendamento);
        
        if (success) {
            // Salva localmente
            saveAgendamento(agendamento);
            
            // Feedback ao usuário
            showToast('✅ Disparo agendado com sucesso!');
            
            // Limpa formulário
            elements.form.reset();
            setupDefaultDateTime();
            updateCharCount();
            
            // Atualiza lista
            updateScheduleList();
        } else {
            throw new Error('Falha na comunicação com o servidor');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao agendar. Tente novamente.', true);
    } finally {
        setSubmittingState(false);
    }
}

// Envia para o n8n (simulação)
async function sendToN8N(agendamento) {
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Em produção, descomente isso:
    /*
    const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(agendamento)
    });
    
    return response.ok;
    */
    
    // Simulação de sucesso
    return true;
}

// Atualiza estado de envio
function setSubmittingState(isSubmitting) {
    state.isSubmitting = isSubmitting;
    elements.btnSubmit.disabled = isSubmitting;
    elements.btnSubmit.innerHTML = isSubmitting 
        ? '<i class="fas fa-spinner fa-spin"></i> Agendando...' 
        : '<i class="fas fa-calendar-plus"></i> Agendar Disparo';
}

// Mostra toast de notificação
function showToast(message, isError = false) {
    const toast = elements.toast;
    const icon = toast.querySelector('.toast-icon');
    const text = toast.querySelector('.toast-message');
    
    text.textContent = message;
    icon.className = isError ? 'fas fa-exclamation-circle toast-icon' : 'fas fa-check-circle toast-icon';
    icon.style.color = isError ? '#f72585' : '#28a745';
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Salva agendamento no localStorage
function saveAgendamento(agendamento) {
    state.agendamentos.unshift(agendamento);
    
    // Mantém apenas os últimos 10 agendamentos
    if (state.agendamentos.length > 10) {
        state.agendamentos = state.agendamentos.slice(0, 10);
    }
    
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.agendamentos));
}

// Carrega do localStorage
function loadFromStorage() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (saved) {
        state.agendamentos = JSON.parse(saved);
    }
}

// Atualiza lista de agendamentos
function updateScheduleList() {
    const scheduleList = elements.scheduleList;
    
    if (state.agendamentos.length === 0) {
        scheduleList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhum agendamento realizado</p>
            </div>
        `;
        return;
    }
    
    scheduleList.innerHTML = state.agendamentos.map(agendamento => `
        <div class="schedule-item" data-id="${agendamento.id}">
            <div class="schedule-info">
                <h4>${agendamento.mensagem.substring(0, 50)}${agendamento.mensagem.length > 50 ? '...' : ''}</h4>
                <div class="schedule-time">
                    <i class="far fa-calendar"></i>
                    ${formatDate(agendamento.data)} às ${agendamento.hora}
                    ${agendamento.destinatario ? `<i class="fas fa-user-tag"></i> ${agendamento.destinatario}` : ''}
                </div>
            </div>
            <div class="schedule-actions">
                <button class="btn-action edit" onclick="editAgendamento(${agendamento.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" onclick="deleteAgendamento(${agendamento.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Edita agendamento
function editAgendamento(id) {
    const agendamento = state.agendamentos.find(a => a.id === id);
    if (!agendamento) return;
    
    elements.data.value = agendamento.data;
    elements.hora.value = agendamento.hora;
    elements.mensagem.value = agendamento.mensagem;
    elements.destinatario.value = agendamento.destinatario || '';
    
    updateCharCount();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Remove da lista após edição
    state.agendamentos = state.agendamentos.filter(a => a.id !== id);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.agendamentos));
    updateScheduleList();
    
    showToast('✏️ Agendamento carregado para edição');
}

// Exclui agendamento
function deleteAgendamento(id) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    
    state.agendamentos = state.agendamentos.filter(a => a.id !== id);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.agendamentos));
    updateScheduleList();
    
    showToast('🗑️ Agendamento excluído');
}

// Mostra dicas de mensagem
function showTips() {
    const tips = [
        "Lembrete: Seu calçado está pronto para retirada!",
        "Promoção: 20% off em tênis até amanhã!",
        "Novidades: Chegaram novos modelos de sandálias!",
        "Manutenção: Traga seu calçado para limpeza gratuita!",
        "Aniversário: 15% de desconto no seu mês!",
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    elements.mensagem.value = randomTip;
    updateCharCount();
    showToast('💡 Dica aplicada!');
}

// Manipula atalhos de teclado
function handleKeyboardShortcuts(e) {
    // Ctrl + Enter para enviar
    if (e.ctrlKey && e.key === 'Enter') {
        elements.form.requestSubmit();
    }
    
    // Esc para fechar modal
    if (e.key === 'Escape' && elements.previewModal.classList.contains('active')) {
        elements.previewModal.classList.remove('active');
    }
    
    // F5 para atualizar lista
    if (e.key === 'F5') {
        e.preventDefault();
        updateScheduleList();
    }
}

// Simula verificação de conexão
function checkConnection() {
    const statusDot = elements.statusIndicator.querySelector('.status-dot');
    const statusText = elements.statusIndicator.querySelector('.status-text');
    
    state.connectionStatus = navigator.onLine;
    
    if (state.connectionStatus) {
        statusDot.style.color = '#28a745';
        statusText.textContent = 'Conectado';
        statusText.style.color = '#28a745';
    } else {
        statusDot.style.color = '#dc3545';
        statusText.textContent = 'Offline';
        statusText.style.color = '#dc3545';
    }
}

// Evento de conexão
window.addEventListener('online', checkConnection);
window.addEventListener('offline', checkConnection);

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    init();
    checkConnection();
    setInterval(checkConnection, 30000); // Verifica a cada 30 segundos
});

// Expõe funções globais para os botões HTML
window.editAgendamento = editAgendamento;
window.deleteAgendamento = deleteAgendamento;