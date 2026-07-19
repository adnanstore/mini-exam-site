const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DEFAULT_ADMIN_PASSWORD = "admin123";
const PUBLIC_DIR = __dirname;

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");


if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}


function createDefaultDatabase() {
  return {
    adminPassword: DEFAULT_ADMIN_PASSWORD,

    settings: {
      title: "منصة الاختبارات",
      description: "اختبر معلوماتك واستعد للامتحانات",
      buttonText: "ابدأ الاختبار",
      backgroundColor: "#ffffff",
      titleColor: "#1e3a8a",
      buttonColor: "#2563eb",
      textColor: "#000000"
    },

    notifications: [],

    exams: [
      {
        id: 1,
        title: "اختبار تجريبي",
        duration: 5,
        attempts: 1,

        questions: [
          {
            id: 1,
            text: "ما ناتج 5 × 5؟",
            options: [
              "10",
              "15",
              "20",
              "25"
            ],
            answer: 3
          }
        ]
      }
    ],

    results: []
  };
}


function normalizeDatabase(database) {
  const defaults = createDefaultDatabase();

  return {
    adminPassword:
      typeof database?.adminPassword === "string" &&
      database.adminPassword.trim()
        ? database.adminPassword
        : defaults.adminPassword,

    settings: {
      ...defaults.settings,
      ...(database?.settings || {})
    },

    notifications:
      Array.isArray(database?.notifications)
        ? database.notifications
        : [],

    exams:
      Array.isArray(database?.exams)
        ? database.exams
        : [],

    results:
      Array.isArray(database?.results)
        ? database.results
        : []
  };
}


function readDatabase() {
  try {
    const content = fs.readFileSync(DB_FILE, "utf8");

    if (!content.trim()) {
      throw new Error("Empty database");
    }

    const database = JSON.parse(content);

    return normalizeDatabase(database);

  } catch (error) {
    const database = createDefaultDatabase();

    saveDatabase(database);

    return database;
  }
}


function saveDatabase(database) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(
      normalizeDatabase(database),
      null,
      2
    ),
    "utf8"
  );
}


function sendJSON(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  response.end(JSON.stringify(data));
}


function sendFile(response, filename) {
  const filePath = path.join(PUBLIC_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return sendJSON(response, 404, {
      error: "الملف غير موجود"
    });
  }

  const extension =
    path.extname(filePath).toLowerCase();

  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  response.writeHead(200, {
    "Content-Type":
      contentTypes[extension] ||
      "application/octet-stream"
  });

  fs.createReadStream(filePath).pipe(response);
}


function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", chunk => {
      body += chunk;

      if (body.length > 1000000) {
        request.destroy();

        reject(
          new Error("البيانات كبيرة")
        );
      }
    });

    request.on("end", () => {
      try {
        resolve(
          body ? JSON.parse(body) : {}
        );
      } catch (error) {
        reject(
          new Error("صيغة البيانات غير صحيحة")
        );
      }
    });

    request.on("error", reject);
  });
}


function isAdmin(request) {
  return (
    request.headers["x-admin-password"] ===
    readDatabase().adminPassword
  );
}


function validateQuestions(questions) {
  if (
    !Array.isArray(questions) ||
    questions.length === 0
  ) {
    return false;
  }

  return questions.every(question => {
    const text =
      String(question?.text || "").trim();

    const options = question?.options;

    const answer = Number(question?.answer);

    return (
      text.length > 0 &&

      Array.isArray(options) &&

      options.length === 4 &&

      options.every(option =>
        String(option || "").trim().length > 0
      ) &&

      [0, 1, 2, 3].includes(answer)
    );
  });
}


function prepareQuestions(questions) {
  return questions.map((question, index) => ({
    id:
      Number(question.id) ||
      Date.now() + index,

    text:
      String(question.text || "").trim(),

    options:
      question.options.map(option =>
        String(option || "").trim()
      ),

    answer:
      Number(question.answer)
  }));
}


const server = http.createServer(
  async (request, response) => {
    try {
      const url = new URL(
        request.url,
        "http://localhost"
      );

      const pathname =
        decodeURIComponent(url.pathname);


      // =========================
      // الصفحات والملفات
      // =========================

      if (
        request.method === "GET" &&
        pathname === "/"
      ) {
        return sendFile(
          response,
          "index.html"
        );
      }


      if (
        request.method === "GET" &&
        pathname === "/exam"
      ) {
        return sendFile(
          response,
          "exam.html"
        );
      }


      if (
        request.method === "GET" &&
        pathname === "/admin"
      ) {
        return sendFile(
          response,
          "admin.html"
        );
      }


      if (
        request.method === "GET" &&
        pathname === "/style.css"
      ) {
        return sendFile(
          response,
          "style.css"
        );
      }


      if (
        request.method === "GET" &&
        pathname === "/app.js"
      ) {
        return sendFile(
          response,
          "app.js"
        );
      }


      if (
        request.method === "GET" &&
        pathname === "/home-data.js"
      ) {
        return sendFile(
          response,
          "home-data.js"
        );
      }


      // =========================
      // بيانات الصفحة الرئيسية
      // =========================

      if (
        request.method === "GET" &&
        pathname === "/api/home"
      ) {
        const database = readDatabase();

        return sendJSON(response, 200, {
          settings: database.settings,
          notifications:
            database.notifications
        });
      }


      // =========================
      // عرض كل الاختبارات
      // =========================

      if (
        request.method === "GET" &&
        pathname === "/api/exams"
      ) {
        const database = readDatabase();

        return sendJSON(
          response,
          200,

          database.exams.map(exam => ({
            id: exam.id,
            title: exam.title,
            duration: exam.duration,
            attempts: exam.attempts || 1,

            questionCount:
              Array.isArray(exam.questions)
                ? exam.questions.length
                : 0
          }))
        );
      }


      // =========================
      // عرض اختبار واحد
      // =========================

      const examMatch =
        pathname.match(
          /^\/api\/exams\/(\d+)$/
        );


      if (
        request.method === "GET" &&
        examMatch
      ) {
        const database = readDatabase();

        const exam =
          database.exams.find(
            item =>
              item.id ===
              Number(examMatch[1])
          );


        if (!exam) {
          return sendJSON(
            response,
            404,
            {
              error:
                "الاختبار غير موجود"
            }
          );
        }


        return sendJSON(
          response,
          200,
          {
            id: exam.id,
            title: exam.title,
            duration: exam.duration,
            attempts: exam.attempts || 1,

            questions:
              exam.questions.map(
                question => ({
                  id: question.id,
                  text: question.text,
                  options:
                    question.options
                })
              )
          }
        );
      }


      // =========================
      // إرسال إجابات الطالب
      // =========================

      if (
        request.method === "POST" &&
        pathname === "/api/submit"
      ) {
        const body =
          await readRequestBody(request);

        const database =
          readDatabase();


        const exam =
          database.exams.find(
            item =>
              item.id ===
              Number(body.examId)
          );


        if (!exam) {
          return sendJSON(
            response,
            404,
            {
              error:
                "الاختبار غير موجود"
            }
          );
        }


        const studentName =
          String(body.name || "").trim();

        const studentId =
          String(
            body.studentId || ""
          ).trim();


        if (
          !studentName ||
          !studentId
        ) {
          return sendJSON(
            response,
            400,
            {
              error:
                "اسم الطالب ورقم الطالب مطلوبان"
            }
          );
        }


        const maxAttempts =
          Number(exam.attempts) || 1;


        const usedAttempts =
          database.results.filter(
            result =>
              result.examId ===
                exam.id &&

              String(result.studentId) ===
                studentId
          ).length;


        if (
          usedAttempts >= maxAttempts
        ) {
          return sendJSON(
            response,
            403,
            {
              error:
                "لقد استنفدت جميع المحاولات المسموح بها"
            }
          );
        }


        const answers =
          body.answers || {};

        let score = 0;


        exam.questions.forEach(
          question => {
            if (
              Number(
                answers[question.id]
              ) ===
              Number(question.answer)
            ) {
              score++;
            }
          }
        );


        const result = {
          id: Date.now(),
          name: studentName,
          studentId,
          examId: exam.id,
          examTitle: exam.title,
          score,

          total:
            exam.questions.length,

          date:
            new Date().toISOString()
        };


        database.results.unshift(
          result
        );

        saveDatabase(database);


        return sendJSON(
          response,
          201,
          result
        );
      }


      // =========================
      // تسجيل دخول الإدارة
      // =========================

      if (
        request.method === "POST" &&
        pathname ===
          "/api/admin/login"
      ) {
        const body =
          await readRequestBody(request);


        if (
          String(
            body.password || ""
          ) !==
          readDatabase().adminPassword
        ) {
          return sendJSON(
            response,
            401,
            {
              error:
                "كلمة المرور غير صحيحة"
            }
          );
        }


        return sendJSON(
          response,
          200,
          {
            success: true
          }
        );
      }


      // =========================
      // حماية مسارات الإدارة
      // =========================

      if (
        pathname.startsWith(
          "/api/admin/"
        ) &&
        !isAdmin(request)
      ) {
        return sendJSON(
          response,
          401,
          {
            error: "غير مصرح لك"
          }
        );
      }


      // =========================
      // عرض جميع بيانات الإدارة
      // =========================

      if (
        request.method === "GET" &&
        pathname ===
          "/api/admin/data"
      ) {
        return sendJSON(
          response,
          200,
          readDatabase()
        );
      }


      // =========================
      // حفظ إعدادات الصفحة
      // =========================

      if (
        request.method === "PUT" &&
        pathname ===
          "/api/admin/settings"
      ) {
        const body =
          await readRequestBody(request);

        const database =
          readDatabase();


        database.settings = {
          title:
            String(
              body.title || ""
            ).trim(),

          description:
            String(
              body.description || ""
            ).trim(),

          buttonText:
            String(
              body.buttonText || ""
            ).trim(),

          backgroundColor:
            String(
              body.backgroundColor ||
              "#ffffff"
            ),

          titleColor:
            String(
              body.titleColor ||
              "#1e3a8a"
            ),

          buttonColor:
            String(
              body.buttonColor ||
              "#2563eb"
            ),

          textColor:
            String(
              body.textColor ||
              "#000000"
            )
        };


        saveDatabase(database);


        return sendJSON(
          response,
          200,
          {
            success: true,
            settings:
              database.settings
          }
        );
      }


      // =========================
      // إضافة إشعار
      // =========================

      if (
        request.method === "POST" &&
        pathname ===
          "/api/admin/notifications"
      ) {
        const body =
          await readRequestBody(request);

        const database =
          readDatabase();


        const title =
          String(
            body.title || ""
          ).trim();

        const message =
          String(
            body.message || ""
          ).trim();


        if (!title || !message) {
          return sendJSON(
            response,
            400,
            {
              error:
                "عنوان الإشعار ونص الإشعار مطلوبان"
            }
          );
        }


        const notification = {
          id: Date.now(),
          title,
          message,

          date:
            new Date().toISOString()
        };


        database.notifications.unshift(
          notification
        );

        saveDatabase(database);


        return sendJSON(
          response,
          201,
          notification
        );
      }


      // =========================
      // تعديل أو حذف إشعار واحد
      // =========================

      const notificationMatch =
        pathname.match(
          /^\/api\/admin\/notifications\/(\d+)$/
        );


      if (
        request.method === "PUT" &&
        notificationMatch
      ) {
        const body =
          await readRequestBody(request);

        const database =
          readDatabase();


        const notification =
          database.notifications.find(
            item =>
              Number(item.id) ===
              Number(
                notificationMatch[1]
              )
          );


        if (!notification) {
          return sendJSON(
            response,
            404,
            {
              error:
                "الإشعار غير موجود"
            }
          );
        }


        const title =
          String(
            body.title || ""
          ).trim();

        const message =
          String(
            body.message || ""
          ).trim();


        if (!title || !message) {
          return sendJSON(
            response,
            400,
            {
              error:
                "عنوان الإشعار ونص الإشعار مطلوبان"
            }
          );
        }


        notification.title = title;
        notification.message = message;

        notification.updatedAt =
          new Date().toISOString();


        saveDatabase(database);


        return sendJSON(
          response,
          200,
          notification
        );
      }


      if (
        request.method === "DELETE" &&
        notificationMatch
      ) {
        const database =
          readDatabase();

        const notificationId =
          Number(
            notificationMatch[1]
          );


        const notificationExists =
          database.notifications.some(
            item =>
              Number(item.id) ===
              notificationId
          );


        if (!notificationExists) {
          return sendJSON(
            response,
            404,
            {
              error:
                "الإشعار غير موجود"
            }
          );
        }


        database.notifications =
          database.notifications.filter(
            item =>
              Number(item.id) !==
              notificationId
          );


        saveDatabase(database);


        return sendJSON(
          response,
          200,
          {
            success: true
          }
        );
      }


      // =========================
      // حذف جميع الإشعارات
      // =========================

      if (
        request.method === "DELETE" &&
        pathname ===
          "/api/admin/notifications"
      ) {
        const database =
          readDatabase();

        database.notifications = [];

        saveDatabase(database);


        return sendJSON(
          response,
          200,
          {
            success: true
          }
        );
      }


      // =========================
      // تغيير كلمة المرور
      // =========================

      if (
        request.method === "PUT" &&
        pathname ===
          "/api/admin/password"
      ) {
        const body =
          await readRequestBody(request);

        const database =
          readDatabase();


        if (
          String(
            body.oldPassword || ""
          ) !==
          database.adminPassword
        ) {
          return sendJSON(
            response,
            400,
            {
              error:
                "كلمة المرور الحالية غير صحيحة"
            }
          );
        }


        const newPassword =
          String(
            body.newPassword || ""
          ).trim();


        if (!newPassword) {
          return sendJSON(
            response,
            400,
            {
              error:
                "كلمة المرور الجديدة فارغة"
            }
          );
        }


        database.adminPassword =
          newPassword;

        saveDatabase(database);


        return sendJSON(
          response,
          200,
          {
            success: true
          }
        );
      }


      // =========================
      // إضافة اختبار
      // =========================

      if (
        request.method === "POST" &&
        pathname ===
          "/api/admin/exams"
      ) {
        const body =
          await readRequestBody(request);

        const database =
          readDatabase();


        const title =
          String(
            body.title || ""
          ).trim();

        const duration =
          Number(body.duration);

        const attempts =
          Number(body.attempts) || 1;

        const questions =
          body.questions || [];


        if (
          !title ||
          !Number.isFinite(duration) ||
          duration <= 0 ||
          attempts <= 0 ||
          !validateQuestions(questions)
        ) {
          return sendJSON(
            response,
            400,
            {
              error:
                "بيانات الاختبار غير صحيحة"
            }
          );
        }


        const exam = {
          id: Date.now(),
          title,
          duration,
          attempts,

          questions:
            prepareQuestions(questions)
        };


        database.exams.push(exam);

        saveDatabase(database);


        return sendJSON(
          response,
          201,
          exam
        );
      }


      // =========================
      // تعديل أو حذف اختبار
      // =========================

      const adminExamMatch =
        pathname.match(
          /^\/api\/admin\/exams\/(\d+)$/
        );


      if (
        request.method === "PUT" &&
        adminExamMatch
      ) {
        const body =
          await readRequestBody(request);

        const database =
          readDatabase();


        const exam =
          database.exams.find(
            item =>
              Number(item.id) ===
              Number(
                adminExamMatch[1]
              )
          );


        if (!exam) {
          return sendJSON(
            response,
            404,
            {
              error:
                "الاختبار غير موجود"
            }
          );
        }


        const title =
          String(
            body.title || ""
          ).trim();

        const duration =
          Number(body.duration);

        const attempts =
          Number(body.attempts) || 1;

        const questions =
          body.questions || [];


        if (
          !title ||
          !Number.isFinite(duration) ||
          duration <= 0 ||
          attempts <= 0 ||
          !validateQuestions(questions)
        ) {
          return sendJSON(
            response,
            400,
            {
              error:
                "بيانات الاختبار غير صحيحة"
            }
          );
        }


        exam.title = title;
        exam.duration = duration;
        exam.attempts = attempts;

        exam.questions =
          prepareQuestions(questions);


        saveDatabase(database);


        return sendJSON(
          response,
          200,
          exam
        );
      }


      if (
        request.method === "DELETE" &&
        adminExamMatch
      ) {
        const database =
          readDatabase();

        const examId =
          Number(
            adminExamMatch[1]
          );


        const examExists =
          database.exams.some(
            item =>
              Number(item.id) === examId
          );


        if (!examExists) {
          return sendJSON(
            response,
            404,
            {
              error:
                "الاختبار غير موجود"
            }
          );
        }


        database.exams =
          database.exams.filter(
            item =>
              Number(item.id) !== examId
          );


        saveDatabase(database);


        return sendJSON(
          response,
          200,
          {
            success: true
          }
        );
      }


      // =========================
      // أي رابط غير موجود
      // =========================

      return sendJSON(
        response,
        404,
        {
          error:
            "الصفحة غير موجودة"
        }
      );

    } catch (error) {
      console.error(error);

      return sendJSON(
        response,
        500,
        {
          error:
            error.message ===
            "صيغة البيانات غير صحيحة"
              ? error.message
              : "حدث خطأ داخل السيرفر"
        }
      );
    }
  }
);


server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");
    console.log(
      "تم تشغيل الموقع بنجاح"
    );
    console.log(
      `http://localhost:${PORT}`
    );
    console.log(
      `لوحة الإدارة: http://localhost:${PORT}/admin`
    );
    console.log("");
  }
);
