/**
 * 基金从业资格考试题库系统 - 完整版
 * 支持三科目：基金法律法规、证券投资基金基础知识、私募股权投资基金基础知识
 * 支持三模式：章节练习、历年真题、考前点题
 */

// ==================== 全局状态管理 ====================
const state = {
    // 当前选择
    currentSubject: 'subject1',
    currentMode: 'chapter', // chapter | pastPaper | spotQuestion
    
    // 章节练习状态
    currentChapter: null,
    currentSection: null,
    
    // 真题/点题状态
    currentPaper: null,
    paperStartTime: null,
    paperTimer: null,
    paperTimeLimit: 120 * 60, // 120分钟（秒）
    paperTimeRemaining: 120 * 60,
    
    // 题目状态
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {}, // { questionIndex: selectedOption }
    markedQuestions: new Set(), // 标记的题目索引
    
    // 错题和收藏
    wrongQuestions: new Set(), // 格式: "subject_mode_paperId_questionIndex"
    favoriteQuestions: new Set(), // 格式同上
    
    // 答题卡
    answerCardOpen: false,
    
    // 试卷提交状态
    submittedPapers: new Set(), // 已提交的试卷ID
    
    // 自动跳转设置
    autoNext: true // 答对后自动跳转下一题
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 检查数据加载
    if (typeof examDB === 'undefined') {
        console.error('题库数据未加载');
        document.getElementById('sidebarContent').innerHTML = 
            '<div style="padding: 20px; color: #ef4444;">数据加载失败，请刷新页面重试</div>';
        return;
    }
    
    // 加载本地存储数据
    loadLocalData();
    
    // 初始化UI
    initUI();
    
    // 更新统计
    updateStats();
}

// ==================== UI初始化 ====================
function initUI() {
    // 科目切换
    document.querySelectorAll('.subject-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const subject = tab.dataset.subject;
            switchSubject(subject);
            
            // 更新激活状态
            document.querySelectorAll('.subject-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
    
    // 模式切换
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            switchMode(mode);
            
            // 更新激活状态
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
    
    // 工具栏按钮
    document.getElementById('favoritesBtn')?.addEventListener('click', showFavorites);
    document.getElementById('answerCardBtn')?.addEventListener('click', toggleAnswerCard);
    document.getElementById('resetBtn')?.addEventListener('click', resetCurrentProgress);

    // 自动跳转开关
    const autoNextToggle = document.getElementById('autoNextToggle');
    if (autoNextToggle) {
        autoNextToggle.checked = state.autoNext;
        autoNextToggle.addEventListener('change', (e) => {
            state.autoNext = e.target.checked;
        });
    }

    // 导航按钮
    document.getElementById('prevBtn')?.addEventListener('click', prevQuestion);
    document.getElementById('nextBtn')?.addEventListener('click', nextQuestion);

    // 题目操作按钮
    document.getElementById('markBtn')?.addEventListener('click', toggleMark);
    document.getElementById('submitPaperBtn')?.addEventListener('click', submitPaper);

    // 关闭弹窗
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('closeFavorites')?.addEventListener('click', closeFavorites);
    document.getElementById('closeResult')?.addEventListener('click', closeResult);
    document.getElementById('closeAnswerCard')?.addEventListener('click', toggleAnswerCard);
    
    // 遮罩层点击
    document.getElementById('overlay')?.addEventListener('click', closeAllModals);
    
    // 移动端菜单
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // 初始化侧边栏
    renderSidebar();

    // 初始化移动端触摸滑动支持
    initMobileTouch();
}

// ==================== 移动端触摸滑动支持 ====================
function initMobileTouch() {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    const sidebar = document.getElementById('sidebar');
    const contentArea = document.querySelector('.content-area');

    // 从屏幕左侧边缘滑动打开侧边栏
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // 水平滑动距离大于垂直滑动距离，且滑动距离超过50px
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            // 从左侧边缘向右滑动打开侧边栏
            if (deltaX > 0 && touchStartX < 50) {
                sidebar?.classList.add('open');
            }
            // 向左滑动关闭侧边栏
            else if (deltaX < 0 && sidebar?.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }
    }, { passive: true });

    // 题目区域左右滑动切换题目
    const questionCard = document.getElementById('questionCard');
    if (questionCard) {
        questionCard.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        questionCard.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const deltaX = touchEndX - touchStartX;

            // 滑动距离超过100px才切换题目
            if (Math.abs(deltaX) > 100) {
                if (deltaX > 0) {
                    // 向右滑动 - 上一题
                    prevQuestion();
                } else {
                    // 向左滑动 - 下一题
                    nextQuestion();
                }
            }
        }, { passive: true });
    }
}

// ==================== 科目和模式切换 ====================
function switchSubject(subjectId) {
    state.currentSubject = subjectId;
    state.currentChapter = null;
    state.currentSection = null;
    state.currentPaper = null;
    state.questions = [];
    state.currentQuestionIndex = 0;
    state.userAnswers = {};
    
    // 重置UI
    resetPracticeArea();
    renderSidebar();
    updateStats();
}

function switchMode(mode) {
    state.currentMode = mode;
    state.currentChapter = null;
    state.currentSection = null;
    state.currentPaper = null;
    state.questions = [];
    state.currentQuestionIndex = 0;
    state.userAnswers = {};
    
    // 停止计时器
    if (state.paperTimer) {
        clearInterval(state.paperTimer);
        state.paperTimer = null;
    }
    
    // 更新侧边栏标题
    const titles = {
        chapter: '章节列表',
        pastPaper: '历年真题',
        spotQuestion: '考前点题'
    };
    document.getElementById('sidebarTitle').textContent = titles[mode];
    
    // 重置UI
    resetPracticeArea();
    renderSidebar();
}

function resetPracticeArea() {
    document.getElementById('welcomeScreen').style.display = 'flex';
    document.getElementById('questionWrapper').style.display = 'none';
    document.getElementById('footerNav').style.display = 'none';
    document.getElementById('timerBar').style.display = 'none';
    document.getElementById('submitPaperBtn').style.display = 'none';
    document.getElementById('currentTitle').textContent = '请选择章节或试卷';
    document.getElementById('progressInfo').textContent = '';
    
    // 关闭答题卡
    state.answerCardOpen = false;
    document.getElementById('answerCardSidebar').classList.remove('open');
    document.querySelector('.content-area').classList.remove('answer-card-open');
}

// ==================== 侧边栏渲染 ====================
function renderSidebar() {
    const container = document.getElementById('sidebarContent');
    const subject = examDB[state.currentSubject];
    
    if (!subject) {
        container.innerHTML = '<div style="padding: 20px;">暂无数据</div>';
        return;
    }
    
    if (state.currentMode === 'chapter') {
        renderChapterSidebar(container, subject);
    } else if (state.currentMode === 'pastPaper') {
        renderPaperSidebar(container, subject.pastPapers, '真题');
    } else if (state.currentMode === 'spotQuestion') {
        renderPaperSidebar(container, subject.spotQuestions, '点题');
    }
}

function getSectionStats(chapterId, sectionId, subject) {
    // 计算子章节（节）的正确率和进度统计
    const questions = subject.chapterQuestions[chapterId]?.[sectionId];
    if (!questions) return { total: 0, answered: 0, correct: 0, accuracy: 0 };

    const progressKey = `${state.currentSubject}_chapter_${chapterId}_${sectionId}`;
    const saved = localStorage.getItem(`progress_${progressKey}`);
    const progress = saved ? JSON.parse(saved) : null;
    const answers = progress?.answers || {};

    let total = questions.length;
    let answered = 0;
    let correct = 0;

    questions.forEach((question, idx) => {
        if (answers[idx] !== undefined) {
            answered++;
            if (answers[idx] === question.answer) {
                correct++;
            }
        }
    });

    const accuracy = answered > 0 ? (correct / answered * 100).toFixed(2) : 0;
    return { total, answered, correct, accuracy };
}

function getChapterStats(chapterId, subject) {
    // 计算章节的正确率和进度统计
    const chapterQuestions = subject.chapterQuestions[chapterId];
    if (!chapterQuestions) return { total: 0, answered: 0, correct: 0, accuracy: 0 };

    let total = 0;
    let answered = 0;
    let correct = 0;

    // 遍历所有节
    Object.keys(chapterQuestions).forEach(sectionId => {
        const sectionStats = getSectionStats(chapterId, sectionId, subject);
        total += sectionStats.total;
        answered += sectionStats.answered;
        correct += sectionStats.correct;
    });

    const accuracy = answered > 0 ? (correct / answered * 100).toFixed(2) : 0;
    return { total, answered, correct, accuracy };
}

function renderChapterSidebar(container, subject) {
    let html = '';

    // 对章节按章号排序
    const sortedChapters = [...subject.chapters].sort((a, b) => {
        const matchA = a.title.match(/第(\d+)章/);
        const matchB = b.title.match(/第(\d+)章/);
        const numA = matchA ? parseInt(matchA[1]) : 999;
        const numB = matchB ? parseInt(matchB[1]) : 999;
        return numA - numB;
    });

    sortedChapters.forEach((chapter, idx) => {
        const isActive = state.currentChapter === chapter.id;

        // 计算章节统计
        const stats = getChapterStats(chapter.id, subject);
        const statsText = stats.answered > 0
            ? `<span class="chapter-stats">${stats.accuracy}% (${stats.answered}/${stats.total})</span>`
            : `<span class="chapter-stats">0/${stats.total}</span>`;

        // 对节按节号排序
        const sortedSections = [...chapter.sections].sort((a, b) => {
            const matchA = a.title.match(/第(\d+)节/);
            const matchB = b.title.match(/第(\d+)节/);
            const numA = matchA ? parseInt(matchA[1]) : 999;
            const numB = matchB ? parseInt(matchB[1]) : 999;
            return numA - numB;
        });

        html += `
            <div class="chapter-group ${isActive ? '' : 'collapsed'}">
                <div class="chapter-title" onclick="toggleChapter('${chapter.id}')">
                    <span>${chapter.title}</span>
                    ${statsText}
                </div>
                <div class="section-list">
                    ${sortedSections.map(section => {
                        const sectionStats = getSectionStats(chapter.id, section.id, subject);
                        const sectionStatsText = sectionStats.answered > 0
                            ? `<span class="section-stats">${sectionStats.accuracy}% (${sectionStats.answered}/${sectionStats.total})</span>`
                            : `<span class="section-stats">0/${sectionStats.total}</span>`;
                        return `
                        <div class="section-item ${state.currentSection === section.id ? 'active' : ''}"
                             onclick="selectSection('${chapter.id}', '${section.id}')">
                            <span>${section.title}</span>
                            ${sectionStatsText}
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderPaperSidebar(container, papers, type) {
    if (!papers || papers.length === 0) {
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b;">暂无${type}数据</div>`;
        return;
    }
    
    let html = '<div class="paper-list">';
    papers.forEach(paper => {
        html += `
            <div class="paper-item ${state.currentPaper === paper.id ? 'active' : ''}" 
                 onclick="selectPaper('${paper.id}')">
                <div class="paper-name">${paper.name}</div>
                <div class="paper-meta">共 ${paper.total} 题 ${paper.year ? `· ${paper.year}年` : ''}</div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// ==================== 选择章节/试卷 ====================
function toggleChapter(chapterId) {
    // 找到对应的章节组并切换折叠状态
    const chapterGroups = document.querySelectorAll('.chapter-group');
    chapterGroups.forEach(group => {
        const title = group.querySelector('.chapter-title');
        if (title.textContent.includes(examDB[state.currentSubject].chapters.find(c => c.id === chapterId)?.title)) {
            group.classList.toggle('collapsed');
        }
    });
}

function selectSection(chapterId, sectionId) {
    const subject = examDB[state.currentSubject];
    const questions = subject.chapterQuestions[chapterId]?.[sectionId];
    
    if (!questions || questions.length === 0) {
        alert('该章节暂无题目');
        return;
    }
    
    // 更新状态
    state.currentChapter = chapterId;
    state.currentSection = sectionId;
    state.questions = questions;
    state.currentQuestionIndex = 0;
    state.userAnswers = {};
    
    // 加载进度
    loadProgress();
    
    // 更新UI
    const chapter = subject.chapters.find(c => c.id === chapterId);
    const section = chapter.sections.find(s => s.id === sectionId);
    document.getElementById('currentTitle').textContent = `${chapter.title} - ${section.title}`;
    
    // 更新侧边栏激活状态
    renderSidebar();
    
    // 显示题目
    showQuestionArea();
    renderQuestion();
    updateProgress();
}

function selectPaper(paperId) {
    const subject = examDB[state.currentSubject];
    const questions = state.currentMode === 'pastPaper' 
        ? subject.paperQuestions[paperId]
        : subject.spotQuestionData[paperId];
    
    if (!questions || questions.length === 0) {
        alert('该试卷暂无题目');
        return;
    }
    
    // 检查是否已提交过
    const paperKey = `${state.currentSubject}_${state.currentMode}_${paperId}`;
    const isSubmitted = state.submittedPapers.has(paperKey);
    
    if (isSubmitted) {
        if (!confirm('您已完成此试卷，是否重新练习？')) {
            return;
        }
        // 清除之前的记录
        state.submittedPapers.delete(paperKey);
        clearPaperProgress(paperKey);
    }
    
    // 更新状态
    state.currentPaper = paperId;
    state.questions = questions;
    state.currentQuestionIndex = 0;
    state.userAnswers = {};
    state.paperStartTime = Date.now();
    state.paperTimeRemaining = state.paperTimeLimit;
    
    // 加载进度
    loadProgress();
    
    // 更新UI
    const papers = state.currentMode === 'pastPaper' ? subject.pastPapers : subject.spotQuestions;
    const paper = papers.find(p => p.id === paperId);
    document.getElementById('currentTitle').textContent = paper.name;
    
    // 显示计时器和提交按钮
    document.getElementById('timerBar').style.display = 'flex';
    document.getElementById('submitPaperBtn').style.display = 'inline-flex';
    
    // 启动计时器
    startTimer();
    
    // 更新侧边栏激活状态
    renderSidebar();
    
    // 显示题目
    showQuestionArea();
    renderQuestion();
    updateProgress();
}

function showQuestionArea() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('questionWrapper').style.display = 'block';
    document.getElementById('footerNav').style.display = 'flex';
}

// ==================== 计时器 ====================
function startTimer() {
    if (state.paperTimer) {
        clearInterval(state.paperTimer);
    }
    
    updateTimerDisplay();
    
    state.paperTimer = setInterval(() => {
        state.paperTimeRemaining--;
        updateTimerDisplay();
        
        if (state.paperTimeRemaining <= 0) {
            clearInterval(state.paperTimer);
            submitPaper();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.paperTimeRemaining / 60);
    const seconds = state.paperTimeRemaining % 60;
    const display = document.getElementById('timerDisplay');
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 少于5分钟时变红闪烁
    if (state.paperTimeRemaining < 300) {
        display.classList.add('warning');
    } else {
        display.classList.remove('warning');
    }
}

// ==================== 题目渲染 ====================
function renderQuestion() {
    const question = state.questions[state.currentQuestionIndex];
    if (!question) return;
    
    const container = document.getElementById('questionCard');
    const userAnswer = state.userAnswers[state.currentQuestionIndex];
    const isMarked = state.markedQuestions.has(getCurrentQuestionKey());
    const isWrong = state.wrongQuestions.has(getCurrentQuestionKey());
    
    // 构建选项HTML
    const optionsHtml = Object.entries(question.options || {}).map(([letter, text]) => {
        let className = 'option-item';
        if (userAnswer === letter) {
            className += ' selected';
            if (userAnswer === question.answer) {
                className += ' correct';
            } else {
                className += ' wrong';
            }
        } else if (userAnswer && letter === question.answer) {
            className += ' correct';
        }
        
        return `
            <div class="${className}" onclick="selectOption('${letter}')">
                <span class="option-letter">${letter}</span>
                <span class="option-text">${escapeHtml(text)}</span>
            </div>
        `;
    }).join('');
    
    // 构建标记和错题标记
    const badges = [];
    if (isMarked) badges.push('<span class="marked-status">🔖 已标记</span>');
    if (isWrong) badges.push('<span class="wrong-badge">❌ 错题</span>');
    
    // 构建答案解析区域
    let answerHtml = '';
    if (userAnswer) {
        const isCorrect = userAnswer === question.answer;
        answerHtml = `
            <div class="answer-section">
                <div class="answer-header">
                    <span class="answer-label">正确答案:</span>
                    <span class="answer-value ${isCorrect ? '' : 'wrong'}">${question.answer}</span>
                    <span class="answer-label" style="margin-left: 16px;">你的答案:</span>
                    <span class="answer-value ${isCorrect ? '' : 'wrong'}">${userAnswer}</span>
                </div>
                ${question.explanation ? `
                    <div class="explanation-box">
                        <div class="explanation-title">解析</div>
                        <div class="explanation-content">${escapeHtml(question.explanation)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 检查是否已收藏
    const questionKey = getCurrentQuestionKey();
    const isFavorite = state.favoriteQuestions.has(questionKey);

    container.innerHTML = `
        <div class="question-header">
            <div>
                <span class="question-number">第 ${state.currentQuestionIndex + 1} / ${state.questions.length} 题</span>
                ${badges.join('')}
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite()" title="${isFavorite ? '取消收藏' : '添加收藏'}">
                    ${isFavorite ? '⭐' : '☆'}
                </button>
                <span class="question-type ${question.type === 'multiple' ? 'multiple' : ''}">
                    ${question.type === 'multiple' ? '多选题' : '单选题'}
                </span>
            </div>
        </div>
        <div class="question-content">${escapeHtml(question.q)}</div>
        <div class="options-list">
            ${optionsHtml}
        </div>
        ${answerHtml}
    `;
    
    // 更新按钮状态
    updateActionButtons();
}

function selectOption(option) {
    const question = state.questions[state.currentQuestionIndex];
    if (!question) return;
    
    // 检查是否已提交（真题模式）
    const paperKey = `${state.currentSubject}_${state.currentMode}_${state.currentPaper}`;
    if (state.currentMode !== 'chapter' && state.submittedPapers.has(paperKey)) {
        return; // 已提交不能修改答案
    }
    
    // 保存答案
    state.userAnswers[state.currentQuestionIndex] = option;
    
    // 检查是否正确
    const isCorrect = option === question.answer;
    const questionKey = getCurrentQuestionKey();
    
    if (!isCorrect) {
        state.wrongQuestions.add(questionKey);
    } else {
        state.wrongQuestions.delete(questionKey);
    }
    
    // 保存进度
    saveProgress();
    saveLocalData();
    
    // 重新渲染
    renderQuestion();
    updateProgress();
    
    // 更新答题卡
    if (state.answerCardOpen) {
        renderAnswerCard();
    }
    
    // 答对后自动跳转下一题
    if (isCorrect && state.autoNext) {
        setTimeout(() => {
            nextQuestion();
        }, 500); // 延迟500毫秒，让用户看到正确答案
    }
}

function updateActionButtons() {
    const markBtn = document.getElementById('markBtn');
    if (!markBtn) return;
    
    const questionKey = getCurrentQuestionKey();
    
    // 更新标记按钮
    if (state.markedQuestions.has(questionKey)) {
        markBtn.textContent = '🔖 取消标记';
        markBtn.classList.add('btn-primary');
    } else {
        markBtn.textContent = '🔖 标记';
        markBtn.classList.remove('btn-primary');
    }
}

// ==================== 导航功能 ====================
function prevQuestion() {
    if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderQuestion();
        updateProgress();
    }
}

function nextQuestion() {
    if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex++;
        renderQuestion();
        updateProgress();
    }
}

function jumpToQuestionByIndex(index) {
    if (index >= 0 && index < state.questions.length) {
        state.currentQuestionIndex = index;
        renderQuestion();
        updateProgress();
    }
}

function updateProgress() {
    const answered = Object.keys(state.userAnswers).length;
    const total = state.questions.length;
    
    document.getElementById('questionCounter').textContent = 
        `${state.currentQuestionIndex + 1} / ${total}`;
    document.getElementById('progressInfo').textContent = 
        `已答 ${answered}/${total} 题`;
}

// ==================== 标记和收藏功能 ====================
function toggleMark() {
    const questionKey = getCurrentQuestionKey();

    if (state.markedQuestions.has(questionKey)) {
        state.markedQuestions.delete(questionKey);
    } else {
        state.markedQuestions.add(questionKey);
    }

    saveLocalData();
    renderQuestion();

    if (state.answerCardOpen) {
        renderAnswerCard();
    }
}

function toggleFavorite() {
    const questionKey = getCurrentQuestionKey();
    
    if (state.favoriteQuestions.has(questionKey)) {
        state.favoriteQuestions.delete(questionKey);
    } else {
        state.favoriteQuestions.add(questionKey);
    }
    
    saveLocalData();
    renderQuestion();
}

// ==================== 答题卡 ====================
function toggleAnswerCard() {
    if (state.questions.length === 0) {
        alert('请先选择章节或试卷');
        return;
    }
    
    state.answerCardOpen = !state.answerCardOpen;
    const sidebar = document.getElementById('answerCardSidebar');
    const contentArea = document.querySelector('.content-area');
    
    if (state.answerCardOpen) {
        sidebar.classList.add('open');
        contentArea.classList.add('answer-card-open');
        renderAnswerCard();
    } else {
        sidebar.classList.remove('open');
        contentArea.classList.remove('answer-card-open');
    }
}

function renderAnswerCard() {
    const grid = document.getElementById('answerCardGrid');
    const correctEl = document.getElementById('cardCorrectCount');
    const wrongEl = document.getElementById('cardWrongCount');
    const unansweredEl = document.getElementById('cardUnansweredCount');
    const markedEl = document.getElementById('cardMarkedCount');
    
    let correct = 0, wrong = 0, unanswered = 0, marked = 0;
    
    const gridHtml = state.questions.map((q, idx) => {
        const userAnswer = state.userAnswers[idx];
        const questionKey = getQuestionKeyByIndex(idx);
        const isMarked = state.markedQuestions.has(questionKey);
        const isCurrent = idx === state.currentQuestionIndex;
        
        let className = 'answer-card-item';
        if (isCurrent) className += ' current';
        if (isMarked) {
            marked++;
            className += ' marked';
        }
        
        if (userAnswer !== undefined) {
            if (userAnswer === q.answer) {
                className += ' correct';
                correct++;
            } else {
                className += ' wrong';
                wrong++;
            }
        } else {
            unanswered++;
        }
        
        return `<div class="${className}" onclick="jumpToQuestionByIndex(${idx})">${idx + 1}</div>`;
    }).join('');
    
    grid.innerHTML = gridHtml;
    
    if (correctEl) correctEl.textContent = correct;
    if (wrongEl) wrongEl.textContent = wrong;
    if (unansweredEl) unansweredEl.textContent = unanswered;
    if (markedEl) markedEl.textContent = marked;
}

// ==================== 试卷提交和评分 ====================
function submitPaper() {
    if (state.questions.length === 0) return;
    
    // 停止计时器
    if (state.paperTimer) {
        clearInterval(state.paperTimer);
        state.paperTimer = null;
    }
    
    // 计算得分
    let correct = 0, wrong = 0, unanswered = 0;
    state.questions.forEach((q, idx) => {
        const userAnswer = state.userAnswers[idx];
        if (userAnswer === undefined || userAnswer === null) {
            unanswered++;
        } else if (userAnswer === q.answer) {
            correct++;
        } else {
            wrong++;
        }
    });
    
    const total = state.questions.length;
    const score = Math.round((correct / total) * 100);
    const timeUsed = state.paperTimeLimit - state.paperTimeRemaining;
    const minutes = Math.floor(timeUsed / 60);
    const seconds = timeUsed % 60;
    
    // 标记为已提交
    const paperKey = `${state.currentSubject}_${state.currentMode}_${state.currentPaper}`;
    state.submittedPapers.add(paperKey);
    saveLocalData();
    
    // 显示结果
    const resultBody = document.getElementById('resultBody');
    resultBody.innerHTML = `
        <div class="result-score">
            <div class="score-number">${score}</div>
            <div class="score-label">分 (${correct}/${total} 正确)</div>
            <div style="color: #64748b; margin-bottom: 24px;">
                用时: ${minutes}分${seconds}秒
            </div>
            <div class="result-stats">
                <div class="result-stat">
                    <div class="result-stat-value correct">${correct}</div>
                    <div class="result-stat-label">答对</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-value wrong">${wrong}</div>
                    <div class="result-stat-label">答错</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-value unanswered">${unanswered}</div>
                    <div class="result-stat-label">未答</div>
                </div>
            </div>
            <div class="result-actions">
                <button class="btn btn-primary" onclick="closeResult(); reviewPaper();">查看解析</button>
                <button class="btn btn-secondary" onclick="closeResult(); resetCurrentProgress();">重新练习</button>
            </div>
        </div>
    `;
    
    document.getElementById('resultModal').classList.add('active');
    
    // 隐藏提交按钮
    document.getElementById('submitPaperBtn').style.display = 'none';
}

function reviewPaper() {
    state.currentQuestionIndex = 0;
    renderQuestion();
    updateProgress();
}

// ==================== 收藏夹 ====================
function showFavorites() {
    const modal = document.getElementById('favoritesModal');
    const body = document.getElementById('favoritesBody');
    
    if (state.favoriteQuestions.size === 0) {
        body.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⭐</div>
                <h3>暂无收藏</h3>
                <p>点击题目上的收藏按钮添加收藏</p>
            </div>
        `;
    } else {
        const favList = Array.from(state.favoriteQuestions).map(key => {
            const qInfo = getQuestionByKey(key);
            if (!qInfo) return null;
            return { key, ...qInfo };
        }).filter(Boolean);
        
        body.innerHTML = `
            <div class="favorites-list">
                ${favList.map((item, idx) => `
                    <div class="favorite-item">
                        <div class="item-header">
                            <span class="item-chapter">${item.subjectName} · ${item.location}</span>
                            <div class="item-actions">
                                <button class="btn btn-secondary" onclick="redoFavoriteQuestion('${item.key}')">查看</button>
                                <button class="btn btn-danger" onclick="removeFromFavorites('${item.key}')">移除</button>
                            </div>
                        </div>
                        <div class="item-content">${idx + 1}. ${escapeHtml(item.question.q)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    modal.classList.add('active');
}

function redoFavoriteQuestion(key) {
    closeFavorites();
    navigateToQuestion(key);
}

function removeFromFavorites(key) {
    state.favoriteQuestions.delete(key);
    saveLocalData();
    showFavorites(); // 刷新显示
}

// ==================== 辅助函数 ====================
function getCurrentQuestionKey() {
    let key = `${state.currentSubject}_${state.currentMode}`;
    if (state.currentMode === 'chapter') {
        key += `_${state.currentChapter}_${state.currentSection}_${state.currentQuestionIndex}`;
    } else {
        key += `_${state.currentPaper}_${state.currentQuestionIndex}`;
    }
    return key;
}

function getQuestionKeyByIndex(idx) {
    let key = `${state.currentSubject}_${state.currentMode}`;
    if (state.currentMode === 'chapter') {
        key += `_${state.currentChapter}_${state.currentSection}_${idx}`;
    } else {
        key += `_${state.currentPaper}_${idx}`;
    }
    return key;
}

function getQuestionByKey(key) {
    const parts = key.split('_');
    if (parts.length < 4) return null;
    
    const subject = parts[0];
    const mode = parts[1];
    
    if (!examDB[subject]) return null;
    
    let question, location, subjectName, userAnswer;
    subjectName = examDB[subject].name;
    
    if (mode === 'chapter') {
        const chapterId = parts[2];
        const sectionId = parts[3];
        const qIdx = parseInt(parts[4]);
        
        const questions = examDB[subject].chapterQuestions[chapterId]?.[sectionId];
        if (!questions || !questions[qIdx]) return null;
        
        question = questions[qIdx];
        const chapter = examDB[subject].chapters.find(c => c.id === chapterId);
        const section = chapter?.sections.find(s => s.id === sectionId);
        location = `${chapter?.title || ''} - ${section?.title || ''}`;
        
        // 获取用户答案
        const currentKey = `${subject}_${mode}_${chapterId}_${sectionId}`;
        const saved = localStorage.getItem(`progress_${currentKey}`);
        if (saved) {
            const progress = JSON.parse(saved);
            userAnswer = progress.answers[qIdx];
        }
    } else {
        const paperId = parts[2];
        const qIdx = parseInt(parts[3]);
        
        const questions = mode === 'pastPaper' 
            ? examDB[subject].paperQuestions[paperId]
            : examDB[subject].spotQuestionData[paperId];
        
        if (!questions || !questions[qIdx]) return null;
        
        question = questions[qIdx];
        const papers = mode === 'pastPaper' 
            ? examDB[subject].pastPapers 
            : examDB[subject].spotQuestions;
        const paper = papers.find(p => p.id === paperId);
        location = paper?.name || '';
        
        // 获取用户答案
        const currentKey = `${subject}_${mode}_${paperId}`;
        const saved = localStorage.getItem(`progress_${currentKey}`);
        if (saved) {
            const progress = JSON.parse(saved);
            userAnswer = progress.answers[qIdx];
        }
    }
    
    return { question, location, subjectName, userAnswer };
}

function navigateToQuestion(key) {
    const parts = key.split('_');
    if (parts.length < 4) return;
    
    const subject = parts[0];
    const mode = parts[1];
    
    // 切换科目
    if (subject !== state.currentSubject) {
        switchSubject(subject);
        document.querySelectorAll('.subject-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.subject === subject);
        });
    }
    
    // 切换模式
    if (mode !== state.currentMode) {
        switchMode(mode);
        document.querySelectorAll('.mode-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.mode === mode);
        });
    }
    
    if (mode === 'chapter') {
        const chapterId = parts[2];
        const sectionId = parts[3];
        const qIdx = parseInt(parts[4]);
        
        // 加载章节
        const questions = examDB[subject].chapterQuestions[chapterId]?.[sectionId];
        if (questions) {
            state.currentChapter = chapterId;
            state.currentSection = sectionId;
            state.questions = questions;
            state.currentQuestionIndex = qIdx;
            
            loadProgress();
            
            const chapter = examDB[subject].chapters.find(c => c.id === chapterId);
            const section = chapter?.sections.find(s => s.id === sectionId);
            document.getElementById('currentTitle').textContent = 
                `${chapter?.title || ''} - ${section?.title || ''}`;
            
            renderSidebar();
            showQuestionArea();
            renderQuestion();
            updateProgress();
        }
    } else {
        const paperId = parts[2];
        const qIdx = parseInt(parts[3]);
        
        const questions = mode === 'pastPaper' 
            ? examDB[subject].paperQuestions[paperId]
            : examDB[subject].spotQuestionData[paperId];
        
        if (questions) {
            state.currentPaper = paperId;
            state.questions = questions;
            state.currentQuestionIndex = qIdx;
            
            loadProgress();
            
            const papers = mode === 'pastPaper' 
                ? examDB[subject].pastPapers 
                : examDB[subject].spotQuestions;
            const paper = papers.find(p => p.id === paperId);
            document.getElementById('currentTitle').textContent = paper?.name || '';
            
            renderSidebar();
            showQuestionArea();
            renderQuestion();
            updateProgress();
        }
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 本地存储 ====================
function saveLocalData() {
    const data = {
        wrongQuestions: Array.from(state.wrongQuestions),
        favoriteQuestions: Array.from(state.favoriteQuestions),
        markedQuestions: Array.from(state.markedQuestions),
        submittedPapers: Array.from(state.submittedPapers)
    };
    localStorage.setItem('fund_exam_global_data', JSON.stringify(data));
}

function loadLocalData() {
    try {
        const data = JSON.parse(localStorage.getItem('fund_exam_global_data') || '{}');
        if (data.wrongQuestions) {
            state.wrongQuestions = new Set(data.wrongQuestions);
        }
        if (data.favoriteQuestions) {
            state.favoriteQuestions = new Set(data.favoriteQuestions);
        }
        if (data.markedQuestions) {
            state.markedQuestions = new Set(data.markedQuestions);
        }
        if (data.submittedPapers) {
            state.submittedPapers = new Set(data.submittedPapers);
        }
    } catch (e) {
        console.error('加载本地数据失败:', e);
    }
}

function saveProgress() {
    let key;
    if (state.currentMode === 'chapter') {
        key = `${state.currentSubject}_${state.currentMode}_${state.currentChapter}_${state.currentSection}`;
    } else {
        key = `${state.currentSubject}_${state.currentMode}_${state.currentPaper}`;
    }
    
    const progress = {
        answers: state.userAnswers,
        currentIndex: state.currentQuestionIndex,
        timestamp: Date.now()
    };
    
    localStorage.setItem(`progress_${key}`, JSON.stringify(progress));
}

function loadProgress() {
    let key;
    if (state.currentMode === 'chapter') {
        key = `${state.currentSubject}_${state.currentMode}_${state.currentChapter}_${state.currentSection}`;
    } else {
        key = `${state.currentSubject}_${state.currentMode}_${state.currentPaper}`;
    }
    
    try {
        const saved = localStorage.getItem(`progress_${key}`);
        if (saved) {
            const progress = JSON.parse(saved);
            state.userAnswers = progress.answers || {};
            // 不自动跳转，让用户从第一题开始
        }
    } catch (e) {
        console.error('加载进度失败:', e);
    }
}

function clearPaperProgress(key) {
    localStorage.removeItem(`progress_${key}`);
}

// ==================== 重置和统计 ====================
function resetCurrentProgress() {
    if (!confirm('确定要重置当前进度吗？')) return;
    
    state.userAnswers = {};
    state.currentQuestionIndex = 0;
    
    // 清除当前进度存储
    let key;
    if (state.currentMode === 'chapter') {
        key = `${state.currentSubject}_${state.currentMode}_${state.currentChapter}_${state.currentSection}`;
    } else {
        key = `${state.currentSubject}_${state.currentMode}_${state.currentPaper}`;
        // 清除提交状态
        state.submittedPapers.delete(key);
        saveLocalData();
        
        // 重置计时器
        if (state.paperTimer) {
            clearInterval(state.paperTimer);
            state.paperTimer = null;
        }
        state.paperTimeRemaining = state.paperTimeLimit;
        if (state.currentMode !== 'chapter') {
            startTimer();
            document.getElementById('submitPaperBtn').style.display = 'inline-flex';
        }
    }
    
    localStorage.removeItem(`progress_${key}`);
    
    renderQuestion();
    updateProgress();
    
    if (state.answerCardOpen) {
        renderAnswerCard();
    }
}

function updateStats() {
    const subject = examDB[state.currentSubject];
    if (!subject) return;
    
    let totalChapters = 0, totalQuestions = 0, completed = 0, correct = 0;
    
    if (state.currentMode === 'chapter') {
        totalChapters = subject.chapters.length;
        subject.chapters.forEach(ch => {
            ch.sections.forEach(sec => {
                totalQuestions += sec.count;
                
                // 检查进度
                const key = `${state.currentSubject}_chapter_${ch.id}_${sec.id}`;
                const saved = localStorage.getItem(`progress_${key}`);
                if (saved) {
                    const progress = JSON.parse(saved);
                    const answers = progress.answers || {};
                    completed += Object.keys(answers).length;
                    
                    const questions = subject.chapterQuestions[ch.id]?.[sec.id] || [];
                    Object.entries(answers).forEach(([idx, ans]) => {
                        if (questions[idx] && ans === questions[idx].answer) {
                            correct++;
                        }
                    });
                }
            });
        });
    } else {
        const papers = state.currentMode === 'pastPaper' ? subject.pastPapers : subject.spotQuestions;
        totalChapters = papers.length;
        papers.forEach(paper => {
            totalQuestions += paper.total;
            
            const key = `${state.currentSubject}_${state.currentMode}_${paper.id}`;
            const saved = localStorage.getItem(`progress_${key}`);
            if (saved) {
                const progress = JSON.parse(saved);
                const answers = progress.answers || {};
                completed += Object.keys(answers).length;
            }
        });
    }
    
    document.getElementById('statChapters').textContent = totalChapters;
    document.getElementById('statQuestions').textContent = totalQuestions;
    document.getElementById('statCompleted').textContent = completed;
    
    const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0;
    document.getElementById('statAccuracy').textContent = accuracy + '%';
}

// ==================== 弹窗控制 ====================
function closeModal() {
    document.getElementById('answerModal').classList.remove('active');
}

function closeFavorites() {
    document.getElementById('favoritesModal').classList.remove('active');
}

function closeResult() {
    document.getElementById('resultModal').classList.remove('active');
}

function closeAllModals() {
    closeModal();
    closeFavorites();
    closeResult();
    document.getElementById('overlay').classList.remove('active');

    // 关闭答题卡
    state.answerCardOpen = false;
    document.getElementById('answerCardSidebar').classList.remove('open');
    document.querySelector('.content-area').classList.remove('answer-card-open');
}
