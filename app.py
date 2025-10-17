import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, make_response
from decouple import config
from pymongo import MongoClient
from bson.objectid import ObjectId
import pandas as pd
import io

# Configuração do Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = config('SECRET_KEY', default='super-secret-key')

# Configuração do MongoDB
MONGO_URI = config('MONGO_URI', default=None)
if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI)
        db = client.kanban_db
        clientes_collection = db.clientes
        print("Conectado ao MongoDB Atlas.")
    except Exception as e:
        print(f"ERRO ao conectar ao MongoDB: {e}")
        clientes_collection = None
else:
    print("WARNING: MONGO_URI não encontrado. Usando um mock database.")
    clientes_collection = None

# Mock database para desenvolvimento sem MongoDB
mock_data = [
    {"_id": "mock1", "nome": "Cliente Mock 1", "mediaEnvio": 150, "logo": "https://via.placeholder.com/50x50?text=CM1", "categoria": "High Touch", "recuperacao": 50, "qualidade": "Média", "recorrencia": "Mensal"},
    {"_id": "mock2", "nome": "Cliente Mock 2", "mediaEnvio": 80, "logo": "https://via.placeholder.com/50x50?text=CM2", "categoria": "Sem Definição", "recuperacao": 0, "qualidade": "Baixa", "recorrencia": "Sem fluxo definido"},
]

def get_clientes_data():
    if clientes_collection:
        # Converte ObjectId para string para JSON serialização
        clientes = []
        for doc in clientes_collection.find({}):
            doc['_id'] = str(doc['_id'])
            clientes.append(doc)
        return clientes
    else:
        return mock_data

# --- Rotas do Frontend ---

@app.route('/')
def index():
    return render_template('index.html')

# --- Rotas da API (Backend) ---

@app.route('/api/clientes', methods=['GET'])
def get_clientes():
    clientes = get_clientes_data()
    return jsonify(clientes)

@app.route('/api/clientes', methods=['POST'])
def upload_planilha():
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nenhum arquivo selecionado"}), 400

    if file and (file.filename.endswith('.xlsx') or file.filename.endswith('.csv')):
        try:
            # Leitura do arquivo
            if file.filename.endswith('.xlsx'):
                df = pd.read_excel(file)
            else: # CSV
                df = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))

            # Renomear colunas para o padrão do schema
            df.rename(columns={
                'Nome do Cliente': 'nome',
                'Média de Envio': 'mediaEnvio',
                'Logo': 'logo'
            }, inplace=True)
            
            # Limpeza e validação básica
            df = df[['nome', 'mediaEnvio', 'logo']].dropna(subset=['nome'])
            df['mediaEnvio'] = pd.to_numeric(df['mediaEnvio'], errors='coerce').fillna(0).astype(int)
            
            # Adicionar campos padrão do schema
            df['categoria'] = 'Sem Definição'
            df['recuperacao'] = 0
            df['qualidade'] = 'Média'
            df['recorrencia'] = 'Sem fluxo definido'
            df['logo'] = df['logo'].apply(lambda x: x if pd.notna(x) and x else '/static/images/default_logo.png')

            clientes_novos = df.to_dict('records')

            if clientes_collection:
                # Inserir no MongoDB, evitando duplicatas pelo nome
                nomes_existentes = set(c['nome'] for c in clientes_collection.find({}, {'nome': 1}))
                clientes_para_inserir = [c for c in clientes_novos if c['nome'] not in nomes_existentes]
                
                if clientes_para_inserir:
                    clientes_collection.insert_many(clientes_para_inserir)
                
                return jsonify({"message": f"{len(clientes_para_inserir)} clientes inseridos. {len(clientes_novos) - len(clientes_para_inserir)} clientes já existiam."}), 200
            else:
                # Mock data update (apenas para simulação)
                global mock_data
                # Adicionar IDs mock para consistência
                for i, cliente in enumerate(clientes_novos):
                    cliente['_id'] = f"mock_{i+1}"
                mock_data = clientes_novos
                return jsonify({"message": f"{len(clientes_novos)} clientes carregados no mock data."}), 200

        except Exception as e:
            return jsonify({"error": f"Erro ao processar o arquivo: {str(e)}"}), 500

    return jsonify({"error": "Formato de arquivo não suportado. Use .xlsx ou .csv"}), 400

@app.route('/api/clientes/<string:cliente_id>', methods=['PUT'])
def update_cliente(cliente_id):
    data = request.get_json()
    
    update_fields = {}
    if 'categoria' in data:
        update_fields['categoria'] = data['categoria']
    if 'recuperacao' in data:
        update_fields['recuperacao'] = data['recuperacao']
    if 'qualidade' in data:
        update_fields['qualidade'] = data['qualidade']
    if 'recorrencia' in data:
        update_fields['recorrencia'] = data['recorrencia']

    if clientes_collection:
        try:
            result = clientes_collection.update_one(
                {'_id': ObjectId(cliente_id)},
                {'$set': update_fields}
            )

            if result.modified_count > 0:
                return jsonify({"message": "Cliente atualizado com sucesso"}), 200
            else:
                return jsonify({"error": "Cliente não encontrado ou nenhum campo modificado"}), 404
        except Exception as e:
            return jsonify({"error": f"Erro ao atualizar cliente: {str(e)}"}), 500
    else:
        # Mock data update (apenas para simulação)
        global mock_data
        for cliente in mock_data:
            if cliente['_id'] == cliente_id:
                cliente.update(update_fields)
                return jsonify({"message": "Cliente atualizado no mock data"}), 200
        return jsonify({"error": "Cliente não encontrado no mock data"}), 404

@app.route('/api/exportar', methods=['GET'])
def exportar_csv():
    clientes = get_clientes_data()
    
    if not clientes:
        return jsonify({"error": "Nenhum dado para exportar"}), 404

    df = pd.DataFrame(clientes)
    
    # Selecionar e renomear colunas para o formato de exportação
    df = df.rename(columns={
        'nome': 'Nome',
        'mediaEnvio': 'Média de Envio',
        'categoria': 'Categoria',
        'recuperacao': 'Recuperação (%)',
        'qualidade': 'Qualidade',
        'recorrencia': 'Recorrência'
    })
    
    df_export = df[['Nome', 'Média de Envio', 'Categoria', 'Recuperação (%)', 'Qualidade', 'Recorrência']]

    # Criar o CSV em memória
    output = io.StringIO()
    df_export.to_csv(output, index=False, sep=';') # Usando ; como separador para melhor compatibilidade em PT-BR
    csv_output = output.getvalue()

    # Retornar como resposta de arquivo CSV
    response = make_response(csv_output)
    response.headers["Content-Disposition"] = "attachment; filename=clientes_kanban.csv"
    response.headers["Content-type"] = "text/csv; charset=utf-8"
    return response

if __name__ == '__main__':
    app.run(debug=True)
