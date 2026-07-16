// State variables
let orders = [];
let menuItems = [];
let token = sessionStorage.getItem('admin_token');
const expandedOrders = new Set();

// Helper to resolve API path dynamically based on page location
function getApiUrl(endpoint) {
    const path = window.location.pathname;
    const adminIndex = path.toLowerCase().indexOf('/admin');
    if (adminIndex !== -1) {
        const base = path.substring(0, adminIndex);
        const basePath = base.endsWith('/') ? base : base + '/';
        return basePath + endpoint;
    }
    return '/' + endpoint;
}

// Synthesized Doorbell Sound using Web Audio API (Disabled for silent operation)
function playDingDong() {
    // Disabled
}

// Repeating Sound Alert for unapproved orders
let alertInterval = null;

function startAlertInterval() {
    if (alertInterval) return;
    alertInterval = setInterval(() => {
        checkUnapprovedAlerts();
    }, 15000); // Repeat every 15 seconds
}

function stopAlertInterval() {
    if (alertInterval) {
        clearInterval(alertInterval);
        alertInterval = null;
    }
}

function checkUnapprovedAlerts() {
    // Play sound only if there are unapproved and open orders (status "Alındı" and not closed)
    const hasUnapproved = orders.some(o => o.status === "Alındı" && !o.closed);
    if (hasUnapproved) {
        playDingDong();
        startAlertInterval();
    } else {
        stopAlertInterval();
    }
}

// DOM Elements
const authOverlay = document.getElementById('authOverlay');
const adminWrapper = document.getElementById('adminWrapper');
const loginForm = document.getElementById('loginForm');
const adminPasswordInput = document.getElementById('adminPassword');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');
const networkIndicator = document.getElementById('networkIndicator');
const networkText = document.getElementById('networkText');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const adminSidebar = document.querySelector('.admin-sidebar');

const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.admin-tab-content');

const ordersGrid = document.getElementById('ordersGrid');
const hideClosedOrdersCheck = document.getElementById('hideClosedOrders');


const excelForm = document.getElementById('excelForm');
const excelFileInput = document.getElementById('excelFile');
const excelFileName = document.getElementById('excelFileName');
const menuTableBody = document.getElementById('menuTableBody');
const menuSearchInput = document.getElementById('menuSearchInput');
const addItemForm = document.getElementById('addItemForm');

const qrType = document.getElementById('qrType');
const qrSubMekan = document.getElementById('qrSubMekan');
const qrSubKoy = document.getElementById('qrSubKoy');
const qrMekanSelect = document.getElementById('qrMekanSelect');
const qrKoySelect = document.getElementById('qrKoySelect');
const qrAdaInput = document.getElementById('qrAdaInput');
const qrParselInput = document.getElementById('qrParselInput');
const generateQrBtn = document.getElementById('generateQrBtn');
const qrResultBox = document.getElementById('qrResultBox');
const qrPlaceholderText = document.getElementById('qrPlaceholderText');
const qrResultTitle = document.getElementById('qrResultTitle');
const generatedQrImage = document.getElementById('generatedQrImage');
const qrLinkUrl = document.getElementById('qrLinkUrl');
const downloadQrBtn = document.getElementById('downloadQrBtn');

// 1. Authentication functions
function checkAuth() {
    if (token === "admin-authenticated-token-987654") {
        authOverlay.style.display = 'none';
        adminWrapper.style.display = 'flex';
        initDashboard();
    } else {
        authOverlay.style.display = 'flex';
        adminWrapper.style.display = 'none';
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = adminPasswordInput.value;
    
    fetch(getApiUrl('api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            token = data.token;
            sessionStorage.setItem('admin_token', token);
            authError.style.display = 'none';
            adminPasswordInput.value = "";
            checkAuth();
        } else {
            authError.textContent = data.message;
            authError.style.display = 'block';
        }
    })
    .catch(err => {
        authError.textContent = "Bağlantı hatası.";
        authError.style.display = 'block';
    });
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('admin_token');
    token = null;
    checkAuth();
    window.location.reload();
});

// 2. Tab Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tabName = btn.dataset.tab;
        tabContents.forEach(content => {
            if (content.id === `tab-${tabName}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Close sidebar on mobile after choosing a tab
        if (adminSidebar && adminSidebar.classList.contains('open')) {
            adminSidebar.classList.remove('open');
            sidebarBackdrop.classList.remove('active');
        }
    });
});



// 3. Initialize Dashboard
function initDashboard() {
    loadOrders();
    loadMenuItems();
    setupSSE();
}

// 4. SSE (Server-Sent Events) Setup
function setupSSE() {
    const sse = new EventSource(getApiUrl('api/live-orders'));
    
    sse.onopen = () => {
        networkIndicator.className = "pulse-dot green";
        networkText.textContent = "Canlı Bağlantı Aktif";
    };
    
    sse.onerror = () => {
        networkIndicator.className = "pulse-dot";
        networkIndicator.style.backgroundColor = "var(--danger)";
        networkText.textContent = "Bağlantı Koptu / Tekrar Bağlanıyor";
    };
    
    sse.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "NEW_ORDER") {
            const newOrder = payload.data;
            orders.unshift(newOrder); // Add to top of array
            renderOrders();
            checkUnapprovedAlerts(); // Will trigger playDingDong and start alert loop
        } else if (payload.type === "ORDER_UPDATED") {
            const updatedOrder = payload.data;
            const idx = orders.findIndex(o => o.orderNo === updatedOrder.orderNo);
            if (idx !== -1) {
                orders[idx] = updatedOrder;
                renderOrders();
                checkUnapprovedAlerts(); // Adjust loop (stop if no unapproved orders left)
            }
        }
    };
    
    // Fallback polling loop (every 15 seconds) to ensure admin receives updates even if SSE is buffered/blocked by IIS/Plesk
    setInterval(() => {
        loadOrders();
    }, 15000);
}

// 5. Load & Render Orders
function loadOrders() {
    fetch(getApiUrl('api/orders'))
        .then(res => res.json())
        .then(data => {
            orders = data;
            renderOrders();
            checkUnapprovedAlerts(); // Check for alerts on startup/reload
        })
        .catch(err => console.error("Error loading orders:", err));
}

function renderOrders() {
    ordersGrid.innerHTML = "";
    
    const hideClosed = hideClosedOrdersCheck.checked;
    const filteredOrders = orders.filter(o => !hideClosed || !o.closed);
    
    if (filteredOrders.length === 0) {
        ordersGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted); background:var(--bg-panel); border-radius: var(--radius-md);">Görüntülenecek sipariş bulunmamaktadır.</div>`;
        return;
    }
    
    filteredOrders.forEach(order => {
        const card = document.createElement('div');
        const statusClass = 'status-' + order.status.toLowerCase().replace(' ', '');
        card.className = `order-card ${statusClass}`;
        
        // Time formatting
        const dateObj = new Date(order.timestamp);
        const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        
        // Location text formatting
        let locText = "";
        let locTextShort = "";
        if (order.deliveryType === "Gel Al") {
            locText = "🛍️ Gel Al (Paket)";
            locTextShort = "🛍️ Gel Al";
        } else {
            if (order.location.type === "Koylar") {
                locText = `⛵ ${order.location.value.koy} Koyu (Ada: ${order.location.value.ada}, Parsel: ${order.location.value.parsel})`;
                locTextShort = `⛵ ${order.location.value.koy} K. (A:${order.location.value.ada}/P:${order.location.value.parsel})`;
            } else if (order.location.type === "Mekanlar") {
                locText = `📍 Ortak Mekan: ${order.location.value}`;
                locTextShort = `📍 ${order.location.value}`;
            } else {
                locText = `📝 Özel Tarif: ${order.location.value}`;
                locTextShort = `📝 Özel Tarif`;
            }
        }
        
        // Items listing
        let itemsHTML = "";
        order.items.forEach(item => {
            itemsHTML += `
                <div class="item-row">
                    <span class="item-name">${item.name}</span>
                    <div>
                        <span class="item-qty">${item.quantity} adet</span>
                        <span style="color:var(--text-muted); margin-left:8px;">${item.price} TL</span>
                    </div>
                </div>
            `;
        });
        
        // Notes block if present
        let notesHTML = "";
        if (order.notes) {
            notesHTML = `
                <div class="order-card-notes">
                    <span class="notes-label">Sipariş Notu</span>
                    <span>${order.notes}</span>
                </div>
            `;
        }
        
        // Status classes for dropdown highlight
        const statusMap = {
            "Alındı": "status-alindi",
            "Onaylandı": "status-onaylandi",
            "Hazır": "status-hazir",
            "Yola Çıktı": "status-yolacikti",
            "Teslim Edildi": "status-teslimedildi"
        };

        const isExpanded = expandedOrders.has(order.orderNo);
        const headerExpandedClass = isExpanded ? "expanded-border" : "";
        const iconExpandedClass = isExpanded ? "expanded" : "";
        const displayStyle = isExpanded ? "block" : "none";
        
        card.innerHTML = `
            <!-- Collapsible Summary Header -->
            <div class="order-summary-header ${headerExpandedClass}" onclick="toggleOrderDetails('${order.orderNo}')">
                <div class="summary-left">
                    <span class="order-no-tag">#${order.orderNo}</span>
                    <span class="order-time-tag">⏱️ ${timeStr}</span>
                    <span class="summary-loc">${locTextShort}</span>
                </div>
                <div class="summary-right">
                    <span class="summary-total">${order.totalPrice} TL</span>
                    <span class="summary-status-badge ${statusMap[order.status]}">${order.status}</span>
                    <span class="collapse-icon ${iconExpandedClass}">▼</span>
                </div>
            </div>
            
            <!-- Collapsible Detailed Content -->
            <div class="order-details-content" id="details-${order.orderNo}" style="display: ${displayStyle};">
                <div>
                    <div class="order-card-customer">
                        <span class="cust-name">${order.name}</span>
                        <span class="cust-phone">📞 ${order.phone}</span>
                    </div>
                    
                    <div class="order-card-loc">
                        <span class="loc-label">${order.deliveryType === "Gel Al" ? "Teslimat Türü" : "Teslimat Adresi"}</span>
                        <span class="loc-val">${locText}</span>
                    </div>
                    
                    <div class="order-card-items">
                        ${itemsHTML}
                    </div>
                </div>
                
                <div>
                    ${notesHTML}
                    
                    <div class="order-card-totals">
                        <div class="total-display-row">
                            <span class="pay-method">${order.paymentMethod === "Nakit" ? "💵 Nakit" : "💳 Kapıda POS"}</span>
                            <span class="total-val">${order.totalPrice} TL</span>
                        </div>
                    </div>
                    
                    <div class="order-card-status">
                        <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--text-muted);">Sipariş Statüsü</label>
                        <select class="status-dropdown ${statusMap[order.status]}" onchange="updateOrderStatus('${order.orderNo}', this.value)">
                            <option value="Alındı" ${order.status === "Alındı" ? "selected" : ""}>1. Alındı</option>
                            <option value="Onaylandı" ${order.status === "Onaylandı" ? "selected" : ""}>2. Onaylandı</option>
                            <option value="Hazır" ${order.status === "Hazır" ? "selected" : ""}>3. Hazır</option>
                            <option value="Yola Çıktı" ${order.status === "Yola Çıktı" ? "selected" : ""}>4. Yola Çıktı</option>
                            <option value="Teslim Edildi" ${order.status === "Teslim Edildi" ? "selected" : ""}>5. Teslim Edildi</option>
                        </select>
                        
                        <div class="card-actions">
                            <button class="btn btn-close btn-card-action" onclick="closeOrder('${order.orderNo}')">${order.closed ? "Geri Aç" : "Siparişi Kapat"}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        ordersGrid.appendChild(card);
    });
}

window.toggleOrderDetails = function(orderNo) {
    const detailsDiv = document.getElementById(`details-${orderNo}`);
    if (!detailsDiv) return;
    const card = detailsDiv.closest('.order-card');
    const header = card.querySelector('.order-summary-header');
    const icon = card.querySelector('.collapse-icon');
    
    if (expandedOrders.has(orderNo)) {
        expandedOrders.delete(orderNo);
        detailsDiv.style.display = 'none';
        header.classList.remove('expanded-border');
        icon.classList.remove('expanded');
    } else {
        expandedOrders.add(orderNo);
        detailsDiv.style.display = 'block';
        header.classList.add('expanded-border');
        icon.classList.add('expanded');
    }
};

hideClosedOrdersCheck.addEventListener('change', () => {
    renderOrders();
});

window.updateOrderStatus = function(orderNo, newStatus) {
    fetch(getApiUrl('api/orders/update-status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNo, status: newStatus })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const idx = orders.findIndex(o => o.orderNo === orderNo);
            if (idx !== -1) {
                orders[idx].status = newStatus;
                renderOrders();
                checkUnapprovedAlerts();
            }
        } else {
            alert("Durum güncellenirken hata oluştu.");
        }
    })
    .catch(err => console.error("Error updating status:", err));
};

window.closeOrder = function(orderNo) {
    const orderObj = orders.find(o => o.orderNo === orderNo);
    if (!orderObj) return;
    
    // Toggle closed flag
    const newClosedVal = !orderObj.closed;
    
    fetch(getApiUrl('api/orders/update-status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNo, closed: newClosedVal })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const idx = orders.findIndex(o => o.orderNo === orderNo);
            if (idx !== -1) {
                orders[idx].closed = newClosedVal;
                renderOrders();
                checkUnapprovedAlerts();
            }
        } else {
            alert("Sipariş kapatılırken hata oluştu.");
        }
    })
    .catch(err => console.error("Error closing order:", err));
};

// 6. Menu Management (Tab 2)
function loadMenuItems() {
    fetch(getApiUrl('api/menu'))
        .then(res => res.json())
        .then(data => {
            menuItems = data;
            renderMenuTable();
        })
        .catch(err => console.error("Error loading menu:", err));
}

function renderMenuTable() {
    menuTableBody.innerHTML = "";
    const searchVal = menuSearchInput.value.toLowerCase().trim();
    
    menuItems.forEach(item => {
        if (searchVal && !item.name.toLowerCase().includes(searchVal) && !item.category.toLowerCase().includes(searchVal)) {
            return;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="ID">${item.id}</td>
            <td data-label="Kategori"><input type="text" id="cat-${item.id}" value="${item.category}"></td>
            <td data-label="Ürün Adı"><input type="text" id="name-${item.id}" value="${item.name}"></td>
            <td data-label="Fiyat (TL)"><input type="number" id="price-${item.id}" value="${item.price}" min="0"></td>
            <td data-label="Resim Linki"><input type="text" id="img-${item.id}" value="${item.image || ''}" placeholder="Resim linki..."></td>
            <td data-label="Aktif" style="text-align:center;"><input type="checkbox" id="active-${item.id}" ${item.active ? "checked" : ""}></td>
            <td data-label="İşlem">
                <button class="btn btn-primary btn-table" onclick="saveMenuItem(${item.id})">Kaydet</button>
            </td>
        `;
        menuTableBody.appendChild(row);
    });
}

menuSearchInput.addEventListener('input', () => {
    renderMenuTable();
});

window.saveMenuItem = function(id) {
    const category = document.getElementById(`cat-${id}`).value.trim();
    const name = document.getElementById(`name-${id}`).value.trim();
    const price = parseFloat(document.getElementById(`price-${id}`).value || 0);
    const image = document.getElementById(`img-${id}`).value.trim();
    const active = document.getElementById(`active-${id}`).checked;
    
    if (!category || !name) {
        alert("Kategori ve isim alanları boş bırakılamaz.");
        return;
    }
    
    fetch(getApiUrl('api/menu/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, category, name, price, image, active })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Update local array
            const idx = menuItems.findIndex(i => i.id === id);
            if (idx !== -1) {
                menuItems[idx] = data.item;
            }
            alert("Ürün başarıyla kaydedildi.");
        } else {
            alert(data.message || "Kaydedilirken hata oluştu.");
        }
    })
    .catch(err => alert("Sunucu hatası."));
};

// Add New Item Manually
addItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('newItemName').value;
    const category = document.getElementById('newItemCategory').value;
    const price = document.getElementById('newItemPrice').value;
    const image = document.getElementById('newItemImage').value;
    
    fetch(getApiUrl('api/menu/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, price, image })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            menuItems.push(data.item);
            renderMenuTable();
            addItemForm.reset();
            alert("Ürün başarıyla eklendi.");
        } else {
            alert(data.message || "Eklenirken hata oluştu.");
        }
    })
    .catch(err => alert("Hata oluştu."));
});

// Excel file input selection UI
excelFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        excelFileName.textContent = e.target.files[0].name;
    } else {
        excelFileName.textContent = "Dosya seçilmedi";
    }
});

// Excel upload Form submission
excelForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = excelFileInput.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('excel', file);
    
    const submitBtn = document.getElementById('excelSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = "Yükleniyor...";
    
    fetch(getApiUrl('api/menu/upload'), {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Menüyü Güncelle";
        
        if (data.success) {
            excelForm.reset();
            excelFileName.textContent = "Dosya seçilmedi";
            alert(data.message);
            loadMenuItems(); // reload menu
        } else {
            alert(data.message || "Menü yüklenirken hata oluştu.");
        }
    })
    .catch(err => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Menüyü Güncelle";
        console.error("Excel upload error:", err);
        alert("Dosya yüklenirken bağlantı hatası oluştu.");
    });
});

// 7. Akıllı QR Kod Üretici (Tab 3)
qrType.addEventListener('change', (e) => {
    const type = e.target.value;
    qrSubMekan.style.display = type === "mekan" ? "block" : "none";
    qrSubKoy.style.display = type === "koy" ? "block" : "none";
});

generateQrBtn.addEventListener('click', () => {
    const type = qrType.value;
    let urlPath = "";
    let title = "Genel Menü QR Kodu";
    const host = window.location.origin; // e.g. http://localhost:3000 or production domain
    
    if (type === "genel") {
        urlPath = "/";
        title = "Genel Menü (Konumsuz) QR Kodu";
    } else if (type === "mekan") {
        const mekan = qrMekanSelect.value;
        urlPath = `/?location=${encodeURIComponent(mekan)}`;
        title = `${mekan} Mekanı Akıllı QR Kodu`;
    } else if (type === "koy") {
        const koy = qrKoySelect.value;
        const ada = parseInt(qrAdaInput.value) || 1;
        const parsel = parseInt(qrParselInput.value) || 1;
        urlPath = `/?location=${encodeURIComponent(koy)}&ada=${ada}&parsel=${parsel}`;
        title = `${koy} Koyu (Ada: ${ada}, Parsel: ${parsel}) Akıllı QR Kodu`;
    }
    
    const fullUrl = host + urlPath;
    
    // Generate QR code image source using free qrserver API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}`;
    
    // Render Results
    qrResultTitle.textContent = title;
    generatedQrImage.src = qrApiUrl;
    qrLinkUrl.textContent = fullUrl;
    
    // Setup Download button link
    downloadQrBtn.href = qrApiUrl;
    
    // Show display card
    qrPlaceholderText.style.display = 'none';
    qrResultBox.style.display = 'flex';
});

// Initial authentication check on load
checkAuth();

// 8. Mobile Sidebar Toggle Event Listeners
if (hamburgerBtn && sidebarBackdrop && adminSidebar) {
    hamburgerBtn.addEventListener('click', () => {
        adminSidebar.classList.toggle('open');
        sidebarBackdrop.classList.toggle('active');
    });

    sidebarBackdrop.addEventListener('click', () => {
        adminSidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
    });
}

