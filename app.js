let adminPassword = "";

let database = {
  exams: [],
  results: [],
  notifications: [],
  settings: {}
};

let editingExamId = null;
let questionCounter = 0;

/* =========================
   الرسائل والتنبيهات
========================= */

function showMessage(elementId, message, type = "error") {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.className =
    type === "ok"
      ? "notice ok"
      : "notice error";

  element.textContent = message;
}

/* =========================
   تسجيل دخول الإدارة
========================= */

async function login() {
  const passwordInput =
    document.getElementById("password");

  if (!passwordInput) {
    alert("حقل كلمة المرور غير موجود");
    return;
  }

  const password = passwordInput.value.trim();

  if (!password) {
    showMessage(
      "loginMsg",
      "اكتب كلمة مرور الإدارة"
    );
    return;
  }

  try {
    const response = await fetch(
      "/api/admin/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "فشل تسجيل الدخول"
      );
    }

    adminPassword = password;

    const loginCard =
      document.getElementById("loginCard");

    const adminPanel =
      document.getElementById("adminPanel");

    if (loginCard) {
      loginCard.classList.add("hidden");
    }

    if (adminPanel) {
      adminPanel.classList.remove("hidden");
    }

    showMessage(
      "loginMsg",
      "",
      "ok"
    );

    await loadAdminData();

    const questionsContainer =
      document.getElementById("questions");

    if (
      questionsContainer &&
      questionsContainer.querySelectorAll(
        ".question"
      ).length === 0
    ) {
      addQuestion();
    }
  } catch (error) {
    showMessage(
      "loginMsg",
      error.message
    );
  }
}

/* =========================
   طلبات لوحة الإدارة
========================= */

async function adminRequest(url, options = {}) {
  const headers = {
    "x-admin-password": adminPassword,
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  let result;

  try {
    result = await response.json();
  } catch {
    result = {
      error: "استجابة غير صحيحة من الخادم"
    };
  }

  if (!response.ok) {
    if (response.status === 401) {
      const adminPanel =
        document.getElementById(
          "adminPanel"
        );

      const loginCard =
        document.getElementById(
          "loginCard"
        );

      if (adminPanel) {
        adminPanel.classList.add(
          "hidden"
        );
      }

      if (loginCard) {
        loginCard.classList.remove(
          "hidden"
        );
      }

      adminPassword = "";
    }

    throw new Error(
      result.error ||
      "حدث خطأ أثناء تنفيذ العملية"
    );
  }

  return result;
}

/* =========================
   تحميل بيانات الإدارة
========================= */

async function loadAdminData() {
  try {
    const loadedData =
      await adminRequest(
        "/api/admin/data"
      );

    database = {
      exams: Array.isArray(
        loadedData.exams
      )
        ? loadedData.exams
        : [],

      results: Array.isArray(
        loadedData.results
      )
        ? loadedData.results
        : [],

      notifications: Array.isArray(
        loadedData.notifications
      )
        ? loadedData.notifications
        : [],

      settings:
        loadedData.settings &&
        typeof loadedData.settings ===
          "object"
          ? loadedData.settings
          : {}
    };

    renderExamList();

    if (
      typeof renderResults ===
      "function"
    ) {
      renderResults();
    }

    if (
      typeof renderNotifications ===
      "function"
    ) {
      renderNotifications();
    }

    if (
      typeof loadSettingsForm ===
      "function"
    ) {
      loadSettingsForm();
    }
  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   إضافة سؤال
========================= */

function addQuestion(questionData = null) {
  const container =
    document.getElementById("questions");

  if (!container) {
    alert(
      "عنصر الأسئلة غير موجود في صفحة الإدارة"
    );
    return;
  }

  questionCounter++;

  const questionBox =
    document.createElement("div");

  questionBox.className = "question";

  questionBox.dataset.questionId =
    questionData?.id || "";

  const questionType =
    normalizeQuestionType(
      questionData?.type
    );

  const questionNumber =
    container.children.length + 1;

  questionBox.innerHTML = `
    <div class="actions">
      <h3 class="question-title">
        السؤال ${questionNumber}
      </h3>

      <button
        type="button"
        class="red small"
        onclick="removeQuestion(this)">
        حذف السؤال
      </button>
    </div>

    <label class="field-label">
      نوع السؤال
    </label>

    <select
      class="question-type"
      onchange="changeQuestionType(this)">
      <option value="mcq">
        اختيار من متعدد
      </option>

      <option value="true_false">
        صح أو خطأ
      </option>

      <option value="essay">
        سؤال مقالي
      </option>
    </select>

    <label class="field-label">
      نص السؤال
    </label>

    <input
      class="question-text"
      type="text"
      placeholder="اكتب نص السؤال"
      value="${escapeAttribute(
        questionData?.text || ""
      )}">

    <div class="mcq-fields">
      <label class="field-label">
        خيارات الإجابة
      </label>

      <input
        class="option-text"
        type="text"
        placeholder="الإجابة الأولى"
        value="${escapeAttribute(
          questionData?.options?.[0] ||
          ""
        )}">

      <input
        class="option-text"
        type="text"
        placeholder="الإجابة الثانية"
        value="${escapeAttribute(
          questionData?.options?.[1] ||
          ""
        )}">

      <input
        class="option-text"
        type="text"
        placeholder="الإجابة الثالثة"
        value="${escapeAttribute(
          questionData?.options?.[2] ||
          ""
        )}">

      <input
        class="option-text"
        type="text"
        placeholder="الإجابة الرابعة"
        value="${escapeAttribute(
          questionData?.options?.[3] ||
          ""
        )}">

      <label class="field-label">
        الإجابة الصحيحة
      </label>

      <select class="correct-answer">
        <option value="0">
          الإجابة الأولى صحيحة
        </option>

        <option value="1">
          الإجابة الثانية صحيحة
        </option>

        <option value="2">
          الإجابة الثالثة صحيحة
        </option>

        <option value="3">
          الإجابة الرابعة صحيحة
        </option>
      </select>
    </div>

    <div
      class="true-false-fields"
      style="display:none">

      <label class="field-label">
        الإجابة الصحيحة
      </label>

      <select class="true-false-answer">
        <option value="true">
          صح
        </option>

        <option value="false">
          خطأ
        </option>
      </select>
    </div>

    <div
      class="essay-fields"
      style="display:none">

      <p class="essay-note">
        هذا السؤال مقالي، ويكتب الطالب
        إجابته داخل مربع نص.
      </p>

      <label class="field-label">
        الإجابة النموذجية
        (اختيارية)
      </label>

      <textarea
        class="essay-model-answer"
        placeholder="اكتب الإجابة النموذجية أو اتركها فارغة">${escapeHTML(
          questionData
            ?.modelAnswer || ""
        )}</textarea>
    </div>
  `;

  container.appendChild(questionBox);

  const typeSelect =
    questionBox.querySelector(
      ".question-type"
    );

  typeSelect.value = questionType;

  const correctAnswerSelect =
    questionBox.querySelector(
      ".correct-answer"
    );

  correctAnswerSelect.value = String(
    questionData?.answer ?? 0
  );

  const trueFalseAnswer =
    questionBox.querySelector(
      ".true-false-answer"
    );

  trueFalseAnswer.value =
    normalizeTrueFalseAnswer(
      questionData?.answer
    );

  changeQuestionType(typeSelect);
  updateQuestionNumbers();
}

/* =========================
   تحديد نوع السؤال
========================= */

function normalizeQuestionType(type) {
  if (
    type === "true_false" ||
    type === "true-false" ||
    type === "tf" ||
    type === "boolean"
  ) {
    return "true_false";
  }

  if (
    type === "essay" ||
    type === "text" ||
    type === "written"
  ) {
    return "essay";
  }

  return "mcq";
}

function normalizeTrueFalseAnswer(answer) {
  if (
    answer === false ||
    answer === "false" ||
    answer === 0 ||
    answer === "0"
  ) {
    return "false";
  }

  return "true";
}

function changeQuestionType(selectElement) {
  const questionBox =
    selectElement.closest(".question");

  if (!questionBox) {
    return;
  }

  const type =
    normalizeQuestionType(
      selectElement.value
    );

  const mcqFields =
    questionBox.querySelector(
      ".mcq-fields"
    );

  const trueFalseFields =
    questionBox.querySelector(
      ".true-false-fields"
    );

  const essayFields =
    questionBox.querySelector(
      ".essay-fields"
    );

  if (mcqFields) {
    mcqFields.style.display =
      type === "mcq"
        ? "block"
        : "none";
  }

  if (trueFalseFields) {
    trueFalseFields.style.display =
      type === "true_false"
        ? "block"
        : "none";
  }

  if (essayFields) {
    essayFields.style.display =
      type === "essay"
        ? "block"
        : "none";
  }
}

/* =========================
   حذف سؤال
========================= */

function removeQuestion(button) {
  const questionBox =
    button.closest(".question");

  if (!questionBox) {
    return;
  }

  const questions =
    document.querySelectorAll(
      "#questions .question"
    );

  if (questions.length <= 1) {
    alert(
      "يجب أن يحتوي الاختبار على سؤال واحد على الأقل"
    );
    return;
  }

  const confirmed = confirm(
    "هل تريد حذف هذا السؤال؟"
  );

  if (!confirmed) {
    return;
  }

  questionBox.remove();
  updateQuestionNumbers();
}

/* =========================
   تحديث أرقام الأسئلة
========================= */

function updateQuestionNumbers() {
  const questions =
    document.querySelectorAll(
      "#questions .question"
    );

  questions.forEach(
    (questionBox, index) => {
      const title =
        questionBox.querySelector(
          ".question-title"
        );/* =========================
   تنظيف النصوص
========================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function cleanQuestionText(text) {
  return String(text ?? "")
    .replace(/^\s*\d+\s*[\-\.\)\:]\s*/u, "")
    .replace(/^\s*السؤال\s*\d+\s*[\-\.\)\:]*\s*/u, "")
    .replace(/^\s*سؤال\s*\d+\s*[\-\.\)\:]*\s*/u, "")
    .trim();
}

/* =========================
   جمع بيانات الأسئلة
========================= */

function collectQuestions() {
  const questionBoxes =
    document.querySelectorAll(
      "#questions .question"
    );

  const questions = [];

  for (
    let index = 0;
    index < questionBoxes.length;
    index++
  ) {
    const questionBox =
      questionBoxes[index];

    const typeSelect =
      questionBox.querySelector(
        ".question-type"
      );

    const textInput =
      questionBox.querySelector(
        ".question-text"
      );

    const type =
      normalizeQuestionType(
        typeSelect?.value
      );

    const text =
      textInput?.value.trim() || "";

    if (!text) {
      throw new Error(
        `اكتب نص السؤال رقم ${index + 1}`
      );
    }

    if (type === "mcq") {
      const optionInputs =
        questionBox.querySelectorAll(
          ".option-text"
        );

      const options = Array.from(
        optionInputs
      ).map((input) =>
        input.value.trim()
      );

      if (
        options.some(
          (option) => !option
        )
      ) {
        throw new Error(
          `أكمل جميع خيارات السؤال رقم ${
            index + 1
          }`
        );
      }

      const correctAnswer =
        Number(
          questionBox.querySelector(
            ".correct-answer"
          )?.value
        );

      if (
        !Number.isInteger(
          correctAnswer
        ) ||
        correctAnswer < 0 ||
        correctAnswer >= options.length
      ) {
        throw new Error(
          `حدد الإجابة الصحيحة للسؤال رقم ${
            index + 1
          }`
        );
      }

      questions.push({
        id:
          questionBox.dataset
            .questionId || undefined,

        type: "mcq",
        text,
        options,
        answer: correctAnswer
      });

      continue;
    }

    if (type === "true_false") {
      const answerValue =
        questionBox.querySelector(
          ".true-false-answer"
        )?.value;

      questions.push({
        id:
          questionBox.dataset
            .questionId || undefined,

        type: "true_false",
        text,
        options: [
          "صح",
          "خطأ"
        ],
        answer:
          answerValue === "true"
      });

      continue;
    }

    const modelAnswer =
      questionBox.querySelector(
        ".essay-model-answer"
      )?.value.trim() || "";

    questions.push({
      id:
        questionBox.dataset
          .questionId || undefined,

      type: "essay",
      text,
      modelAnswer,
      answer: null
    });
  }

  if (questions.length === 0) {
    throw new Error(
      "أضف سؤالًا واحدًا على الأقل"
    );
  }

  return questions;
}

/* =========================
   قراءة بيانات الاختبار
========================= */

function getExamFormData() {
  const titleInput =
    document.getElementById(
      "examTitle"
    );

  const descriptionInput =
    document.getElementById(
      "examDescription"
    );

  const durationInput =
    document.getElementById(
      "examDuration"
    );

  const title =
    titleInput?.value.trim() || "";

  const description =
    descriptionInput?.value.trim() || "";

  const duration =
    Number(durationInput?.value);

  if (!title) {
    throw new Error(
      "اكتب عنوان الاختبار"
    );
  }

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    throw new Error(
      "اكتب مدة صحيحة للاختبار"
    );
  }

  const questions =
    collectQuestions();

  return {
    title,
    description,
    duration,
    questions
  };
}

/* =========================
   حفظ الاختبار
========================= */

async function saveExam() {
  const saveButton =
    document.getElementById(
      "saveExamButton"
    );

  try {
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent =
        "جارٍ الحفظ...";
    }

    const examData =
      getExamFormData();

    if (editingExamId) {
      await adminRequest(
        `/api/admin/exams/${editingExamId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify(
            examData
          )
        }
      );

      alert(
        "تم تعديل الاختبار بنجاح"
      );
    } else {
      await adminRequest(
        "/api/admin/exams",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify(
            examData
          )
        }
      );

      alert(
        "تم إنشاء الاختبار بنجاح"
      );
    }

    resetExamForm();
    await loadAdminData();
  } catch (error) {
    alert(error.message);
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent =
        editingExamId
          ? "حفظ التعديلات"
          : "حفظ الاختبار";
    }
  }
}

/* =========================
   تفريغ نموذج الاختبار
========================= */

function resetExamForm() {
  editingExamId = null;

  const titleInput =
    document.getElementById(
      "examTitle"
    );

  const descriptionInput =
    document.getElementById(
      "examDescription"
    );

  const durationInput =
    document.getElementById(
      "examDuration"
    );

  const questionsContainer =
    document.getElementById(
      "questions"
    );

  const saveButton =
    document.getElementById(
      "saveExamButton"
    );

  if (titleInput) {
    titleInput.value = "";
  }

  if (descriptionInput) {
    descriptionInput.value = "";
  }

  if (durationInput) {
    durationInput.value = "30";
  }

  if (questionsContainer) {
    questionsContainer.innerHTML = "";
  }

  if (saveButton) {
    saveButton.textContent =
      "حفظ الاختبار";
  }

  questionCounter = 0;
  addQuestion();
}

/* =========================
   الاستيراد الجماعي للأسئلة
========================= */

function importBulkQuestions() {
  const input =
    document.getElementById(
      "bulkQuestionsInput"
    );

  if (!input) {
    alert(
      "مربع استيراد الأسئلة غير موجود"
    );
    return;
  }

  const rawText =
    input.value.trim();

  if (!rawText) {
    alert(
      "الصق الأسئلة داخل مربع الاستيراد"
    );
    return;
  }

  try {
    const parsedQuestions =
      parseBulkQuestions(rawText);

    if (
      parsedQuestions.length === 0
    ) {
      throw new Error(
        "لم أتمكن من اكتشاف أي سؤال"
      );
    }

    const container =
      document.getElementById(
        "questions"
      );

    const existingQuestions =
      container?.querySelectorAll(
        ".question"
      );

    if (
      existingQuestions?.length === 1
    ) {
      const firstQuestion =
        existingQuestions[0];

      const firstText =
        firstQuestion.querySelector(
          ".question-text"
        )?.value.trim();

      if (!firstText) {
        firstQuestion.remove();
      }
    }

    parsedQuestions.forEach(
      (question) => {
        addQuestion(question);
      }
    );

    input.value = "";

    alert(
      `تم استيراد ${parsedQuestions.length} سؤال بنجاح`
    );
  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   تحليل مجموعة الأسئلة
========================= */

function parseBulkQuestions(rawText) {
  const normalizedText =
    String(rawText)
      .replace(/\r/g, "")
      .replace(
        /[“”]/g,
        '"'
      )
      .trim();

  const blocks =
    splitQuestionBlocks(
      normalizedText
    );

  const questions = [];

  blocks.forEach(
    (block, index) => {
      const question =
        parseQuestionBlock(
          block,
          index
        );

      if (question) {
        questions.push(
          question
        );
      }
    }
  );

  return questions;
}

/* =========================
   فصل الأسئلة عن بعضها
========================= */

function splitQuestionBlocks(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks = [];
  let currentBlock = [];

  const isQuestionStart =
    (line) => {
      return (
        /^\d+\s*[\-\.\)\:]\s*\S+/u.test(
          line
        ) ||
        /^السؤال\s*\d+\s*[\-\.\)\:]/u.test(
          line
        ) ||
        /^سؤال\s*\d+\s*[\-\.\)\:]/u.test(
          line
        ) ||
        /^\[(اختيار|اختيار من متعدد|صح وخطأ|صح أو خطأ|مقالي)\]/u.test(
          line
        )
      );
    };

  for (const line of lines) {
    if (
      isQuestionStart(line) &&
      currentBlock.length > 0
    ) {
      blocks.push(
        currentBlock.join("\n")
      );

      currentBlock = [];
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    blocks.push(
      currentBlock.join("\n")
    );
  }

  if (
    blocks.length === 1 &&
    text.includes("\n\n")
  ) {
    return text
      .split(/\n\s*\n+/)
      .map((block) =>
        block.trim()
      )
      .filter(Boolean);
  }

  return blocks;
}

/* =========================
   تحليل سؤال واحد
========================= */

function parseQuestionBlock(
  block,
  index
) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const explicitType =
    detectExplicitQuestionType(
      lines
    );

  const optionLines =
    lines.filter((line) =>
      isOptionLine(line)
    );

  const answerLine =
    lines.find((line) =>
      isAnswerLine(line)
    );

  const modelAnswerLine =
    lines.find((line) =>
      /^(الإجابة النموذجية|الاجابة النموذجية|نموذج الإجابة|نموذج الاجابة)\s*[:：\-]/u.test(
        line
      )
    );

  const questionText =
    extractQuestionText(lines);

  if (!questionText) {
    throw new Error(
      `تعذر قراءة نص السؤال رقم ${
        index + 1
      }`
    );
  }

  let type = explicitType;

  if (!type) {
    if (optionLines.length >= 2) {
      type = "mcq";
    } else if (
      containsTrueFalseWords(
        lines.join(" ")
      )
    ) {
      type = "true_false";
    } else {
      type = "essay";
    }
  }

  if (type === "mcq") {
    const options =
      optionLines.map((line) =>
        extractOptionText(line)
      );

    if (options.length < 2) {
      throw new Error(
        `السؤال رقم ${
          index + 1
        } اختيار من متعدد، لكنه لا يحتوي على خيارات كافية`
      );
    }

    while (options.length < 4) {
      options.push("");
    }

    const answerText =
      extractAnswerText(
        answerLine || ""
      );

    const answerIndex =
      detectOptionAnswerIndex(
        answerText,
        options
      );

    return {
      type: "mcq",
      text: questionText,
      options:
        options.slice(0, 4),
      answer: answerIndex
    };
  }

  if (type === "true_false") {
    const answerText =
      extractAnswerText(
        answerLine || ""
      );

    return {
      type: "true_false",
      text:
        removeTrueFalsePrompt(
          questionText
        ),

      options: [
        "صح",
        "خطأ"
      ],

      answer:
        detectTrueFalseAnswer(
          answerText
        )
    };
  }

  const modelAnswer =
    modelAnswerLine
      ? modelAnswerLine
          .replace(
            /^(الإجابة النموذجية|الاجابة النموذجية|نموذج الإجابة|نموذج الاجابة)\s*[:：\-]\s*/u,
            ""
          )
          .trim()
      : answerLine
        ? extractAnswerText(
            answerLine
          )
        : "";

  return {
    type: "essay",
    text: questionText,
    modelAnswer,
    answer: null
  };
}

/* =========================
   اكتشاف نوع السؤال
========================= */

function detectExplicitQuestionType(
  lines
) {
  const joined =
    lines.join(" ");

  if (
    /\[(اختيار|اختيار من متعدد)\]/u.test(
      joined
    )
  ) {
    return "mcq";
  }

  if (
    /\[(صح وخطأ|صح أو خطأ)\]/u.test(
      joined
    )
  ) {
    return "true_false";
  }

  if (
    /\[مقالي\]/u.test(joined)
  ) {
    return "essay";
  }

  return null;
}

function containsTrueFalseWords(
  text
) {
  return (
    /صح\s*(أو|ام|أم|\/)\s*خطأ/u.test(
      text
    ) ||
    /صح\s*وخطاء/u.test(text) ||
    /صح\s*وخطأ/u.test(text) ||
    /true\s*(or|\/)\s*false/i.test(
      text
    )
  );
}

/* =========================
   استخراج نص السؤال
========================= */

function extractQuestionText(lines) {
  const ignoredPatterns = [
    /^\[(اختيار|اختيار من متعدد|صح وخطأ|صح أو خطأ|مقالي)\]$/u,

    /^(الإجابة|الاجابة|الإجابة الصحيحة|الاجابة الصحيحة|الجواب|الحل)\s*[:：\-]/u,

    /^(الإجابة النموذجية|الاجابة النموذجية|نموذج الإجابة|نموذج الاجابة)\s*[:：\-]/u
  ];

  const questionLines =
    lines.filter((line) => {
      if (isOptionLine(line)) {
        return false;
      }

      return !ignoredPatterns.some(
        (pattern) =>
          pattern.test(line)
      );
    });

  if (
    questionLines.length === 0
  ) {
    return "";
  }

  let text =
    questionLines.join(" ");

  text = text
    .replace(
      /^\[(اختيار|اختيار من متعدد|صح وخطأ|صح أو خطأ|مقالي)\]\s*/u,
      ""
    )
    .replace(
      /^(السؤال|سؤال)\s*[:：\-]\s*/u,
      ""
    );

  return cleanQuestionText(text);
}

/* =========================
   اكتشاف خيارات الإجابة
========================= */

function isOptionLine(line) {
  return (
    /^\s*[أابجدهـو]\s*[\)\.\-\:]\s*\S+/u.test(
      line
    ) ||
    /^\s*[A-Da-d]\s*[\)\.\-\:]\s*\S+/u.test(
      line
    ) ||
    /^\s*[1-4]\s*[\)\.\-\:]\s*\S+/u.test(
      line
    )
  );
}

function extractOptionText(line) {
  return line
    .replace(
      /^\s*[أابجدهـوA-Da-d1-4]\s*[\)\.\-\:]\s*/u,
      ""
    )
    .trim();
}

/* =========================
   استخراج الإجابة
========================= */

function isAnswerLine(line) {
  return /^(الإجابة|الاجابة|الإجابة الصحيحة|الاجابة الصحيحة|الجواب|الحل|answer)\s*[:：\-]/iu.test(
    line
  );
}

function extractAnswerText(line) {
  return String(line)
    .replace(
      /^(الإجابة|الاجابة|الإجابة الصحيحة|الاجابة الصحيحة|الجواب|الحل|answer)\s*[:：\-]\s*/iu,
      ""
    )
    .trim();
}

/* =========================
   تحديد إجابة الاختيار
========================= */

function detectOptionAnswerIndex(
  answerText,
  options
) {
  const cleaned =
    String(answerText)
      .trim()
      .replace(/[،,.]/g, "");

  const answerMap = {
    "أ": 0,
    "ا": 0,
    "A": 0,
    "a": 0,
    "1": 0,

    "ب": 1,
    "B": 1,
    "b": 1,
    "2": 1,

    "ج": 2,
    "C": 2,
    "c": 2,
    "3": 2,

    "د": 3,
    "D": 3,
    "d": 3,
    "4": 3
  };

  if (
    Object.prototype.hasOwnProperty.call(
      answerMap,
      cleaned
    )
  ) {
    return answerMap[cleaned];
  }

  const foundIndex =
    options.findIndex(
      (option) =>
        option.trim() ===
        answerText.trim()
    );

  if (foundIndex >= 0) {
    return foundIndex;
  }

  return 0;
}

/* =========================
   تحديد إجابة صح أو خطأ
========================= */

function detectTrueFalseAnswer(
  answerText
) {
  const cleaned =
    String(answerText)
      .trim()
      .toLowerCase();

  if (
    cleaned.includes("خطأ") ||
    cleaned.includes("خطاء") ||
    cleaned === "false" ||
    cleaned === "0" ||
    cleaned === "غلط"
  ) {
    return false;
  }

  return true;
}

function removeTrueFalsePrompt(
  text
) {
  return String(text)
    .replace(
      /صح\s*(أو|ام|أم|\/)\s*خطأ\s*[؟?]?/gu,
      ""
    )
    .replace(
      /صح\s*وخطأ\s*[؟?]?/gu,
      ""
    )
    .replace(
      /true\s*(or|\/)\s*false\s*[؟?]?/giu,
      ""
    )
    .trim();
}

      if (title) {
        title.textContent =
          `السؤال ${index + 1}`;
      }
    }
  );


}
/* =========================
   عرض الاختبارات
========================= */

function renderExamList() {
  const container =
    document.getElementById(
      "examList"
    );

  if (!container) {
    return;
  }

  if (
    !database.exams ||
    database.exams.length === 0
  ) {
    container.innerHTML =
      "<p class='muted'>لا توجد اختبارات حالياً.</p>";

    return;
  }

  container.innerHTML = "";

  database.exams.forEach(
    (exam) => {

      const box =
        document.createElement("div");

      box.className = "question";

      box.innerHTML = `

        <h3>
          ${escapeHTML(exam.title)}
        </h3>

        <p>
          المدة:
          <b>${exam.duration}</b>
          دقيقة
        </p>

        <p>
          عدد الأسئلة:
          <b>
          ${
            exam.questions
              ? exam.questions.length
              : 0
          }
          </b>
        </p>

        <div class="actions">

          <button
            class="small"
            onclick="editExam(${exam.id})">
            تعديل
          </button>


          <button
            class="red small"
            onclick="deleteExam(${exam.id})">
            حذف
          </button>


          <a
            class="btn gray small"
            href="/exam?id=${exam.id}">
            فتح الاختبار
          </a>

        </div>

      `;


      container.appendChild(box);

    }
  );
}


/* =========================
   تعديل اختبار
========================= */

function editExam(examId) {

  const exam =
    database.exams.find(
      item =>
      item.id === examId
    );


  if (!exam) {

    alert(
      "الاختبار غير موجود"
    );

    return;

  }


  editingExamId =
    exam.id;


  const title =
    document.getElementById(
      "examTitle"
    );


  const description =
    document.getElementById(
      "examDescription"
    );


  const duration =
    document.getElementById(
      "examDuration"
    );


  if (title) {
    title.value =
      exam.title || "";
  }


  if (description) {
    description.value =
      exam.description || "";
  }


  if (duration) {
    duration.value =
      exam.duration || 30;
  }



  const container =
    document.getElementById(
      "questions"
    );


  if (container) {

    container.innerHTML = "";


    exam.questions.forEach(
      question => {

        addQuestion(
          question
        );

      }
    );

  }


  const button =
    document.getElementById(
      "saveExamButton"
    );


  if (button) {

    button.textContent =
      "حفظ التعديلات";

  }


  window.scrollTo({

    top:0,

    behavior:"smooth"

  });

}


/* =========================
   حذف اختبار
========================= */

async function deleteExam(examId) {

  const exam =
    database.exams.find(
      item =>
      item.id === examId
    );


  if (!exam) {

    return;

  }


  const confirmDelete =
    confirm(
      `هل تريد حذف اختبار ${exam.title}؟`
    );


  if (!confirmDelete) {

    return;

  }


  try {


    await adminRequest(

      "/api/admin/exams/" +
      examId,

      {

        method:"DELETE"

      }

    );


    if (
      editingExamId === examId
    ) {

      resetExamForm();

    }


    await loadAdminData();


    alert(
      "تم حذف الاختبار"
    );


  } catch(error) {


    alert(
      error.message
    );


  }

}


/* =========================
   النتائج
========================= */

function renderResults() {

  const old =
    document.getElementById(
      "resultsCard"
    );


  if (old) {

    old.remove();

  }


  const panel =
    document.getElementById(
      "adminPanel"
    );


  if (!panel) {

    return;

  }


  const card =
    document.createElement(
      "div"
    );


  card.className =
    "card";


  card.id =
    "resultsCard";


  card.innerHTML = `

    <h2>
      نتائج الطلاب
    </h2>


    <div id="resultsTable"></div>

  `;


  panel.appendChild(card);



  const table =
    document.getElementById(
      "resultsTable"
    );


  if (
    !database.results ||
    database.results.length === 0
  ) {


    table.innerHTML =

      "<p class='muted'>لا توجد نتائج حتى الآن.</p>";

    return;

  }



  let rows = "";



  database.results.forEach(

    result => {


      rows += `

      <tr>

        <td>
        ${escapeHTML(result.name)}
        </td>


        <td>
        ${escapeHTML(result.examTitle)}
        </td>


        <td>
        ${result.score}
        /
        ${result.total}
        </td>


        <td>
        ${new Date(
          result.date
        ).toLocaleString("ar")}
        </td>


      </tr>

      `;


    }

  );



  table.innerHTML = `

  <div style="overflow:auto">

  <table>

  <thead>

  <tr>

  <th>
  الطالب
  </th>

  <th>
  الاختبار
  </th>

  <th>
  النتيجة
  </th>

  <th>
  التاريخ
  </th>


  </tr>

  </thead>


  <tbody>

  ${rows}

  </tbody>


  </table>

  </div>

  `;

}


/* =========================
   الإشعارات
========================= */

async function addNotification(){

  const title =
    document.getElementById(
      "notificationTitle"
    )?.value.trim();


  const message =
    document.getElementById(
      "notificationMessage"
    )?.value.trim();



  if (!title || !message) {

    alert(
      "اكتب عنوان ونص الإشعار"
    );

    return;

  }



  try {


    await adminRequest(

      "/api/admin/notifications",

      {

        method:"POST",

        headers:{

          "Content-Type":
          "application/json"

        },


        body:JSON.stringify({

          title,

          message

        })

      }

    );



    document.getElementById(
      "notificationTitle"
    ).value = "";


    document.getElementById(
      "notificationMessage"
    ).value = "";



    await loadAdminData();



    alert(
      "تم نشر الإشعار"
    );



  } catch(error){


    alert(
      error.message
    );


  }

}



function renderNotifications(){

  const container =
    document.getElementById(
      "notificationList"
    );


  if (!container) {

    return;

  }



  if (

    !database.notifications ||

    database.notifications.length===0

  ){

    container.innerHTML =
    "<p class='muted'>لا توجد إشعارات</p>";

    return;

  }



  container.innerHTML="";



  database.notifications.forEach(

    item=>{


      const div =
      document.createElement(
        "div"
      );


      div.className =
      "question";


      div.innerHTML = `

      <h3>
      ${escapeHTML(item.title)}
      </h3>


      <p>
      ${escapeHTML(item.message)}
      </p>


      <div class="actions">


      <button
      class="red small"
      onclick="deleteNotification(${item.id})">

      حذف

      </button>


      </div>

      `;


      container.appendChild(div);


    }

  );

}

/* =========================
   حذف إشعار
========================= */

async function deleteNotification(id) {

  const confirmDelete =
    confirm(
      "هل تريد حذف هذا الإشعار؟"
    );


  if (!confirmDelete) {
    return;
  }


  try {

    await adminRequest(
      "/api/admin/notifications/" + id,
      {
        method: "DELETE"
      }
    );


    await loadAdminData();


    alert(
      "تم حذف الإشعار"
    );


  } catch(error) {

    alert(
      error.message
    );

  }

}


/* =========================
   حذف جميع الإشعارات
========================= */

async function deleteAllNotifications(){

  const confirmDelete =
    confirm(
      "هل تريد حذف جميع الإشعارات؟"
    );


  if (!confirmDelete) {
    return;
  }


  try {

    await adminRequest(
      "/api/admin/notifications",
      {
        method:"DELETE"
      }
    );


    await loadAdminData();


    alert(
      "تم حذف جميع الإشعارات"
    );


  } catch(error){

    alert(
      error.message
    );

  }

}


/* =========================
   تعديل إشعار
========================= */

async function editNotification(id){

  const notification =
    database.notifications.find(
      item =>
      item.id === id
    );


  if (!notification){

    alert(
      "الإشعار غير موجود"
    );

    return;

  }



  const newTitle =
    prompt(
      "عنوان الإشعار:",
      notification.title
    );


  if (newTitle === null) {
    return;
  }


  const newMessage =
    prompt(
      "نص الإشعار:",
      notification.message
    );


  if (newMessage === null) {
    return;
  }



  try {


    await adminRequest(

      "/api/admin/notifications/" +
      id,

      {

        method:"PUT",

        headers:{

          "Content-Type":
          "application/json"

        },


        body:JSON.stringify({

          title:newTitle,

          message:newMessage

        })

      }

    );



    await loadAdminData();



    alert(
      "تم تعديل الإشعار"
    );


  } catch(error){


    alert(
      error.message
    );


  }

}



/* =========================
   إعدادات الصفحة الرئيسية
========================= */

function loadSettingsForm(){

  const settings =
    database.settings;


  if (!settings) {
    return;
  }



  const fields = [

    [
      "homeTitle",
      settings.title
    ],

    [
      "homeDescription",
      settings.description
    ],

    [
      "homeButtonText",
      settings.buttonText
    ],

    [
      "backgroundColor",
      settings.backgroundColor
    ],

    [
      "titleColor",
      settings.titleColor
    ],

    [
      "buttonColor",
      settings.buttonColor
    ],

    [
      "textColor",
      settings.textColor
    ]

  ];



  fields.forEach(
    ([id,value])=>{

      const element =
        document.getElementById(id);


      if(element){

        element.value =
          value || "";

      }

    }
  );

}



async function saveHomeSettings(){

  const data = {

    title:
    document.getElementById(
      "homeTitle"
    )?.value || "",


    description:
    document.getElementById(
      "homeDescription"
    )?.value || "",


    buttonText:
    document.getElementById(
      "homeButtonText"
    )?.value || "",


    backgroundColor:
    document.getElementById(
      "backgroundColor"
    )?.value || "#ffffff",


    titleColor:
    document.getElementById(
      "titleColor"
    )?.value || "#000000",


    buttonColor:
    document.getElementById(
      "buttonColor"
    )?.value || "#2563eb",


    textColor:
    document.getElementById(
      "textColor"
    )?.value || "#000000"

  };



  try{


    await adminRequest(

      "/api/admin/settings",

      {

        method:"PUT",

        headers:{

          "Content-Type":
          "application/json"

        },


        body:
        JSON.stringify(data)

      }

    );



    alert(
      "تم حفظ إعدادات الصفحة"
    );


    await loadAdminData();



  }catch(error){


    alert(
      error.message
    );


  }

}


/* =========================
   تغيير كلمة المرور
========================= */

async function changeAdminPassword(){

  const oldPassword =
    document.getElementById(
      "oldPassword"
    )?.value.trim();


  const newPassword =
    document.getElementById(
      "newPassword"
    )?.value.trim();



  if(
    !oldPassword ||
    !newPassword
  ){

    alert(
      "اكتب كلمة المرور الحالية والجديدة"
    );

    return;

  }



  try{


    await adminRequest(

      "/api/admin/password",

      {

        method:"PUT",

        headers:{

          "Content-Type":
          "application/json"

        },


        body:JSON.stringify({

          oldPassword,

          newPassword

        })

      }

    );



    document.getElementById(
      "oldPassword"
    ).value="";


    document.getElementById(
      "newPassword"
    ).value="";



    alert(
      "تم تغيير كلمة المرور"
    );



  }catch(error){


    alert(
      error.message
    );

  }

}


/* =========================
   تشغيل الأحداث
========================= */

document.addEventListener(
  "DOMContentLoaded",
  ()=>{


    const password =
      document.getElementById(
        "password"
      );


    if(password){

      password.addEventListener(
        "keydown",
        (event)=>{

          if(
            event.key === "Enter"
          ){

            login();

          }

        }
      );

    }


  }
);

