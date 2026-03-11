// Переменные состояния
let currentLessonIndex = 0;
let currentExampleIndex = 0;
let currentQuestionIndex = 0;
let testAnswers = {};
let testStarted = false;
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
    navBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// ===== УРОКИ =====
function loadLesson(index) {
    if (index < 0 || index >= lessons.length) return;

    currentLessonIndex = index;
    currentExampleIndex = 0;

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

    // Обновить кнопки навигации
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === lessons.length - 1;
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
    }
}

function previousLesson() {
    if (currentLessonIndex > 0) {
        loadLesson(currentLessonIndex - 1);
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
        
        // Перенаправить вывод print
        const originalPrint = console.log;
        let outputText = '';
        
        pyodide.runPython(`
import sys
from io import StringIO

# Перенаправить stdout
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
    
    // Показать уведомление
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Скопировано!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

// ===== ТЕСТ =====
function loadQuestion(index) {
    if (index < 0 || index >= questions.length) return;

    currentQuestionIndex = index;
    const question = questions[index];

    // Обновить прогресс
    const progress = ((index + 1) / questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('questionNumber').textContent = `Вопрос ${index + 1} из ${questions.length}`;

    // Загрузить вопрос
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

    // Обновить кнопки навигации
    const prevBtn = document.getElementById('testPrevBtn');
    const nextBtn = document.getElementById('testNextBtn');

    prevBtn.disabled = index === 0;

    if (index === questions.length - 1) {
        nextBtn.textContent = 'Завершить тест';
    } else {
        nextBtn.textContent = 'Следующий →';
    }
}

function selectAnswer(optionIndex) {
    testAnswers[currentQuestionIndex] = optionIndex;

    // Обновить визуальное отображение
    const options = document.querySelectorAll('.option');
    options.forEach((option, i) => {
        option.classList.toggle('selected', i === optionIndex);
    });
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
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
    // Скрыть вопросы, показать результаты
    document.getElementById('testContent').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'block';

    // Подсчитать результаты
    let correctCount = 0;
    questions.forEach((question, index) => {
        if (testAnswers[index] === question.correct) {
            correctCount++;
        }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    document.getElementById('scorePercentage').textContent = percentage + '%';
    document.getElementById('scoreText').textContent = `Вы ответили правильно на ${correctCount} из ${questions.length} вопросов`;

    // Сообщение в зависимости от результата
    let message = '';
    if (percentage === 100) {
        message = '🎉 Отлично! Вы идеально справились с тестом!';
    } else if (percentage >= 80) {
        message = '👏 Отлично! Вы хорошо усвоили материал!';
    } else if (percentage >= 60) {
        message = '👍 Хорошо! Но есть над чем работать.';
    } else if (percentage >= 40) {
        message = '📚 Рекомендуем пересмотреть уроки.';
    } else {
        message = '💪 Не отчаивайтесь! Изучите уроки еще раз.';
    }
    document.getElementById('scoreMessage').textContent = message;

    // Показать детали ответов
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    questions.forEach((question, index) => {
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
