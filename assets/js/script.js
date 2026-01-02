import questions from './question.js';

// DOM 요소 추가
const selectionMessageContainer = document.getElementById('selection-message-container');
const questionContainer = document.getElementById('question-container');
const resultContainer = document.getElementById('result-container');
const submitButton = document.getElementById('submit-button');
const showAnswerButton = document.getElementById('show-answer-button');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const currentNumberElement = document.getElementById('current-number');
const totalQuestionsElement = document.getElementById('total-questions');
const selectionContainer = document.getElementById('selection-container');
const startButton = document.getElementById('start-button');
const quizContainer = document.getElementById('quiz-container');
const resetButton = document.getElementById('reset-button');

// 상태 변수
let currentQuestionIndex = 0;
let filteredQuestions = [];
let incorrectQuestions = [];
let isReviewMode = false;
let quizStarted = false;
let isAnswerSubmitted = false;
let isMultipleChoiceAnswered = false;
let isEssayAnswerShown = false;

document.addEventListener('DOMContentLoaded', function () {
    const selectionTypeFilter = document.getElementById('selection-type-filter');

    // 필수 DOM 요소 체크
    if (!selectionTypeFilter || !startButton || !questionContainer) {
        console.error('필수 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    incorrectQuestions = [];
    isReviewMode = false;
    quizStarted = false;

    // 선택 화면 표시, 문제 화면 숨김
    showSelectionScreen();

    // 이벤트 리스너 등록
    if (submitButton) submitButton.addEventListener('click', handleSubmit);
    if (showAnswerButton) showAnswerButton.addEventListener('click', showAnswer);
    if (prevButton) prevButton.addEventListener('click', showPreviousQuestion);
    if (nextButton) nextButton.addEventListener('click', showNextQuestion);
    if (resetButton) resetButton.addEventListener('click', resetQuiz);

    // 키보드 이벤트 리스너 추가 - 엔터키 처리
    document.addEventListener('keydown', function (event) {
        if (!quizStarted || filteredQuestions.length === 0) return;

        const currentQuestion = filteredQuestions[currentQuestionIndex];
        if (!currentQuestion) return;

        // 숫자 키 1-5 처리 (객관식 문제일 때만)
        if (currentQuestion.type === 'multiple-choice' && !isMultipleChoiceAnswered) {
            if ((event.key >= '1' && event.key <= '5') || (event.code.startsWith('Numpad') && event.code.length === 7 && event.code[6] >= '1' && event.code[6] <= '5')) {
                event.preventDefault();

                const num = event.code.includes('Numpad') ? event.code[6] : event.key;
                const optionIndex = parseInt(num) - 1;

                const checkboxes = document.querySelectorAll('input[name="option"]');
                if (optionIndex >= 0 && optionIndex < checkboxes.length) {
                    checkboxes.forEach((cb, idx) => {
                        checkboxes[idx].checked = (idx === optionIndex);
                    });

                    checkboxes[optionIndex].focus();
                }
            }
        }

        // 엔터키 처리
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();

            // 객관식 문제 처리
            if (currentQuestion.type === 'multiple-choice' && !isMultipleChoiceAnswered) {
                const checkedOption = document.querySelector('input[name="option"]:checked');
                if (checkedOption) {
                    handleMultipleChoiceSubmit(currentQuestion.answer);
                }
            }
            // 서술형 문제 처리
            else if (currentQuestion.type === 'essay') {
                if (isEssayAnswerShown) {
                    showNextQuestion();
                } else {
                    handleSubmit();
                }
            }
            // 이미 답변이 제출된 객관식 문제인 경우 다음 문제로 이동
            else if (isMultipleChoiceAnswered) {
                showNextQuestion();
            }
        }
    });

    // 시작 버튼 이벤트 리스너 추가
    startButton.addEventListener('click', () => {
        const selectedType = selectionTypeFilter.value;

        if (selectedType === '선택하세요') {
            showMessage('문제 유형을 선택해주세요.', 'warning');
            return;
        }

        startQuiz(null, selectedType);
    });

    // 필터 변경 이벤트 리스너
    selectionTypeFilter.addEventListener('change', () => {
        updateMessageForSelection(selectionTypeFilter.value);
    });

    // 초기 메시지 표시
    updateMessageForSelection(selectionTypeFilter.value);
});

// 선택에 따른 메시지 업데이트 함수
function updateMessageForSelection(selectedType) {
    if (selectedType === '선택하세요') {
        showMessage('문제 유형을 선택해주세요.', 'info');
    } else {
        const filtered = questions.filter(q => q.type === selectedType);
        showMessage(`선택된 조건에 맞는 문제: ${filtered.length}개`, 'info');
    }
}

// 선택 화면 표시 함수
function showSelectionScreen() {
    if (selectionContainer) selectionContainer.style.display = 'block';
    if (quizContainer) quizContainer.style.display = 'none';
}

// 필터링 함수 수정
function filterQuestions(selectedChapter, selectedType) {
    // 모든 문제를 가져옴
    let filtered = [...questions];

    // 챕터 필터링 (selectedChapter가 null이면 모든 챕터 포함)
    if (selectedChapter) {
        filtered = filtered.filter(q => q.chapter === selectedChapter);
    }

    // 유형 필터링
    if (selectedType !== '선택하세요') {
        filtered = filtered.filter(q => q.type === selectedType);
    }

    // 필터링된 문제가 있는지 확인
    if (filtered.length === 0) {
        showMessage('선택한 조건에 맞는 문제가 없습니다.', 'warning');
        return false;
    }

    // Fisher-Yates 알고리즘을 사용하여 배열을 무작위로 섞기
    for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    filteredQuestions = filtered;
    return true;
}

// startQuiz 함수 수정
function startQuiz(chapter, type) {
    // 필터링 실행
    if (!filterQuestions(chapter, type)) {
        return;
    }

    // 퀴즈 시작 상태로 변경
    quizStarted = true;

    // 선택 화면 숨기고 퀴즈 화면 표시
    if (selectionContainer) selectionContainer.style.display = 'none';
    if (quizContainer) quizContainer.style.display = 'block';

    // 첫 문제 표시
    currentQuestionIndex = 0;
    updateQuestionCounter();
    displayQuestion();
}

// 문제 표시
function displayQuestion() {
    if (filteredQuestions.length === 0) return;

    // 문제 유형이 바뀔 때마다 상태 초기화
    resetQuestionStates();

    const currentQuestion = filteredQuestions[currentQuestionIndex];
    if (questionContainer) questionContainer.innerHTML = '';
    if (resultContainer) resultContainer.innerHTML = '';

    // 문제 번호와 챕터 표시
    const questionMeta = document.createElement('div');
    questionMeta.className = 'question-meta';
    questionMeta.innerHTML = `<span class="chapter">${currentQuestion.chapter}</span> <span class="number">문제 ${currentQuestion.number}</span>`;
    questionContainer.appendChild(questionMeta);

    // 문제 텍스트 표시
    const questionText = document.createElement('h2');
    questionText.className = 'question-text';
    // 줄바꿈 문자를 HTML로 변환
    questionText.innerHTML = currentQuestion.question.replace(/\n/g, '<br>');
    questionContainer.appendChild(questionText);

    // 문제 유형에 따라 다른 UI 표시
    switch (currentQuestion.type) {
        case 'multiple-choice':
            displayMultipleChoiceQuestion(currentQuestion);
            if (submitButton) submitButton.style.display = 'none';
            if (showAnswerButton) showAnswerButton.style.display = 'none';
            break;

        case 'essay':
            displayEssayQuestion(currentQuestion);
            if (submitButton) submitButton.style.display = 'inline-block';
            if (showAnswerButton) showAnswerButton.style.display = 'inline-block';
            break;
    }

    // 버튼 상태 업데이트
    updateButtonStates();
}

// 문제 상태 초기화 함수 수정
function resetQuestionStates() {
    isAnswerSubmitted = false;
    isMultipleChoiceAnswered = false;
    isEssayAnswerShown = false;
}

// 객관식 문제 제출 처리 함수
function handleMultipleChoiceSubmit(correctAnswer) {
    const selectedOptions = document.querySelectorAll('input[name="option"]:checked');
    const selectedAnswers = Array.from(selectedOptions).map(input => input.value);

    if (selectedAnswers.length === 0) {
        showMessage('답을 선택해주세요.', 'warning');
        return;
    }

    // 정답 확인
    const isCorrect = Array.isArray(correctAnswer)
        ? selectedAnswers.length === correctAnswer.length && selectedAnswers.every(answer => correctAnswer.includes(answer))
        : selectedAnswers.length === 1 && selectedAnswers[0] === correctAnswer;

    displayResult(isCorrect, selectedAnswers.join(', '), correctAnswer);

    // 모든 옵션 비활성화
    document.querySelectorAll('input[name="option"]').forEach(input => {
        input.disabled = true;
    });

    // 정답 강조
    document.querySelectorAll('.option-label').forEach(label => {
        const input = label.querySelector('input[name="option"]');
        if (input) {
            const isAnswer = Array.isArray(correctAnswer)
                ? correctAnswer.includes(input.value)
                : input.value === correctAnswer;

            if (isAnswer) {
                label.classList.add('correct-answer');
            }
        }
    });

    isMultipleChoiceAnswered = true;
    updateButtonStates();

    // 마지막 문제인 경우 자동으로 완료 처리
    if (currentQuestionIndex === filteredQuestions.length - 1) {
        setTimeout(() => {
            handleLastQuestion();
        }, 1500);
    }
}

// 객관식 문제 표시 함수 수정
function displayMultipleChoiceQuestion(question) {
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';

    const correctAnswer = question.answer;
    const isMultiAnswer = Array.isArray(correctAnswer);

    // 옵션이 있는지 확인
    if (!question.options || question.options.length === 0) {
        console.error('객관식 문제에 옵션이 없습니다:', question);
        return;
    }

    // 옵션 섞기
    const shuffledOptions = [...question.options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    shuffledOptions.forEach((option, index) => {
        const optionLabel = document.createElement('label');
        optionLabel.className = 'option-label';

        const input = document.createElement('input');
        input.type = isMultiAnswer ? 'checkbox' : 'radio';
        input.name = 'option';
        input.value = option;
        input.id = `option-${index}`;

        // 단일 선택 객관식의 경우 자동 제출
        if (!isMultiAnswer) {
            input.addEventListener('change', () => {
                if (input.checked && !isMultipleChoiceAnswered) {
                    setTimeout(() => {
                        handleMultipleChoiceSubmit(correctAnswer);
                    }, 100);
                }
            });
        }

        const labelContent = document.createElement('span');
        labelContent.innerHTML = `<span class="option-number">${index + 1}.</span> ${option}`;

        optionLabel.appendChild(input);
        optionLabel.appendChild(labelContent);
        optionsContainer.appendChild(optionLabel);
    });

    questionContainer.appendChild(optionsContainer);

    // 다중 선택 객관식의 경우 제출 버튼 추가
    if (isMultiAnswer) {
        const multipleChoiceSubmitButton = document.createElement('button');
        multipleChoiceSubmitButton.textContent = '제출';
        multipleChoiceSubmitButton.className = 'submit-button';
        multipleChoiceSubmitButton.addEventListener('click', () => {
            if (!isMultipleChoiceAnswered) {
                handleMultipleChoiceSubmit(correctAnswer);
            }
        });
        questionContainer.appendChild(multipleChoiceSubmitButton);
    }
}

// 서술형 문제 표시 함수 개선
function displayEssayQuestion(question) {
    const answerContainer = document.createElement('div');
    answerContainer.className = 'answer-container';

    const questionDescription = document.createElement('div');
    questionDescription.className = 'question-description';
    questionDescription.textContent = '아래 텍스트 영역에 답변을 작성하세요. Enter 키를 눌러 정답을 확인할 수 있습니다.';
    answerContainer.appendChild(questionDescription);

    const textarea = document.createElement('textarea');
    textarea.className = 'essay-answer';
    textarea.placeholder = '답변을 입력하세요. (Enter 키를 눌러 정답 확인)';
    textarea.rows = 8;

    answerContainer.appendChild(textarea);
    questionContainer.appendChild(answerContainer);

    // 텍스트 영역에 포커스 설정
    setTimeout(() => {
        textarea.focus();
    }, 100);
}

// 결과 표시 함수
function displayResult(isCorrect, userAnswer, correctAnswer) {
    if (!resultContainer) return;

    resultContainer.innerHTML = '';

    const resultDiv = document.createElement('div');
    resultDiv.className = `result ${isCorrect ? 'correct' : 'incorrect'}`;

    const resultIcon = document.createElement('span');
    resultIcon.className = 'result-icon';
    resultIcon.textContent = isCorrect ? '✓' : '✗';

    const resultText = document.createElement('div');
    resultText.className = 'result-text';

    if (isCorrect) {
        resultText.innerHTML = `<p>정답입니다!</p>`;
    } else {
        const correctAnswerText = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer;
        resultText.innerHTML = `<p>오답입니다.</p><p>제출한 답: ${userAnswer}</p><p>정답: ${correctAnswerText}</p>`;

        // 오답 문제 저장 (중복 방지)
        if (!isReviewMode && !incorrectQuestions.some(q => q.number === filteredQuestions[currentQuestionIndex].number)) {
            incorrectQuestions.push(filteredQuestions[currentQuestionIndex]);
        }
    }

    resultDiv.appendChild(resultIcon);
    resultDiv.appendChild(resultText);
    resultContainer.appendChild(resultDiv);
    
    // 해설 표시 추가
    const currentQuestion = filteredQuestions[currentQuestionIndex];
    if (currentQuestion && currentQuestion.explanation) {
        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'explanation';
        explanationDiv.innerHTML = `<h4> 해설</h4><p>${currentQuestion.explanation}</p>`;
        resultContainer.appendChild(explanationDiv);
    }

    isAnswerSubmitted = true;
    updateButtonStates();
}

// 정답 표시 함수 개선
function showAnswer() {
    if (isEssayAnswerShown) return;

    const currentQuestion = filteredQuestions[currentQuestionIndex];

    if (currentQuestion.type === 'essay') {
        if (!resultContainer) return;

        resultContainer.innerHTML = '';

        const answerReveal = document.createElement('div');
        answerReveal.className = 'answer-reveal';

        // 정답 텍스트 처리
        const formattedAnswer = currentQuestion.answer
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        answerReveal.innerHTML = `<h3>정답</h3><div class="answer-content"><p>${formattedAnswer}</p></div>`;

        resultContainer.appendChild(answerReveal);

        isEssayAnswerShown = true;
        updateButtonStates();
    }
}

// 제출 처리 함수
function handleSubmit() {
    const currentQuestion = filteredQuestions[currentQuestionIndex];

    if (currentQuestion && currentQuestion.type === 'essay') {
        const textarea = document.querySelector('.essay-answer');

        if (textarea) {
            textarea.disabled = true;
        }

        showAnswer();
        isAnswerSubmitted = true;
    }
}

// 이전 문제 표시 함수
function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateQuestionCounter();
        displayQuestion();
    }
}

// 다음 문제 표시 함수
function showNextQuestion() {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
        currentQuestionIndex++;
        updateQuestionCounter();
        displayQuestion();
    } else {
        handleLastQuestion();
    }
}

// 마지막 문제 처리 함수
function handleLastQuestion() {
    if (!questionContainer || !resultContainer) return;

    questionContainer.innerHTML = '';
    resultContainer.innerHTML = '';

    const completionMessage = document.createElement('div');
    completionMessage.className = 'message success';
    completionMessage.innerHTML = `<h2>모든 문제를 완료했습니다!</h2><p>총 ${filteredQuestions.length}개의 문제 중 ${filteredQuestions.length - incorrectQuestions.length}개를 맞추셨습니다.</p>`;

    questionContainer.appendChild(completionMessage);

    // 오답이 있는 경우 복습 버튼 표시
    if (incorrectQuestions.length > 0) {
        const reviewButton = document.createElement('button');
        reviewButton.className = 'review-button';
        reviewButton.textContent = `오답 복습하기 (${incorrectQuestions.length}문제)`;
        reviewButton.addEventListener('click', startReviewMode);

        questionContainer.appendChild(reviewButton);
    }

    // 처음으로 돌아가는 버튼
    const returnButton = document.createElement('button');
    returnButton.className = 'return-button';
    returnButton.textContent = '처음으로 돌아가기';
    returnButton.addEventListener('click', resetQuiz);

    questionContainer.appendChild(returnButton);

    // 버튼 숨김
    if (prevButton) prevButton.style.display = 'none';
    if (submitButton) submitButton.style.display = 'none';
    if (showAnswerButton) showAnswerButton.style.display = 'none';
    if (nextButton) nextButton.style.display = 'none';
}

// 오답 복습 모드 시작 함수
function startReviewMode() {
    if (incorrectQuestions.length === 0) return;

    isReviewMode = true;
    filteredQuestions = [...incorrectQuestions];
    incorrectQuestions = [];

    currentQuestionIndex = 0;
    updateQuestionCounter();
    displayQuestion();

    showMessage('오답 복습 모드입니다. 틀린 문제들을 다시 풀어보세요.', 'info');
}

// 문제 카운터 업데이트 함수
function updateQuestionCounter() {
    if (currentNumberElement) currentNumberElement.textContent = currentQuestionIndex + 1;
    if (totalQuestionsElement) totalQuestionsElement.textContent = filteredQuestions.length;
}

// 버튼 상태 업데이트 함수
function updateButtonStates() {
    // 이전 버튼 상태
    if (prevButton) {
        prevButton.disabled = currentQuestionIndex === 0;
        prevButton.style.display = 'inline-block';
    }

    // 제출 버튼 상태
    if (submitButton) {
        submitButton.disabled = isAnswerSubmitted;
    }

    // 정답 보기 버튼 상태
    if (showAnswerButton) {
        showAnswerButton.disabled = !isAnswerSubmitted || isEssayAnswerShown;
    }

    // 다음 버튼 상태
    if (nextButton) {
        const isLastQuestion = currentQuestionIndex === filteredQuestions.length - 1;
        const canProceed = (filteredQuestions[currentQuestionIndex].type === 'multiple-choice' && isMultipleChoiceAnswered) ||
            (filteredQuestions[currentQuestionIndex].type === 'essay' && isEssayAnswerShown);

        nextButton.disabled = !canProceed;
        nextButton.style.display = isLastQuestion ? 'none' : 'inline-block';
    }
}

// 메시지 표시 함수
function showMessage(text, type = 'info') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message ${type}`;
    messageContainer.textContent = text;

    const targetContainer = quizStarted ? resultContainer : selectionMessageContainer;
    if (!targetContainer) return;

    targetContainer.innerHTML = '';
    targetContainer.appendChild(messageContainer);

    if (type === 'warning') {
        setTimeout(() => {
            if (targetContainer.contains(messageContainer)) {
                targetContainer.removeChild(messageContainer);
            }
        }, 3000);
    }
}

// 퀴즈 초기화 함수
function resetQuiz() {
    // 상태 초기화
    currentQuestionIndex = 0;
    filteredQuestions = [];
    incorrectQuestions = [];
    isReviewMode = false;
    quizStarted = false;
    isAnswerSubmitted = false;
    isMultipleChoiceAnswered = false;
    isEssayAnswerShown = false;

    // UI 초기화
    if (questionContainer) questionContainer.innerHTML = '';
    if (resultContainer) resultContainer.innerHTML = '';

    // 버튼 표시 복원
    if (prevButton) prevButton.style.display = 'inline-block';
    if (submitButton) submitButton.style.display = 'inline-block';
    if (showAnswerButton) showAnswerButton.style.display = 'inline-block';
    if (nextButton) nextButton.style.display = 'inline-block';

    // 선택 화면으로 돌아가기
    showSelectionScreen();

    // 필터 초기화
    const selectionTypeFilter = document.getElementById('selection-type-filter');
    if (selectionTypeFilter) {
        selectionTypeFilter.value = '선택하세요';
        updateMessageForSelection('선택하세요');
    }
}