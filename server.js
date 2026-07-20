const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Serve static files with Cache-Control headers
const staticOptions = {
  setHeaders: (res, filepath) => {
    const ext = path.extname(filepath).toLowerCase();
    if (ext === '.html' || ext === '.js' || ext === '.css') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/admin', express.static(path.join(__dirname, 'admin'), staticOptions));

// File paths
const DB_PATH = path.join(__dirname, 'data', 'database.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Multer config for Excel uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, 'menu_upload.xlsx');
  }
});
const upload = multer({ storage });

// Database helper functions
const DEFAULT_VENUES = [
  "Havuzbaşı",
  "Disko önü",
  "Tilki",
  "Fener",
  "Beyaz Fırın",
  "Manzara çevre yolu",
  "Yönetim önü",
  "Martı sahil",
  "Gemi yatağı sahil",
  "Güvercin sahil",
  "Halil büfe",
  "Güvercin Market",
  "Gemi Yatağı market"
];

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const db = JSON.parse(data);
      if (!db.venues) {
        db.venues = DEFAULT_VENUES;
      }
      return db;
    }
  } catch (err) {
    console.error("Error reading database:", err);
  }
  return { menu: [], orders: [], venues: DEFAULT_VENUES, settings: { orderCounter: 0, lastCounterDate: "" } };
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// SSE Clients for real-time notifications
let sseClients = [];

function sendSSEEvent(type, data) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Admin Password (from prompt - user uses 987654)
const ADMIN_PASSWORD = "987654";

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

// SSE Endpoint for Live Orders
app.get('/api/live-orders', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// Admin Authentication Check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: "admin-authenticated-token-987654" });
  } else {
    res.status(401).json({ success: false, message: "Geçersiz şifre" });
  }
});

// Get Venues list
app.get('/api/venues', (req, res) => {
  const db = readDB();
  res.json(db.venues || DEFAULT_VENUES);
});

// Update Venues list (Admin authorization check)
app.post('/api/admin/venues', (req, res) => {
  const token = req.headers.authorization;
  if (token !== "admin-authenticated-token-987654") {
    return res.status(401).json({ success: false, message: "Yetkisiz erişim" });
  }

  const { venues } = req.body;
  if (!venues || !Array.isArray(venues)) {
    return res.status(400).json({ success: false, message: "Geçersiz veri formatı" });
  }

  const db = readDB();
  db.venues = venues.map(v => v.trim()).filter(Boolean);
  writeDB(db);

  res.json({ success: true, venues: db.venues });
});

// Get Menu Items
app.get('/api/menu', (req, res) => {
  const db = readDB();
  res.json(db.menu);
});

// Update Menu Item (manually from admin UI)
app.post('/api/menu/update', (req, res) => {
  const { id, price, image, active, name, category } = req.body;
  const db = readDB();
  const index = db.menu.findIndex(item => item.id === parseInt(id));
  if (index !== -1) {
    if (price !== undefined) db.menu[index].price = parseFloat(price);
    if (image !== undefined) db.menu[index].image = image;
    if (active !== undefined) db.menu[index].active = !!active;
    if (name !== undefined) db.menu[index].name = name;
    if (category !== undefined) db.menu[index].category = category;
    
    writeDB(db);
    res.json({ success: true, item: db.menu[index] });
  } else {
    res.status(404).json({ success: false, message: "Ürün bulunamadı" });
  }
});

// Add New Menu Item Manually
app.post('/api/menu/add', (req, res) => {
  const { name, category, price, image } = req.body;
  if (!name || !category || price === undefined) {
    return res.status(400).json({ success: false, message: "Eksik bilgi" });
  }
  const db = readDB();
  const newId = db.menu.length > 0 ? Math.max(...db.menu.map(i => i.id)) + 1 : 1;
  const newItem = {
    id: newId,
    category: category.trim(),
    name: name.trim(),
    price: parseFloat(price),
    image: image ? image.trim() : "",
    active: true
  };
  db.menu.push(newItem);
  writeDB(db);
  res.json({ success: true, item: newItem });
});

// Get Orders (last 30 orders including closed ones)
app.get('/api/orders', (req, res) => {
  const db = readDB();
  // Sort: newest first
  const sortedOrders = [...db.orders].sort((a, b) => b.timestamp - a.timestamp);
  res.json(sortedOrders.slice(0, 30));
});

// Submit New Order
app.post('/api/orders', (req, res) => {
  const { name, phone, deliveryType, location, items, paymentMethod, notes } = req.body;

  if (!name || !phone || !deliveryType || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Lütfen gerekli tüm alanları doldurun." });
  }

  // Cart item checks (Max 10 distinct items, max 5 quantity per item)
  if (items.length > 10) {
    return res.status(400).json({ success: false, message: "En fazla 10 farklı ürün sipariş edebilirsiniz." });
  }
  for (const item of items) {
    if (item.quantity > 5) {
      return res.status(400).json({ success: false, message: "Bir üründen en fazla 5 adet sipariş edebilirsiniz." });
    }
  }

  const db = readDB();

  // Generate Daily Sequential Order Number (YYAAGG9999)
  const now = new Date();
  
  // Format as YYAAGG in Local Time
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yy}${mm}${dd}`;

  let counter = 1;
  if (db.settings.lastCounterDate === todayStr) {
    db.settings.orderCounter += 1;
    counter = db.settings.orderCounter;
  } else {
    db.settings.lastCounterDate = todayStr;
    db.settings.orderCounter = 1;
    counter = 1;
  }

  const orderNo = `${todayStr}${String(counter).padStart(4, '0')}`;

  // Calculate total price based on menu prices to ensure integrity
  let totalPrice = 0;
  const orderItems = [];

  for (const cartItem of items) {
    const menuItem = db.menu.find(m => m.id === cartItem.id);
    if (menuItem) {
      const price = menuItem.price;
      totalPrice += price * cartItem.quantity;
      orderItems.push({
        id: menuItem.id,
        name: menuItem.name,
        category: menuItem.category,
        price: price,
        quantity: cartItem.quantity
      });
    }
  }

  const orderTime = Date.now();
  const newOrder = {
    orderNo: orderNo,
    name: name.trim(),
    phone: phone.trim(),
    deliveryType: deliveryType, // "Adrese teslim" | "Gel Al"
    location: deliveryType === "Gel Al" ? null : location, // { type: "Koylar"|"Mekanlar"|"Diğer", value: "Fener" | { koy: "Martı", ada: 12, parsel: 3 } | "Description text" }
    items: orderItems,
    totalPrice: totalPrice,
    paymentMethod: paymentMethod, // "Nakit" | "Kart"
    notes: notes ? notes.trim().slice(0, 200) : "",
    status: "Alındı", // Status: "Alındı" | "Onaylandı" | "Hazır" | "Yola Çıktı" | "Teslim Edildi"
    closed: false,
    timestamp: orderTime,
    statusHistory: {
      "Alındı": orderTime
    }
  };

  db.orders.push(newOrder);
  writeDB(db);

  // Broadcast to Admin SSE
  sendSSEEvent("NEW_ORDER", newOrder);

  res.json({
    success: true,
    message: "Siparişiniz alınmıştır, yarım saat içinde teslim edilecektir.",
    orderNo: orderNo,
    totalPrice: totalPrice
  });
});

// Update Order Status (or close it)
app.post('/api/orders/update-status', (req, res) => {
  const { orderNo, status, closed } = req.body;
  const db = readDB();
  const index = db.orders.findIndex(o => o.orderNo === orderNo);
  if (index !== -1) {
    if (status !== undefined) {
      db.orders[index].status = status;
      if (!db.orders[index].statusHistory) {
        db.orders[index].statusHistory = {
          "Alındı": db.orders[index].timestamp
        };
      }
      db.orders[index].statusHistory[status] = Date.now();
    }
    if (closed !== undefined) db.orders[index].closed = !!closed;
    
    writeDB(db);
    
    // Broadcast status update
    sendSSEEvent("ORDER_UPDATED", db.orders[index]);
    
    res.json({ success: true, order: db.orders[index] });
  } else {
    res.status(404).json({ success: false, message: "Sipariş bulunamadı" });
  }
});

// Get Single Order Status
app.get('/api/orders/status/:orderNo', (req, res) => {
  const { orderNo } = req.params;
  const db = readDB();
  const order = db.orders.find(o => o.orderNo === orderNo);
  if (order) {
    res.json({
      success: true,
      orderNo: order.orderNo,
      status: order.status,
      closed: order.closed,
      deliveryType: order.deliveryType,
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      items: order.items,
      statusHistory: order.statusHistory || { "Alındı": order.timestamp }
    });
  } else {
    res.status(404).json({ success: false, message: "Sipariş bulunamadı" });
  }
});

// Get Order History by Phone Number
app.get('/api/orders/history', (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ success: false, message: "Telefon numarası eksik" });
  }
  const cleanPhone = phone.replace(/\s+/g, '').trim();
  const db = readDB();
  
  const history = db.orders
    .filter(o => o.phone.replace(/\s+/g, '').trim() === cleanPhone)
    .map(o => ({
      orderNo: o.orderNo,
      timestamp: o.timestamp,
      items: o.items,
      totalPrice: o.totalPrice,
      paymentMethod: o.paymentMethod,
      deliveryType: o.deliveryType,
      status: o.status,
      closed: o.closed,
      statusHistory: o.statusHistory || { "Alındı": o.timestamp }
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
    
  res.json(history);
});



// Upload Excel Menu (Merge to preserve images)
app.post('/api/menu/upload', upload.single('excel'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Dosya yüklenemedi." });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Excel dosyası boş veya hatalı." });
    }

    // Inspect headers
    const sampleRow = rows[0];
    const keys = Object.keys(sampleRow);
    
    // Find column names dynamically
    const catKey = keys.find(k => k.toLowerCase().includes('kategori') || k.toLowerCase().includes('category'));
    const nameKey = keys.find(k => k.toLowerCase().includes('ad') || k.toLowerCase().includes('name'));
    const priceKey = keys.find(k => k.toLowerCase().includes('fiyat') || k.toLowerCase().includes('price') || k.toLowerCase().includes('tutar'));
    const imgKey = keys.find(k => k.toLowerCase().includes('resim') || k.toLowerCase().includes('image') || k.toLowerCase().includes('görsel'));

    if (!catKey || !nameKey || !priceKey) {
      return res.status(400).json({ 
        success: false, 
        message: "Excel sütunları bulunamadı. Lütfen 'Kategori', 'Ürün Adı' ve 'Ürün Fiyatı' başlıklarını içerdiğinden emin olun." 
      });
    }

    const db = readDB();
    const existingMenuMap = new Map();
    db.menu.forEach(item => {
      existingMenuMap.set(item.name.toLowerCase().trim(), item);
    });

    const newMenu = [];
    let item_id = 1;

    rows.forEach(row => {
      const cat = String(row[catKey] || '').trim();
      const name = String(row[nameKey] || '').trim();
      const price = parseFloat(row[priceKey] || 0);
      const fileImg = imgKey ? String(row[imgKey] || '').trim() : '';

      if (name && cat) {
        // Retrieve existing item if matches by name, to preserve image URL
        const existingItem = existingMenuMap.get(name.toLowerCase());
        let finalImage = "";
        
        if (fileImg && fileImg.startsWith("http")) {
          finalImage = fileImg;
        } else if (existingItem && existingItem.image) {
          finalImage = existingItem.image;
        }

        newMenu.push({
          id: item_id++,
          category: cat,
          name: name,
          price: price,
          image: finalImage,
          active: existingItem ? existingItem.active : true
        });
      }
    });

    db.menu = newMenu;
    writeDB(db);

    // Remove uploaded temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: `Menü başarıyla güncellendi. ${newMenu.length} adet ürün yüklendi.` });
  } catch (err) {
    console.error("Excel processing error:", err);
    res.status(500).json({ success: false, message: "Excel dosyası işlenirken hata oluştu: " + err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
