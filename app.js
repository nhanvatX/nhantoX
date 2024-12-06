const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const crypto = require('crypto');
const secretKey = '1234567890abcdef1234567890abcdef'; 
const iv = crypto.randomBytes(16);

const encrypt = (text) => {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { iv: iv.toString('hex'), encryptedData: encrypted };
};

const decrypt = (encryptedData, iv) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};


const sessionMap = new Map(); // Lưu token -> thông tin người dùng

const generateToken = () => {
  return crypto.randomBytes(16).toString('hex'); // Tạo token 32 ký tự
};


const app = express();
const PORT = 3000;

// Middleware
app.use(cookieParser());
app.use(express.static('assets')); // Phục vụ tài nguyên tĩnh

app.use(express.static(path.join(__dirname, '/views')));
app.use(bodyParser.urlencoded({ extended: false }));

// Dummy user data
const validEmail = 'doalacthiensu@highest.atomic';
const validPassword = 'anminhtrongbongdem';
const userName = 'Nhân vật phụ';

// Middleware kiểm tra cookie
const checkAuth = (req, res, next) => {
  const token = req.cookies.authToken;

  if (sessionMap.has(token) == true) {
        // Kiểm tra xem token có hết hạn không
      if (token.expiresAt < Date.now()) {
        // Nếu token hết hạn, xóa token và gửi thông báo lỗi
        sessionMap.delete(token);
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
      }
    req.user = sessionMap.get(token); // Gán thông tin người dùng từ Map
  } else {
    req.user = null;
  }
  next();
};



const modifySignInButton = (html, req) => {
  const user = req.user;
  if (user) {
    // Thay đổi nút Sign In thành Welcome + tên và nút Log Out
    return html.replace(
      `<li id="SignIn"><a href="/signin">Sign In</a></li>`,
      `<li id="SignIn">Welcome, ${user.name}</li>
       <li><a href="/logout">Log Out</a></li>`
    );
  } else {
    // Giữ nguyên nếu chưa đăng nhập
    return html;
  }
};

app.get('/home', checkAuth, (req, res) => {
  fs.readFile(path.join(__dirname, 'views', 'index.html'), 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error loading the page.');
    const html = modifySignInButton(data, req);
    res.send(html);
  });
});


app.get('/shop', checkAuth, (req, res) => {
  fs.readFile(path.join(__dirname, 'views', 'shop.html'), 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error loading the page.');
    const html = modifySignInButton(data, req);
    res.send(html);
  });
});

app.get('/product-details', checkAuth, (req, res) => {
  fs.readFile(path.join(__dirname, 'views', 'product-details.html'), 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error loading the page.');
    const html = modifySignInButton(data, req);
    res.send(html);
  });
});

app.get('/contact', checkAuth, (req, res) => {
  fs.readFile(path.join(__dirname, 'views', 'contact.html'), 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error loading the page.');
    const html = modifySignInButton(data, req);
    res.send(html);
  });
});


app.get('/signin', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Kiểm tra thông tin đăng nhập
  if (email === validEmail && password === validPassword) {
    const user = { name: userName, email }; // Thông tin người dùng

    const token = generateToken(); // Tạo token ngẫu nhiên
    sessionMap.set(token, user); // Lưu token và thông tin vào Map

    res.cookie('authToken', token, { httpOnly: true, maxAge: 3600000 }); // Lưu cookie 1 giờ
    res.redirect('/home'); // Quay về trang chủ
  } else {
    res.status(401).send('Invalid credentials'); // Đăng nhập thất bại
  }
});


app.get('/logout', (req, res) => {
  const token = req.cookies.authToken;

  if (sessionMap.has(token)) {
    sessionMap.delete(token); // Xóa token khỏi Map
  }
  
  res.clearCookie('authToken'); // Xóa cookie khỏi trình duyệt
  res.redirect('/home'); // Quay về trang chủ
});


// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/home`);
});
