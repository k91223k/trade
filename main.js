/* -----------------------------
    後端 API 位置
------------------------------ */
const API_BASE = "http://localhost:3000"; 


/* -----------------------------
    1. 使用者登入狀態（前端 localStorage）
------------------------------ */

function getUser() {
    return localStorage.getItem("loginUser");
}
function setUser(email) {
    localStorage.setItem("loginUser", email);
}
function logout() {
    localStorage.removeItem("loginUser");
    location.reload();
}
function updateUserArea() {
    const userInfo = document.getElementById("userInfo");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginLink = document.getElementById("loginLink"); 
    const registerLink = document.getElementById("registerLink"); 
    const user = getUser();
    if (!user) {
        if (userInfo) userInfo.textContent = "";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (loginLink) loginLink.style.display = "inline-block"; 
        if (registerLink) registerLink.style.display = "inline-block"; 
    } else {
        if (userInfo) userInfo.textContent = "Hi, " + user;
        if (logoutBtn) {
            logoutBtn.style.display = "inline-block";
            logoutBtn.onclick = logout; 
        }
        if (loginLink) loginLink.style.display = "none"; 
        if (registerLink) registerLink.style.display = "none"; 
    }
}
document.addEventListener("DOMContentLoaded", updateUserArea);


/* -----------------------------
    2. 登入 login.html (含 Email 驗證檢查)
------------------------------ */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const pwd = document.getElementById("pwd").value;
        const loginError = document.getElementById("loginError");
        loginError.textContent = "";
        if (!email || !pwd) {
            loginError.textContent = "請輸入完整的 Email 和密碼。";
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(pwd)}`);
            if (!res.ok) { throw new Error("伺服器連線失敗。"); }
            const users = await res.json();
            if (users && users.length > 0) { 
                const user = users[0];
                if (user.verified !== true) {
                    loginError.textContent = "您的帳號尚未通過 Email 驗證！"; 
                    return;
                }
                setUser(email);
                alert("登入成功！");
                location.href = "index.html";
            } else {
                loginError.textContent = "帳號或密碼錯誤！"; 
            }
        } catch (err) {
            console.error("登入請求失敗", err);
            loginError.textContent = err.message || "登入過程中發生錯誤，請檢查後端是否運行。";
        }
    });
}


/* -----------------------------
    3. 註冊 register.html (含 Email 重複檢查)
------------------------------ */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const pwd = document.getElementById("pwd").value;
        const pwdConfirm = document.getElementById("pwdConfirm").value;
        const registerError = document.getElementById("registerError");
        registerError.textContent = "";
        if (pwd !== pwdConfirm) {
            registerError.textContent = "兩次輸入的密碼不一致！";
            return;
        }
        try {
            const checkRes = await fetch(`${API_BASE}/users?email=${encodeURIComponent(email)}`);
            const existingUsers = await checkRes.json();
            if (existingUsers && existingUsers.length > 0) {
                registerError.textContent = "此電子郵件已被註冊，請直接登入或使用其他信箱。";
                return;
            }
            const newUser = { email: email, password: pwd, verified: false };
            const postRes = await fetch(`${API_BASE}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser)
            });
            if (postRes.ok) {
                alert("註冊成功！(需 Email 驗證)。請前往登入頁面。");
                location.href = "login.html";
            } else {
                const errorResult = await postRes.json();
                registerError.textContent = "註冊失敗： " + (errorResult.message || '伺服器錯誤');
            }
        } catch (err) {
            console.error("註冊請求失敗", err);
            registerError.textContent = err.message || "註冊過程中發生錯誤，請檢查後端是否運行。";
        }
    });
}


/* -----------------------------
    4. 刊登商品 post.html (POST 請求)
------------------------------ */
const postForm = document.getElementById("postForm");
if (postForm) {
    if (!getUser()) {
        alert('請先登入才能刊登商品！');
        location.href = 'login.html'; 
    } else {
        postForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const title = document.getElementById("title")?.value;
            const price = document.getElementById("price")?.value;
            const desc = document.getElementById("desc")?.value;
            const imgUrl = document.getElementById("imgUrl")?.value; 

            if (!imgUrl || !title || !price || !desc) {
                alert('請填寫所有商品資訊！');
                return;
            }
            
            // 刊登時新增一個時間戳，用於排序
            const newProduct = { 
                title, 
                price, 
                desc, 
                img: imgUrl, 
                seller: getUser(),
                // 【新增】記錄刊登時間，用於「最新上架」排序
                timestamp: Date.now() 
            };

            try {
                const res = await fetch(`${API_BASE}/products`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newProduct)
                });

                const result = await res.json();

                if (res.ok) {
                    alert("商品刊登成功！");
                    location.href = "index.html";
                } else {
                    alert("刊登失敗： " + (result.message || `伺服器錯誤碼: ${res.status}`));
                }
            } catch (error) {
                console.error("POST 請求失敗:", error);
                alert("刊登失敗：無法連接到伺服器 (json-server 是否運行？)");
            }
        });
    }
}


/* -----------------------------
    5. 商品列表 index.html (GET 請求與排序/篩選功能)
------------------------------ */

// 僅用於獲取所有商品數據
async function loadProducts() { 
    let url = `${API_BASE}/products`;
    try {
        const res = await fetch(url);
        if (!res.ok) { throw new Error(`HTTP 錯誤: ${res.status}`); }
        return await res.json();
    } catch (err) {
        console.error("讀取商品失敗", err);
        return [];
    }
}

// 獲取目前的關鍵字和排序方式，並調用 renderProducts
function getCurrentFiltersAndRender() {
    const keyword = document.getElementById("searchInput")?.value.trim() || "";
    const sortBy = document.getElementById("sortSelect")?.value || "default";
    renderProducts(keyword, sortBy);
}


// 處理搜尋按鈕點擊事件
function handleSearch() {
    getCurrentFiltersAndRender();
}

// 【新增】處理排序下拉選單變更事件
function handleSort() {
    getCurrentFiltersAndRender();
}


// 執行前端篩選、排序並渲染列表
async function renderProducts(keyword = "", sortBy = "default") {
    const list = document.getElementById("product-list");
    if (!list) return;

    // 1. 獲取所有商品
    const allProducts = await loadProducts(); 
    list.innerHTML = "";
    
    // 2. 篩選邏輯 (根據關鍵字)
    const trimmedKeyword = keyword.toLowerCase();
    
    const filteredProducts = trimmedKeyword
        ? allProducts.filter(p => 
            String(p.title).toLowerCase().includes(trimmedKeyword)
          )
        : allProducts; 

    
    // 3. 【新增】排序邏輯 (根據 sortBy 參數)
    filteredProducts.sort((a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        
        switch (sortBy) {
            case 'price-asc': // 價格低到高
                return priceA - priceB;
            case 'price-desc': // 價格高到低
                return priceB - priceA;
            case 'default': // 最新上架 (timestamp 大的在前)
            default:
                // 檢查是否有 timestamp 欄位，沒有則用 ID 倒序
                const timeA = a.timestamp || 0; 
                const timeB = b.timestamp || 0; 
                if (timeA && timeB) {
                     return timeB - timeA;
                }
                // 兼容舊數據（如果沒有 timestamp，則用 ID 倒序）
                return String(b.id).localeCompare(String(a.id)); 
        }
    });

    
    // 4. 渲染結果
    if (filteredProducts.length === 0 && trimmedKeyword) {
        list.innerHTML = `<p>找不到符合關鍵字 "${keyword}" 的商品。</p>`;
        return;
    } else if (filteredProducts.length === 0) {
        list.innerHTML = `<p>目前沒有任何商品上架。</p>`;
        return;
    }

    filteredProducts.forEach(p => {
        const item = document.createElement("div");
        item.className = "product";
        
        const productId = String(p.id).trim(); 

        if (productId) { 
            item.innerHTML = `
                <img src="${p.img}" class="p-img"/>
                <h3>${p.title}</h3>
                <p>NT$ ${p.price}</p>
                <button onclick="openDetail('${productId}')">查看商品</button> 
            `;
            list.appendChild(item);
        } else {
            console.warn("跳過 ID 無效的商品:", p);
        }
    });
}
// 頁面載入時執行
renderProducts(); 


/* -----------------------------
/* -----------------------------
    6. 商品詳情 product.html (GET 請求與刪除/聯絡)
------------------------------ */

// 開啟商品詳細頁，傳遞字串 ID
function openDetail(id) {
    location.href = `product.html?id=${id}`; 
}

async function loadDetailPage() {
    const box = document.getElementById("detail");
    if (!box) return;

    const params = new URLSearchParams(location.search);
    const id = params.get("id"); 

    if (!id) {
        box.innerHTML = "<h2>商品 ID 無效</h2>";
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/products/${id}`); 

        if (!res.ok) {
            box.innerHTML = "<h2>商品不存在</h2>";
            return;
        }
        
        const p = await res.json();
        const currentUser = getUser();
        const isOwner = p.seller === currentUser;

        // 賣家 Email，用於聯絡
        const sellerEmail = p.seller || 'N/A';
        const subject = `詢問商品: ${p.title} (ID: ${p.id})`;

        // 聯絡按鈕 HTML，使用 mailto 協定
        const contactButton = `
            <a href="mailto:${sellerEmail}?subject=${encodeURIComponent(subject)}" class="contact-btn">
                聯絡賣家：${sellerEmail}
            </a>
        `;
        
        // 刪除按鈕 HTML (只對刊登者顯示)
        const deleteButton = isOwner ? 
            `<button class="delete-btn" onclick="deleteProduct('${p.id}')">
                刪除此商品
            </button>` 
            : '';

        // 渲染詳細資訊 (與 CSS 配合實現雙欄佈局)
        box.innerHTML = `
            <img src="${p.img}" class="detail-img"/>
            
            <div class="product-info">
                <h2>${p.title}</h2>
                <p><b>價格：</b>NT$ ${p.price}</p>
                <p><b>描述：</b>${p.desc}</p>
                <p><small>刊登者: ${sellerEmail}</small></p>

                ${!isOwner ? contactButton : ''}

                ${deleteButton}
            </div>
        `;
        
    } catch (err) {
        box.innerHTML = "<h2>讀取商品詳細失敗</h2>";
        console.error(err);
    }
}

// 確保只在 product.html 頁面運行
if (document.getElementById("detail")) {
    loadDetailPage();
}
/* -----------------------------
    7. 刪除商品 (DELETE 請求)
------------------------------ */
async function deleteProduct(id) {
    if (!getUser()) {
        alert("請登入後再進行此操作！");
        return;
    }
    
    if (!confirm("確定刪除？")) return;

    // API 請求使用字串 ID
    const res = await fetch(`${API_BASE}/products/${id}`, {
        method: "DELETE"
    });

    if (res.ok) {
        alert("刪除成功！");
        location.href = "index.html";
    } else {
        alert("刪除失敗，錯誤碼: " + res.status);
    }
}