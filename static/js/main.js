// 存储专业术语的对象，按分类存储
let terms = {
    'TikTok': {}  // 默认分类
};

// 当前选中的分类
let currentCategory = 'TikTok';

// 从 localStorage 加载术语
function loadTerms() {
    const savedTerms = localStorage.getItem('translationTerms');
    if (savedTerms) {
        terms = JSON.parse(savedTerms);
    } else {
        // 清空所有分类，只保留默认分类
        terms = {
            'TikTok': {}
        };
        saveTerms();  // 保存空的术语库
    }
    updateCategorySelect();
    updateTermsList();
}

// 保存术语到 localStorage
function saveTerms() {
    localStorage.setItem('translationTerms', JSON.stringify(terms));
}

// DOM 元素
const langBtns = document.querySelectorAll('.lang-btn');
const swapBtn = document.getElementById('swapBtn');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const loadingBar = document.getElementById('loadingBar');
const termInput = document.getElementById('termInput');
const translationInput = document.getElementById('translationInput');
const addTermBtn = document.getElementById('addTermBtn');
const termsList = document.getElementById('termsList');
const themeSwitch = document.querySelector('.theme-switch');
const expandBtn = document.querySelector('.expand-btn');
const termsPanel = document.querySelector('.terms-panel');
const speakBtns = document.querySelectorAll('.tool-btn[title="朗读"]');
const clearBtns = document.querySelectorAll('.tool-btn[title="清空"]');
const copyBtns = document.querySelectorAll('.tool-btn[title="复制"]');
const suggestBtn = document.querySelector('.suggest-btn');
const translateBtn = document.getElementById('translateBtn');

// 当前翻译方向
let currentDirection = 'en2zh';

// 语言切换
langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        langBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDirection = btn.dataset.lang === 'en' ? 'en2zh' : 'zh2en';
        updateLanguageLabels();
    });
});

// 更新语言标签
function updateLanguageLabels() {
    const sourceLang = currentDirection === 'en2zh' ? '英语' : '中文';
    const targetLang = currentDirection === 'en2zh' ? '中文' : '英语';
    document.querySelector('.source .lang-label').textContent = sourceLang;
    document.querySelector('.target .lang-label').textContent = targetLang;
    
    // 更新翻译按钮文本
    translateBtn.innerHTML = `
        <i class="fas fa-language"></i>
        <span>${currentDirection === 'en2zh' ? 'Translate' : '翻译'}</span>
    `;
}

// 交换语言
swapBtn.addEventListener('click', () => {
    currentDirection = currentDirection === 'en2zh' ? 'zh2en' : 'en2zh';
    const tempText = inputText.value;
    inputText.value = outputText.value;
    outputText.value = tempText;
    
    // 更新语言按钮状态
    langBtns.forEach(btn => {
        btn.classList.toggle('active');
    });
    updateLanguageLabels();
});

// 翻译功能
async function translate() {
    try {
        const text = inputText.value.trim();
        if (!text) {
            showNotification('请输入要翻译的文本', 'error');
            return;
        }

        // 显示加载动画
        loadingBar.style.width = '30%';

        // 设置源语言和目标语言
        const sourceLang = currentDirection === 'en2zh' ? 'en' : 'zh';
        const targetLang = currentDirection === 'en2zh' ? 'zh' : 'en';

        // 在翻译前应用术语替换
        let processedText = text;
        
        // 创建术语映射
        const termMap = new Map();
        // 只使用当前分类的术语
        const categoryTerms = terms[currentCategory];
        for (const [term1, term2] of Object.entries(categoryTerms)) {
            if (currentDirection === 'en2zh') {
                // 英译中：将所有英文术语转为小写存储
                termMap.set(term1.toLowerCase(), term2);
            } else {
                // 中译英：直接存储中文术语
                termMap.set(term2, term1);
            }
        }

        // 按长度排序源语言术语（避免部分匹配问题）
        const sortedTerms = Array.from(termMap.keys())
            .sort((a, b) => b.length - a.length);
        
        // 替换术语
        for (const sourceTerm of sortedTerms) {
            if (currentDirection === 'en2zh') {
                // 英译中：不区分大小写匹配
                const regex = new RegExp(`\\b${sourceTerm}\\b`, 'gi');
                if (regex.test(processedText)) {
                    processedText = processedText.replace(regex, termMap.get(sourceTerm.toLowerCase()));
                }
            } else {
                // 中译英：精确匹配
                if (processedText.includes(sourceTerm)) {
                    const regex = new RegExp(sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                    processedText = processedText.replace(regex, termMap.get(sourceTerm));
                }
            }
        }

        console.log('处理后的文本:', processedText); // 调试用

        // 使用 MyMemory API
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(processedText)}&langpair=${sourceLang}|${targetLang}`;
        
        loadingBar.style.width = '60%';
        
        const response = await fetch(url);
        const data = await response.json();

        loadingBar.style.width = '90%';

        if (data.responseStatus === 200) {
            let translatedText = data.responseData.translatedText;
            
            // 处理翻译结果中的空格问题
            if (currentDirection === 'en2zh') {
                // 1. 先处理专业术语
                // 只使用当前分类的术语
                for (const [term1, term2] of Object.entries(categoryTerms)) {
                    const regex = new RegExp(`\\s*\\b${term1}\\b\\s*`, 'gi');
                    translatedText = translatedText.replace(regex, term2);
                }
                
                // 2. 处理英文所有格
                translatedText = translatedText
                    // 处理's的情况
                    .replace(/(\S+)的\s+/g, '$1的')
                    // 处理s'的情况
                    .replace(/(\S+)们的\s+/g, '$1们的');
                
                // 3. 清理中文之间的空格
                translatedText = translatedText
                    // 移除中文字符之间的空格
                    .replace(/([一-龥])\s+([一-龥])/g, '$1$2')
                    // 移除中文与英文之间多余的空格，只保留一个
                    .replace(/([一-龥])\s+([a-zA-Z])/g, '$1 $2')
                    .replace(/([a-zA-Z])\s+([一-龥])/g, '$1 $2')
                    // 清理标点符号周围的空格
                    .replace(/\s*([，。！？；：、])\s*/g, '$1')
                    // 清理括号内外的空格
                    .replace(/\s*[（(]\s*/g, '（')
                    .replace(/\s*[）)]\s*/g, '）')
                    // 清理中文前后的空格
                    .replace(/\s+([一-龥])/g, '$1')
                    .replace(/([一-龥])\s+/g, '$1')
                    // 清理首尾空格
                    .trim();
            }
            
            outputText.value = translatedText;
            showNotification('翻译完成', 'success');
        } else {
            throw new Error(data.responseDetails || '翻译失败');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        loadingBar.style.width = '100%';
        setTimeout(() => {
            loadingBar.style.width = '0';
        }, 500);
    }
}

// 文本朗读
speakBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const textarea = btn.closest('.editor').querySelector('textarea');
        const text = textarea.value;
        if (text) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = currentDirection === 'en2zh' ? 
                (textarea === inputText ? 'en-US' : 'zh-CN') :
                (textarea === inputText ? 'zh-CN' : 'en-US');
            speechSynthesis.speak(utterance);
        }
    });
});

// 清空按钮
clearBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const textarea = btn.closest('.editor').querySelector('textarea');
        textarea.value = '';
        if (textarea === inputText) {
            document.querySelector('.char-count').textContent = '0/5000';
        }
        showNotification('已清空文本', 'success');
    });
});

// 复制按钮
copyBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const textarea = btn.closest('.editor').querySelector('textarea');
        try {
            await navigator.clipboard.writeText(textarea.value);
            showNotification('已复制到剪贴板', 'success');
        } catch (err) {
            showNotification('复制失败，请手动复制', 'error');
        }
    });
});

// 深色模式切换
themeSwitch.addEventListener('click', () => {
    document.documentElement.setAttribute(
        'data-theme',
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    );
    themeSwitch.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ?
        '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// 术语面板展开/折叠
expandBtn.addEventListener('click', () => {
    const content = termsPanel.querySelector('.terms-list-container');
    const isExpanded = content.style.display !== 'none';
    content.style.display = isExpanded ? 'none' : 'block';
    expandBtn.innerHTML = isExpanded ? 
        '<i class="fas fa-chevron-down"></i>' : 
        '<i class="fas fa-chevron-up"></i>';
});

// 更新分类选择器
function updateCategorySelect() {
    const select = document.getElementById('categorySelect');
    select.innerHTML = '';
    Object.keys(terms).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        option.selected = category === currentCategory;
        select.appendChild(option);
    });
}

// 添加分类按钮事件
document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const category = prompt('请输入新的分类名称：');
    if (category && !terms[category]) {
        terms[category] = {};
        currentCategory = category;
        saveTerms();
        updateCategorySelect();
        showNotification('分类添加成功', 'success');
    }
});

// 分类选择事件
document.getElementById('categorySelect').addEventListener('change', (e) => {
    currentCategory = e.target.value;
    updateTermsList();
});

// 批量导入按钮事件
document.getElementById('importTermsBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

// 文件导入处理
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const lines = content.split('\n');
                let importCount = 0;

                lines.forEach(line => {
                    const [zh, en] = line.trim().split(',').map(s => s.trim());
                    if (zh && en) {
                        terms[currentCategory][zh] = en;
                        terms[currentCategory][en] = zh;
                        importCount++;
                    }
                });

                saveTerms();
                updateTermsList();
                showNotification(`成功导入 ${importCount} 对术语`, 'success');
            } catch (error) {
                showNotification('导入失败，请检查文件格式', 'error');
            }
        };
        reader.readAsText(file);
    }
    e.target.value = ''; // 重置文件输入
});

// 更新添加术语的逻辑
addTermBtn.addEventListener('click', () => {
    const term = termInput.value.trim();
    const translation = translationInput.value.trim();

    if (!term || !translation) {
        showNotification('请输入完整的术语和翻译', 'error');
        return;
    }

    // 添加到当前分类
    terms[currentCategory][term] = translation;
    terms[currentCategory][translation] = term;
    
    saveTerms();
    updateTermsList();
    termInput.value = '';
    translationInput.value = '';
    showNotification('术语添加成功', 'success');
});

// 更新术语列表显示
function updateTermsList() {
    termsList.innerHTML = '';
    const addedPairs = new Set();
    
    const categoryTerms = terms[currentCategory];
    for (const [term, translation] of Object.entries(categoryTerms)) {
        const pair = [term, translation].sort().join('|');
        if (addedPairs.has(pair)) continue;
        addedPairs.add(pair);
        
        const termItem = document.createElement('div');
        termItem.className = 'term-item';
        termItem.innerHTML = `
            <div class="term-text">
                <span class="term">${term}</span>
                <i class="fas fa-exchange-alt"></i>
                <span class="translation">${translation}</span>
            </div>
            <button class="delete-btn" onclick="deleteTerm('${term}', '${translation}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
        termsList.appendChild(termItem);
    }
}

// 更新删除术语的逻辑
function deleteTerm(term, translation) {
    delete terms[currentCategory][term];
    delete terms[currentCategory][translation];
    saveTerms();
    updateTermsList();
    showNotification('术语已删除', 'success');
}

// 显示通知
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.getElementById('notifications').appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// 移除自动翻译相关代码
inputText.addEventListener('input', () => {
    // 只保留字数统计功能
    const count = inputText.value.length;
    document.querySelector('.char-count').textContent = `${count}/5000`;
});

// 添加翻译按钮点击事件
translateBtn.addEventListener('click', translate);

// 清空所有术语和分类
function clearAllTerms() {
    terms = {
        'TikTok': {}
    };
    currentCategory = 'TikTok';
    saveTerms();
    updateCategorySelect();
    updateTermsList();
}

// 密码验证
const DEFAULT_PASSWORD = '0000';
const passwordOverlay = document.getElementById('passwordOverlay');
const passwordInput = document.getElementById('passwordInput');
const submitPassword = document.getElementById('submitPassword');

// 检查是否已验证
function checkAuth() {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
        passwordOverlay.style.display = 'flex';
    } else {
        passwordOverlay.style.display = 'none';
    }
}

// 密码验证
submitPassword.addEventListener('click', () => {
    if (passwordInput.value === DEFAULT_PASSWORD) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('adminKey', '1234567890');  // 设置管理员密钥
        passwordOverlay.style.display = 'none';
        showNotification('管理员验证成功', 'success');
    } else {
        // 普通用户直接通过
        localStorage.setItem('isAuthenticated', 'true');
        passwordOverlay.style.display = 'none';
        showNotification('访问成功', 'success');
    }
});

// 回车提交密码
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitPassword.click();
    }
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadTerms();
    updateLanguageLabels();
}); 
