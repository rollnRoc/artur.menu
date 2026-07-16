// State variables
let menuData = [];
let cart = {}; // keyed by product ID
let userProfile = {
    name: "",
    phone: "",
    deliveryType: "Adrese teslim",
    location: null
};

// DOM Elements
const setupSection = document.getElementById('setupSection');
const menuSection = document.getElementById('menuSection');
const setupForm = document.getElementById('setupForm');
const userNameInput = document.getElementById('userName');
const userPhoneInput = document.getElementById('userPhone');
const deliveryOptionAddress = document.getElementById('deliveryOptionAddress');
const deliveryOptionPickup = document.getElementById('deliveryOptionPickup');
const locationDetailsArea = document.getElementById('locationDetailsArea');
const locationTypeSelect = document.getElementById('locationType');
const subKoylar = document.getElementById('subKoylar');
const subMekanlar = document.getElementById('subMekanlar');
const subDiger = document.getElementById('subDiger');
const koySelect = document.getElementById('koySelect');
const adaInput = document.getElementById('adaInput');
const parselInput = document.getElementById('parselInput');
const mekanSelect = document.getElementById('mekanSelect');
const digerText = document.getElementById('digerText');
const digerCount = document.getElementById('digerCount');

const barUserName = document.getElementById('barUserName');
const barUserLocation = document.getElementById('barUserLocation');
const editInfoBtn = document.getElementById('editInfoBtn');

const menuSearch = document.getElementById('menuSearch');
const categoryTabs = document.getElementById('categoryTabs');
const menuContainer = document.getElementById('menuContainer');
const categoryGridView = document.getElementById('categoryGridView');
const categoryGrid = document.getElementById('categoryGrid');
const productListView = document.getElementById('productListView');
const backToCategoriesBtn = document.getElementById('backToCategoriesBtn');
const activeCategoryTitle = document.getElementById('activeCategoryTitle');

const cartTrigger = document.getElementById('cartTrigger');
const cartBadge = document.getElementById('cartBadge');
const cartOverlay = document.getElementById('cartOverlay');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const cartItemsList = document.getElementById('cartItemsList');
const cartNotes = document.getElementById('orderNotes');
const cartNotesCount = document.getElementById('cartNotesCount');
const payOptionCash = document.getElementById('payOptionCash');
const payOptionCard = document.getElementById('payOptionCard');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartGrandTotal = document.getElementById('cartGrandTotal');
const submitOrderBtn = document.getElementById('submitOrderBtn');

const successOverlay = document.getElementById('successOverlay');
const summaryOrderNo = document.getElementById('summaryOrderNo');
const summaryTotal = document.getElementById('summaryTotal');
const summaryPayment = document.getElementById('summaryPayment');
const newOrderBtn = document.getElementById('newOrderBtn');

// Initialize dropdowns (Ada 1-300, Parsel 1-9)
function initDropdowns() {
    // Ada 1-300
    adaInput.innerHTML = "";
    for (let i = 1; i <= 300; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        adaInput.appendChild(opt);
    }
    // Parsel 1-9
    parselInput.innerHTML = "";
    for (let i = 1; i <= 9; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        parselInput.appendChild(opt);
    }
}

// Read URL params (Smart QR)
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('location') || params.get('loc'); // e.g. fener, marti
    const ada = params.get('ada');
    const parsel = params.get('parsel');

    if (loc) {
        // Switch to address delivery
        document.querySelector('input[name="deliveryType"][value="Adrese teslim"]').checked = true;
        updateDeliveryTypeUI("Adrese teslim");

        const normalizedLoc = loc.toLowerCase().trim();

        // Check if it matches a known cove
        const isKoy = ["güvercin", "güvercinkoyu", "guvercin", "martı", "marti", "gemi yatağı", "gemiyatagi", "gemiyatagi"].some(k => normalizedLoc.includes(k));
        
        if (isKoy) {
            locationTypeSelect.value = "Koylar";
            updateLocationFieldsUI("Koylar");

            if (normalizedLoc.includes("güvercin") || normalizedLoc.includes("guvercin")) {
                koySelect.value = "Güvercin";
            } else if (normalizedLoc.includes("martı") || normalizedLoc.includes("marti")) {
                koySelect.value = "Martı";
            } else {
                koySelect.value = "Gemi Yatağı";
            }

            if (ada) adaInput.value = ada;
            if (parsel) parselInput.value = parsel;

        } else if (normalizedLoc === "diğer" || normalizedLoc === "diger" || normalizedLoc === "generic") {
            locationTypeSelect.value = "Diğer";
            updateLocationFieldsUI("Diğer");
            const desc = params.get('desc');
            if (desc) digerText.value = desc;
        } else {
            // Match to a venue
            locationTypeSelect.value = "Mekanlar";
            updateLocationFieldsUI("Mekanlar");
            
            // Try matching venue value
            const options = Array.from(mekanSelect.options);
            const matchedOpt = options.find(opt => opt.value.toLowerCase().includes(normalizedLoc) || normalizedLoc.includes(opt.value.toLowerCase()));
            if (matchedOpt) {
                mekanSelect.value = matchedOpt.value;
            }
        }
    }
}

// Load profile from Local Storage
function loadSavedProfile() {
    const saved = localStorage.getItem('artur_siparis_profile');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            userNameInput.value = data.name || "";
            userPhoneInput.value = data.phone || "";
            
            if (data.deliveryType) {
                document.querySelector(`input[name="deliveryType"][value="${data.deliveryType}"]`).checked = true;
                updateDeliveryTypeUI(data.deliveryType);
            }
            
            if (data.location && data.deliveryType === "Adrese teslim") {
                locationTypeSelect.value = data.location.type;
                updateLocationFieldsUI(data.location.type);

                if (data.location.type === "Koylar" && data.location.value) {
                    koySelect.value = data.location.value.koy;
                    adaInput.value = data.location.value.ada;
                    parselInput.value = data.location.value.parsel;
                } else if (data.location.type === "Mekanlar") {
                    mekanSelect.value = data.location.value;
                } else if (data.location.type === "Diğer") {
                    digerText.value = data.location.value;
                }
            }
        } catch (e) {
            console.error("Local storage read error:", e);
        }
    }
}

// UI triggers
function updateDeliveryTypeUI(type) {
    if (type === "Adrese teslim") {
        deliveryOptionAddress.classList.add('active');
        deliveryOptionPickup.classList.remove('active');
        locationDetailsArea.style.display = 'block';
    } else {
        deliveryOptionAddress.classList.remove('active');
        deliveryOptionPickup.classList.add('active');
        locationDetailsArea.style.display = 'none';
    }
}

function updateLocationFieldsUI(type) {
    subKoylar.style.display = type === "Koylar" ? "block" : "none";
    subMekanlar.style.display = type === "Mekanlar" ? "block" : "none";
    subDiger.style.display = type === "Diğer" ? "block" : "none";
}

// Setup Event Listeners
deliveryOptionAddress.addEventListener('click', () => {
    document.querySelector('input[name="deliveryType"][value="Adrese teslim"]').checked = true;
    updateDeliveryTypeUI("Adrese teslim");
});
deliveryOptionPickup.addEventListener('click', () => {
    document.querySelector('input[name="deliveryType"][value="Gel Al"]').checked = true;
    updateDeliveryTypeUI("Gel Al");
});

locationTypeSelect.addEventListener('change', (e) => {
    updateLocationFieldsUI(e.target.value);
});

digerText.addEventListener('input', (e) => {
    digerCount.textContent = `${e.target.value.length} / 200`;
});
cartNotes.addEventListener('input', (e) => {
    cartNotesCount.textContent = `${e.target.value.length} / 200`;
});

// Setup Form Submission
setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = userNameInput.value.trim();
    const phone = userPhoneInput.value.trim();
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    
    let location = null;
    if (deliveryType === "Adrese teslim") {
        const type = locationTypeSelect.value;
        let value = "";
        
        if (type === "Koylar") {
            value = {
                koy: koySelect.value,
                ada: parseInt(adaInput.value),
                parsel: parseInt(parselInput.value)
            };
        } else if (type === "Mekanlar") {
            value = mekanSelect.value;
        } else {
            value = digerText.value.trim();
            if (!value) {
                alert("Lütfen teslimat adresi açıklamasını girin.");
                return;
            }
        }
        
        location = { type, value };
    }
    
    // Save to State
    userProfile = { name, phone, deliveryType, location };
    
    // Save to Local Storage
    localStorage.setItem('artur_siparis_profile', JSON.stringify(userProfile));
    
    // Update Header Bar
    barUserName.textContent = name;
    if (deliveryType === "Gel Al") {
        barUserLocation.textContent = "Gel Al (Paket)";
    } else {
        if (location.type === "Koylar") {
            barUserLocation.textContent = `${location.value.koy} Koyu (Ada: ${location.value.ada}, Parsel: ${location.value.parsel})`;
        } else if (location.type === "Mekanlar") {
            barUserLocation.textContent = `${location.value} Mekanı`;
        } else {
            barUserLocation.textContent = location.value.length > 25 ? location.value.slice(0, 25) + '...' : location.value;
        }
    }
    
    // Switch to Menu
    setupSection.style.display = 'none';
    menuSection.style.display = 'block';
    cartTrigger.style.display = 'flex';
    
    loadMenu();
    
    // Auto-focus search input for fast typing
    setTimeout(() => {
        const searchInput = document.getElementById('menuSearch');
        if (searchInput) searchInput.focus();
    }, 150);
});

editInfoBtn.addEventListener('click', () => {
    menuSection.style.display = 'none';
    setupSection.style.display = 'flex';
    cartTrigger.style.display = 'none';
});

// Load menu items from server
function loadMenu() {
    fetch('api/menu')
        .then(res => res.json())
        .then(data => {
            menuData = data.filter(item => item.active);
            renderCategoryGrid();
            renderCategoryTabs();
            renderProducts();
            showCategoryGrid();
        })
        .catch(err => {
            console.error("Error loading menu:", err);
            alert("Menü yüklenirken hata oluştu.");
        });
}

function showCategoryGrid() {
    categoryGridView.style.display = 'block';
    productListView.style.display = 'none';
    menuSearch.value = "";
}

function renderCategoryGrid() {
    const categories = [...new Set(menuData.map(item => item.category))];
    categoryGrid.innerHTML = "";
    
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        
        let imgHTML = "";
        const catKey = normalizeCategoryKey(cat);
        const imgSrc = categoryImages[catKey] || "";
        
        if (imgSrc) {
            imgHTML = `<img src="${imgSrc}" class="category-card-img" alt="${cat}">`;
        } else {
            imgHTML = `<div class="category-card-img" style="background: linear-gradient(135deg, var(--bg-card-hover) 0%, var(--bg-app) 100%);"></div>`;
        }
        
        card.innerHTML = `
            ${imgHTML}
            <div class="category-card-overlay">
                <span class="category-card-name">${cat}</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            openCategory(cat);
        });
        
        categoryGrid.appendChild(card);
    });
}

function openCategory(cat) {
    categoryGridView.style.display = 'none';
    productListView.style.display = 'block';
    activeCategoryTitle.textContent = cat;
    
    // Highlight correct category tab
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        const span = tab.querySelector('span');
        const tabText = span ? span.textContent : tab.textContent;
        if (tabText === cat) {
            tab.classList.add('active');
            tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            tab.classList.remove('active');
        }
    });
    
    renderProducts(cat);
}

function normalizeCategoryKey(cat) {
    return cat.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/i̇/g, 'i')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

// Map of category icons loaded locally from Menü.xlsx
const categoryImages = {
    "corbalar": "images/kategoriler/corbalar.png",
    "izgaralar": "images/kategoriler/izgaralar.png",
    "pizzalar": "images/kategoriler/pizzalar.png",
    "fastfood": "images/kategoriler/fastfood.png",
    "tatlilar": "images/kategoriler/tatlilar.png",
    "sogukicecekler": "images/kategoriler/soguk_icecekler.png",
    "sicakicecekler": "images/kategoriler/sicak_icecekler.png",
    "kahveler": "images/kategoriler/kahveler.png",
    "kahvalti": "images/kategoriler/kahvalti.png",
    "hamurisi": "images/kategoriler/hamur_isi.png",
    "kokteyller": "images/kategoriler/kokteyller.png",
    "mezeler": "images/kategoriler/mezeler.png",
    "salatalar": "images/kategoriler/salatalar.png",
    "tabldot": "images/kategoriler/tabldot.png"
};

// Render category tabs dynamically
function renderCategoryTabs() {
    // Get unique categories
    const categories = ['TÜMÜ', ...new Set(menuData.map(item => item.category))];
    categoryTabs.innerHTML = "";
    
    categories.forEach((cat, idx) => {
        const tab = document.createElement('button');
        tab.className = `category-tab ${idx === 0 ? 'active' : ''}`;
        
        let iconHTML = "";
        const catKey = normalizeCategoryKey(cat);
        if (categoryImages[catKey]) {
            iconHTML = `<img src="${categoryImages[catKey]}" style="width: 16px; height: 16px; object-fit: contain; filter: brightness(0.9);" alt="${cat}">`;
        } else if (cat === 'TÜMÜ') {
            iconHTML = `🍽️`;
        }
        
        tab.innerHTML = `${iconHTML} <span>${cat}</span>`;
        
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeCategoryTitle.textContent = cat;
            renderProducts(cat);
        });
        categoryTabs.appendChild(tab);
    });
}

// Render products based on category and search query
function renderProducts(filterCategory = 'TÜMÜ') {
    const searchVal = menuSearch.value.toLowerCase().trim();
    menuContainer.innerHTML = "";
    
    // Group products by category
    const grouped = {};
    menuData.forEach(prod => {
        if (filterCategory !== 'TÜMÜ' && prod.category !== filterCategory) return;
        if (searchVal && !prod.name.toLowerCase().includes(searchVal) && !prod.category.toLowerCase().includes(searchVal)) return;
        
        if (!grouped[prod.category]) {
            grouped[prod.category] = [];
        }
        grouped[prod.category].push(prod);
    });
    
    const cats = Object.keys(grouped);
    if (cats.length === 0) {
        menuContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Aramanızla eşleşen ürün bulunamadı.</div>`;
        return;
    }
    
    cats.forEach(cat => {
        // Group Header
        const header = document.createElement('h3');
        header.className = 'category-group-header';
        header.textContent = cat;
        menuContainer.appendChild(header);
        
        // Products in group
        grouped[cat].forEach(prod => {
            const card = document.createElement('div');
            const hasImage = !!prod.image;
            card.className = `product-card ${hasImage ? 'has-image' : 'has-no-image'}`;
            
            // Image area
            let imgHTML = "";
            if (hasImage) {
                imgHTML = `<img src="${prod.image}" class="product-image" loading="lazy" onerror="this.style.display='none'; this.parentNode.classList.remove('has-image'); this.parentNode.classList.add('has-no-image');">`;
            }
            
            const qtyInCart = cart[prod.id] ? cart[prod.id].quantity : 0;
            
            card.innerHTML = `
                ${imgHTML}
                <div class="product-details">
                    <span class="product-name">${prod.name}</span>
                    <span class="product-price">${prod.price} TL</span>
                </div>
                <div class="product-action" id="action-${prod.id}">
                    ${qtyInCart > 0 ? renderQtyControls(prod.id, qtyInCart) : `<button class="add-to-cart-btn" onclick="addToCart(${prod.id})">+</button>`}
                </div>
            `;
            menuContainer.appendChild(card);
        });
    });
}

function renderQtyControls(id, qty) {
    return `
        <div class="quantity-controller">
            <button class="qty-btn qty-btn-minus" onclick="changeQty(${id}, -1)">-</button>
            <span class="qty-number">${qty}</span>
            <button class="qty-btn qty-btn-plus" onclick="changeQty(${id}, 1)">+</button>
        </div>
    `;
}

// Cart functionality
window.addToCart = function(id) {
    // Limits check: Max 10 distinct items
    const distinctItems = Object.keys(cart).length;
    if (distinctItems >= 10) {
        alert("Sepete en fazla 10 farklı ürün ekleyebilirsiniz.");
        return;
    }
    
    const prod = menuData.find(p => p.id === id);
    if (prod) {
        cart[id] = {
            id: prod.id,
            name: prod.name,
            price: prod.price,
            category: prod.category,
            quantity: 1
        };
        updateCartUI();
        refreshProductCardAction(id);
    }
};

window.changeQty = function(id, delta) {
    if (cart[id]) {
        const newQty = cart[id].quantity + delta;
        
        // Limit check: Max 5 quantity per item
        if (newQty > 5) {
            alert("Bir üründen en fazla 5 adet sipariş edebilirsiniz.");
            return;
        }
        
        if (newQty <= 0) {
            delete cart[id];
        } else {
            cart[id].quantity = newQty;
        }
        
        updateCartUI();
        refreshProductCardAction(id);
    }
};

function refreshProductCardAction(id) {
    const actionArea = document.getElementById(`action-${id}`);
    if (actionArea) {
        const qty = cart[id] ? cart[id].quantity : 0;
        if (qty > 0) {
            actionArea.innerHTML = renderQtyControls(id, qty);
        } else {
            actionArea.innerHTML = `<button class="add-to-cart-btn" onclick="addToCart(${id})">+</button>`;
        }
    }
}

function updateCartUI() {
    const items = Object.values(cart);
    
    // Update badge count
    const totalCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
    cartBadge.textContent = totalCount;
    
    // Update subtotal
    const subtotal = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    cartSubtotal.textContent = `${subtotal} TL`;
    cartGrandTotal.textContent = `${subtotal} TL`;
    
    // Enable/disable submit button
    submitOrderBtn.disabled = items.length === 0;
}

// Search input
menuSearch.addEventListener('input', () => {
    const query = menuSearch.value.trim();
    if (query.length > 0) {
        // Instantly transition to product list view
        categoryGridView.style.display = 'none';
        productListView.style.display = 'block';
        activeCategoryTitle.textContent = "Arama Sonuçları";
        
        // Highlight TÜMÜ tab
        const tabs = document.querySelectorAll('.category-tab');
        tabs.forEach(tab => {
            const span = tab.querySelector('span');
            const tabText = span ? span.textContent : tab.textContent;
            if (tabText === 'TÜMÜ') {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        renderProducts('TÜMÜ');
    } else {
        // Search cleared, go back to category grid
        showCategoryGrid();
    }
});

// Back to category grid button
backToCategoriesBtn.addEventListener('click', () => {
    showCategoryGrid();
});

// Cart drawer trigger
cartTrigger.addEventListener('click', () => {
    renderCartList();
    cartOverlay.classList.add('open');
});

closeDrawerBtn.addEventListener('click', () => {
    cartOverlay.classList.remove('open');
});

cartOverlay.addEventListener('click', (e) => {
    if (e.target === cartOverlay) {
        cartOverlay.classList.remove('open');
    }
});

function renderCartList() {
    const items = Object.values(cart);
    cartItemsList.innerHTML = "";
    
    if (items.length === 0) {
        cartItemsList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Sepetiniz boş.</div>`;
        return;
    }
    
    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-price-calc">${item.quantity} adet x ${item.price} TL</span>
            </div>
            <div class="quantity-controller">
                <button class="qty-btn qty-btn-minus" onclick="changeQty(${item.id}, -1); renderCartList();">-</button>
                <span class="qty-number">${item.quantity}</span>
                <button class="qty-btn qty-btn-plus" onclick="changeQty(${item.id}, 1); renderCartList();">+</button>
            </div>
            <span class="cart-item-total">${item.price * item.quantity} TL</span>
        `;
        cartItemsList.appendChild(row);
    });
}

// Payment selectors
payOptionCash.addEventListener('click', () => {
    document.querySelector('input[name="paymentMethod"][value="Nakit"]').checked = true;
    payOptionCash.classList.add('active');
    payOptionCard.classList.remove('active');
});
payOptionCard.addEventListener('click', () => {
    document.querySelector('input[name="paymentMethod"][value="Kart"]').checked = true;
    payOptionCard.classList.add('active');
    payOptionCash.classList.remove('active');
});

// Submit Order to backend
submitOrderBtn.addEventListener('click', () => {
    const items = Object.values(cart);
    if (items.length === 0) return;
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const notes = cartNotes.value.trim();
    
    const orderData = {
        name: userProfile.name,
        phone: userProfile.phone,
        deliveryType: userProfile.deliveryType,
        location: userProfile.location,
        items: items.map(i => ({ id: i.id, quantity: i.quantity })),
        paymentMethod: paymentMethod,
        notes: notes
    };
    
    submitOrderBtn.disabled = true;
    submitOrderBtn.textContent = "Gönderiliyor...";
    
    fetch('api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
    .then(res => res.json())
    .then(data => {
        submitOrderBtn.disabled = false;
        submitOrderBtn.textContent = "Siparişi Tamamla";
        
        if (data.success) {
            // Setup Success Screen
            summaryOrderNo.textContent = data.orderNo;
            summaryTotal.textContent = `${data.totalPrice} TL`;
            summaryPayment.textContent = paymentMethod === "Nakit" ? "Nakit" : "Kapıda POS";
            
            // Start tracking order status
            startOrderTracking(data.orderNo);
            
            // Show Success Overlay
            successOverlay.classList.add('open');
            cartOverlay.classList.remove('open');
            
            // Clear cart
            cart = {};
            updateCartUI();
            cartNotes.value = "";
            cartNotesCount.textContent = "0 / 200";
        } else {
            alert(data.message || "Sipariş gönderilirken hata oluştu.");
        }
    })
    .catch(err => {
        submitOrderBtn.disabled = false;
        submitOrderBtn.textContent = "Siparişi Tamamla";
        console.error("Order submit error:", err);
        alert("Bağlantı hatası. Lütfen internetinizi kontrol edin.");
    });
});

newOrderBtn.addEventListener('click', () => {
    successOverlay.classList.remove('open');
    renderProducts(); // refresh menu item counts
});

// Initialize on page load
initDropdowns();
loadSavedProfile();
parseUrlParams();
initActiveOrderTracking();

// Order Tracking System
let activeOrderPollingInterval = null;
const activeOrderBanner = document.getElementById('activeOrderBanner');
const bannerStatusText = document.getElementById('bannerStatusText');
const bannerTrackBtn = document.getElementById('bannerTrackBtn');

const stepsList = ["Alındı", "Onaylandı", "Hazır", "Yola Çıktı", "Teslim Edildi"];

function startOrderTracking(orderNo) {
    if (!orderNo) return;
    
    // Save to local storage as active order
    localStorage.setItem('artur_active_order', orderNo);
    
    // Initial fetch
    checkActiveOrderStatus(orderNo);
    
    // Set up polling interval (every 10 seconds)
    if (activeOrderPollingInterval) clearInterval(activeOrderPollingInterval);
    activeOrderPollingInterval = setInterval(() => {
        checkActiveOrderStatus(orderNo);
    }, 10000);
}

function checkActiveOrderStatus(orderNo) {
    fetch(`api/orders/status/${orderNo}`)
        .then(res => {
            if (!res.ok) {
                throw new Error("Order not found or deleted");
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                // If order is closed/archived, stop tracking
                if (data.closed) {
                    stopOrderTracking();
                    return;
                }
                
                // Update tracker UI inside success modal
                updateTrackerUI(data.status);
                
                // Update floating banner UI
                if (bannerStatusText) bannerStatusText.textContent = `Durum: ${data.status}`;
                if (activeOrderBanner) activeOrderBanner.style.display = 'flex';
            }
        })
        .catch(err => {
            console.warn("Order tracking error:", err);
            // Hide tracking if order doesn't exist
            stopOrderTracking();
        });
}

function stopOrderTracking() {
    if (activeOrderPollingInterval) {
        clearInterval(activeOrderPollingInterval);
        activeOrderPollingInterval = null;
    }
    localStorage.removeItem('artur_active_order');
    if (activeOrderBanner) activeOrderBanner.style.display = 'none';
}

function updateTrackerUI(status) {
    const activeIdx = stepsList.indexOf(status);
    if (activeIdx === -1) return;
    
    // Update progress line width
    const trackerProgressLine = document.getElementById('trackerProgressLine');
    if (trackerProgressLine) {
        const percent = (activeIdx / (stepsList.length - 1)) * 100;
        trackerProgressLine.style.width = `${percent}%`;
    }
    
    stepsList.forEach((step, idx) => {
        const stepKey = normalizeCategoryKey(step); // alindi, onaylandi, hazir, yolacikti, teslimedildi
        const stepEl = document.getElementById(`step-${stepKey}`);
        if (!stepEl) return;
        
        const dot = stepEl.querySelector('.step-dot');
        
        if (idx < activeIdx) {
            stepEl.className = "tracker-step completed";
            if (dot) dot.textContent = "✓";
        } else if (idx === activeIdx) {
            stepEl.className = "tracker-step active";
            if (dot) dot.textContent = idx + 1;
        } else {
            stepEl.className = "tracker-step";
            if (dot) dot.textContent = idx + 1;
        }
    });
    
    // Update text description based on status
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        if (status === "Alındı") {
            successMessage.textContent = "Siparişiniz kafeye ulaştı, onay bekleniyor.";
        } else if (status === "Onaylandı") {
            successMessage.textContent = "Siparişiniz onaylandı, hazırlanıyor.";
        } else if (status === "Hazır") {
            successMessage.textContent = "Siparişiniz hazırlandı, teslimat bekliyor.";
        } else if (status === "Yola Çıktı") {
            successMessage.textContent = "Kuryemiz yola çıktı, geliyor!";
        } else if (status === "Teslim Edildi") {
            successMessage.textContent = "Siparişiniz başarıyla teslim edildi. Afiyet olsun!";
        }
    }
}

function initActiveOrderTracking() {
    const activeOrderNo = localStorage.getItem('artur_active_order');
    if (activeOrderNo) {
        startOrderTracking(activeOrderNo);
    }
}

// Banner click to open tracking modal
if (bannerTrackBtn) {
    bannerTrackBtn.addEventListener('click', () => {
        const activeOrderNo = localStorage.getItem('artur_active_order');
        if (activeOrderNo) {
            // Fetch status once immediately to populate summary
            fetch(`api/orders/status/${activeOrderNo}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        summaryOrderNo.textContent = data.orderNo;
                        summaryTotal.textContent = `${data.totalPrice} TL`;
                        summaryPayment.textContent = data.paymentMethod === "Nakit" ? "Nakit" : "Kapıda POS";
                        
                        updateTrackerUI(data.status);
                        successOverlay.classList.add('open');
                    }
                });
        }
    });
}

// Local file protocol warning for CORS / local file restrictions
if (window.location.protocol === 'file:') {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = "background-color: var(--danger); color: white; padding: 12px; text-align: center; font-size: 13px; font-weight: 600; position: sticky; top: 0; z-index: 1000; box-shadow: 0 4px 10px rgba(0,0,0,0.3);";
    warningDiv.innerHTML = "⚠️ Uygulama yerel dosya (file://) olarak açılmıştır. Tarayıcı güvenlik sınırlandırmaları nedeniyle görseller yüklenemez. Görselleri görebilmek için lütfen tarayıcınızın adres çubuğuna <strong><a href='http://localhost:3000' style='color: white; text-decoration: underline;'>http://localhost:3000</a></strong> yazarak giriş yapın.";
    document.body.insertBefore(warningDiv, document.body.firstChild);
}
