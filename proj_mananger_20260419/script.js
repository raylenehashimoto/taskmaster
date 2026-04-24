// Firebase配置
const firebaseConfig = { 
   apiKey: "AIzaSyDTXP0Q5sxBRqGpVXXeiYjKq9KdZCcEUnk", 
   authDomain: "project-manager-app-28474.firebaseapp.com", 
   projectId: "project-manager-app-28474", 
   storageBucket: "project-manager-app-28474.firebasestorage.app", 
   messagingSenderId: "1020429574411", 
   appId: "1:1020429574411:web:afd37b6ea2bc40a0e3820e",
   databaseURL: "https://project-manager-app-28474-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// 初始化Firebase
let auth;
let db;
let firebaseInitialized = false;

// 确保Firebase SDK加载后初始化
function initializeFirebase() {
    console.log('尝试初始化Firebase...');
    
    // 检查Firebase SDK是否加载
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK 未加载');
        return false;
    }
    
    // 检查Firebase配置是否存在
    if (!firebaseConfig) {
        console.error('Firebase 配置未定义');
        return false;
    }
    
    // 检查是否已经初始化
    if (firebaseInitialized) {
        console.log('Firebase 已经初始化');
        return true;
    }
    
    try {
        // 检查是否已经有应用实例
        if (firebase.apps.length > 0) {
            console.log('Firebase 应用已经存在，使用现有实例');
            auth = firebase.auth();
            db = firebase.database();
            firebaseInitialized = true;
            return true;
        }
        
        // 初始化Firebase应用
        console.log('初始化新的Firebase应用...');
        console.log('Firebase配置:', firebaseConfig);
        
        firebase.initializeApp(firebaseConfig);
        
        // 获取数据库引用
        db = firebase.database();
        // 获取认证引用
        auth = firebase.auth();
        
        firebaseInitialized = true;
        console.log('Firebase 初始化成功');
        return true;
    } catch (error) {
        console.error('Firebase 初始化失败:', error);
        return false;
    }
}

// 页面加载时初始化
window.addEventListener('load', function() {
    console.log('页面加载完成，调用initializeFirebase...');
    initializeFirebase();
    
    // 监听用户认证状态变化
    if (typeof firebase !== 'undefined') {
        console.log('添加认证状态监听器...');
        firebase.auth().onAuthStateChanged(function(user) {
            console.log('认证状态变化，用户:', user);
            if (user) {
                // 用户已登录
                currentUser = user;
                updateUserInfo();
                console.log('用户已登录，加载数据...');
                loadDataFromFirebase();
            } else {
                // 用户已登出
                currentUser = null;
                updateUserInfo();
                console.log('用户已登出');
            }
        });
    }
    
    // 在DOM加载完成后调用init()函数
    console.log('DOM加载完成，调用init()函数...');
    init();
});

// 全局变量
let cards = [];
let categories = ['工作', '生活', '学习', '其他'];
let completedCards = [];
let recycledCards = [];
let archivedCategories = [];
let currentFilter = 'all';
let currentCardId = null;
let currentItemId = null;
let archivedCollapsed = false;
let currentUser = null;
let currentDate = new Date();
let currentItemDate = new Date();

// 通用存储函数
function saveData(key, data) {
    try {
        // 尝试使用本地存储（兼容本地开发）
        localStorage.setItem(key, JSON.stringify(data));
        
        // 如果用户已登录且Firebase已初始化，同步到Firebase
        if (currentUser && typeof firebase !== 'undefined') {
            const db = firebase.database();
            db.ref('users/' + currentUser.uid + '/' + key).set(data);
        }
    } catch (error) {
        console.error('保存数据失败:', error);
    }
}

// 从Firebase加载数据
function loadDataFromFirebase() {
    if (currentUser && typeof firebase !== 'undefined') {
        const db = firebase.database();
        
        // 加载分类
        db.ref('users/' + currentUser.uid + '/categories').once('value').then((snapshot) => {
            const firebaseCategories = snapshot.val();
            if (firebaseCategories) {
                categories = firebaseCategories;
                localStorage.setItem('categories', JSON.stringify(categories));
                renderCategories();
                renderFilterButtons();
            } else {
                // 如果Firebase中没有分类数据，使用默认分类
                categories = ['工作', '生活', '学习', '其他'];
                localStorage.setItem('categories', JSON.stringify(categories));
                renderCategories();
                renderFilterButtons();
            }
        });
        
        // 加载归档分类
        db.ref('users/' + currentUser.uid + '/archivedCategories').once('value').then((snapshot) => {
            const firebaseArchivedCategories = snapshot.val();
            if (firebaseArchivedCategories) {
                archivedCategories = firebaseArchivedCategories;
                localStorage.setItem('archivedCategories', JSON.stringify(archivedCategories));
            }
        });
        
        // 加载卡片
        db.ref('users/' + currentUser.uid + '/cards').once('value').then((snapshot) => {
            const firebaseCards = snapshot.val();
            if (firebaseCards) {
                cards = firebaseCards;
                localStorage.setItem('cards', JSON.stringify(cards));
                renderCards();
            } else {
                // 如果Firebase中没有卡片数据，使用空数组
                cards = [];
                localStorage.setItem('cards', JSON.stringify(cards));
                renderCards();
            }
        });
        
        // 加载已完成卡片
        db.ref('users/' + currentUser.uid + '/completedCards').once('value').then((snapshot) => {
            const firebaseCompletedCards = snapshot.val();
            if (firebaseCompletedCards) {
                completedCards = firebaseCompletedCards;
                localStorage.setItem('completedCards', JSON.stringify(completedCards));
                renderCompletedCards();
            } else {
                // 如果Firebase中没有已完成卡片数据，使用空数组
                completedCards = [];
                localStorage.setItem('completedCards', JSON.stringify(completedCards));
                renderCompletedCards();
            }
        });
        
        // 加载回收卡片
        db.ref('users/' + currentUser.uid + '/recycledCards').once('value').then((snapshot) => {
            const firebaseRecycledCards = snapshot.val();
            if (firebaseRecycledCards) {
                recycledCards = firebaseRecycledCards;
                localStorage.setItem('recycledCards', JSON.stringify(recycledCards));
            } else {
                // 如果Firebase中没有回收卡片数据，使用空数组
                recycledCards = [];
                localStorage.setItem('recycledCards', JSON.stringify(recycledCards));
            }
        });
    }
}

// 初始化数据
async function initData() {
    try {
        // 尝试从本地存储加载数据（兼容本地开发）
        const localCards = localStorage.getItem('cards');
        const localCategories = localStorage.getItem('categories');
        const localCompletedCards = localStorage.getItem('completedCards');
        const localRecycledCards = localStorage.getItem('recycledCards');
        const localArchivedCategories = localStorage.getItem('archivedCategories');
        const localArchivedCollapsed = localStorage.getItem('archivedCollapsed');
        
        if (localCards) {
            cards = JSON.parse(localCards);
        } else {
            cards = [];
        }
        if (localCategories) {
            categories = JSON.parse(localCategories);
        } else {
            categories = ['工作', '生活', '学习', '其他'];
        }
        if (localCompletedCards) {
            completedCards = JSON.parse(localCompletedCards);
        } else {
            completedCards = [];
        }
        if (localRecycledCards) {
            recycledCards = JSON.parse(localRecycledCards);
        } else {
            recycledCards = [];
        }
        if (localArchivedCategories) {
            archivedCategories = JSON.parse(localArchivedCategories);
        } else {
            archivedCategories = [];
        }
        if (localArchivedCollapsed) {
            archivedCollapsed = JSON.parse(localArchivedCollapsed);
        }
        
        // 清理超过30天的回收卡片
        cleanRecycledCards();
    } catch (error) {
        console.error('加载数据失败:', error);
        // 出错时初始化默认值
        cards = [];
        categories = ['工作', '生活', '学习', '其他'];
        completedCards = [];
        recycledCards = [];
        archivedCategories = [];
    }
}

// 获取拖拽元素的插入位置
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.filter-btn:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 初始化
async function init() {
    console.log('开始执行init()函数');
    console.log('当前URL:', window.location.href);
    console.log('当前hash:', window.location.hash);
    
    try {
        await initData();
        console.log('initData()执行完成');
        
        // 绑定事件（即使其他函数出错，也要确保事件绑定）
        bindEvents();
        console.log('bindEvents()执行完成');
        
        // 尝试渲染其他元素，但即使失败也不影响事件绑定
        try {
            renderCategories();
            console.log('renderCategories()执行完成');
            
            renderFilterButtons();
            console.log('renderFilterButtons()执行完成');
            
            renderCards();
            console.log('renderCards()执行完成');
            
            loadArchivedCollapsedState();
            console.log('loadArchivedCollapsedState()执行完成');
        } catch (renderError) {
            console.error('渲染元素时出错:', renderError);
        }
        
        // 检查URL参数，如果包含#login则自动显示登录弹窗
        console.log('检查URL hash:', window.location.hash);
        if (window.location.hash === '#login') {
            console.log('发现#login hash，显示登录弹窗');
            showLoginModal();
        } else {
            console.log('没有发现#login hash');
        }
    } catch (error) {
        console.error('init()函数执行出错:', error);
        // 即使初始化数据出错，也要尝试绑定事件
        try {
            bindEvents();
            console.log('bindEvents()执行完成（错误后）');
        } catch (bindError) {
            console.error('绑定事件时出错:', bindError);
        }
    }
    
    // 检查登录状态和当前页面（延迟执行，确保 Firebase 认证状态已恢复）
    setTimeout(checkLoginStatus, 100);

    // 检查 URL 哈希并显示登录弹窗（如果哈希是 #login）
    if (window.location.hash === '#login') {
        showLoginModal();
    }

    // 监听 URL 哈希变化，当哈希变为 #login 时显示登录弹窗
    window.addEventListener('hashchange', function() {
        if (window.location.hash === '#login') {
            showLoginModal();
        }
    });
}

// 检查登录状态和当前页面
function checkLoginStatus() {
    // 获取当前页面的路径
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('index.html') || currentPath === '/' || currentPath === '';
    const isDashboardPage = currentPath.includes('dashboard.html');

    console.log('检查登录状态，当前页面:', isLoginPage ? 'index.html (登录页)' : isDashboardPage ? 'dashboard.html (工作台)' : '其他');
    console.log('currentUser:', currentUser);

    // 检查用户是否登录
    if (currentUser) {
        // 用户已登录
        console.log('用户已登录，currentUser:', currentUser.email);
        if (isLoginPage) {
            // 如果在登录页且已登录，跳转到工作台
            console.log('在登录页且已登录，跳转到工作台');
            window.location.href = 'dashboard.html';
        }
    } else {
        // 尝试通过 Firebase 检查登录状态
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const auth = firebase.auth();
            console.log('Firebase auth 实例:', auth);
            console.log('Firebase currentUser:', auth.currentUser);

            if (auth.currentUser) {
                // Firebase 认证状态显示用户已登录
                console.log('Firebase 认证状态显示用户已登录:', auth.currentUser.email);
                currentUser = auth.currentUser;
                if (isLoginPage) {
                    // 如果在登录页且已登录，跳转到工作台
                    console.log('在登录页且已登录，跳转到工作台');
                    window.location.href = 'dashboard.html';
                }
                return;
            } else {
                // 监听 Firebase 认证状态变化
                auth.onAuthStateChanged(function(user) {
                    if (user) {
                        // 用户已登录
                        console.log('Firebase 认证状态变化：用户已登录:', user.email);
                        currentUser = user;
                        if (isLoginPage) {
                            // 如果在登录页且已登录，跳转到工作台
                            console.log('在登录页且已登录，跳转到工作台');
                            window.location.href = 'dashboard.html';
                        }
                    } else {
                        // 用户未登录
                        console.log('Firebase 认证状态变化：用户未登录');
                        if (isDashboardPage) {
                            // 如果在工作台页且未登录，跳转到登录页
                            console.log('在工作台页且未登录，跳转到登录页');
                            window.location.href = 'index.html';
                        }
                    }
                });

                // 给 Firebase 一点时间来加载认证状态
                console.log('等待 Firebase 认证状态加载...');
                return;
            }
        }

        // 用户未登录
        console.log('用户未登录');
        if (isDashboardPage) {
            // 如果在工作台页且未登录，跳转到登录页
            console.log('在工作台页且未登录，跳转到登录页');
            window.location.href = 'index.html';
        }
    }
}

console.log('init()函数执行完成');

// 清理超过30天的回收卡片
function cleanRecycledCards() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    recycledCards = recycledCards.filter(card => {
        const deletedAt = new Date(card.deletedAt);
        return deletedAt > thirtyDaysAgo;
    });
    
    saveData('recycledCards', recycledCards);
}

// 渲染日历
function renderCalendar() {
    const calendarPopup = document.getElementById('calendar-popup');
    const calendarTitle = calendarPopup.querySelector('.calendar-title');
    const calendarDays = calendarPopup.querySelector('.calendar-days');
    const dueDateInput = document.getElementById('detail-checklist-due-date');
    
    if (!calendarTitle || !calendarDays || !dueDateInput) return;
    
    // 设置月份和年份标题
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    calendarTitle.textContent = `${year}年 ${monthNames[month]}`;
    
    // 清空日历天数
    calendarDays.innerHTML = '';
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 获取当月第一天是星期几（0-6，0表示星期日）
    let startDay = firstDay.getDay();
    // 调整为从周一开始（1-7，1表示星期一）
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    // 获取当月的天数
    const daysInMonth = lastDay.getDate();
    
    // 填充前导空白
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDay);
    }
    
    // 填充当月天数
    for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = i;
        
        // 标记今天
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        // 标记选中的日期
        const selectedDate = dueDateInput.value;
        if (selectedDate) {
            const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
            if (i === selectedDay && month === selectedMonth - 1 && year === selectedYear) {
                dayElement.classList.add('selected');
            }
        }
        
        // 添加点击事件
        dayElement.addEventListener('click', function() {
            const selectedDate = new Date(year, month, i);
            const formattedDate = selectedDate.toISOString().slice(0, 10);
            dueDateInput.value = formattedDate;
            calendarPopup.style.display = 'none';
        });
        
        calendarDays.appendChild(dayElement);
    }
}

// 渲染清单项目详情弹窗中的日历
function renderItemCalendar() {
    const calendarPopup = document.getElementById('item-calendar-popup');
    const calendarTitle = calendarPopup.querySelector('.calendar-title');
    const calendarDays = calendarPopup.querySelector('.calendar-days');
    const dueDateInput = document.getElementById('item-due-date');
    
    if (!calendarTitle || !calendarDays || !dueDateInput) return;
    
    // 设置月份和年份标题
    const year = currentItemDate.getFullYear();
    const month = currentItemDate.getMonth();
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    calendarTitle.textContent = `${year}年 ${monthNames[month]}`;
    
    // 清空日历天数
    calendarDays.innerHTML = '';
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 获取当月第一天是星期几（0-6，0表示星期日）
    let startDay = firstDay.getDay();
    // 调整为从周一开始（1-7，1表示星期一）
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    // 获取当月的天数
    const daysInMonth = lastDay.getDate();
    
    // 填充前导空白
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDay);
    }
    
    // 填充当月天数
    for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = i;
        
        // 标记今天
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        // 标记选中的日期
        const selectedDate = dueDateInput.value;
        if (selectedDate) {
            const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
            if (i === selectedDay && month === selectedMonth - 1 && year === selectedYear) {
                dayElement.classList.add('selected');
            }
        }
        
        // 添加点击事件
        dayElement.addEventListener('click', function() {
            const selectedDate = new Date(year, month, i);
            const formattedDate = selectedDate.toISOString().slice(0, 10);
            dueDateInput.value = formattedDate;
            calendarPopup.style.display = 'none';
        });
        
        calendarDays.appendChild(dayElement);
    }
}

// 绑定事件
function bindEvents() {
    console.log('开始执行bindEvents()函数');
    
    try {
        // 添加分类
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) {
            // 移除之前的事件监听器，避免重复绑定
            const newAddCategoryBtn = addCategoryBtn.cloneNode(true);
            addCategoryBtn.parentNode.replaceChild(newAddCategoryBtn, addCategoryBtn);
            
            // 绑定新的事件监听器
            newAddCategoryBtn.addEventListener('click', function() {
                const addCategoryModal = document.getElementById('add-category-modal');
                if (addCategoryModal) {
                    addCategoryModal.classList.add('active');
                    const categoryNameInput = document.getElementById('category-name');
                    if (categoryNameInput) {
                        categoryNameInput.value = '';
                    }
                }
            });
            console.log('绑定 add-category-btn 事件成功');
        } else {
            console.error('找不到 add-category-btn 元素');
        }
        
        // 从弹窗添加卡片
        const addCardModalBtn = document.getElementById('add-card-modal-btn');
        if (addCardModalBtn) {
            addCardModalBtn.addEventListener('click', addCardFromModal);
            console.log('绑定 add-card-modal-btn 事件成功');
        } else {
            console.error('找不到 add-card-modal-btn 元素');
        }
        
        // 左侧新建卡片按钮已移除
        
        // 筛选按钮
        const filterBtns = document.querySelectorAll('.filter-btn');
        if (filterBtns.length > 0) {
            filterBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentFilter = this.dataset.category;
                    renderCards();
                    renderCompletedCards();
                });
            });
            console.log('绑定 filter-btn 事件成功');
        } else {
            console.error('找不到 filter-btn 元素');
        }
        
        // 切换已结束区域功能已移除
        
        // 关闭详情页
        const closeDetailBtn = document.getElementById('close-detail-btn');
        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', closeDetailPage);
            console.log('绑定 close-detail-btn 事件成功');
        } else {
            console.error('找不到 close-detail-btn 元素');
        }
        
        // 添加清单项
        const addChecklistItemBtn = document.getElementById('add-detail-checklist-btn');
        if (addChecklistItemBtn) {
            addChecklistItemBtn.addEventListener('click', addChecklistItem);
            console.log('绑定 add-detail-checklist-btn 事件成功');
        } else {
            console.error('找不到 add-detail-checklist-btn 元素');
        }

        // 卡片备注
        const cardNoteInput = document.getElementById('card-note-input');
        if (cardNoteInput) {
            cardNoteInput.addEventListener('blur', function() {
                if (currentCardId) {
                    let card = cards.find(c => c.id === currentCardId);
                    let cardArray = cards;
                    
                    // 如果在活跃卡片中找不到，就在已结束卡片中查找
                    if (!card) {
                        card = completedCards.find(c => c.id === currentCardId);
                        cardArray = completedCards;
                    }
                    
                    if (card) {
                        card.note = cardNoteInput.value;
                        saveData(cardArray === cards ? 'cards' : 'completedCards', cardArray);
                    }
                }
            });
        }

        // 重命名卡片
        const renameCardBtn = document.getElementById('rename-card-btn');
        if (renameCardBtn) {
            renameCardBtn.addEventListener('click', renameCard);
            console.log('绑定 rename-card-btn 事件成功');
        } else {
            console.error('找不到 rename-card-btn 元素');
        }
        
        // 星标按钮
        const starBtn = document.getElementById('star-btn');
        if (starBtn) {
            starBtn.addEventListener('click', toggleStar);
            console.log('绑定 star-btn 事件成功');
        } else {
            console.error('找不到 star-btn 元素');
        }
        
        // 关闭清单项目详情
        const closeItemDetailBtn = document.getElementById('close-item-detail-btn');
        if (closeItemDetailBtn) {
            closeItemDetailBtn.addEventListener('click', closeItemDetail);
            console.log('绑定 close-item-detail-btn 事件成功');
        } else {
            console.error('找不到 close-item-detail-btn 元素');
        }
        
        // 上传文件
        const itemFilesInput = document.getElementById('item-files');
        if (itemFilesInput) {
            itemFilesInput.addEventListener('change', handleFileUpload);
            console.log('绑定 item-files 事件成功');
        } else {
            console.error('找不到 item-files 元素');
        }
        
        // 保存清单项目详情
        const saveItemDetailBtn = document.getElementById('save-item-detail-btn');
        if (saveItemDetailBtn) {
            saveItemDetailBtn.addEventListener('click', saveItemDetail);
            console.log('绑定 save-item-detail-btn 事件成功');
        } else {
            console.error('找不到 save-item-detail-btn 元素');
        }
        
        // 取消清单项目详情
        const cancelItemDetailBtn = document.getElementById('cancel-item-detail-btn');
        if (cancelItemDetailBtn) {
            cancelItemDetailBtn.addEventListener('click', closeItemDetail);
            console.log('绑定 cancel-item-detail-btn 事件成功');
        } else {
            console.error('找不到 cancel-item-detail-btn 元素');
        }
        
        // 删除清单项目
        const deleteItemBtn = document.getElementById('delete-item-btn');
        if (deleteItemBtn) {
            deleteItemBtn.addEventListener('click', deleteChecklistItem);
            console.log('绑定 delete-item-btn 事件成功');
        } else {
            console.error('找不到 delete-item-btn 元素');
        }
        
        // 导出卡片
        const exportCardBtn = document.getElementById('export-card-btn');
        if (exportCardBtn) {
            exportCardBtn.addEventListener('click', exportCard);
            console.log('绑定 export-card-btn 事件成功');
        } else {
            console.error('找不到 export-card-btn 元素');
        }
        
        // 删除卡片
        const deleteCardBtn = document.getElementById('delete-card-btn');
        if (deleteCardBtn) {
            deleteCardBtn.addEventListener('click', deleteCard);
            console.log('绑定 delete-card-btn 事件成功');
        } else {
            console.error('找不到 delete-card-btn 元素');
        }
        

        
        // 关闭分类弹窗
        const closeCategoryModalBtn = document.getElementById('close-category-modal');
        if (closeCategoryModalBtn) {
            closeCategoryModalBtn.addEventListener('click', function() {
                const addCategoryModal = document.getElementById('add-category-modal');
                if (addCategoryModal) {
                    addCategoryModal.classList.remove('active');
                }
            });
            console.log('绑定 close-category-modal 事件成功');
        } else {
            console.error('找不到 close-category-modal 元素');
        }
        
        // 取消添加分类
        const cancelCategoryBtn = document.getElementById('cancel-category-btn');
        if (cancelCategoryBtn) {
            cancelCategoryBtn.addEventListener('click', function() {
                const addCategoryModal = document.getElementById('add-category-modal');
                if (addCategoryModal) {
                    addCategoryModal.classList.remove('active');
                }
            });
            console.log('绑定 cancel-category-btn 事件成功');
        } else {
            console.error('找不到 cancel-category-btn 元素');
        }
        
        // 保存分类
        const saveCategoryBtn = document.getElementById('save-category-btn');
        if (saveCategoryBtn) {
            saveCategoryBtn.addEventListener('click', function() {
                addCategory();
                const addCategoryModal = document.getElementById('add-category-modal');
                if (addCategoryModal) {
                    addCategoryModal.classList.remove('active');
                }
            });
            console.log('绑定 save-category-btn 事件成功');
        } else {
            console.error('找不到 save-category-btn 元素');
        }
        
        // 登录按钮
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', showLoginModal);
            console.log('绑定 login-btn 事件成功');
        } else {
            console.error('找不到 login-btn 元素');
        }
        
        // 注册按钮
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', showRegisterModal);
            console.log('绑定 register-btn 事件成功');
        } else {
            console.error('找不到 register-btn 元素');
        }
        
        // 登录表单提交
        const submitLoginBtn = document.getElementById('submit-login-btn');
        if (submitLoginBtn) {
            submitLoginBtn.addEventListener('click', login);
            console.log('绑定 submit-login-btn 事件成功');
        } else {
            console.error('找不到 submit-login-btn 元素');
        }
        
        // 注册表单提交
        const submitRegisterBtn = document.getElementById('submit-register-btn');
        if (submitRegisterBtn) {
            submitRegisterBtn.addEventListener('click', register);
            console.log('绑定 submit-register-btn 事件成功');
        } else {
            console.error('找不到 submit-register-btn 元素');
        }
        
        // 关闭登录弹窗
        const closeLoginModalBtn = document.getElementById('close-login-modal');
        if (closeLoginModalBtn) {
            closeLoginModalBtn.addEventListener('click', hideLoginModal);
            console.log('绑定 close-login-modal 事件成功');
        } else {
            console.error('找不到 close-login-modal 元素');
        }
        
        // 关闭注册弹窗
        const closeRegisterModalBtn = document.getElementById('close-register-modal');
        if (closeRegisterModalBtn) {
            closeRegisterModalBtn.addEventListener('click', hideRegisterModal);
            console.log('绑定 close-register-modal 事件成功');
        } else {
            console.error('找不到 close-register-modal 元素');
        }
        
        // 取消登录
        const cancelLoginBtn = document.getElementById('cancel-login-btn');
        if (cancelLoginBtn) {
            cancelLoginBtn.addEventListener('click', hideLoginModal);
            console.log('绑定 cancel-login-btn 事件成功');
        } else {
            console.error('找不到 cancel-login-btn 元素');
        }
        
        // 取消注册
        const cancelRegisterBtn = document.getElementById('cancel-register-btn');
        if (cancelRegisterBtn) {
            cancelRegisterBtn.addEventListener('click', hideRegisterModal);
            console.log('绑定 cancel-register-btn 事件成功');
        } else {
            console.error('找不到 cancel-register-btn 元素');
        }
        
        // 打开回收站
        const openRecycleBinBtn = document.getElementById('open-recycle-bin');
        if (openRecycleBinBtn) {
            openRecycleBinBtn.addEventListener('click', openRecycleBin);
            console.log('绑定 open-recycle-bin 事件成功');
        } else {
            console.error('找不到 open-recycle-bin 元素');
        }
        
        // 关闭回收站
        const closeRecycleBinModalBtn = document.getElementById('close-recycle-bin-modal');
        if (closeRecycleBinModalBtn) {
            closeRecycleBinModalBtn.addEventListener('click', closeRecycleBin);
            console.log('绑定 close-recycle-bin-modal 事件成功');
        } else {
            console.error('找不到 close-recycle-bin-modal 元素');
        }
        
        // 关闭回收站按钮
        const closeRecycleBinBtn = document.getElementById('close-recycle-bin-btn');
        if (closeRecycleBinBtn) {
            closeRecycleBinBtn.addEventListener('click', closeRecycleBin);
            console.log('绑定 close-recycle-bin-btn 事件成功');
        } else {
            console.error('找不到 close-recycle-bin-btn 元素');
        }
        
        // 清空回收站
        const emptyRecycleBinBtn = document.getElementById('empty-recycle-bin-btn');
        if (emptyRecycleBinBtn) {
            emptyRecycleBinBtn.addEventListener('click', emptyRecycleBin);
            console.log('绑定 empty-recycle-bin-btn 事件成功');
        } else {
            console.error('找不到 empty-recycle-bin-btn 元素');
        }
        
        // 打开归档项目
        const openArchiveBtn = document.getElementById('open-archive-btn');
        if (openArchiveBtn) {
            openArchiveBtn.addEventListener('click', openArchive);
            console.log('绑定 open-archive-btn 事件成功');
        } else {
            console.error('找不到 open-archive-btn 元素');
        }
        
        // 关闭归档项目
        const closeArchiveModalBtn = document.getElementById('close-archive-modal');
        if (closeArchiveModalBtn) {
            closeArchiveModalBtn.addEventListener('click', closeArchive);
            console.log('绑定 close-archive-modal 事件成功');
        } else {
            console.error('找不到 close-archive-modal 元素');
        }
        
        // 关闭归档项目按钮
        const closeArchiveBtn = document.getElementById('close-archive-btn');
        if (closeArchiveBtn) {
            closeArchiveBtn.addEventListener('click', closeArchive);
            console.log('绑定 close-archive-btn 事件成功');
        } else {
            console.error('找不到 close-archive-btn 元素');
        }
        
        // 退出按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
            console.log('绑定 logout-btn 事件成功');
        } else {
            console.error('找不到 logout-btn 元素');
        }
        
        // 登录页面的注册链接
        const goToRegisterLink = document.getElementById('go-to-register');
        if (goToRegisterLink) {
            goToRegisterLink.addEventListener('click', function(e) {
                e.preventDefault();
                hideLoginModal();
                showRegisterModal();
            });
            console.log('绑定 go-to-register 事件成功');
        } else {
            console.error('找不到 go-to-register 元素');
        }
        
        // 注册页面的登录链接
        const goToLoginLink = document.getElementById('go-to-login');
        if (goToLoginLink) {
            goToLoginLink.addEventListener('click', function(e) {
                e.preventDefault();
                hideRegisterModal();
                showLoginModal();
            });
            console.log('绑定 go-to-login 事件成功');
        } else {
            console.error('找不到 go-to-login 元素');
        }
        
        // 数据管理 - 导出所有数据
        const exportAllBtn = document.getElementById('export-all-btn');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', exportAllData);
            console.log('绑定 export-all-btn 事件成功');
        } else {
            console.error('找不到 export-all-btn 元素');
        }
        
        // 数据管理 - 导入数据
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            // 移除之前的事件监听器，避免重复绑定
            const newImportBtn = importBtn.cloneNode(true);
            importBtn.parentNode.replaceChild(newImportBtn, importBtn);
            
            // 绑定新的事件监听器
            newImportBtn.addEventListener('click', function() {
                console.log('点击了导入数据按钮');
                const importFileInput = document.getElementById('import-file');
                if (importFileInput) {
                    console.log('找到了 import-file 元素，触发点击');
                    importFileInput.click();
                } else {
                    console.error('找不到 import-file 元素');
                }
            });
            console.log('绑定 import-btn 事件成功');
        } else {
            console.error('找不到 import-btn 元素');
        }
        
        // 数据管理 - 文件选择
        const importFileInput = document.getElementById('import-file');
        if (importFileInput) {
            // 移除之前的事件监听器，避免重复绑定
            const newImportFileInput = importFileInput.cloneNode(true);
            importFileInput.parentNode.replaceChild(newImportFileInput, importFileInput);
            
            // 绑定新的事件监听器
            newImportFileInput.addEventListener('change', function(e) {
                console.log('选择了文件，触发 importData 函数');
                importData(e);
            });
            console.log('绑定 import-file 事件成功');
        } else {
            console.error('找不到 import-file 元素');
        }
        
        // 日期选择器
        const dueDateInput = document.getElementById('detail-checklist-due-date');
        const calendarPopup = document.getElementById('calendar-popup');
        
        if (dueDateInput && calendarPopup) {
            // 点击输入框显示日历
            dueDateInput.addEventListener('click', function(e) {
                e.stopPropagation();
                calendarPopup.style.display = 'block';
                renderCalendar();
            });
            
            // 点击日历外部隐藏日历
            document.addEventListener('click', function(e) {
                if (!dueDateInput.contains(e.target) && !calendarPopup.contains(e.target)) {
                    calendarPopup.style.display = 'none';
                }
            });
            
            // 上一个月
            const calendarPrev = calendarPopup.querySelector('.calendar-prev');
            if (calendarPrev) {
                calendarPrev.addEventListener('click', function(e) {
                    e.stopPropagation();
                    currentDate.setMonth(currentDate.getMonth() - 1);
                    renderCalendar();
                });
            }
            
            // 下一个月
            const calendarNext = calendarPopup.querySelector('.calendar-next');
            if (calendarNext) {
                calendarNext.addEventListener('click', function(e) {
                    e.stopPropagation();
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    renderCalendar();
                });
            }
            
            // 清除按钮
            const calendarClear = calendarPopup.querySelector('.calendar-clear');
            if (calendarClear) {
                calendarClear.addEventListener('click', function(e) {
                    e.stopPropagation();
                    dueDateInput.value = '';
                    calendarPopup.style.display = 'none';
                });
            }
            
            // 今天按钮
            const calendarToday = calendarPopup.querySelector('.calendar-today');
            if (calendarToday) {
                calendarToday.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const today = new Date();
                    const formattedDate = today.toISOString().slice(0, 10);
                    dueDateInput.value = formattedDate;
                    calendarPopup.style.display = 'none';
                });
            }
            
            console.log('绑定日期选择器事件成功');
        } else {
            console.error('找不到日期选择器元素');
        }
        
        // 清单项目详情弹窗中的日期选择器
        const itemDueDateInput = document.getElementById('item-due-date');
        const itemCalendarPopup = document.getElementById('item-calendar-popup');
        
        if (itemDueDateInput && itemCalendarPopup) {
            // 点击输入框显示日历
            itemDueDateInput.addEventListener('click', function(e) {
                e.stopPropagation();
                itemCalendarPopup.style.display = 'block';
                renderItemCalendar();
            });
            
            // 点击日历外部隐藏日历
            document.addEventListener('click', function(e) {
                if (!itemDueDateInput.contains(e.target) && !itemCalendarPopup.contains(e.target)) {
                    itemCalendarPopup.style.display = 'none';
                }
            });
            
            // 上一个月
            const itemCalendarPrev = itemCalendarPopup.querySelector('.calendar-prev');
            if (itemCalendarPrev) {
                itemCalendarPrev.addEventListener('click', function(e) {
                    e.stopPropagation();
                    currentItemDate.setMonth(currentItemDate.getMonth() - 1);
                    renderItemCalendar();
                });
            }
            
            // 下一个月
            const itemCalendarNext = itemCalendarPopup.querySelector('.calendar-next');
            if (itemCalendarNext) {
                itemCalendarNext.addEventListener('click', function(e) {
                    e.stopPropagation();
                    currentItemDate.setMonth(currentItemDate.getMonth() + 1);
                    renderItemCalendar();
                });
            }
            
            // 清除按钮
            const itemCalendarClear = itemCalendarPopup.querySelector('.calendar-clear');
            if (itemCalendarClear) {
                itemCalendarClear.addEventListener('click', function(e) {
                    e.stopPropagation();
                    itemDueDateInput.value = '';
                    itemCalendarPopup.style.display = 'none';
                });
            }
            
            // 今天按钮
            const itemCalendarToday = itemCalendarPopup.querySelector('.calendar-today');
            if (itemCalendarToday) {
                itemCalendarToday.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const today = new Date();
                    const formattedDate = today.toISOString().slice(0, 10);
                    itemDueDateInput.value = formattedDate;
                    itemCalendarPopup.style.display = 'none';
                });
            }
            
            console.log('绑定清单项目日期选择器事件成功');
        } else {
            console.error('找不到清单项目日期选择器元素');
        }
        
        // 顶部搜索功能
        const mainSearchInput = document.getElementById('main-search-input');
        if (mainSearchInput) {
            mainSearchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                filterCards(searchTerm);
            });
            console.log('绑定 main-search-input 事件成功');
        } else {
            console.error('找不到 main-search-input 元素');
        }
        
        console.log('bindEvents()函数执行完成');
    } catch (error) {
        console.error('bindEvents()函数执行出错:', error);
    }
}

// 渲染分类选项
function renderCategories() {
    // 渲染分类列表
    renderCategoryList();
}

// 渲染分类列表
// 生成随机颜色
function getRandomColor() {
    const colors = [
        '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c',
        '#1abc9c', '#34495e', '#95a5a6', '#f1c40f', '#e67e22'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function renderCategoryList() {
    const categoryList = document.getElementById('category-list');
    if (!categoryList) {
        // 在 home.html 页面中，category-list 元素不存在，直接返回
        return;
    }
    categoryList.innerHTML = '';
    
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        const color = getRandomColor();
        categoryItem.style.backgroundColor = color;
        categoryItem.innerHTML = `
            <span>${category}</span>
            <div class="category-item-actions">
                <button class="add-card-btn" onclick="addCardToCategory('${category}')">新建卡片</button>
                <button class="rename-btn" onclick="renameCategory('${category}')">重命名</button>
                <button class="archive-btn" onclick="archiveCategory('${category}')">归档</button>
                <button class="delete-btn" onclick="deleteCategory('${category}')">删除</button>
            </div>
        `;
        categoryList.appendChild(categoryItem);
    });
}

// 重命名分类
function renameCategory(oldName) {
    const newName = prompt('请输入新的分类名称：', oldName);
    if (newName && newName.trim() && newName !== oldName) {
        // 检查新名称是否已存在
        if (categories.includes(newName.trim())) {
            alert('分类名称已存在！');
            return;
        }
        
        // 更新分类名称
        const index = categories.indexOf(oldName);
        if (index !== -1) {
            categories[index] = newName.trim();
            saveData('categories', categories);
            
            // 更新使用该分类的卡片
            cards.forEach(card => {
                if (card.category === oldName) {
                    card.category = newName.trim();
                }
            });
            saveData('cards', cards);
            
            renderCategories();
            renderFilterButtons();
            renderCards();
        }
    }
}

// 归档分类
function archiveCategory(categoryName) {
    if (confirm(`确定要归档分类 "${categoryName}" 吗？\n该分类下的所有卡片将被一起归档。`)) {
        // 找到要归档的分类索引
        const index = categories.indexOf(categoryName);
        if (index !== -1) {
            // 将分类添加到归档分类列表
            archivedCategories.push({
                name: categoryName,
                archivedAt: new Date().toISOString()
            });
            saveData('archivedCategories', archivedCategories);
            
            // 从分类列表中移除
            categories.splice(index, 1);
            saveData('categories', categories);
            
            renderCategories();
            renderFilterButtons();
            renderCards();
        }
    }
}

// 删除分类
function deleteCategory(categoryName) {
    if (categories.length <= 1) {
        alert('至少需要保留一个分类！');
        return;
    }
    
    if (confirm(`确定要删除分类 "${categoryName}" 吗？\n该分类下的所有卡片将被移动到第一个分类。`)) {
        // 找到要删除的分类索引
        const index = categories.indexOf(categoryName);
        if (index !== -1) {
            // 找到第一个分类作为默认分类
            const defaultCategory = categories[0] === categoryName ? categories[1] : categories[0];
            
            // 更新使用该分类的卡片
            cards.forEach(card => {
                if (card.category === categoryName) {
                    card.category = defaultCategory;
                }
            });
            saveData('cards', cards);
            
            // 删除分类
            categories.splice(index, 1);
            saveData('categories', categories);
            
            renderCategories();
            renderFilterButtons();
            renderCards();
        }
    }
}

// 渲染筛选按钮
function renderFilterButtons() {
    // 获取左侧分类筛选容器
    const leftFilterContainer = document.querySelector('.category-filter');
    if (!leftFilterContainer) return;
    
    // 清空左侧容器，保留"全部"和"星标卡片"按钮
    leftFilterContainer.innerHTML = '';
    
    // 创建"全部"按钮
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn';
    allBtn.dataset.category = 'all';
    allBtn.textContent = '全部';
    allBtn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.category;
        renderCards();
        renderCompletedCards();
    });
    leftFilterContainer.appendChild(allBtn);
    
    // 创建"星标卡片"按钮
    const starredBtn = document.createElement('button');
    starredBtn.className = 'filter-btn';
    starredBtn.dataset.category = 'starred';
    starredBtn.textContent = '星标卡片';
    starredBtn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.category;
        renderCards();
        renderCompletedCards();
    });
    leftFilterContainer.appendChild(starredBtn);
    
    // 创建"快到期"按钮
    const upcomingBtn = document.createElement('button');
    upcomingBtn.className = 'filter-btn';
    upcomingBtn.dataset.category = 'upcoming';
    upcomingBtn.textContent = '快到期';
    upcomingBtn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.category;
        renderCards();
        renderCompletedCards();
    });
    leftFilterContainer.appendChild(upcomingBtn);
    
    // 获取右侧顶部筛选容器
    const rightFilterContainer = document.querySelector('.main-filter');
    if (!rightFilterContainer) return;
    
    // 清空右侧容器
    rightFilterContainer.innerHTML = '';
    
    // 添加分类筛选按钮到右侧（只显示用户自定义分类）
    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.category = category;
        btn.textContent = category;
        
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.category;
            renderCards();
            renderCompletedCards();
        });
        
        rightFilterContainer.appendChild(btn);
    });
    
    // 保持当前筛选状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.category === currentFilter) {
            btn.classList.add('active');
        }
    });
}

// 添加分类
function addCategory() {
    const categoryName = document.getElementById('category-name').value.trim();
    if (categoryName && !categories.includes(categoryName)) {
        categories.push(categoryName);
        saveData('categories', categories);
        renderCategories();
        renderFilterButtons();
        document.getElementById('category-name').value = '';
    }
}

// 向指定分类添加卡片
function addCardToCategory(category) {
    // 设置选中的分类
    document.getElementById('selected-category').value = category;
    // 显示添加卡片弹窗
    document.getElementById('add-card-modal').classList.add('active');
}

// 更新分类顺序
function updateCategoryOrder() {
    const filterContainer = document.querySelector('.category-filter');
    const filterButtons = filterContainer.querySelectorAll('.filter-btn');
    const newCategories = [];
    
    filterButtons.forEach(btn => {
        const category = btn.dataset.category;
        if (!category.includes('all') && !category.includes('starred')) {
            newCategories.push(category);
        }
    });
    
    categories = newCategories;
    saveData('categories', categories);
    renderCategories();
}

// 显示添加卡片弹窗
function showAddCardForm(category) {
    document.getElementById('selected-category').value = category;
    document.getElementById('add-card-modal').classList.add('active');
    document.getElementById('card-title-modal').focus();
}

// 隐藏添加卡片弹窗
function hideAddCardForm() {
    document.getElementById('add-card-modal').classList.remove('active');
    document.getElementById('card-title-modal').value = '';
    document.getElementById('selected-category').value = '';
}



// 从弹窗添加卡片
function addCardFromModal() {
    const title = document.getElementById('card-title-modal').value.trim();
    const category = document.getElementById('selected-category').value;
    
    if (title && category) {
        const card = {
            id: Date.now().toString(),
            title,
            category,
            checklist: [],
            completed: false,
            createdAt: new Date().toISOString(),
            starred: false,
            note: ''
        };
        
        cards.push(card);
        saveData('cards', cards);
        renderCards();
        hideAddCardForm();
    }
}

// 渲染卡片
function renderCards() {
    const kanbanBoard = document.getElementById('kanban-board');
    if (!kanbanBoard) {
        // 在 home.html 页面中，kanban-board 元素不存在，直接返回
        return;
    }
    kanbanBoard.innerHTML = '';
    
    // 按分类分组卡片
    const cardsByCategory = {};
    
    // 筛选卡片，排除已归档分类的卡片和已删除的卡片
    const archivedCategoryNames = archivedCategories.map(c => c.name);
    const deletedCardIds = recycledCards.map(card => card.id);
    let filteredCards = cards.filter(card => !card.completed && !archivedCategoryNames.includes(card.category) && !deletedCardIds.includes(card.id));
    
    if (currentFilter === 'starred') {
        filteredCards = filteredCards.filter(card => card.starred);
    } else if (currentFilter === 'upcoming') {
        // 计算3天后的日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate() + 3);
        
        // 筛选出包含快到期清单任务的卡片
        filteredCards = filteredCards.filter(card => {
            const checklist = card.checklist || [];
            // 检查是否有清单任务快到期
            return checklist.some(item => {
                if (!item.dueDate) return false;
                const dueDate = new Date(item.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate >= today && dueDate <= threeDaysLater;
            });
        });
    } else if (currentFilter !== 'all') {
        filteredCards = filteredCards.filter(card => card.category === currentFilter);
    }
    
    // 分组
    filteredCards.forEach(card => {
        if (!cardsByCategory[card.category]) {
            cardsByCategory[card.category] = [];
        }
        cardsByCategory[card.category].push(card);
    });
    
    // 创建看板列
    if (currentFilter === 'all') {
        categories.forEach(category => {
            const categoryCards = cardsByCategory[category] || [];
            const column = document.createElement('div');
            column.className = 'kanban-column';
            column.innerHTML = `
                <h3>${category}</h3>
                <div class="cards-container" data-category="${category}"></div>
                <button class="add-card-btn" onclick="showAddCardForm('${category}')">添加卡片</button>
            `;
            kanbanBoard.appendChild(column);
            
            const container = column.querySelector('.cards-container');
            if (categoryCards.length > 0) {
                categoryCards.forEach(card => {
                    container.appendChild(createCardElement(card));
                });
            } else {
                // 显示空状态提示
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = '<p>暂无卡片，点击下方按钮添加</p>';
                container.appendChild(emptyState);
            }
        });
    } else if (currentFilter === 'starred' || currentFilter === 'upcoming') {
        Object.keys(cardsByCategory).forEach(category => {
            const categoryCards = cardsByCategory[category] || [];
            if (categoryCards.length > 0) {
                const column = document.createElement('div');
                column.className = 'kanban-column';
                column.innerHTML = `
                    <h3>${category}</h3>
                    <div class="cards-container" data-category="${category}"></div>
                    <button class="add-card-btn" onclick="showAddCardForm('${category}')">添加卡片</button>
                `;
                kanbanBoard.appendChild(column);
                
                const container = column.querySelector('.cards-container');
                categoryCards.forEach(card => {
                    container.appendChild(createCardElement(card));
                });
            }
        });
    } else {
        const categoryCards = cardsByCategory[currentFilter] || [];
        const column = document.createElement('div');
        column.className = 'kanban-column';
        column.innerHTML = `
            <h3>${currentFilter}</h3>
            <div class="cards-container" data-category="${currentFilter}"></div>
            <button class="add-card-btn" onclick="showAddCardForm('${currentFilter}')">添加卡片</button>
        `;
        kanbanBoard.appendChild(column);
        
        const container = column.querySelector('.cards-container');
        if (categoryCards.length > 0) {
            categoryCards.forEach(card => {
                container.appendChild(createCardElement(card));
            });
        } else {
            // 显示空状态提示
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<p>暂无卡片，点击下方按钮添加</p>';
            container.appendChild(emptyState);
        }
    }
    
    // 渲染已结束卡片
    renderCompletedCards();
}

// 创建卡片元素
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.id = card.id;
    
    const checklist = card.checklist || [];
    const completedCount = checklist.filter(item => item.completed).length;
    const totalCount = checklist.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    cardElement.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${card.title}</h3>
            <button class="star-btn" onclick="toggleStar('${card.id}'); event.stopPropagation();">
                <span class="star-icon ${card.starred ? 'starred' : ''}">☆</span>
            </button>
        </div>
        <div class="card-category">${card.category}</div>
        <div class="checklist">
            ${checklist.slice(0, 3).map(item => `
                <div class="checklist-item ${item.completed ? 'completed' : ''}">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} 
                           onchange="toggleChecklistItem('${card.id}', '${item.id}', this.checked); event.stopPropagation();">
                    <span>${item.text}</span>
                    <button onclick="openItemDetail('${card.id}', '${item.id}'); event.stopPropagation();">编辑</button>
                </div>
            `).join('')}
        </div>
        ${checklist.length > 3 ? `<div class="checklist-more">还有 ${checklist.length - 3} 项...</div>` : ''}
        <div class="card-footer">
            <span>${progress}% 完成</span>
            <button class="complete-btn" onclick="completeCard('${card.id}'); event.stopPropagation();">完成</button>
        </div>
    `;
    
    cardElement.addEventListener('click', () => openDetailPage(card.id));
    return cardElement;
}

// 创建已完成卡片元素
function createCompletedCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card completed';
    cardElement.dataset.id = card.id;
    
    cardElement.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${card.title || '无标题'}</h3>
            <button class="star-btn" onclick="toggleStar('${card.id}'); event.stopPropagation();">
                <span class="star-icon ${card.starred ? 'starred' : ''}">☆</span>
            </button>
        </div>
        <div class="card-category">${card.category || '无分类'}</div>
        <div class="card-footer">
            <span>已完成于 ${card.completedAt ? new Date(card.completedAt).toLocaleString() : '未知时间'}</span>
            <div class="footer-actions">
                <button class="restore-btn" onclick="restoreCompletedCard('${card.id}'); event.stopPropagation();">还原</button>
                <button class="complete-btn" onclick="deleteCompletedCard('${card.id}'); event.stopPropagation();">删除</button>
            </div>
        </div>
    `;
    
    cardElement.addEventListener('click', () => openDetailPage(card.id));
    return cardElement;
}

// 还原已完成卡片
function restoreCompletedCard(cardId) {
    const cardIndex = completedCards.findIndex(card => card.id === cardId);
    if (cardIndex !== -1) {
        const card = completedCards[cardIndex];
        const cardCategory = card.category;
        // 移除已完成标记
        delete card.completedAt;
        delete card.completed;
        // 从已完成数组中移除
        completedCards.splice(cardIndex, 1);
        // 添加到活跃卡片数组
        cards.push(card);
        // 保存数据
        saveData('cards', cards);
        saveData('completedCards', completedCards);
        // 重新渲染
        renderCards();
        renderCompletedCards();
        
        // 显示还原成功提示
        alert(`卡片已还原到「${cardCategory}」项目中`);
        
        // 如果当前筛选的不是全部，且还原的卡片不属于当前筛选项目，自动切换到全部视图
        if (currentFilter !== 'all' && currentFilter !== cardCategory) {
            // 找到全部筛选按钮并点击
            const allBtn = document.querySelector('[data-category="all"]');
            if (allBtn) {
                allBtn.click();
            }
        }
    }
}

// 渲染已结束卡片（按项目分组显示）
function renderCompletedCards() {
    const completedContainer = document.getElementById('completed-cards');
    if (!completedContainer) {
        return;
    }
    completedContainer.innerHTML = '';

    const archivedCategoryNames = archivedCategories.map(c => c.name);
    const deletedCardIds = recycledCards.map(card => card.id);
    let filteredCompletedCards = completedCards.filter(card => !archivedCategoryNames.includes(card.category) && !deletedCardIds.includes(card.id));

    // 根据筛选条件过滤已完成卡片
    if (currentFilter === 'starred') {
        filteredCompletedCards = filteredCompletedCards.filter(card => card.starred);
    } else if (currentFilter !== 'all') {
        filteredCompletedCards = filteredCompletedCards.filter(card => card.category === currentFilter);
    }

    if (filteredCompletedCards && filteredCompletedCards.length > 0) {
        const cardsByCategory = {};
        filteredCompletedCards.forEach(card => {
            if (!cardsByCategory[card.category]) {
                cardsByCategory[card.category] = [];
            }
            cardsByCategory[card.category].push(card);
        });

        Object.keys(cardsByCategory).forEach(category => {
            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'completed-category-group';

            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'completed-category-header';
            categoryHeader.innerHTML = `<h3>${category}</h3>`;
            categoryGroup.appendChild(categoryHeader);

            const categoryCardsContainer = document.createElement('div');
            categoryCardsContainer.className = 'completed-category-cards';

            cardsByCategory[category].forEach(card => {
                const cardElement = createCompletedCardElement(card);
                categoryCardsContainer.appendChild(cardElement);
            });

            categoryGroup.appendChild(categoryCardsContainer);
            completedContainer.appendChild(categoryGroup);
        });
    } else {
        completedContainer.innerHTML = '<p class="no-cards">暂无已结束卡片</p>';
    }
}

// 筛选卡片
function filterCards(searchTerm) {
    // 重新渲染卡片，确保已删除的卡片不会显示
    renderCards();
    
    const cardsContainer = document.querySelector('.kanban-board');
    if (!cardsContainer) return;
    
    const cardElements = cardsContainer.querySelectorAll('.card');
    
    cardElements.forEach(cardElement => {
        const cardTitle = cardElement.querySelector('.card-title').textContent.toLowerCase();
        const cardCategory = cardElement.querySelector('.card-category').textContent.toLowerCase();
        
        // 搜索任务清单内容
        let checklistContent = '';
        const checklistItems = cardElement.querySelectorAll('.checklist-item span');
        checklistItems.forEach(item => {
            checklistContent += item.textContent.toLowerCase() + ' ';
        });
        
        if (cardTitle.includes(searchTerm) || cardCategory.includes(searchTerm) || checklistContent.includes(searchTerm)) {
            cardElement.style.display = 'block';
        } else {
            cardElement.style.display = 'none';
        }
    });
}

// 切换已结束区域
function toggleArchivedSection() {
    const completedCards = document.getElementById('completed-cards');
    
    archivedCollapsed = !archivedCollapsed;
    saveData('archivedCollapsed', archivedCollapsed);
    
    if (archivedCollapsed) {
        completedCards.style.display = 'none';
    } else {
        completedCards.style.display = 'grid';
    }
}

// 加载已结束区域状态
function loadArchivedCollapsedState() {
    const completedCards = document.getElementById('completed-cards');
    
    if (archivedCollapsed) {
        completedCards.style.display = 'none';
    } else {
        completedCards.style.display = 'grid';
    }
}

// 打开详情页
function openDetailPage(cardId) {
    currentCardId = cardId;
    // 获取已删除卡片的ID列表
    const deletedCardIds = recycledCards.map(card => card.id);
    
    // 检查卡片是否已删除
    if (deletedCardIds.includes(cardId)) {
        alert('该卡片已被删除，无法访问');
        return;
    }
    
    let card = cards.find(c => c.id === cardId);
    
    // 如果在活跃卡片中找不到，就在已结束卡片中查找
    if (!card) {
        card = completedCards.find(c => c.id === cardId);
    }
    
    if (card) {
        document.getElementById('detail-title').textContent = card.title;
        document.getElementById('detail-category').textContent = card.category;
        document.getElementById('detail-created').textContent = new Date(card.createdAt).toLocaleString();
        document.getElementById('card-note-input').value = card.note || '';

        // 更新星标状态
        const starIcon = document.querySelector('#star-btn .star-icon');
        starIcon.className = `star-icon ${card.starred ? 'starred' : ''}`;
        starIcon.textContent = card.starred ? '★' : '☆';
        
        // 渲染清单
        const checklistContainer = document.getElementById('detail-checklist');
        checklistContainer.innerHTML = '';
        
        // 确保checklist存在
        const checklist = card.checklist || [];
        checklist.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = `detail-checklist-item ${item.completed ? 'completed' : ''}`;
            
            // 创建复选框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            if (item.completed) {
                checkbox.checked = true;
            }
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                toggleChecklistItem(card.id, item.id, this.checked);
            });
            itemElement.appendChild(checkbox);
            
            // 创建文本
            const textSpan = document.createElement('span');
            textSpan.textContent = item.text;
            itemElement.appendChild(textSpan);
            
            // 显示截止时间和剩余天数（如果有且任务未完成）
            if (item.dueDate && !item.completed) {
                const dueDate = new Date(item.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                const timeDiff = dueDate.getTime() - today.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                const dueDateSpan = document.createElement('span');
                dueDateSpan.className = 'checklist-due-date';
                dueDateSpan.textContent = '截止: ' + dueDate.toLocaleDateString();
                itemElement.appendChild(dueDateSpan);
                
                const daysLeftSpan = document.createElement('span');
                daysLeftSpan.className = `checklist-days-left ${daysDiff < 0 ? 'overdue' : daysDiff === 0 ? 'today' : ''}`;
                daysLeftSpan.textContent = daysDiff < 0 ? `已逾期${Math.abs(daysDiff)}天` : daysDiff === 0 ? '今天到期' : `剩余${daysDiff}天`;
                itemElement.appendChild(daysLeftSpan);
            }
            
            // 创建编辑按钮
            const editButton = document.createElement('button');
            editButton.textContent = '编辑';
            editButton.addEventListener('click', function(e) {
                e.stopPropagation();
                openItemDetail(card.id, item.id);
            });
            itemElement.appendChild(editButton);
            
            // 先添加任务项
            checklistContainer.appendChild(itemElement);
            
            // 再显示复盘/总结内容（如果有）
            if (item.note && item.note.trim()) {
                const noteElement = document.createElement('div');
                noteElement.className = 'checklist-note';
                noteElement.textContent = item.note.trim();
                checklistContainer.appendChild(noteElement);
            }
        });
        
        // 更新进度
        updateProgress(card);
        
        // 显示详情页
        const cardDetail = document.getElementById('card-detail');
        cardDetail.dataset.cardId = cardId;
        cardDetail.classList.add('active');
    }
}

// 关闭详情页
function closeDetailPage() {
    document.getElementById('card-detail').classList.remove('active');
    currentCardId = null;
}

// 导出卡片
function exportCard() {
    if (currentCardId) {
        // 获取已删除卡片的ID列表
        const deletedCardIds = recycledCards.map(card => card.id);
        
        // 检查卡片是否已删除
        if (deletedCardIds.includes(currentCardId)) {
            alert('该卡片已被删除，无法导出');
            return;
        }
        
        const card = cards.find(c => c.id === currentCardId);
        if (card) {
            // 选择导出格式
            const format = prompt('请选择导出格式：\n1. Excel\n2. 图片', '1');
            
            switch (format) {
                case '1':
                    exportAsExcel(card);
                    break;
                case '2':
                    exportAsImage(card);
                    break;
                default:
                    break;
            }
        }
    }
}

// 导出为Excel
function exportAsExcel(card) {
    // 准备Excel数据
    const worksheetData = [
        ['卡片标题', card.title],
        ['分类', card.category],
        ['创建时间', new Date(card.createdAt).toLocaleString()],
        ['星标', card.starred ? '是' : '否'],
        [],
        ['任务清单'],
        ['任务', '状态', '截止时间', '复盘/总结']
    ];
    
    // 添加清单项目
    const checklist = card.checklist || [];
    checklist.forEach(item => {
        worksheetData.push([
            item.text,
            item.completed ? '已完成' : '未完成',
            item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '',
            item.note || ''
        ]);
    });
    
    // 创建工作簿和工作表
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '卡片详情');
    
    // 导出Excel文件
    XLSX.writeFile(workbook, `${card.title}.xlsx`);
}

// 导出为图片
function exportAsImage(card) {
    // 获取卡片详情页的内容
    const detailContent = document.querySelector('.card-detail-content');
    
    // 使用html2canvas将内容转换为图片
    html2canvas(detailContent, {
        scale: 2, // 提高图片质量
        useCORS: true, // 允许跨域图片
        logging: false
    }).then(canvas => {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${card.title}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// 导出所有数据
function exportAllData() {
    const allData = {
        categories: categories,
        cards: cards,
        completedCards: completedCards
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `project-manager-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// 导入数据
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (importedData.categories) {
                categories = importedData.categories;
            }
            if (importedData.cards) {
                cards = importedData.cards;
            }
            if (importedData.completedCards) {
                completedCards = importedData.completedCards;
            }
            
            renderCategories();
            renderCards();
            renderCompletedCards();
            saveData('categories', categories);
            saveData('cards', cards);
            saveData('completedCards', completedCards);
            
            alert('数据导入成功！');
        } catch (error) {
            alert('数据导入失败，请确保文件格式正确。');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    
    // 重置文件输入，以便可以重复选择同一个文件
    e.target.value = '';
}

// 添加清单项
function addChecklistItem() {
    if (currentCardId) {
        const input = document.getElementById('detail-checklist-input');
        const text = input.value.trim();
        const dueDateInput = document.getElementById('detail-checklist-due-date');
        const dueDate = dueDateInput.value ? dueDateInput.value : null;
        
        if (text) {
            const card = cards.find(c => c.id === currentCardId);
            if (card) {
                // 确保checklist存在
                if (!card.checklist) {
                    card.checklist = [];
                }
                card.checklist.push({
                    id: Date.now().toString(),
                    text,
                    completed: false,
                    note: '',
                    dueDate: dueDate,
                    files: []
                });
                
                saveData('cards', cards);
                openDetailPage(currentCardId); // 重新打开详情页以更新内容
                renderCards(); // 更新卡片显示
                input.value = '';
                dueDateInput.value = ''; // 清空日期输入框
            }
        }
    }
}

// 切换清单项状态
function toggleChecklistItem(cardId, itemId, completed) {
    // 获取已删除卡片的ID列表
    const deletedCardIds = recycledCards.map(card => card.id);
    
    // 检查卡片是否已删除
    if (deletedCardIds.includes(cardId)) {
        alert('该卡片已被删除，无法修改');
        return;
    }
    
    const card = cards.find(c => c.id === cardId);
    if (card) {
        const checklist = card.checklist || [];
        const item = checklist.find(i => i.id === itemId);
        if (item) {
            item.completed = completed;
            saveData('cards', cards);
            
            // 更新卡片显示
            renderCards();
            
            // 如果在详情页，更新进度和任务状态
            if (currentCardId === cardId) {
                updateProgress(card);
                
                // 找到对应的清单项目元素
                const checklistItems = document.querySelectorAll('.detail-checklist-item');
                checklistItems.forEach(itemElement => {
                    const textSpan = itemElement.querySelector('span');
                    if (textSpan && textSpan.textContent === item.text) {
                        // 更新完成状态样式
                        if (completed) {
                            itemElement.classList.add('completed');
                            // 隐藏截止时间和剩余天数
                            const dueDateSpan = itemElement.querySelector('.checklist-due-date');
                            const daysLeftSpan = itemElement.querySelector('.checklist-days-left');
                            if (dueDateSpan) dueDateSpan.style.display = 'none';
                            if (daysLeftSpan) daysLeftSpan.style.display = 'none';
                        } else {
                            itemElement.classList.remove('completed');
                            // 显示截止时间和剩余天数（如果有）
                            if (item.dueDate) {
                                const dueDate = new Date(item.dueDate);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                dueDate.setHours(0, 0, 0, 0);
                                
                                const timeDiff = dueDate.getTime() - today.getTime();
                                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                                
                                let dueDateSpan = itemElement.querySelector('.checklist-due-date');
                                let daysLeftSpan = itemElement.querySelector('.checklist-days-left');
                                
                                if (!dueDateSpan) {
                                    dueDateSpan = document.createElement('span');
                                    dueDateSpan.className = 'checklist-due-date';
                                    itemElement.appendChild(dueDateSpan);
                                }
                                if (!daysLeftSpan) {
                                    daysLeftSpan = document.createElement('span');
                                    itemElement.appendChild(daysLeftSpan);
                                }
                                
                                dueDateSpan.textContent = '截止: ' + dueDate.toLocaleDateString();
                                dueDateSpan.style.display = 'inline-block';
                                
                                daysLeftSpan.className = `checklist-days-left ${daysDiff < 0 ? 'overdue' : daysDiff === 0 ? 'today' : ''}`;
                                daysLeftSpan.textContent = daysDiff < 0 ? `已逾期${Math.abs(daysDiff)}天` : daysDiff === 0 ? '今天到期' : `剩余${daysDiff}天`;
                                daysLeftSpan.style.display = 'inline-block';
                            }
                        }
                    }
                });
            } else {
                renderCards();
            }
        }
    }
}

// 更新进度
function updateProgress(card) {
    const checklist = card.checklist || [];
    const completedCount = checklist.filter(item => item.completed).length;
    const totalCount = checklist.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const progressContainer = document.getElementById('progress-container');
    progressContainer.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">${completedCount}/${totalCount} 完成</div>
    `;
}

// 完成卡片
function completeCard(cardId) {
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex !== -1) {
        const card = cards[cardIndex];
        card.completed = true;
        card.completedAt = new Date().toISOString();
        
        // 将卡片从 cards 数组移动到 completedCards 数组
        cards.splice(cardIndex, 1);
        completedCards.push(card);
        
        // 保存数据
        saveData('cards', cards);
        saveData('completedCards', completedCards);
        
        // 重新渲染
        renderCards();
        renderCompletedCards();
    }
}

// 删除已结束卡片
function deleteCompletedCard(cardId) {
    if (confirm('确定要删除此卡片吗？')) {
        if (confirm('再次确认删除，此操作不可恢复！')) {
            const card = completedCards.find(c => c.id === cardId);
            if (card) {
                // 从已完成卡片数组中删除
                completedCards = completedCards.filter(c => c.id !== cardId);
                
                // 为卡片添加删除时间戳
                card.deletedAt = new Date().toISOString();
                
                // 将卡片添加到回收站
                recycledCards.push(card);
                
                // 保存数据
                saveData('completedCards', completedCards);
                saveData('recycledCards', recycledCards);
                
                // 重新渲染
                renderCompletedCards();
            }
        }
    }
}

// 重命名卡片
function renameCard() {
    if (currentCardId) {
        const card = cards.find(c => c.id === currentCardId);
        if (card) {
            const newTitle = prompt('请输入新的卡片标题：', card.title);
            if (newTitle && newTitle.trim()) {
                card.title = newTitle.trim();
                saveData('cards', cards);
                openDetailPage(currentCardId); // 重新打开详情页以更新内容
                renderCards(); // 更新看板中的卡片
                
                // 如果有清单项目详情页打开，重新打开以更新关联卡片下拉列表
                if (currentItemId) {
                    openItemDetail(currentCardId, currentItemId);
                }
            }
        }
    }
}

// 切换星标状态
function toggleStar(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (card) {
        card.starred = !card.starred;
        saveData('cards', cards);
        
        // 更新星标图标
        if (currentCardId === cardId) {
            const starIcon = document.querySelector('#star-btn .star-icon');
            starIcon.className = `star-icon ${card.starred ? 'starred' : ''}`;
            starIcon.textContent = card.starred ? '★' : '☆';
        }
        
        renderCards();
    }
}

// 打开清单项目详情
function openItemDetail(cardId, itemId) {
    currentCardId = cardId;
    currentItemId = itemId;
    
    const card = cards.find(c => c.id === cardId);
    if (card) {
        const checklist = card.checklist || [];
        const item = checklist.find(i => i.id === itemId);
        if (item) {
            document.getElementById('item-text').value = item.text;
            document.getElementById('item-note').value = item.note || '';
            document.getElementById('item-due-date').value = item.dueDate ? item.dueDate.slice(0, 10) : '';
            
            // 渲染文件列表
            const fileList = document.getElementById('item-file-list');
            fileList.innerHTML = '';
            
            if (item.files && item.files.length > 0) {
                item.files.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${file.size} bytes</span>
                        <button class="download-file-btn" onclick="downloadFile('${cardId}', '${itemId}', '${file.id}')">下载</button>
                        <button class="delete-file-btn" onclick="deleteFile('${cardId}', '${itemId}', '${file.id}')">删除</button>
                    `;
                    fileList.appendChild(fileItem);
                });
            } else {
                fileList.innerHTML = '<p class="no-files">暂无附件</p>';
            }
            
            // 填充关联卡片选项
            const relatedCardSelect = document.getElementById('item-related-card');
            if (relatedCardSelect) {
                // 获取已删除卡片的ID列表
                const deletedCardIds = recycledCards.map(card => card.id);
                console.log('已删除卡片ID列表:', deletedCardIds);
                console.log('活跃卡片数量:', cards.length);
                console.log('已完成卡片数量:', completedCards.length);
                console.log('回收站卡片数量:', recycledCards.length);
                // 只显示未删除且标题不包含"删除"的卡片
                const availableCards = [
                    ...cards.filter(card => !deletedCardIds.includes(card.id) && !card.title.includes('删除')),
                    ...completedCards.filter(card => !deletedCardIds.includes(card.id) && !card.title.includes('删除'))
                ];
                console.log('可用卡片数量:', availableCards.length);
                console.log('可用卡片列表:', availableCards.map(c => ({id: c.id, title: c.title})));
                relatedCardSelect.innerHTML = '<option value="">无</option>' + 
                    availableCards.map(c => `<option value="${c.id}" ${item.relatedCard === c.id ? 'selected' : ''}>${c.title}</option>`).join('');
            }
            
            // 显示详情页
            document.getElementById('checklist-item-detail').classList.add('active');
        }
    }
}

// 关闭清单项目详情
function closeItemDetail() {
    document.getElementById('checklist-item-detail').classList.remove('active');
    currentItemId = null;
}

// 处理文件上传
function handleFileUpload(e) {
    if (currentCardId && currentItemId) {
        const files = e.target.files;
        const card = cards.find(c => c.id === currentCardId);
        
        if (card) {
            const checklist = card.checklist || [];
            const item = checklist.find(i => i.id === currentItemId);
            if (item) {
                if (!item.files) {
                    item.files = [];
                }
                
                let uploadedCount = 0;
                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        item.files.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            lastModified: file.lastModified,
                            content: e.target.result // 存储base64编码的文件内容
                        });
                        
                        uploadedCount++;
                        if (uploadedCount === files.length) {
                            localStorage.setItem('cards', JSON.stringify(cards));
                            openItemDetail(currentCardId, currentItemId); // 重新打开详情页以更新内容
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
    }
}

// 删除文件
function deleteFile(cardId, itemId, fileId) {
    const card = cards.find(c => c.id === cardId);
    if (card) {
        const checklist = card.checklist || [];
        const item = checklist.find(i => i.id === itemId);
        if (item && item.files) {
            item.files = item.files.filter(file => file.id !== fileId);
            localStorage.setItem('cards', JSON.stringify(cards));
            openItemDetail(cardId, itemId); // 重新打开详情页以更新内容
        }
    }
}

// 下载文件
function downloadFile(cardId, itemId, fileId) {
    const card = cards.find(c => c.id === cardId);
    if (card) {
        const checklist = card.checklist || [];
        const item = checklist.find(i => i.id === itemId);
        if (item && item.files) {
            const file = item.files.find(f => f.id === fileId);
            if (file && file.content) {
                // 创建下载链接
                const link = document.createElement('a');
                link.href = file.content;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    }
}

// 保存清单项目详情
function saveItemDetail() {
    if (currentCardId && currentItemId) {
        const card = cards.find(c => c.id === currentCardId);
        if (card) {
            const checklist = card.checklist || [];
            const item = checklist.find(i => i.id === currentItemId);
            if (item) {
                item.text = document.getElementById('item-text').value.trim();
                item.note = document.getElementById('item-note').value;
                item.dueDate = document.getElementById('item-due-date').value ? new Date(document.getElementById('item-due-date').value).toISOString() : null;
                
                saveData('cards', cards);
                closeItemDetail();
                
                // 如果在详情页，更新内容
                if (currentCardId) {
                    openDetailPage(currentCardId);
                } else {
                    renderCards();
                }
            }
        }
    }
}

// 删除清单项目
function deleteChecklistItem() {
    if (currentCardId && currentItemId) {
        if (confirm('确定要删除此清单项目吗？')) {
            const card = cards.find(c => c.id === currentCardId);
            if (card) {
                // 确保checklist存在
                if (!card.checklist) {
                    card.checklist = [];
                }
                card.checklist = card.checklist.filter(item => item.id !== currentItemId);
                saveData('cards', cards);
                closeItemDetail();
                
                // 如果在详情页，更新内容
                if (currentCardId) {
                    openDetailPage(currentCardId);
                } else {
                    renderCards();
                }
            }
        }
    }
}

// 监听键盘事件
document.addEventListener('keypress', function(e) {
    // 按Enter键添加清单项
    if (e.target.id === 'detail-checklist-input' && e.key === 'Enter') {
        addChecklistItem();
    }
});

// 保存清单项目详情（点击保存按钮）
document.addEventListener('click', function(e) {
    if (e.target.id === 'save-item-detail-btn') {
        saveItemDetail();
    }
});

// 删除卡片
// 详情页删除卡片
function deleteCard() {
    if (currentCardId) {
        const card = cards.find(c => c.id === currentCardId);
        
        if (card) {
            if (confirm(`确定要删除卡片 "${card.title}" 吗？`)) {
                // 从卡片数组中删除卡片
                cards = cards.filter(c => c.id !== currentCardId);
                
                // 为卡片添加删除时间戳
                card.deletedAt = new Date().toISOString();
                
                // 将卡片添加到回收站
                recycledCards.push(card);
                
                // 保存数据
                saveData('cards', cards);
                saveData('recycledCards', recycledCards);
                
                // 关闭详情页
                closeDetailPage();
                
                // 重新渲染卡片
                renderCards();
            }
        }
    }
}

// 打开回收站
function openRecycleBin() {
    const modal = document.getElementById('recycle-bin-modal');
    const recycledCardsList = document.getElementById('recycled-cards-list');
    const recycleBinEmpty = document.getElementById('recycle-bin-empty');
    
    // 输出回收站卡片数量和内容
    console.log('回收站卡片数量:', recycledCards.length);
    console.log('回收站卡片内容:', recycledCards);
    
    // 清空列表
    recycledCardsList.innerHTML = '';
    
    if (recycledCards.length === 0) {
        // 显示空回收站提示
        recycleBinEmpty.style.display = 'block';
    } else {
        // 隐藏空回收站提示
        recycleBinEmpty.style.display = 'none';
        
        // 渲染回收的卡片
        recycledCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'recycled-card';
            cardElement.innerHTML = `
                <div class="recycled-card-header">
                    <h4>${card.title}</h4>
                    <span class="deleted-date">删除时间: ${new Date(card.deletedAt).toLocaleString()}</span>
                </div>
                <div class="recycled-card-actions">
                    <button class="restore-btn" onclick="restoreCard('${card.id}')">恢复</button>
                    <button class="delete-btn" onclick="permanentlyDeleteCard('${card.id}')">永久删除</button>
                </div>
            `;
            recycledCardsList.appendChild(cardElement);
        });
    }
    
    // 显示弹窗
    modal.classList.add('active');
}

// 关闭回收站
function closeRecycleBin() {
    const modal = document.getElementById('recycle-bin-modal');
    modal.classList.remove('active');
}

// 从回收站恢复卡片
function restoreCard(cardId) {
    const cardIndex = recycledCards.findIndex(c => c.id === cardId);
    if (cardIndex !== -1) {
        const card = recycledCards[cardIndex];
        
        // 从回收站中删除卡片
        recycledCards.splice(cardIndex, 1);
        
        // 从卡片中删除删除时间戳
        delete card.deletedAt;
        
        // 将卡片添加回卡片数组
        cards.push(card);
        
        // 保存数据
        saveData('cards', cards);
        saveData('recycledCards', recycledCards);
        
        // 重新渲染卡片
        renderCards();
        
        // 重新打开回收站，更新列表
        openRecycleBin();
    }
}

// 永久删除卡片
function permanentlyDeleteCard(cardId) {
    if (confirm('确定要永久删除此卡片吗？此操作不可恢复！')) {
        recycledCards = recycledCards.filter(c => c.id !== cardId);
        saveData('recycledCards', recycledCards);
        
        // 重新打开回收站，更新列表
        openRecycleBin();
    }
}

// 清空回收站
function emptyRecycleBin() {
    if (confirm('确定要清空回收站吗？此操作不可恢复！')) {
        recycledCards = [];
        saveData('recycledCards', recycledCards);
        
        // 重新打开回收站，更新列表
        openRecycleBin();
    }
}

// 打开归档项目
function openArchive() {
    const modal = document.getElementById('archive-modal');
    const archivedCardsList = document.getElementById('archived-cards-list');
    const archiveEmpty = document.getElementById('archive-empty');
    
    // 清空列表
    archivedCardsList.innerHTML = '';
    
    if (archivedCategories.length === 0) {
        // 显示空归档提示
        archiveEmpty.style.display = 'block';
    } else {
        // 隐藏空归档提示
        archiveEmpty.style.display = 'none';
        
        // 渲染归档的分类
        archivedCategories.forEach(archivedCategory => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'recycled-card';
            categoryElement.innerHTML = `
                <div class="recycled-card-header">
                    <h4>${archivedCategory.name}</h4>
                    <span class="deleted-date">归档时间: ${new Date(archivedCategory.archivedAt).toLocaleString()}</span>
                </div>
                <div class="recycled-card-actions">
                    <button class="restore-btn" onclick="restoreArchivedCategory('${archivedCategory.name}')">恢复</button>
                    <button class="delete-btn" onclick="deleteArchivedCategory('${archivedCategory.name}')">删除</button>
                </div>
            `;
            archivedCardsList.appendChild(categoryElement);
        });
    }
    
    // 显示弹窗
    modal.classList.add('active');
}

// 关闭归档项目
function closeArchive() {
    const modal = document.getElementById('archive-modal');
    modal.classList.remove('active');
}

// 从归档中恢复分类
function restoreArchivedCategory(categoryName) {
    const categoryIndex = archivedCategories.findIndex(c => c.name === categoryName);
    if (categoryIndex !== -1) {
        // 将分类添加回分类列表
        categories.push(categoryName);
        saveData('categories', categories);
        
        // 从归档分类列表中移除
        archivedCategories.splice(categoryIndex, 1);
        saveData('archivedCategories', archivedCategories);
        
        // 刷新归档显示
        openArchive();
        // 刷新分类显示
        renderCategories();
        renderFilterButtons();
    }
}

// 删除归档分类
function deleteArchivedCategory(categoryName) {
    if (confirm(`确定要删除归档分类 "${categoryName}" 吗？\n此操作不可恢复。`)) {
        // 从归档分类列表中移除
        archivedCategories = archivedCategories.filter(c => c.name !== categoryName);
        saveData('archivedCategories', archivedCategories);
        
        // 刷新归档显示
        openArchive();
    }
}

// 显示登录弹窗
function showLoginModal() {
    console.log('调用showLoginModal()函数');
    const loginModal = document.getElementById('login-modal');
    console.log('登录弹窗元素:', loginModal);
    console.log('添加active类前的类名:', loginModal.className);
    loginModal.classList.add('active');
    console.log('添加active类后的类名:', loginModal.className);
    console.log('登录弹窗的display样式:', window.getComputedStyle(loginModal).display);
}

// 隐藏登录弹窗
function hideLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.remove('active');
    }
}

// 显示注册弹窗
function showRegisterModal() {
    const registerModal = document.getElementById('register-modal');
    if (registerModal) {
        registerModal.classList.add('active');
    }
}

// 隐藏注册弹窗
function hideRegisterModal() {
    const registerModal = document.getElementById('register-modal');
    if (registerModal) {
        registerModal.classList.remove('active');
    }
}

// 登录
function login() {
    console.log('开始登录...');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    console.log('登录信息:', { email, password: '***' });
    
    // 先尝试初始化Firebase
    if (initializeFirebase()) {
        console.log('Firebase 初始化成功，开始登录...');
        const auth = firebase.auth();
        console.log('获取auth实例:', auth);
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('登录成功:', userCredential);
                // 登录成功
                const user = userCredential.user;
                currentUser = user;
                updateUserInfo();
                hideLoginModal();
                // 登录成功后跳转到工作台，先跳转再加载数据
                window.location.href = 'dashboard.html';
                // 加载数据（即使跳转后，这部分代码也会执行）
                loadDataFromFirebase();
            })
            .catch((error) => {
                console.error('登录失败:', error);
                console.error('错误代码:', error.code);
                console.error('错误信息:', error.message);
                const errorCode = error.code;
                let errorMessage = '';
                
                // 更友好的错误提示
                switch (errorCode) {
                    case 'auth/invalid-email':
                        errorMessage = '邮箱格式不正确';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = '该账号已被禁用';
                        break;
                    case 'auth/user-not-found':
                        errorMessage = '邮箱不存在，请先注册';
                        break;
                    case 'auth/wrong-password':
                    case 'auth/invalid-login-credentials':
                        errorMessage = '密码错误，请重新输入';
                        break;
                    default:
                        errorMessage = '登录失败，请稍后重试';
                }
                
                alert('登录失败: ' + errorMessage);
            });
    } else {
        console.error('Firebase 初始化失败，无法登录');
        alert('Firebase 未初始化，请刷新页面重试');
    }
}

// 注册
function register() {
    console.log('开始注册...');
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    console.log('注册信息:', { email, password: '***', confirmPassword: '***' });
    
    if (password !== confirmPassword) {
        alert('密码和确认密码不一致');
        return;
    }
    
    // 先尝试初始化Firebase
    if (initializeFirebase()) {
        console.log('Firebase 初始化成功，开始注册...');
        const auth = firebase.auth();
        console.log('获取auth实例:', auth);
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('注册成功:', userCredential);
                // 注册成功
                const user = userCredential.user;
                currentUser = user;
                updateUserInfo();
                hideRegisterModal();
                // 保存初始数据到Firebase
                saveData('categories', categories);
                saveData('cards', cards);
                // 注册成功后跳转到工作台
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                console.error('注册失败:', error);
                const errorCode = error.code;
                let errorMessage = '';
                
                // 更友好的错误提示
                switch (errorCode) {
                    case 'auth/invalid-email':
                        errorMessage = '邮箱格式不正确';
                        break;
                    case 'auth/email-already-in-use':
                        errorMessage = '该邮箱已被注册';
                        break;
                    case 'auth/weak-password':
                        errorMessage = '密码长度至少6位';
                        break;
                    default:
                        errorMessage = '注册失败，请稍后重试';
                }
                
                alert('注册失败: ' + errorMessage);
            });
    } else {
        console.error('Firebase 初始化失败，无法注册');
        alert('Firebase 未初始化，请刷新页面重试');
    }
}

// 退出
function logout() {
    // 先尝试初始化Firebase
    if (initializeFirebase()) {
        const auth = firebase.auth();
        auth.signOut().then(() => {
            // 退出成功
            currentUser = null;
            updateUserInfo();
            alert('已退出登录');
            // 跳转到登录页面
            window.location.href = 'index.html';
        }).catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert('退出失败: ' + errorMessage);
        });
    } else {
        alert('Firebase 未初始化');
        console.error('Firebase SDK 未加载或初始化失败');
    }
}

// 更新用户信息
function updateUserInfo() {
    if (currentUser) {
        // 检查元素是否存在，避免在 home.html 页面中出错
        const authContainer = document.getElementById('auth-container');
        const userInfo = document.getElementById('user-info');
        const userEmail = document.getElementById('user-email');
        
        if (authContainer) {
            authContainer.style.display = 'none';
        }
        if (userInfo) {
            userInfo.style.display = 'block';
        }
        if (userEmail) {
            userEmail.textContent = currentUser.email;
        }
    } else {
        // 检查元素是否存在，避免在 home.html 页面中出错
        const authContainer = document.getElementById('auth-container');
        const userInfo = document.getElementById('user-info');
        
        if (authContainer) {
            authContainer.style.display = 'block';
        }
        if (userInfo) {
            userInfo.style.display = 'none';
        }
    }
}

