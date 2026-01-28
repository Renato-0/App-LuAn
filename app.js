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
    getDoc 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Variáveis globais
let transactions = []; // Array para armazenar transações do mês selecionado
let selectedMonth = null; // Mês selecionado
let currentUser = null; // Usuário logado

// Função para carregar dados do Firestore para o mês selecionado e usuário
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

// Função para salvar dados no Firestore para o mês selecionado e usuário
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

// Função para atualizar a interface do usuário (totais, lista de transações e gráfico)
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

    // Atualizar lista de transações (ordenadas por dia)
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    transactions.sort((a, b) => a.day - b.day); // Ordenar por dia
    transactions.forEach(t => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center ' + (t.type === 'receita' ? 'text-success' : 'text-danger'); // Verde para receitas, vermelho para despesas usando classes Bootstrap
        
        // Construir o conteúdo do li, incluindo o botão de excluir diretamente no innerHTML para garantir visibilidade
        let content = `${t.day}/${selectedMonth}: R$ ${parseFloat(t.amount).toFixed(2)}  - ${t.name} \n ${t.description}`;
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

    // Destruir gráfico anterior se existir para evitar sobreposições
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

    if (!name || !day || !amount || !description || !currentUser) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    // Adicionar transação com ID único
    transactions.push({
        id: Date.now(), // ID único baseado em timestamp
        type: 'receita',
        name: name,
        day: parseInt(day),
        amount: parseFloat(amount),
        description: description
    });

    // Salvar no Firestore e atualizar UI
    await saveData(currentUser.uid, selectedMonth);
    updateUI();

    // Limpar formulário e ocultar
    this.reset();
    this.style.display = 'none';
});

// Event listener para o formulário de despesa
document.getElementById('expense-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const day = document.getElementById('day').value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value.trim();
    const category = document.getElementById('category').value;

    if (!name || !day || !amount || !description || !category || !currentUser) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    // Adicionar transação com ID único
    transactions.push({
        id: Date.now(), // ID único baseado em timestamp
        type: 'despesa',
        name: name,
        day: parseInt(day),
        amount: parseFloat(amount),
        description: description,
        category: category
    });

    // Salvar no Firestore e atualizar UI
    await saveData(currentUser.uid, selectedMonth);
    updateUI();

    // Limpar formulário e ocultar
    this.reset();
    this.style.display = 'none';
});

// Event listener para excluir transação (usando event delegation)
document.getElementById('transaction-list').addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('btn-danger')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        deleteTransaction(id);
    }
});
