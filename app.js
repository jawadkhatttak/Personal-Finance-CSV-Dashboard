
categoryOverrides = loadOverrides();
let allTransactions = [];

const CATEGORY_RULES = [
    { category: 'Income', keywords: ['SALARY', 'FREELANCE', 'BONUS', 'PAYMENT RECEIVED', 'DEPOSIT'] },
    { category: 'Housing', keywords: ['RENT', 'MORTGAGE', 'MAINTENANCE'] },
    { category: 'Groceries', keywords: ['WALMART', 'WHOLE FOODS', 'GROCERY', 'SUPERMARKET', 'ALDI', 'LIDL'] },
    { category: 'Food & Dining', keywords: ['UBER EATS', 'MCDONALDS', 'STARBUCKS', 'RESTAURANT', 'PIZZA', 'KFC', 'BURGER'] },
    { category: 'Transport', keywords: ['UBER RIDE', 'SHELL', 'GAS STATION', 'PETROL', 'FUEL', 'PARKING', 'TAXI'] },
    { category: 'Utilities', keywords: ['ELECTRICITY', 'INTERNET', 'WATER BILL', 'GAS BILL', 'PHONE BILL'] },
    { category: 'Entertainment', keywords: ['NETFLIX', 'SPOTIFY', 'CINEMA', 'DISNEY', 'YOUTUBE', 'APPLE APP STORE'] },
    { category: 'Health', keywords: ['PHARMACY', 'CVS', 'GYM', 'DOCTOR', 'HOSPITAL', 'CLINIC'] },
    { category: 'Shopping', keywords: ['AMAZON', 'EBAY', 'ZARA', 'H&M', 'IKEA'] },
];

function classifyTransaction(description) {
    for (const rule of CATEGORY_RULES) {
        for (const keyword of rule.keywords) {
            if (description.includes(keyword)) {
                // console.log(description.includes(keyword))
                // console.log("keyword", keyword)
                return rule.category;
            }
        }
    }
    return 'Other'; // no keyword matched
}

function isValidCSV(file) {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const validExtension = file.name.endsWith('.csv');
    return validTypes.includes(file.type) || validExtension;
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        // This fires when reading is complete
        reader.onload = (event) => {
            resolve(event.target.result); // the raw CSV text
        };

        // This fires if something goes wrong
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        // Start reading — result will be a string
        reader.readAsText(file);
    });
}

const dropZone = document.querySelector('#drop-zone')
const fileInput = document.querySelector('#file-input')


dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over')
})

document.getElementById('search-input').addEventListener('input', (e) => {
    filterTable(e.target.value.trim());
});

document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('drop-zone').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.querySelector('.reset-btn').classList.add('hidden');
    fileInput.value = '';
    allTransactions = [];
    if (categoryChartInstance) categoryChartInstance.destroy();
    if (trendChartInstance) trendChartInstance.destroy();
});

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
})

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = event.dataTransfer.files[0];
    handleFile(file);
})

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    handleFile(file);
})


async function handleFile(file) {
    showUploadError('');

    if (!isValidCSV(file)) {
        showUploadError('Invalid file — please upload a .csv file');
        return;
    }

    const rawCSV = await readFile(file);
    const rawRows = parseCSV(rawCSV);
    allTransactions = normalizeTransactions(rawRows);
    const stats = computeStats(allTransactions);
    const categoryStats = getCategoryStats(allTransactions);

    renderStats(stats);
    renderCategoryChart(categoryStats);
    renderTrendChart(allTransactions);
    renderTable(allTransactions);

    document.getElementById('drop-zone').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.querySelector('.reset-btn').classList.remove('hidden');
}

function showUploadError(message) {
    const el = document.querySelector('#upload-error');
    el.textContent = message;
    el.classList.toggle('hidden', !message);
}



function normalizeTransactions(rawRows) {
    return rawRows
        .filter(row => row.Date && row.Description && row.Amount !== null)
        .map(row => {
            const description = row.Description.trim().toUpperCase();
            const date = row.Date.trim();
            const key = `${date}_${description}`;

            // Use saved override if it exists, otherwise auto-classify
            const category = categoryOverrides[key] || classifyTransaction(description);

            return {
                date,
                description,
                amount: parseFloat(row.Amount),
                category
            };
        });
}

function getCategoryStats(transactions) {
    const expenses = transactions.filter(t => t.amount < 0);

    return expenses.reduce((acc, t) => {
        const cat = t.category;
        acc[cat] = Math.round(((acc[cat] || 0) + Math.abs(t.amount)) * 100) / 100;
        return acc;
    }, {});
}

function computeStats(transactions) {
    const income = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        income: income,
        expenses: expenses,
        balance: income + expenses  // expenses is negative, so this is income - |expenses|
    };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function parseCSV(rawCSV) {
    const result = Papa.parse(rawCSV, {
        header: true,        // use first row as object keys
        skipEmptyLines: true, // ignore blank rows
        dynamicTyping: true  // auto-convert numbers to Number type
    });
    // Only log if there are actually errors — not an empty array every time
    if (result.errors.length > 0) {
        console.warn('CSV parsing warnings:', result.errors);
    }

    return result.data

}

function renderStats(stats) {
    document.getElementById('total-income').textContent = formatCurrency(stats.income);
    document.getElementById('total-expenses').textContent = formatCurrency(stats.expenses);
    document.getElementById('net-balance').textContent = formatCurrency(stats.balance);
}

let categoryChartInstance = null;

function renderCategoryChart(categoryStats) {
    const labels = Object.keys(categoryStats);
    const values = Object.values(categoryStats);

    const colors = [
        '#58a6ff', '#3fb950', '#f78166', '#d2a8ff',
        '#ffa657', '#79c0ff', '#56d364', '#ff7b72', '#e3b341'
    ];

    if (categoryChartInstance) categoryChartInstance.destroy();

    const ctx = document.getElementById('category-chart').getContext('2d');
    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#0f1117',
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#e6edf3', padding: 12, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((value / total) * 100).toFixed(1);
                            return ` ${formatCurrency(value)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderTable(transactions) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ''; // clear previous rows

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:#8b949e; padding: 2rem;">
                    No transactions found
                </td>
            </tr>`;
        return;
    }

    transactions.forEach(t => {
        const tr = document.createElement('tr');
        const isPositive = t.amount > 0;

        tr.innerHTML = `
            <td>${t.date}</td>
            <td>${t.description}</td>
            <td><span class="category-badge">${t.category}</span></td>
            <td class="${isPositive ? 'amount-positive' : 'amount-negative'}">
                ${formatCurrency(t.amount)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}



function filterTable(query) {
    const filtered = allTransactions.filter(t =>
        t.description.includes(query.toUpperCase()) ||
        t.category.toLowerCase().includes(query.toLowerCase())
    );
    renderTable(filtered);
}

let trendChartInstance = null;

function renderTrendChart(transactions) {
    // Only expenses, grouped by month
    const monthlyMap = transactions
        .filter(t => t.amount < 0)
        .reduce((acc, t) => {
            // date is "2024-01-05" — take first 7 chars for "2024-01"
            const month = t.date.substring(0, 7);
            acc[month] = Math.round(((acc[month] || 0) + Math.abs(t.amount)) * 100) / 100;
            return acc;
        }, {});

    // Sort months chronologically
    const sorted = Object.entries(monthlyMap).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sorted.map(([month]) => {
        // Convert "2024-01" to "Jan 2024"
        const [year, m] = month.split('-');
        return new Date(year, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
    });
    const values = sorted.map(([, total]) => total);

    if (trendChartInstance) trendChartInstance.destroy();

    const ctx = document.getElementById('trend-chart').getContext('2d');
    trendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Spending',
                data: values,
                backgroundColor: '#58a6ff',
                borderRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
                y: {
                    ticks: {
                        color: '#8b949e',
                        callback: (value) => formatCurrency(value)
                    },
                    grid: { color: '#21262d' }
                }
            }
        }
    });
}

document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('drop-zone').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.querySelector('.reset-btn').classList.add('hidden');
    allTransactions = [];
    categoryOverrides = {};
    localStorage.removeItem('finance_overrides');
    fileInput.value = '';
    if (categoryChartInstance) categoryChartInstance.destroy();
    if (trendChartInstance) trendChartInstance.destroy();
});

const ALL_CATEGORIES = [
    'Income', 'Housing', 'Groceries', 'Food & Dining',
    'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'
];

function renderTable(transactions) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:#8b949e;padding:2rem;">
                    No transactions found
                </td>
            </tr>`;
        return;
    }

    transactions.forEach(t => {
        const tr = document.createElement('tr');
        const isPositive = t.amount > 0;
        const key = `${t.date}_${t.description}`;

        // Build category options
        const options = ALL_CATEGORIES.map(cat =>
            `<option value="${cat}" ${cat === t.category ? 'selected' : ''}>${cat}</option>`
        ).join('');

        tr.innerHTML = `
            <td>${t.date}</td>
            <td>${t.description}</td>
            <td>
                <select class="category-select" data-key="${key}">
                    ${options}
                </select>
            </td>
            <td class="${isPositive ? 'amount-positive' : 'amount-negative'}">
                ${formatCurrency(t.amount)}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach change listeners to all selects
    tbody.querySelectorAll('.category-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const key = e.target.dataset.key;
            const newCategory = e.target.value;
            overrideCategory(key, newCategory);
        });
    });
}

function overrideCategory(key, newCategory) {
    // 1. Save to overrides map
    categoryOverrides[key] = newCategory;

    // 2. Update the transaction in allTransactions
    const transaction = allTransactions.find(t => `${t.date}_${t.description}` === key);
    if (transaction) transaction.category = newCategory;

    // 3. Persist to localStorage
    saveOverrides();

    // 4. Re-render only the chart — table already reflects the change via the select
    const categoryStats = getCategoryStats(allTransactions);
    renderCategoryChart(categoryStats);
    renderTrendChart(allTransactions);
}

function saveOverrides() {
    localStorage.setItem('finance_overrides', JSON.stringify(categoryOverrides));
}

function loadOverrides() {
    const raw = localStorage.getItem('finance_overrides');
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {}; // corrupted data — start fresh
    }
}