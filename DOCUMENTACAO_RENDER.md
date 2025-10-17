# Documentação do Projeto Kanban de Clientes

Este documento detalha o código-fonte, a arquitetura e o processo de deploy da aplicação Kanban de Clientes, desenvolvida em **Flask (Python)**, com frontend em **HTML/TailwindCSS/JavaScript** e persistência em **MongoDB Atlas**.

A aplicação foi configurada para ser facilmente implantada na plataforma **Render**.

## 1. Arquitetura do Projeto

O projeto segue a seguinte estrutura de diretórios:

```
kanban_app/
├── app.py                      # Aplicação Flask principal (rotas, lógica de API, MongoDB)
├── requirements.txt            # Dependências Python (Flask, pymongo, pandas, gunicorn, etc.)
├── Procfile                    # Configuração para o Gunicorn no Render
├── .env.example                # Exemplo das variáveis de ambiente necessárias
├── templates/
│   └── index.html              # Frontend principal (Quadro Kanban e Modal)
└── static/
    ├── css/
    │   └── style.css           # Estilos personalizados e cores do Kanban
    ├── js/
    │   └── main.js             # Lógica de frontend (Kanban, Drag & Drop, API calls)
    └── images/
        └── default_logo.png    # Imagem placeholder para logos não fornecidas
```

## 2. Dependências (Python)

As dependências estão listadas no `requirements.txt`:

*   **Flask:** Framework web.
*   **gunicorn:** Servidor WSGI para produção (usado pelo Render).
*   **pymongo:** Driver para conexão com o MongoDB.
*   **pandas** e **openpyxl:** Para leitura e manipulação de planilhas Excel/CSV.
*   **python-decouple:** Para gerenciar variáveis de ambiente de forma segura.

## 3. Deploy no Render (Serviço Web)

O Render é a plataforma de escolha para o deploy. Siga os passos abaixo:

### 3.1. Pré-requisitos

1.  **Conta no Render:** Crie uma conta e conecte seu repositório Git (GitHub, GitLab, etc.) contendo o código da pasta `kanban_app`.
2.  **Conta no MongoDB Atlas:** Crie um cluster e um usuário de banco de dados. Obtenha a **Connection String (URI)**.
3.  **Variáveis de Ambiente:** Você precisará de duas variáveis de ambiente no Render.

### 3.2. Configuração do Render

Ao criar um novo **Web Service** no Render, utilize as seguintes configurações:

| Configuração | Valor | Observação |
| :--- | :--- | :--- |
| **Build Command** | `pip install -r requirements.txt` | Instala as dependências Python. |
| **Start Command** | `gunicorn app:app` | Inicia o servidor Gunicorn, conforme o `Procfile`. |
| **Root Directory** | `/` (ou o diretório que contém `app.py`) | Certifique-se de que o Render aponte para a raiz da aplicação. |

### 3.3. Configuração das Variáveis de Ambiente

No painel do Render, adicione as seguintes variáveis de ambiente (Environment Variables):

| Variável | Valor | Descrição |
| :--- | :--- | :--- |
| `SECRET_KEY` | `[Sua chave secreta]` | Uma string longa e aleatória para segurança do Flask. |
| `MONGO_URI` | `[Sua URI de Conexão do MongoDB Atlas]` | A string de conexão completa do seu cluster (ex: `mongodb+srv://user:pass@cluster.mongodb.net/kanban_db?retryWrites=true&w=majority`). |

Após configurar, o Render fará o build e o deploy automaticamente.

## 4. Funcionalidades e Uso

### 4.1. Upload de Planilha

*   Use o botão **"Upload Planilha (.xlsx/.csv)"** no cabeçalho.
*   O arquivo deve conter as colunas: **"Nome do Cliente"**, **"Média de Envio"** e **"Logo"**.
*   A coluna **"Logo"** deve ser uma URL pública (ex: `https://site.com/logo.png`). Se vazia, uma imagem padrão será usada.
*   Clientes são salvos no MongoDB com a categoria inicial **"Sem Definição"**. Clientes com o mesmo nome são ignorados para evitar duplicatas.

### 4.2. Quadro Kanban

*   O quadro possui 4 colunas: **"Sem Definição"**, **"High Touch"**, **"Mid Touch"** e **"Tech Touch"**.
*   Cada card exibe a logo, o nome e a média de envio do cliente.
*   **Drag & Drop:** Arraste os cards entre as colunas. Ao soltar, a nova categoria é atualizada automaticamente no MongoDB.
*   O total de clientes em cada coluna é exibido no topo.

### 4.3. Detalhes do Cliente (Modal)

*   Clique em qualquer card para abrir o modal de detalhes.
*   Você pode editar:
    *   **Situação de Recuperação:** Slider de 0 a 100%.
    *   **Qualidade dos Lotes:** Dropdown (Baixa, Média, Alta).
    *   **Recorrência:** Dropdown (Mensal, Sem fluxo definido).
*   Clique em **"Salvar"** para persistir as alterações no MongoDB.

### 4.4. Exportação CSV

*   Clique no botão **"Exportar CSV"** no cabeçalho.
*   Um arquivo CSV (`clientes_kanban.csv`) será baixado, contendo todos os dados atuais dos clientes no banco: `Nome`, `Média de Envio`, `Categoria`, `Recuperação (%)`, `Qualidade` e `Recorrência`.
*   O separador utilizado no CSV é o ponto e vírgula (`;`), mais comum em sistemas brasileiros.

