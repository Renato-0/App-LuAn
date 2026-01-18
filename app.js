// Carregar gastos do LocalStorage
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// Função para salvar no LocalStorage
function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// Adicionar gasto
document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const date = new Date().toISOString().split('T')[0];
    
    expenses.push({ amount, description, category, date });
    saveExpenses();
    renderExpenses();
    renderChart();
    e.target.reset();
});

// Renderizar lista de gastos
function renderExpenses() {
    const list = document.getElementById('expense-list');
    list.innerHTML = '';
    expenses.forEach((exp, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `${exp.date} - ${exp.description} (${exp.category}): R$ ${exp.amount.toFixed(2)} 
                        <button class="btn btn-danger btn-sm" onclick="deleteExpense(${index})">Excluir</button>`;
        list.appendChild(li);
    });
    updateTotal();
}

// Excluir gasto
function deleteExpense(index) {
    expenses.splice(index, 1);
    saveExpenses();
    renderExpenses();
    renderChart();
}

// Atualizar total
function updateTotal() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    document.getElementById('total').textContent = total.toFixed(2);
}

// Renderizar gráfico
function renderChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    const categories = {};
    expenses.forEach(exp => {
        categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    });
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56']
            }]
        }
    });
}

// Inicializar
renderExpenses();
renderChart();