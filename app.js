// app.js - Gerenciador de Gastos com Firestore e Auth

import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword,  
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc,
    collection,
    getDocs,
    addDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Variáveis globais
let transactions = [];
let selectedMonth = null;
let currentUser = null;
let editingId = null;

// Função para atualizar uma transação pelo ID
async function updateTransaction(id, newData) {
    // Encontrar o índice da transação no array
    const index = transactions.findIndex(t => t.id === id);
    
    if (index > -1) {
        // Atualiza os dados mantendo o ID original e mesclando com dados novos
        transactions[index] = { 
            ...transactions[index], 
            ...newData 
        };
        
        console.log(`Atualizando transação ID ${id}:`, newData);

        // Salva no Firestore e atualiza a interface
        await saveData(currentUser.uid, selectedMonth);
        updateUI();
        
        console.log('Transação atualizada com sucesso!');
    } else {
        alert('Transação não encontrada.');
    }
}


// Função para carregar categorias do Firestore
async function loadCategories() {
    const categorySelect = document.getElementById('category');
    
    // Limpa as opções atuais (exceto a primeira padrão e a opção "Nova")
    const defaultOptions = categorySelect.querySelectorAll('option[value=""], option[value="new"]');
    categorySelect.innerHTML = '';
    defaultOptions.forEach(opt => categorySelect.appendChild(opt));

    try {
        // Acessa a coleção 'categorias' no Firestore
        const querySnapshot = await getDocs(collection(db, "categorias"));
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = data.nome;
            option.textContent = data.nome;
            categorySelect.appendChild(option);
        });
        
        console.log('Categorias carregadas com sucesso');
    } catch (error) {
        console.error("Erro ao carregar categorias: ", error);
    }
}

// Função para carregar dados do Firestore
async function loadData(userId, month) {
    try {
        console.log(`Carregando dados para o usuário ${userId}, mês ${month}...`);
        const docRef = doc(db, 'users', userId, 'transactions', `month_${month}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            transactions = docSnap.data().transactions || [];
            console.log('Dados carregados:', transactions);
        } else {
            transactions = [];
            console.log('Nenhum dado encontrado para este mês.');
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do Firestore. Verifique o console para detalhes.');
    }
}

// Função para salvar dados no Firestore
async function saveData(userId, month) {
    try {
        console.log(`Salvando dados para o usuário ${userId}, mês ${month}...`);
        const docRef = doc(db, 'users', userId, 'transactions', `month_${month}`);
        await setDoc(docRef, { transactions });
        console.log('Dados salvos com sucesso.');
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Erro ao salvar dados no Firestore. Verifique o console para detalhes.');
    }
}

// Função para excluir uma transação pelo ID
async function deleteTransaction(id) {
    const index = transactions.findIndex(t => t.id === id);
    if (index > -1) {
        transactions.splice(index, 1);
        await saveData(currentUser.uid, selectedMonth);
        updateUI();
    } else {
        alert('Transação não encontrada.');
    }
}

function prepareEdit(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Define o ID que está sendo editado
    editingId = id;

    if (transaction.type === 'receita') {
        // Mostra formulário de receita
        document.getElementById('receita-form').style.display = 'block';
        document.getElementById('expense-form').style.display = 'none';
        
        // Preenche os campos
        document.getElementById('receita-name').value = transaction.name;
        document.getElementById('receita-day').value = transaction.day;
        document.getElementById('receita-amount').value = transaction.amount;
        document.getElementById('receita-description').value = transaction.description || '';
        
    } else {
        // Mostra formulário de despesa
        document.getElementById('expense-form').style.display = 'block';
        document.getElementById('receita-form').style.display = 'none';
        
        // Preenche os campos
        document.getElementById('name').value = transaction.name;
        document.getElementById('day').value = transaction.day;
        document.getElementById('amount').value = transaction.amount;
        document.getElementById('description').value = transaction.description || '';
        document.getElementById('category').value = transaction.category || '';
    }
    
    // Opcional: Scroll até o formulário
    document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
}


// Função para atualizar a interface do usuário
function updateUI() {
    console.log('Atualizando UI...');
    
    // Calcular totais
    let totalReceitas = 0;
    let totalDespesas = 0;
    transactions.forEach(t => {
        if (t.type === 'receita') {
            totalReceitas += parseFloat(t.amount);
        } else {
            totalDespesas += parseFloat(t.amount);
        }
    });
    const saldo = totalReceitas - totalDespesas;

    // Atualizar spans dos totais
    document.getElementById('total-receitas').textContent = totalReceitas.toFixed(2);
    document.getElementById('total-despesas').textContent = totalDespesas.toFixed(2);
    document.getElementById('saldo').textContent = saldo.toFixed(2);

    // Atualizar lista de transações com tabela HTML e data-label para mobile
    const list = document.getElementById('transaction-list');
    const noTransactions = document.getElementById('no-transactions');
    list.innerHTML = '';
    transactions.sort((a, b) => a.day - b.day); // Ordenar por dia
    transactions.forEach(t => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center ' + (t.type === 'receita' ? 'text-success' : 'text-danger'); // Verde para receitas, vermelho para despesas usando classes Bootstrap
        
        // Construir o conteúdo do li, incluindo o botão de excluir diretamente no innerHTML para garantir visibilidade
        let content = `${t.day}/${selectedMonth} - ${t.name}: R$ ${parseFloat(t.amount).toFixed(2)} - ${t.description}`;
        if (t.category) {
            content += ` (${t.category})`;
        }
        content += ` <button class="btn btn-danger btn-sm" data-id="${t.id}">Excluir</button>`;
        li.innerHTML = content;
        
        list.appendChild(li);
    });

    // Atualizar gráfico
    updateChart();
}



// Função para atualizar o gráfico de despesas por categoria
function updateChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    
    // Calcular despesas por categoria
    const categories = {};
    transactions.filter(t => t.type === 'despesa').forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + parseFloat(t.amount);
    });
    
    const labels = Object.keys(categories);
    const data = Object.values(categories);

    // Destruir gráfico anterior se existir
    if (window.myChart) {
        window.myChart.destroy();
    }

    // Criar novo gráfico
    window.myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#ff9f40', '#4bc0c0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': R$ ' + context.parsed.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Verificar estado de autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log('Usuário logado:', user.email);
        document.getElementById('login-interface').style.display = 'none';
        document.getElementById('month-selection').style.display = 'block';
        document.getElementById('main-interface').style.display = 'none';
        selectedMonth = null;
        transactions = [];
    } else {
        currentUser = null;
        console.log('Usuário não logado');
        document.getElementById('login-interface').style.display = 'block';
        document.getElementById('month-selection').style.display = 'none';
        document.getElementById('main-interface').style.display = 'none';
    }
});

// Função para login
async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Login bem-sucedido');
    } catch (error) {
        console.error('Erro no login:', error);
        document.getElementById('login-error').textContent = error.message;
        document.getElementById('login-error').style.display = 'block';
    }
}

// Função para registro
async function registerUser(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log('Registro bem-sucedido');
    } catch (error) {
        console.error('Erro no registro:', error);
        document.getElementById('login-error').textContent = error.message;
        document.getElementById('login-error').style.display = 'block';
    }
}

// Função para logout
async function logoutUser() {
    try {
        await signOut(auth);
        console.log('Logout bem-sucedido');
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

// Event listener para o formulário de login
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    document.getElementById('login-error').style.display = 'none';
    await loginUser(email, password);
});

// Event listener para o botão de registro
document.getElementById('btn-register').addEventListener('click', async function() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    document.getElementById('login-error').style.display = 'none';
    await registerUser(email, password);
});

// Event listener para o botão de logout
document.getElementById('btn-logout').addEventListener('click', async function() {
    await logoutUser();
});

// Event listener para o botão de seleção de mês
document.getElementById('btn-select-month').addEventListener('click', async function() {
    console.log('Botão "Selecionar Mês" clicado.');
    const monthSelect = document.getElementById('selected-month');
    if (monthSelect.value && currentUser) {
        selectedMonth = parseInt(monthSelect.value);
        console.log(`Mês selecionado: ${selectedMonth}`);
        document.getElementById('month-selection').style.display = 'none';
        document.getElementById('main-interface').style.display = 'block';
        await loadData(currentUser.uid, selectedMonth);
        await loadCategories(); // Carrega categorias do Firestore
        updateUI();
    } else {
        alert('Por favor, selecione um mês.');
    }
});

// Event listener para o botão de mudar mês
document.getElementById('btn-change-month').addEventListener('click', function() {
    console.log('Botão "Mudar Mês" clicado.');
    document.getElementById('main-interface').style.display = 'none';
    document.getElementById('month-selection').style.display = 'block';
    selectedMonth = null;
    transactions = [];
});

// Event listener para mostrar/ocultar formulário de receita
document.getElementById('btn-receita').addEventListener('click', function() {
    document.getElementById('receita-form').style.display = 'block';
    document.getElementById('expense-form').style.display = 'none';
});

// Event listener para mostrar/ocultar formulário de despesa
document.getElementById('btn-despesa').addEventListener('click', function() {
    document.getElementById('expense-form').style.display = 'block';
    document.getElementById('receita-form').style.display = 'none';
});

// Event listener para o formulário de receita
document.getElementById('receita-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('receita-name').value.trim();
    const day = document.getElementById('receita-day').value;
    const amount = document.getElementById('receita-amount').value;
    const description = document.getElementById('receita-description').value.trim();

    if (!name || !day || !amount || !currentUser) {
        alert('Por favor, preencha todos os campos.');
        return;
    }


     const data = {
        type: 'receita',
        name: name,
        day: parseInt(day),
        amount: parseFloat(amount),
        description: description
    };

    if (editingId) {
        // MODO EDIÇÃO
        await updateTransaction(editingId, data);
    } else {
        // MODO CRIAÇÃO (código original) // Adicionar transação com ID único
        transactions.push({
            id: Date.now(),
            ...data
        });
        // Salvar no Firestore e atualizar UI
        await saveData(currentUser.uid, selectedMonth);
        updateUI();
    }
    
    // Limpar formulário e ocultar
    this.reset();
    this.style.display = 'none';
    editingId = null; // Reseta o modo edição
});

// Event listener para o formulário de despesa
document.getElementById('expense-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const day = document.getElementById('day').value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value.trim();
    const category = document.getElementById('category').value;

    if (!name || !day || !amount || !category || !currentUser) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    
    const data = {
        type: 'despesa',
        name: name,
        day: parseInt(day),
        amount: parseFloat(amount),
        description: description,
        category: category
    };

    if (editingId) {
        // MODO EDIÇÃO
        await updateTransaction(editingId, data);
    } else {
        // MODO CRIAÇÃO (código original)// Adicionar transação com ID único
        transactions.push({
            id: Date.now(),
            ...data
        });
        // Salvar no Firestore e atualizar UI
        await saveData(currentUser.uid, selectedMonth);
        updateUI();
    }

    
    
    // Limpar formulário e ocultar
    this.reset();
    this.style.display = 'none';
    editingId = null; // Reseta o modo edição
});

// Event listener para excluir transação (usando event delegation)
document.getElementById('transaction-list').addEventListener('click', function(e) {


    if (e.target && e.target.classList.contains('btn-danger')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        deleteTransaction(id);
    }

    if (e.target && e.target.classList.contains('btn-edit')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        prepareEdit(id);
    }
});

// ================== NOVAS FUNÇÕES PARA CATEGORIAS ==================

// Event listener para mostrar/ocultar campo de nova categoria
document.getElementById('category').addEventListener('change', function() {
    const newCategoryArea = document.getElementById('new-category-area');
    const newCategoryInput = document.getElementById('new-category-name');
    
    if (this.value === 'new') {
        // Mostra o campo de input
        newCategoryArea.style.display = 'flex';
        newCategoryInput.focus();
    } else {
        // Esconde o campo de input
        newCategoryArea.style.display = 'none';
        newCategoryInput.value = '';
    }
});

// Event listener para salvar nova categoria
document.getElementById('save-category-btn').addEventListener('click', async function() {
    const newCategoryInput = document.getElementById('new-category-name');
    const categorySelect = document.getElementById('category');
    const newCategoryArea = document.getElementById('new-category-area');
    
    const nomeNovaCategoria = newCategoryInput.value.trim();

    if (nomeNovaCategoria) {
        try {
            // Adiciona no Firestore
            const docRef = await addDoc(collection(db, "categorias"), {
                nome: nomeNovaCategoria,
                criadoEm: serverTimestamp()
            });
            
            console.log("Categoria salva com ID: ", docRef.id);
            
            // Atualiza a interface: recarrega as opções
            await loadCategories();

            // Seleciona automaticamente a categoria recém-criada
            categorySelect.value = nomeNovaCategoria;

            // Esconde o campo de input novamente
            newCategoryArea.style.display = 'none';
            newCategoryInput.value = '';
            
            alert('Categoria adicionada com sucesso!');
        } catch (error) {
            console.error("Erro ao adicionar categoria: ", error);
            alert("Erro ao salvar categoria. Tente novamente.");
        }
    } else {
        alert("Por favor, digite o nome da categoria.");
    }
});

// Event listener para Enter no campo de nova categoria
document.getElementById('new-category-name').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('save-category-btn').click();
    }
});
