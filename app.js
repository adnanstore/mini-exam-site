let adminPassword = "";
let database = {
  exams: [],
  results: []
};

window.editingExamId = null;
let questionCounter = 0;

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

async function login() {
  const passwordInput =
    document.getElementById("password");

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

    document
      .getElementById("loginCard")
      .classList.add("hidden");

    document
      .getElementById("adminPanel")
      .classList.remove("hidden");

    await loadAdminData();

    if (
      document.querySelectorAll(
        "#questions .question"
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

async function adminRequest(url, options = {}) {
  const headers = {
    "x-admin-password": adminPassword,
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const result = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      document
        .getElementById("adminPanel")
        .classList.add("hidden");

      document
        .getElementById("loginCard")
        .classList.remove("hidden");
    }

    throw new Error(
      result.error ||
      "حدث خطأ أثناء تنفيذ العملية"
    );
  }

  return result;
}

async function loadAdminData() {
  try {
    database = await adminRequest(
      "/api/admin/data"
    );

    renderExamList();
  } catch (error) {
    alert(error.message);
  }
}

function addQuestion(questionData = null) {
  questionCounter++;

  const container =
    document.getElementById("questions");

  const questionBox =
    document.createElement("div");

  questionBox.className = "question";
  questionBox.dataset.questionId =
    questionData?.id || "";

  const questionNumber =
    container.children.length + 1;

  questionBox.innerHTML = `
    <div class="actions">
      <h3>
        السؤال ${questionNumber}
      </h3>

      <button
        type="button"
        class="red small"
        onclick="removeQuestion(this)">
        حذف السؤال
      </button>
    </div>

    <input
      class="question-text"
      type="text"
      placeholder="نص السؤال"
      value="${escapeAttribute(
        questionData?.text || ""
      )}">

    <input
      class="option-text"
      type="text"
      placeholder="الإجابة الأولى"
      value="${escapeAttribute(
        questionData?.options?.[0] || ""
      )}">

    <input
      class="option-text"
      type="text"
      placeholder="الإجابة الثانية"
      value="${escapeAttribute(
        questionData?.options?.[1] || ""
      )}">

    <input
      class="option-text"
      type="text"
      placeholder="الإجابة الثالثة"
      value="${escapeAttribute(
        questionData?.options?.[2] || ""
      )}">

    <input
      class="option-text"
      type="text"
      placeholder="الإجابة الرابعة"
      value="${escapeAttribute(
        questionData?.options?.[3] || ""
      )}">

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
  `;

  container.appendChild(questionBox);

  const answerSelect =
    questionBox.querySelector(
      ".correct-answer"
    );

  answerSelect.value = String(
    questionData?.answer ?? 0
  );

  updateQuestionNumbers();
}

function removeQuestion(button) {
  const questions =
    document.querySelectorAll(
      "#questions .question"
    );

  if (questions.length === 1) {
    alert(
      "يجب أن يحتوي الاختبار على سؤال واحد على الأقل"
    );
    return;
  }

  button.closest(".question").remove();

  updateQuestionNumbers();
}

function updateQuestionNumbers() {
  const questions =
    document.querySelectorAll(
      "#questions .question"
    );

  questions.forEach((question, index) => {
    const title =
      question.querySelector("h3");

    if (title) {
      title.textContent =
        `السؤال ${index + 1}`;
    }
  });
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function collectQuestions() {
  const questionBoxes = document.querySelectorAll("#questions .question");

  const questions = [];

  for (const box of questionBoxes) {

    const text =
      box.querySelector(".question-text").value.trim();

    const options = [...box.querySelectorAll(".option-text")]
      .map(item => item.value.trim());

    const answer = Number(
      box.querySelector(".correct-answer").value
    );

    if (!text) {
      throw new Error("يوجد سؤال بدون نص.");
    }

    if (options.some(option => option === "")) {
      throw new Error("يجب إدخال جميع الاختيارات.");
    }

    questions.push({
      id: Number(box.dataset.questionId) || undefined,
      text,
      options,
      answer
    });

  }

  return questions;
}

async function saveExam() {

  try {

    const title =
      document.getElementById("title").value.trim();

    const duration =
      Number(document.getElementById("duration").value);
const attempts =
  Number(document.getElementById("attempts").value);
    if (!title) {
      throw new Error("اكتب اسم الاختبار.");
    }

    if (!duration || duration < 1) {
      throw new Error("مدة الاختبار غير صحيحة.");
    }
if (!attempts || attempts < 1) {
  throw new Error(
    "عدد المحاولات يجب أن يكون 1 أو أكثر."
  );
}
    const questions = collectQuestions();

    const payload = {
  title,
  duration,
  attempts,
  questions
};
    if (window.editingExamId) {
await adminRequest(
  "/api/admin/exams/" + window.editingExamId
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);
      alert("تم تعديل الاختبار.");

    } else {

      await adminRequest(
        "/api/admin/exams",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      alert("تم إضافة الاختبار.");

    }

    clearForm();

    await loadAdminData();

  } catch (error) {

    alert(error.message);

  }

}

function clearForm() {

  editingExamId = null;

  document.getElementById("title").value = "";
  document.getElementById("duration").value = "";
document.getElementById("attempts").value = "1";
  document.getElementById("questions").innerHTML = "";

  addQuestion();

}
function renderExamList() {
  const container =
    document.getElementById("examList");

  if (!database.exams.length) {
    container.innerHTML =
      "<p class='muted'>لا توجد اختبارات حالياً.</p>";
    return;
  }

  container.innerHTML = "";

  database.exams.forEach(exam => {
    const box = document.createElement("div");

    box.className = "question";

    box.innerHTML = `
      <h3>${escapeHTML(exam.title)}</h3>

      <p>
        المدة:
        <b>${exam.duration}</b>
        دقيقة
      </p>
<p>
  عدد المحاولات المسموحة:
  <b>${exam.attempts || 1}</b>
</p>
      <p>
        عدد الأسئلة:
        <b>${exam.questions.length}</b>
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
  });

  renderResults();
}

function renderResults() {
  const oldResults =
    document.getElementById("resultsCard");

  if (oldResults) {
    oldResults.remove();
  }

  const panel =
    document.getElementById("adminPanel");

  const card = document.createElement("div");

  card.className = "card";
  card.id = "resultsCard";
  card.style.marginTop = "20px";

  card.innerHTML = `
    <h2>نتائج الطلاب</h2>
    <div id="resultsTable"></div>
  `;

  panel.appendChild(card);

  const tableBox =
    document.getElementById("resultsTable");

  if (!database.results.length) {
    tableBox.innerHTML =
      "<p class='muted'>لا توجد نتائج حتى الآن.</p>";
    return;
  }

  let rows = "";

  database.results.forEach(result => {
    const date = new Date(result.date);

    rows += `
      <tr>
        <td>${escapeHTML(result.name)}</td>
        <td>${escapeHTML(result.examTitle)}</td>
        <td>${result.score} / ${result.total}</td>
        <td>${date.toLocaleString("ar")}</td>
      </tr>
    `;
  });

  tableBox.innerHTML = `
    <div style="overflow:auto">
      <table>
        <thead>
          <tr>
            <th>اسم الطالب</th>
            <th>الاختبار</th>
            <th>النتيجة</th>
            <th>التاريخ</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function editExam(examId) {
  const exam = database.exams.find(
    item => item.id === examId
  );

  if (!exam) {
    alert("الاختبار غير موجود.");
    return;
  }

  window.editingExamId = exam.id;

  document.getElementById("title").value =
    exam.title;

  document.getElementById("duration").value =
    exam.duration;
document.getElementById("attempts").value =
  exam.attempts || 1;
  const questionsContainer =
    document.getElementById("questions");

  questionsContainer.innerHTML = "";

  exam.questions.forEach(question => {
    addQuestion(question);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function deleteExam(examId) {
  const exam = database.exams.find(
    item => item.id === examId
  );

  if (!exam) {
    alert("الاختبار غير موجود.");
    return;
  }

  const confirmed = confirm(
    `هل تريد حذف اختبار: ${exam.title}؟`
  );

  if (!confirmed) {
    return;
  }

  try {
    await adminRequest(
      "/api/admin/exams/" + examId,
      {
        method: "DELETE"
      }
    );

    if (window.editingExamId === examId) {
      clearForm();
    }

    await loadAdminData();

    alert("تم حذف الاختبار.");
  } catch (error) {
    alert(error.message);
  }
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document
  .getElementById("password")
  ?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      login();
    }
  });
function clearBulkQuestions() {
  const textarea = document.getElementById("bulkQuestions");
  const message = document.getElementById("bulkMessage");

  if (textarea) {
    textarea.value = "";
  }

  if (message) {
    message.textContent = "";
    message.className = "muted";
  }
}

function normalizeArabicLetter(value) {
  return String(value)
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .toLowerCase();
}

function getAnswerIndex(answerText, options) {
  const answer = normalizeArabicLetter(answerText)
    .replace(/^الخيار\s*/, "")
    .replace(/^الاجابه\s*/, "")
    .replace(/^الاجابة\s*/, "")
    .replace(/^الصحيحه\s*/, "")
    .replace(/^الصحيحة\s*/, "")
    .trim();

  const answerMap = {
    "ا": 0,
    "أ": 0,
    "a": 0,
    "1": 0,
    "الاولى": 0,
    "الاول": 0,

    "ب": 1,
    "b": 1,
    "2": 1,
    "الثانيه": 1,
    "الثاني": 1,

    "ج": 2,
    "c": 2,
    "3": 2,
    "الثالثه": 2,
    "الثالث": 2,

    "د": 3,
    "d": 3,
    "4": 3,
    "الرابعه": 3,
    "الرابع": 3
  };

  if (answerMap[answer] !== undefined) {
    return answerMap[answer];
  }

  const exactIndex = options.findIndex(option => {
    return normalizeArabicLetter(option) === answer;
  });

  return exactIndex >= 0 ? exactIndex : -1;
}

function parseBulkQuestions(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");

  const questions = [];
  let currentQuestion = null;

  const questionPattern =
    /^(?:سؤال\s*)?[\(\[]?\s*(\d+)\s*[\)\].\-:،]?\s*(.+)$/i;

  const optionPattern =
    /^(?:[\(\[]?\s*)?(أ|ا|ب|ج|د|A|B|C|D|1|2|3|4)(?:\s*[\)\].\-:،])\s*(.+)$/i;

  const answerPattern =
    /^(?:الإجابة|الاجابة|الإجابه|الاجابه)\s*(?:الصحيحة|الصحيحه)?\s*[:：\-]\s*(.+)$/i;

  for (const line of lines) {
    const answerMatch = line.match(answerPattern);

    if (answerMatch && currentQuestion) {
      currentQuestion.answerText = answerMatch[1].trim();
      continue;
    }

    const optionMatch = line.match(optionPattern);

    if (
      optionMatch &&
      currentQuestion &&
      currentQuestion.options.length < 4
    ) {
      currentQuestion.options.push(
        optionMatch[2].trim()
      );
      continue;
    }

    const questionMatch = line.match(questionPattern);

    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      currentQuestion = {
        text: questionMatch[2].trim(),
        options: [],
        answerText: ""
      };

      continue;
    }

    if (!currentQuestion) {
      currentQuestion = {
        text: line,
        options: [],
        answerText: ""
      };
    } else if (currentQuestion.options.length === 0) {
      currentQuestion.text += " " + line;
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions.map((question, index) => {
    if (!question.text) {
      throw new Error(
        `السؤال رقم ${index + 1} لا يحتوي على نص.`
      );
    }

    if (question.options.length !== 4) {
      throw new Error(
        `السؤال رقم ${index + 1} يحتوي على ${
          question.options.length
        } خيارات، ويجب أن يحتوي على 4 خيارات.`
      );
    }

    if (!question.answerText) {
      throw new Error(
        `لم يتم تحديد الإجابة الصحيحة للسؤال رقم ${
          index + 1
        }.`
      );
    }

    const answer = getAnswerIndex(
      question.answerText,
      question.options
    );

    if (answer < 0 || answer > 3) {
      throw new Error(
        `تعذر معرفة الإجابة الصحيحة للسؤال رقم ${
          index + 1
        }.`
      );
    }

    return {
      text: question.text,
      options: question.options,
      answer
    };
  });
}

function isQuestionBoxEmpty(questionBox) {
  const questionText =
    questionBox.querySelector(".question-text")
      ?.value.trim() || "";

  const optionTexts = [
    ...questionBox.querySelectorAll(".option-text")
  ].map(input => input.value.trim());

  return (
    questionText === "" &&
    optionTexts.every(option => option === "")
  );
}

function importBulkQuestions() {
  const textarea =
    document.getElementById("bulkQuestions");

  const message =
    document.getElementById("bulkMessage");

  if (!textarea || !message) {
    alert("قسم استيراد الأسئلة غير موجود.");
    return;
  }

  const text = textarea.value.trim();

  if (!text) {
    message.textContent =
      "الصق الأسئلة أولًا داخل المربع.";

    message.className = "notice error";
    return;
  }

  try {
    const importedQuestions =
      parseBulkQuestions(text);

    if (!importedQuestions.length) {
      throw new Error(
        "لم يتم العثور على أسئلة صالحة."
      );
    }

    const currentQuestions =
      document.querySelectorAll(
        "#questions .question"
      );

    if (
      currentQuestions.length === 1 &&
      isQuestionBoxEmpty(currentQuestions[0])
    ) {
      currentQuestions[0].remove();
    }

    importedQuestions.forEach(question => {
      addQuestion(question);
    });

    updateQuestionNumbers();

    message.textContent =
      `تم استيراد ${importedQuestions.length} سؤال بنجاح.`;

    message.className = "notice ok";

    textarea.value = "";

    document
      .getElementById("questions")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  } catch (error) {
    message.textContent = error.message;
    message.className = "notice error";
  }
}
async function changeAdminPassword() {

  const oldPassword =
    document.getElementById("oldPassword").value.trim();

  const newPassword =
    document.getElementById("newPassword").value.trim();

  const message =
    document.getElementById("passwordMessage");

  if (!oldPassword || !newPassword) {
    message.textContent =
      "اكتب كلمة المرور الحالية والجديدة";
    return;
  }

  try {

    await adminRequest(
      "/api/admin/password",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      }
    );

    message.textContent =
      "تم تغيير كلمة المرور بنجاح";

    document.getElementById("oldPassword").value = "";
    document.getElementById("newPassword").value = "";

  } catch(error) {

    message.textContent =
      error.message;

  }
}

async function saveHomeSettings(){

  const data = {

    title:
      document.getElementById("homeTitle").value,

    description:
      document.getElementById("homeDescription").value,

    buttonText:
      document.getElementById("homeButtonText").value,

    backgroundColor:
      document.getElementById("backgroundColor").value,

    titleColor:
      document.getElementById("titleColor").value,

    buttonColor:
      document.getElementById("buttonColor").value,

    textColor:
      document.getElementById("textColor").value

  };


  await adminRequest(
    "/api/admin/settings",
    {
      method:"PUT",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify(data)
    }
  );


  alert("تم حفظ إعدادات الصفحة");

}



async function addNotification(){

  const data = {

    title:
      document.getElementById("notificationTitle").value,

    message:
      document.getElementById("notificationMessage").value

  };


  await adminRequest(
    "/api/admin/notifications",
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify(data)
    }
  );


  document.getElementById("notificationMsg").textContent =
    "تم نشر الإشعار";

}
window.editExam = editExam;
window.saveExam = saveExam;
window.deleteExam = deleteExam;
window.editingExamId = editingExamId;
