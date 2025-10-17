// Variáveis globais
const kanbanBoard = document.getElementById('kanban-board');
const fileUpload = document.getElementById('file-upload');
const exportCsvBtn = document.getElementById('export-csv-btn');
const modal = document.getElementById('client-modal');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');
const recuperacaoSlider = document.getElementById('recuperacao-slider');
const recuperacaoValue = document.getElementById('recuperacao-value');
const qualidadeSelect = document.getElementById('qualidade-select');
const recorrenciaSelect = document.getElementById('recorrencia-select');

let currentClientData = null; // Armazena os dados do cliente atualmente no modal

const COLUMNS = [
    { id: 'Sem Definição', title: 'Sem Definição', colorClass: 'col-sem-definicao', tailwindColor: 'text-gray-500' },
    { id: 'High Touch', title: 'High Touch', colorClass: 'col-high-touch', tailwindColor: 'text-red-500' },
    { id: 'Mid Touch', title: 'Mid Touch', colorClass: 'col-mid-touch', tailwindColor: 'text-blue-500' },
    { id: 'Tech Touch', title: 'Tech Touch', colorClass: 'col-tech-touch', tailwindColor: 'text-green-500' },
];

// --- Funções de Renderização ---

function createColumn(column) {
    const colDiv = document.createElement('div');
    colDiv.className = `kanban-column flex-shrink-0 w-80 p-4 rounded-xl shadow-lg ${column.colorClass} border-t-4`;
    colDiv.setAttribute('data-category', column.id);
    colDiv.addEventListener('dragover', handleDragOver);
    colDiv.addEventListener('dragleave', handleDragLeave);
    colDiv.addEventListener('drop', handleDrop);

    colDiv.innerHTML = `
        <h3 class="text-xl font-bold mb-4 flex justify-between items-center text-gray-800">
            ${column.title}
            <span class="column-count text-sm font-medium bg-white rounded-full px-3 py-1 shadow-inner">0</span>
        </h3>
        <div class="card-list space-y-3 min-h-[50px]">
            <!-- Cards aqui -->
        </div>
    `;
    return colDiv;
}

function createCard(client) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'kanban-card bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition duration-150 ease-in-out';
    cardDiv.setAttribute('draggable', true);
    cardDiv.setAttribute('data-client-id', client._id);
    cardDiv.setAttribute('data-client-name', client.nome);
    cardDiv.addEventListener('dragstart', handleDragStart);
    cardDiv.addEventListener('click', () => openModal(client));

    const logoUrl = client.logo && client.logo !== 'default_logo.png' ? client.logo : '/static/images/default_logo.png';
    const logoContent = logoUrl === '/static/images/default_logo.png' 
        ? `<div class="w-10 h-10 default-logo">L</div>`
        : `<img src="${logoUrl}" alt="Logo de ${client.nome}" class="w-10 h-10 rounded-full object-cover">`;

    cardDiv.innerHTML = `
        <div class="flex items-center space-x-3">
            ${logoContent}
            <div>
                <p class="text-lg font-semibold text-gray-800">${client.nome}</p>
                <p class="text-sm text-gray-500">Média: ${client.mediaEnvio} envios</p>
            </div>
        </div>
        <p class="mt-2 text-xs font-medium ${COLUMNS.find(c => c.id === client.categoria)?.tailwindColor || 'text-gray-500'}">
            Categoria: ${client.categoria}
        </p>
    `;
    return cardDiv;
}

function renderBoard(clients) {
    kanbanBoard.innerHTML = ''; // Limpa o quadro
    const columnsMap = {};

    // 1. Cria e adiciona as colunas
    COLUMNS.forEach(col => {
        const colElement = createColumn(col);
        kanbanBoard.appendChild(colElement);
        columnsMap[col.id] = { element: colElement, count: 0 };
    });

    // 2. Adiciona os cards às colunas corretas e conta
    clients.forEach(client => {
        const cardElement = createCard(client);
        const column = columnsMap[client.categoria];
        if (column) {
            column.element.querySelector('.card-list').appendChild(cardElement);
            column.count++;
        }
    });

    // 3. Atualiza as contagens
    COLUMNS.forEach(col => {
        const column = columnsMap[col.id];
        if (column) {
            column.element.querySelector('.column-count').textContent = column.count;
        }
    });
}

// --- Funções de Comunicação com a API ---

async function fetchClients() {
    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) {
            throw new Error('Erro ao buscar clientes');
        }
        const clients = await response.json();
        renderBoard(clients);
    } catch (error) {
        console.error('Erro ao carregar o Kanban:', error);
        alert('Erro ao carregar os dados. Verifique a conexão com o servidor/MongoDB.');
    }
}

async function updateClientCategory(clientId, newCategory) {
    try {
        const response = await fetch(`/api/clientes/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoria: newCategory }),
        });
        if (!response.ok) {
            throw new Error('Erro ao atualizar categoria');
        }
        // Re-renderiza para atualizar contagens e estado
        fetchClients();
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        alert('Erro ao mover o card. Tente novamente.');
    }
}

async function updateClientDetails(clientId, details) {
    try {
        const response = await fetch(`/api/clientes/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details),
        });
        if (!response.ok) {
            throw new Error('Erro ao salvar detalhes');
        }
        alert('Detalhes do cliente salvos com sucesso!');
        // Re-renderiza para atualizar o card, se necessário (ex: se a categoria mudar)
        fetchClients();
    } catch (error) {
        console.error('Erro ao salvar detalhes:', error);
        alert('Erro ao salvar os detalhes do cliente. Tente novamente.');
    }
}

// --- Funções de Upload e Exportação ---

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Upload bem-sucedido! ${result.message}`);
            fetchClients(); // Atualiza o quadro
        } else {
            alert(`Erro no upload: ${result.error}`);
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        alert('Erro ao tentar fazer o upload da planilha.');
    } finally {
        fileUpload.value = ''; // Limpa o input para permitir novo upload
    }
}

function handleExportCsv() {
    window.location.href = '/api/exportar';
}

// --- Funções do Modal ---

function openModal(client) {
    currentClientData = client;

    // Preenche o cabeçalho
    document.getElementById('modal-client-name').textContent = client.nome;
    document.getElementById('modal-media-envio').textContent = `${client.mediaEnvio} envios`;

    // Preenche os campos editáveis
    recuperacaoSlider.value = client.recuperacao;
    recuperacaoValue.textContent = client.recuperacao;
    qualidadeSelect.value = client.qualidade;
    recorrenciaSelect.value = client.recorrencia;

    // Mostra o modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Adiciona animação de entrada (opcional, para simular framer-motion)
    modal.querySelector('div').classList.remove('scale-95');
    modal.querySelector('div').classList.add('scale-100');
}

function closeModal() {
    // Remove animação de saída
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');
    
    // Esconde o modal após a transição (simulada)
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        currentClientData = null;
    }, 300); 
}

async function handleSaveDetails() {
    if (!currentClientData) return;

    const detailsToSave = {
        recuperacao: parseInt(recuperacaoSlider.value),
        qualidade: qualidadeSelect.value,
        recorrencia: recorrenciaSelect.value,
    };

    await updateClientDetails(currentClientData._id, detailsToSave);
    closeModal();
}

// Atualiza o valor do slider
recuperacaoSlider.addEventListener('input', (e) => {
    recuperacaoValue.textContent = e.target.value;
});

// Eventos do Modal
modalCloseBtn.addEventListener('click', closeModal);
modalSaveBtn.addEventListener('click', handleSaveDetails);
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// --- Funções de Drag and Drop ---

let draggedCard = null;

function handleDragStart(e) {
    draggedCard = e.target;
    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-client-id'));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.classList.add('opacity-50'), 0);
}

function handleDragOver(e) {
    e.preventDefault(); // Necessário para permitir o drop
    e.dataTransfer.dropEffect = 'move';
    if (e.target.classList.contains('kanban-column')) {
        e.target.classList.add('drag-over');
    } else if (e.target.closest('.kanban-column')) {
        e.target.closest('.kanban-column').classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('kanban-column')) {
        e.target.classList.remove('drag-over');
    } else if (e.target.closest('.kanban-column')) {
        e.target.closest('.kanban-column').classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    // Remove o estilo de drag-over
    const targetColumn = e.target.closest('.kanban-column');
    if (targetColumn) {
        targetColumn.classList.remove('drag-over');
    }

    if (draggedCard) {
        draggedCard.classList.remove('opacity-50');

        const clientId = e.dataTransfer.getData('text/plain');
        const newCategory = targetColumn.getAttribute('data-category');
        
        if (newCategory) {
            // Move o card no DOM
            targetColumn.querySelector('.card-list').appendChild(draggedCard);
            
            // Atualiza no backend
            updateClientCategory(clientId, newCategory);
        }
        draggedCard = null;
    }
}


// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    // Cria um diretório de imagens para a logo padrão (apenas para simulação local)
    // No deploy, a imagem deve ser acessível via /static/images/default_logo.png
    // Vou simular a criação do arquivo default_logo.png no próximo passo.
    
    fetchClients();
    fileUpload.addEventListener('change', handleFileUpload);
    exportCsvBtn.addEventListener('click', handleExportCsv);
});
