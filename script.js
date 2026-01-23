// ==============================================
// 📦 CONFIGURAÇÕES DO SISTEMA
// ==============================================
/**
 * ⚙️ CONFIG - Armazena todas as configurações globais do sistema
 */
const CONFIG = {
    API_URL: 'http://localhost:8082/api/agendamentos',
    MAX_CHARS: 500,
    STORAGE_KEY: 'calcados_agendamentos'
};

// ==============================================
// 🎯 ELEMENTOS DO DOM
// ==============================================
const elements = {
    // Formulário e campos
    form: document.getElementById('disparoForm'),
    data: document.getElementById('data'),
    hora: document.getElementById('hora'),
    mensagem: document.getElementById('mensagem'),
    charCount: document.getElementById('charCount'),
    destinatario: document.getElementById('destinatario'),
    
    // Botões principais
    btnSubmit: document.getElementById('btnSubmit'),
    btnPreview: document.getElementById('btnPreview'),
    btnRefresh: document.getElementById('btnRefresh'),
    
    // NOVOS BOTÕES DE EDIÇÃO
    btnSaveEdit: document.getElementById('btnSaveEdit'),
    btnCancelEdit: document.getElementById('btnCancelEdit'),
    
    // Listagem
    scheduleList: document.getElementById('scheduleList'),
    
    // Modal
    previewModal: document.getElementById('previewModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    previewDateTime: document.getElementById('previewDateTime'),
    previewMessage: document.getElementById('previewMessage'),
    
    // Interface
    toast: document.getElementById('toast'),
    statusIndicator: document.getElementById('statusIndicator'),
    formCard: document.getElementById('formCard')
};

// ==============================================
// 🗃️ ESTADO DA APLICAÇÃO
// ==============================================
const state = {
    agendamentos: [],
    isSubmitting: false,
    connectionStatus: true,
    isEditing: false,       // NOVO: Indica se está em modo de edição
    editingId: null         // NOVO: ID do banco sendo editado
};

// ==============================================
// 🚀 FUNÇÕES DE INICIALIZAÇÃO
// ==============================================

/**
 * 🚀 INICIALIZA O SISTEMA DE AGENDAMENTO
 */
function init() {
    console.log('🚀 Inicializando sistema de agendamento...');
    console.log('🔗 URL do back-end:', CONFIG.API_URL);
    
    setupEventListeners();
    setupDefaultDateTime();
    updateCharCount();
    updateScheduleListWithRealData();
    testBackendConnection();
}

/**
 * 🎮 CONFIGURA TODOS OS EVENT LISTENERS
 */
function setupEventListeners() {
    // Contador de caracteres
    elements.mensagem.addEventListener('input', updateCharCount);
    
    // Validação de data/hora
    elements.data.addEventListener('change', validateDateTime);
    elements.hora.addEventListener('change', validateDateTime);
    
    // Envio do formulário (APENAS para novos agendamentos)
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
    
    // Atualizar lista com dados REAIS
    elements.btnRefresh.addEventListener('click', updateScheduleListWithRealData);
    
    // Tooltip de dicas
    document.querySelector('.btn-tooltip').addEventListener('click', showTips);
    
    // Teclas de atalho
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 🔄 NOVOS: Botões de edição
    elements.btnSaveEdit.addEventListener('click', saveEdit);
    elements.btnCancelEdit.addEventListener('click', cancelEdit);
}

/**
 * 📅 CONFIGURA DATA/HORA PADRÃO
 */
function setupDefaultDateTime() {
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const proximaHora = new Date(agora.getTime() + 60 * 60 * 1000);
    const horaFormatada = proximaHora.toTimeString().slice(0, 5);
    
    elements.data.value = dataHoje;
    elements.data.min = dataHoje;
    elements.hora.value = horaFormatada;
}

// ==============================================
// 🛠️ FUNÇÕES DE UTILIDADE
// ==============================================

/**
 * 🔢 ATUALIZA CONTADOR DE CARACTERES
 */
function updateCharCount() {
    const length = elements.mensagem.value.length;
    elements.charCount.textContent = length;
    
    elements.charCount.className = '';
    if (length > CONFIG.MAX_CHARS * 0.9) {
        elements.charCount.classList.add('danger');
    } else if (length > CONFIG.MAX_CHARS * 0.75) {
        elements.charCount.classList.add('warning');
    }
}

/**
 * ⚠️ VALIDA SE DATA/HORA SÃO FUTURAS
 * @returns {boolean} true se válido, false se inválido
 */
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

/**
 * 👁️ MOSTRA PRÉ-VISUALIZAÇÃO DA MENSAGEM
 */
function showPreview() {
    if (!validateDateTime()) return;
    
    const dataFormatada = formatDate(elements.data.value);
    const horaFormatada = elements.hora.value;
    
    elements.previewDateTime.textContent = `${dataFormatada} às ${horaFormatada}`;
    elements.previewMessage.textContent = elements.mensagem.value || 'Nenhuma mensagem informada';
    
    elements.previewModal.classList.add('active');
}

/**
 * 📅 FORMATA DATA PARA PORTUGUÊS
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {string} Data formatada
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// ==============================================
// 📤 FUNÇÕES DE ENVIO PARA O BACK-END
// ==============================================

/**
 * ✅ PROCESSAMENTO DO ENVIO DO FORMULÁRIO (NOVOS AGENDAMENTOS)
 * @param {Event} e - Evento de submit
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    // Se estiver editando, não permite criar novo
    if (state.isEditing) {
        showToast('⚠️ Termine a edição atual primeiro', true);
        return;
    }
    
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
    
    setSubmittingState(true);
    
    try {
        const success = await sendToBackend(agendamento);
        
        if (success) {
            saveAgendamento(agendamento);
            showToast('✅ Disparo agendado com sucesso!');
            
            elements.form.reset();
            setupDefaultDateTime();
            updateCharCount();
            
            await updateScheduleListWithRealData();
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

/**
 * 📤 ENVIA DADOS PARA O BACK-END (CRIAR NOVO)
 * @param {Object} agendamento - Dados do agendamento
 * @returns {Promise<boolean>} true se sucesso
 */
async function sendToBackend(agendamento) {
    console.log('📤 Enviando NOVO agendamento:', agendamento);
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                data: agendamento.data,
                hora: agendamento.hora,
                mensagem: agendamento.mensagem,
                destinatario: agendamento.destinatario || ''
            })
        });
        
        console.log('📥 Status da resposta:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro do servidor:', errorText);
            
            try {
                const errorJson = JSON.parse(errorText);
                
                // Verifica se é erro de horário duplicado
                if (errorJson.erro && errorJson.erro.includes('duplicate key') && 
                    (errorJson.erro.includes('data_disparo') || errorJson.erro.includes('hora_disparo'))) {
                    throw new Error('HORARIO_DUPLICADO');
                }
                
                throw new Error(errorJson.erro || `HTTP ${response.status}: ${errorText}`);
            } catch {
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        }
        
        const data = await response.json();
        console.log('✅ Sucesso! Dados recebidos:', data);
        return true;
        
    } catch (error) {
        console.error('💥 Erro completo:', error);
        
        // Tratamento específico para horário duplicado
        if (error.message === 'HORARIO_DUPLICADO') {
            // CORREÇÃO: Usa a data e hora do formulário atual, não do backend
            const dataFormatada = formatDate(elements.data.value);
            const horaFormatada = elements.hora.value;
            
            showToast(
                `⏰ Horário já agendado!<br><br>                 
                 Já existe um disparo agendado para esta data e horário.<br>
                 Por favor, escolha outro horário.`,
                true
            );
            
            // Destaca os campos
            elements.data.classList.add('error');
            elements.hora.classList.add('error');
            
            // Foca no campo de hora
            setTimeout(() => {
                elements.hora.focus();
                elements.hora.select();
            }, 500);
            
            // Remove o destaque
            setTimeout(() => {
                elements.data.classList.remove('error');
                elements.hora.classList.remove('error');
            }, 3000);
        } else {
            showToast(`❌ ${error.message}`, true);
        }
        return false;
    }
}

// ==============================================
// ✏️ FUNÇÕES DE EDIÇÃO DE AGENDAMENTOS
// ==============================================

/**
 * ✏️ INICIA EDIÇÃO DE UM AGENDAMENTO
 * @param {number} id - ID real do banco de dados
 */
async function startEditing(id) {
    console.log('✏️ Iniciando edição do ID:', id);
    
    try {
        // Busca dados completos do back-end
        const response = await fetch(`${CONFIG.API_URL}/${id}`);
        
        if (!response.ok) {
            throw new Error('Agendamento não encontrado');
        }
        
        const agendamento = await response.json();
        console.log('📥 Dados recebidos para edição:', agendamento);
        
        // Preenche formulário
        elements.data.value = agendamento.dataDisparo || agendamento.data;
        elements.hora.value = agendamento.horaDisparo || agendamento.hora;
        elements.mensagem.value = agendamento.mensagem;
        elements.destinatario.value = agendamento.destinatario || '';
        
        updateCharCount();
        
        // Atualiza estado
        state.isEditing = true;
        state.editingId = id;
        
        // Muda interface para modo edição
        switchToEditMode();
        
        // Rola para o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        showToast('✏️ Agendamento carregado para edição. Altere e clique em "Salvar Edição".');
        
    } catch (error) {
        console.error('❌ Erro ao iniciar edição:', error);
        showToast('❌ Erro ao carregar agendamento para edição', true);
    }
}

/**
 * 🎨 MUDA INTERFACE PARA MODO EDIÇÃO
 */
function switchToEditMode() {
    // Esconde botão normal
    elements.btnSubmit.style.display = 'none';
    
    // Mostra botões de edição
    elements.btnSaveEdit.style.display = 'inline-block';
    elements.btnCancelEdit.style.display = 'inline-block';
    
    // Muda título do card
    document.querySelector('.card-header h2').innerHTML = 
        '<i class="fas fa-edit"></i> Editando Agendamento';
    
    // Adiciona classe visual
    elements.formCard.classList.add('editing-mode');
    
    // Desabilita pré-visualização durante edição
    elements.btnPreview.disabled = true;
}

/**
 * 🔄 RESTAURA INTERFACE PARA MODO NORMAL
 */
function switchToNormalMode() {
    // Mostra botão normal
    elements.btnSubmit.style.display = 'inline-block';
    
    // Esconde botões de edição
    elements.btnSaveEdit.style.display = 'none';
    elements.btnCancelEdit.style.display = 'none';
    
    // Restaura título
    document.querySelector('.card-header h2').innerHTML = 
        '<i class="fas fa-paper-plane"></i> Novo Agendamento';
    
    // Remove classe visual
    elements.formCard.classList.remove('editing-mode');
    
    // Habilita pré-visualização
    elements.btnPreview.disabled = false;
    
    // Limpa estado
    state.isEditing = false;
    state.editingId = null;
}

/**
 * 💾 SALVA AS ALTERAÇÕES NO BANCO DE DADOS
 */
async function saveEdit() {
    if (!state.isEditing || !state.editingId) {
        showToast('❌ Nenhum agendamento em edição', true);
        return;
    }
    
    // Validações
    if (!validateDateTime()) return;
    if (elements.mensagem.value.length === 0) {
        alert('⚠️ A mensagem não pode ficar vazia!');
        elements.mensagem.focus();
        return;
    }
    
    // Prepara dados
    const dadosAtualizados = {
        data: elements.data.value,
        hora: elements.hora.value,
        mensagem: elements.mensagem.value,
        destinatario: elements.destinatario.value || ''
    };
    
    console.log('📤 Salvando edição ID:', state.editingId, 'Dados:', dadosAtualizados);
    
    // Mostra estado de carregamento
    elements.btnSaveEdit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    elements.btnSaveEdit.disabled = true;
    
    try {
        // Envia PUT para atualizar
        const response = await fetch(`${CONFIG.API_URL}/${state.editingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
        });
        
        const resultado = await response.json();
        
        if (!response.ok) {
            // Verifica se é erro de horário duplicado
            if (resultado.erro && resultado.erro.includes('duplicate key') && 
                (resultado.erro.includes('data_disparo') || resultado.erro.includes('hora_disparo'))) {
                throw new Error('HORARIO_DUPLICADO');
            }
            throw new Error(resultado.erro || 'Erro ao atualizar');
        }
        
        console.log('✅ Edição salva com sucesso:', resultado);
        showToast('✅ Agendamento atualizado no banco!');
        
        // Limpa formulário
        elements.form.reset();
        setupDefaultDateTime();
        updateCharCount();
        
        // Volta ao modo normal
        switchToNormalMode();
        
        // Atualiza lista
        await updateScheduleListWithRealData();
        
    } catch (error) {
        console.error('❌ Erro ao salvar edição:', error);
        
        // Tratamento específico para horário duplicado
        if (error.message === 'HORARIO_DUPLICADO') {
            // CORREÇÃO: Usa a data e hora do formulário atual, não do backend
            const dataFormatada = formatDate(elements.data.value);
            const horaFormatada = elements.hora.value;
            
            // Mostra mensagem amigável para o usuário
            showToast(
                `⏰ Horário já agendado!<br><br>                 
                 Já existe um disparo agendado para esta data e horário.<br>
                 Por favor, escolha outro horário.`,
                true
            );
            
            // Destaca os campos de data/hora
            elements.data.classList.add('error');
            elements.hora.classList.add('error');
            
            // Foca no campo de hora para facilitar a correção
            setTimeout(() => {
                elements.hora.focus();
                elements.hora.select();
            }, 500);
            
            // Remove o destaque após alguns segundos
            setTimeout(() => {
                elements.data.classList.remove('error');
                elements.hora.classList.remove('error');
            }, 3000);
            
        } else {
            // Outros erros mostram mensagem padrão
            showToast(`❌ ${error.message}`, true);
        }
    } finally {
        // Restaura botão
        elements.btnSaveEdit.innerHTML = '<i class="fas fa-save"></i> Salvar Edição';
        elements.btnSaveEdit.disabled = false;
    }
}

/**
 * ❌ CANCELA A EDIÇÃO
 */
function cancelEdit() {
    if (confirm('Descartar alterações e cancelar edição?')) {
        elements.form.reset();
        setupDefaultDateTime();
        updateCharCount();
        switchToNormalMode();
        showToast('✖️ Edição cancelada');
    }
}

// ==============================================
// 🌐 FUNÇÕES PARA BUSCAR AGENDAMENTOS DO BANCO
// ==============================================

/**
 * 🌐 BUSCA AGENDAMENTOS REAIS DO BANCO
 * @returns {Promise<Array>} Lista de agendamentos
 */
async function fetchAgendamentosFromBackend() {
    console.log('🔄 Buscando agendamentos do banco de dados...');
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        console.log('📥 Status da resposta:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro ao buscar agendamentos:', errorText);
            throw new Error(`HTTP ${response.status}: Falha ao buscar agendamentos`);
        }
        
        const agendamentos = await response.json();
        console.log(`✅ ${agendamentos.length} agendamentos carregados do banco`);
        
        return agendamentos;
        
    } catch (error) {
        console.error('💥 Erro completo ao buscar agendamentos:', error);
        showToast('❌ Erro ao carregar agendamentos', true);
        return [];
    }
}

/**
 * 🗂️ ATUALIZA LISTA COM DADOS REAIS DO BANCO
 */
async function updateScheduleListWithRealData() {
    console.log('🔄 Atualizando lista com dados reais do banco...');
    
    // Mostra estado de carregamento
    elements.scheduleList.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Carregando agendamentos...</p>
        </div>
    `;
    
    try {
        const agendamentosReais = await fetchAgendamentosFromBackend();
        
        state.agendamentos = agendamentosReais.map(ag => ({
            id: ag.id || Date.now(),
            data: ag.data || '',
            hora: ag.hora || '',
            mensagem: ag.mensagem || 'Sem mensagem',
            destinatario: ag.destinatario || '',
            status: ag.status || 'agendado',
            criadoEm: ag.criadoEm || new Date().toISOString()
        }));
        
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.agendamentos));
        
        renderScheduleList();
        
        showToast(`✅ ${agendamentosReais.length} agendamentos carregados`);
        
    } catch (error) {
        console.error('Erro ao atualizar lista:', error);
        showToast('❌ Erro ao carregar agendamentos do servidor', true);
        
        loadFromStorage();
        renderScheduleList();
    }
}

/**
 * 🎨 RENDERIZA A LISTA DE AGENDAMENTOS
 */
function renderScheduleList() {
    const scheduleList = elements.scheduleList;
    
    if (state.agendamentos.length === 0) {
        scheduleList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhum agendamento no banco de dados</p>
                <button class="btn-refresh-small" onclick="updateScheduleListWithRealData()">
                    <i class="fas fa-redo"></i> Tentar novamente
                </button>
            </div>
        `;
        return;
    }
    
    // Ordena por data/hora
    const agendamentosOrdenados = [...state.agendamentos].sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.hora}`);
        const dateB = new Date(`${b.data}T${b.hora}`);
        return dateB - dateA;
    });
    
    // Cria HTML
    scheduleList.innerHTML = agendamentosOrdenados.map(agendamento => `
        <div class="schedule-item" data-id="${agendamento.id}">
            <div class="schedule-info">
                <div class="schedule-header">
                    <span class="status-badge ${getStatusClass(agendamento.status)}">
                        ${getStatusText(agendamento.status)}
                    </span>
                    <h4>${agendamento.mensagem.substring(0, 50)}${agendamento.mensagem.length > 50 ? '...' : ''}</h4>
                </div>
                <div class="schedule-time">
                    <i class="far fa-calendar"></i>
                    ${formatDate(agendamento.data)} às ${agendamento.hora}
                    ${agendamento.destinatario ? `<i class="fas fa-user-tag"></i> ${agendamento.destinatario}` : ''}
                </div>
                ${agendamento.criadoEm ? `<div class="schedule-created"><small>Criado em: ${formatDate(agendamento.criadoEm)}</small></div>` : ''}
            </div>
            <div class="schedule-actions">
                <!-- Agora chama startEditing com ID real -->
                <button class="btn-action edit" onclick="startEditing(${agendamento.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" onclick="deleteAgendamentoFromBackend(${agendamento.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * 🏷️ RETORNA CLASSE CSS DO STATUS
 */
function getStatusClass(status) {
    const statusMap = {
        'AGENDADO': 'status-agendado',
        'ENVIADO': 'status-enviado',
        'CANCELADO': 'status-cancelado',
        'FALHA': 'status-falha',
        'agendado': 'status-agendado',
        'enviado': 'status-enviado',
        'cancelado': 'status-cancelado',
        'falha': 'status-falha'
    };
    return statusMap[status] || 'status-agendado';
}

/**
 * 🏷️ RETORNA TEXTO DO STATUS
 */
function getStatusText(status) {
    const statusMap = {
        'AGENDADO': 'Agendado',
        'ENVIADO': 'Enviado',
        'CANCELADO': 'Cancelado',
        'FALHA': 'Falha',
        'agendado': 'Agendado',
        'enviado': 'Enviado',
        'cancelado': 'Cancelado',
        'falha': 'Falha'
    };
    return statusMap[status] || 'Agendado';
}

/**
 * 🗑️ EXCLUI AGENDAMENTO DO BANCO
 */
async function deleteAgendamentoFromBackend(id) {
    if (!confirm('Tem certeza que deseja excluir este agendamento do banco de dados?')) return;
    
    try {
        console.log(`🗑️ Excluindo agendamento ID ${id} do banco...`);
        
        const response = await fetch(`${CONFIG.API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            console.log(`✅ Agendamento ID ${id} excluído do banco`);
            showToast('🗑️ Agendamento excluído do banco de dados');
            
            await updateScheduleListWithRealData();
        } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('❌ Erro ao excluir do banco:', error);
        showToast('❌ Erro ao excluir agendamento', true);
    }
}

// ==============================================
// 🧪 FUNÇÃO PARA TESTAR CONEXÃO
// ==============================================

/**
 * 🧪 TESTA CONEXÃO COM O BACK-END
 */
async function testBackendConnection() {
    try {
        console.log('🔍 Testando conexão com:', CONFIG.API_URL);
        
        const response = await fetch(`${CONFIG.API_URL}/status`);
        console.log('📡 Resposta do status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Back-end conectado:', data);
            showToast('✅ Conectado ao servidor');
        } else {
            console.warn('⚠️ Back-end respondendo com erro:', response.status);
            showToast('⚠️ Servidor com problemas', true);
        }
    } catch (error) {
        console.error('❌ Não foi possível conectar ao back-end:', error);
        showToast('❌ Servidor offline', true);
    }
}

// ==============================================
// 🎪 FUNÇÕES DE INTERFACE
// ==============================================

/**
 * ⏳ CONTROLA ESTADO DO BOTÃO DE ENVIO
 */
function setSubmittingState(isSubmitting) {
    state.isSubmitting = isSubmitting;
    elements.btnSubmit.disabled = isSubmitting;
    elements.btnSubmit.innerHTML = isSubmitting 
        ? '<i class="fas fa-spinner fa-spin"></i> Agendando...' 
        : '<i class="fas fa-calendar-plus"></i> Agendar Disparo';
}

/**
 * 🍞 MOSTRA NOTIFICAÇÃO TOAST
 */
function showToast(message, isError = false) {
    const toast = elements.toast;
    const icon = toast.querySelector('.toast-icon');
    const text = toast.querySelector('.toast-message');
    
    text.innerHTML = message; // Usamos innerHTML para permitir tags HTML
    icon.className = isError 
        ? 'fas fa-exclamation-circle toast-icon' 
        : 'fas fa-check-circle toast-icon';
    icon.style.color = isError ? '#f72585' : '#28a745';
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000); // Aumentei para 5 segundos para dar tempo de ler a mensagem mais longa
}

// ==============================================
// 💾 FUNÇÕES DE ARMAZENAMENTO LOCAL
// ==============================================

function saveAgendamento(agendamento) {
    state.agendamentos.unshift(agendamento);
    
    if (state.agendamentos.length > 10) {
        state.agendamentos = state.agendamentos.slice(0, 10);
    }
    
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.agendamentos));
}

function loadFromStorage() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (saved) {
        state.agendamentos = JSON.parse(saved);
        console.log('📂 Dados carregados do cache local');
    }
}

// ==============================================
// 💡 FUNÇÕES AUXILIARES
// ==============================================

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

function handleKeyboardShortcuts(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        elements.form.requestSubmit();
    }
    
    if (e.key === 'Escape' && elements.previewModal.classList.contains('active')) {
        elements.previewModal.classList.remove('active');
    }
    
    if (e.key === 'F5') {
        e.preventDefault();
        updateScheduleListWithRealData();
    }
}

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

// ==============================================
// 🧪 FUNÇÃO DE TESTE DA API
// ==============================================

window.testAPI = async function() {
    console.log('🧪 Testando API...');
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                data: '2024-01-22',
                hora: '14:30',
                mensagem: 'Teste de mensagem via console',
                destinatario: 'Cliente Teste'
            })
        });
        
        const result = await response.json();
        console.log('Resultado do teste:', result);
        showToast('✅ Teste da API realizado!');
    } catch (error) {
        console.error('Erro no teste:', error);
        showToast('❌ Falha no teste da API', true);
    }
};

// ==============================================
// ⚡ INICIALIZAÇÃO E EVENTOS GLOBAIS
// ==============================================

window.addEventListener('online', checkConnection);
window.addEventListener('offline', checkConnection);

document.addEventListener('DOMContentLoaded', () => {
    init();
    checkConnection();
    setInterval(checkConnection, 30000);
});

// ==============================================
// 🌍 EXPÕE FUNÇÕES GLOBAIS
// ==============================================

window.startEditing = startEditing;
window.deleteAgendamentoFromBackend = deleteAgendamentoFromBackend;