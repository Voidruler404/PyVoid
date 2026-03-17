// Переменные состояния
let currentLessonIndex = 0;
let currentExampleIndex = 0;
let currentQuestionIndex = 0;
let testAnswers = {};
let lessonTestAnswers = {};
let pyodide = null;

// Инициализация Pyodide
async function initPyodide() {
    try {
        pyodide = await loadPyodide();
        console.log('Pyodide инициализирован');
    } catch (error) {
        console.error('Ошибка инициализации Pyodide:', error);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initPyodide();
    loadLesson(0);
    loadQuestion(0);
});

// ===== НАВИГАЦИЯ =====
function showPage(pageId) {
    // Скрыть все страницы
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // Показать выбранную страницу
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Обновить активную кнопку навигации
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${pageId}'`)) {
            btn.classList.add('active');
        }
    });

    // Прокрутка наверх
    window.scrollTo(0, 0);
}

function goToLesson(index) {
    loadLesson(index);
    showPage('lessons');
}

// ===== УРОКИ =====
function loadLesson(index) {
    if (index < 0 || index >= lessons.length) return;

    currentLessonIndex = index;
    currentExampleIndex = 0;
    lessonTestAnswers = {}; // Сброс ответов для теста урока

    const lesson = lessons[index];
    document.getElementById('lessonTitle').textContent = `Урок ${index + 1}: ${lesson.title}`;
    document.getElementById('lessonProgress').textContent = `Урок ${index + 1} из ${lessons.length}`;
    document.getElementById('lessonText').textContent = lesson.content;

    // Обновить кнопки примеров
    const exampleButtonsContainer = document.querySelector('.example-buttons');
    exampleButtonsContainer.innerHTML = '';
    lesson.examples.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = `example-btn ${i === 0 ? 'active' : ''}`;
        btn.textContent = `Пример ${i + 1}`;
        btn.onclick = () => showExample(i);
        exampleButtonsContainer.appendChild(btn);
    });

    showExample(0);

    // Загрузить тест урока
    loadLessonTest(lesson);

    // Обновить кнопки навигации
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === lessons.length - 1;
}

function loadLessonTest(lesson) {
    const container = document.getElementById('lessonQuestionContainer');
    const feedback = document.getElementById('lessonTestFeedback');
    container.innerHTML = '';
    feedback.innerHTML = '';
    feedback.className = 'test-feedback';

    if (!lesson.questions || lesson.questions.length === 0) {
        document.getElementById('lessonTestSection').style.display = 'none';
        return;
    }

    document.getElementById('lessonTestSection').style.display = 'block';

    lesson.questions.forEach((q, qIdx) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'lesson-question';
        qDiv.innerHTML = `<h4>${qIdx + 1}. ${q.question}</h4>`;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options-container';
        
        q.options.forEach((opt, optIdx) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'option';
            optDiv.textContent = opt;
            optDiv.onclick = () => {
                lessonTestAnswers[qIdx] = optIdx;
                const siblings = optionsDiv.querySelectorAll('.option');
                siblings.forEach(s => s.classList.remove('selected'));
                optDiv.classList.add('selected');
            };
            optionsDiv.appendChild(optDiv);
        });
        
        qDiv.appendChild(optionsDiv);
        container.appendChild(qDiv);
    });
}

function checkLessonTest() {
    const lesson = lessons[currentLessonIndex];
    const feedback = document.getElementById('lessonTestFeedback');
    let correctCount = 0;
    let total = lesson.questions.length;

    lesson.questions.forEach((q, idx) => {
        if (lessonTestAnswers[idx] === q.correct) {
            correctCount++;
        }
    });

    if (Object.keys(lessonTestAnswers).length < total) {
        feedback.textContent = 'Пожалуйста, ответьте на все вопросы.';
        feedback.className = 'test-feedback warning';
        return;
    }

    if (correctCount === total) {
        feedback.textContent = `Отлично! Вы правильно ответили на все вопросы (${correctCount}/${total}).`;
        feedback.className = 'test-feedback success';
    } else {
        feedback.textContent = `Вы ответили правильно на ${correctCount} из ${total} вопросов. Попробуйте еще раз!`;
        feedback.className = 'test-feedback error';
    }
}

function showExample(index) {
    const lesson = lessons[currentLessonIndex];
    if (index < 0 || index >= lesson.examples.length) return;

    currentExampleIndex = index;
    document.getElementById('exampleCode').textContent = lesson.examples[index];

    // Обновить активную кнопку примера
    const exampleBtns = document.querySelectorAll('.example-btn');
    exampleBtns.forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });
}

function nextLesson() {
    if (currentLessonIndex < lessons.length - 1) {
        loadLesson(currentLessonIndex + 1);
        window.scrollTo(0, 0);
    }
}

function previousLesson() {
    if (currentLessonIndex > 0) {
        loadLesson(currentLessonIndex - 1);
        window.scrollTo(0, 0);
    }
}

// ===== РЕДАКТОР КОДА =====
async function runCode() {
    const code = document.getElementById('codeInput').value;
    const output = document.getElementById('output');

    if (!pyodide) {
        output.textContent = 'Ошибка: Pyodide не инициализирован. Пожалуйста, перезагрузите страницу.';
        return;
    }

    try {
        output.textContent = 'Выполнение...';
        
        pyodide.runPython(`
import sys
from io import StringIO
old_stdout = sys.stdout
sys.stdout = StringIO()
`);

        pyodide.runPython(code);

        const result = pyodide.runPython(`
output = sys.stdout.getvalue()
sys.stdout = old_stdout
output
`);

        output.textContent = result || '(Нет вывода)';
    } catch (error) {
        output.textContent = `Ошибка: ${error.message}`;
    }
}

function resetCode() {
    document.getElementById('codeInput').value = `# Напишите свой код здесь
print("Привет, мир!")
x = 10
y = 20
print(x + y)`;
    document.getElementById('output').textContent = 'Вывод появится здесь...';
}

function copyCode() {
    const code = document.getElementById('codeInput');
    code.select();
    document.execCommand('copy');
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Скопировано!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

// ===== ФИНАЛЬНЫЙ ТЕСТ =====
function loadQuestion(index) {
    if (index < 0 || index >= allQuestions.length) return;

    currentQuestionIndex = index;
    const question = allQuestions[index];

    const progress = ((index + 1) / allQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('questionNumber').textContent = `Вопрос ${index + 1} из ${allQuestions.length}`;

    document.getElementById('questionText').textContent = question.question;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, i) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        if (testAnswers[index] === i) {
            optionDiv.classList.add('selected');
        }
        optionDiv.textContent = option;
        optionDiv.onclick = () => selectAnswer(i);
        optionsContainer.appendChild(optionDiv);
    });

    const prevBtn = document.getElementById('testPrevBtn');
    const nextBtn = document.getElementById('testNextBtn');

    prevBtn.disabled = index === 0;

    if (index === allQuestions.length - 1) {
        nextBtn.textContent = 'Завершить тест';
    } else {
        nextBtn.textContent = 'Следующий →';
    }
}

function selectAnswer(optionIndex) {
    testAnswers[currentQuestionIndex] = optionIndex;
    const options = document.querySelectorAll('#optionsContainer .option');
    options.forEach((option, i) => {
        option.classList.toggle('selected', i === optionIndex);
    });
}

function nextQuestion() {
    if (currentQuestionIndex < allQuestions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        showResults();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        loadQuestion(currentQuestionIndex - 1);
    }
}

function showResults() {
    document.getElementById('testContent').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'block';

    let correctCount = 0;
    allQuestions.forEach((question, index) => {
        if (testAnswers[index] === question.correct) {
            correctCount++;
        }
    });

    const percentage = Math.round((correctCount / allQuestions.length) * 100);
    document.getElementById('scorePercentage').textContent = percentage + '%';
    document.getElementById('scoreText').textContent = `Вы ответили правильно на ${correctCount} из ${allQuestions.length} вопросов`;

    let message = '';
    if (percentage === 100) message = '🎉 Отлично! Вы идеально справились с тестом!';
    else if (percentage >= 80) message = '👏 Отлично! Вы хорошо усвоили материал!';
    else if (percentage >= 60) message = '👍 Хорошо! Но есть над чем работать.';
    else if (percentage >= 40) message = '📚 Рекомендуем пересмотреть уроки.';
    else message = '💪 Не отчаивайтесь! Изучите уроки еще раз.';
    
    document.getElementById('scoreMessage').textContent = message;

    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    allQuestions.forEach((question, index) => {
        const isCorrect = testAnswers[index] === question.correct;
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;

        const statusIcon = isCorrect ? '✓' : '✗';
        resultItem.innerHTML = `
            <h4>${statusIcon} Вопрос ${index + 1}</h4>
            <p><strong>Вопрос:</strong> ${question.question}</p>
            <p><strong>Ваш ответ:</strong> ${question.options[testAnswers[index]] || 'Не ответили'}</p>
            ${!isCorrect ? `<p><strong>Правильный ответ:</strong> ${question.options[question.correct]}</p>` : ''}
            <p><strong>Объяснение:</strong> ${question.explanation}</p>
        `;
        resultsList.appendChild(resultItem);
    });
}

function resetTest() {
    testAnswers = {};
    currentQuestionIndex = 0;
    document.getElementById('testContent').style.display = 'block';
    document.getElementById('resultsContent').style.display = 'none';
    loadQuestion(0);
}
