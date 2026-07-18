const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = process.env.PORT || 3000;

const DEFAULT_ADMIN_PASSWORD = "admin123";

const PUBLIC_DIR = path.join(__dirname, "public");
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



function readDatabase() {

  try {

    const content =
      fs.readFileSync(DB_FILE, "utf8");

    if (!content) {
      throw new Error("Empty database");
    }

    return JSON.parse(content);


  } catch {

    const database =
      createDefaultDatabase();

    saveDatabase(database);

    return database;

  }

}



function saveDatabase(database) {

  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(database, null, 2),
    "utf8"
  );

}



function sendJSON(response, statusCode, data) {

  response.writeHead(statusCode, {

    "Content-Type":
      "application/json; charset=utf-8"

  });


  response.end(
    JSON.stringify(data)
  );

}



function sendFile(response, filename) {

  const filePath =
    path.join(PUBLIC_DIR, filename);


  if (!fs.existsSync(filePath)) {

    return sendJSON(response, 404, {

      error: "الملف غير موجود"

    });

  }


  const extension =
    path.extname(filePath).toLowerCase();



  const contentTypes = {

    ".html":
      "text/html; charset=utf-8",

    ".css":
      "text/css; charset=utf-8",

    ".js":
      "application/javascript; charset=utf-8"

  };


  response.writeHead(200, {

    "Content-Type":
      contentTypes[extension] ||
      "application/octet-stream"

  });


  fs.createReadStream(filePath)
    .pipe(response);

}



function readRequestBody(request) {

  return new Promise((resolve, reject)=>{

    let body = "";


    request.on("data", chunk=>{

      body += chunk;


      if(body.length > 1000000){

        request.destroy();

        reject(
          new Error("البيانات كبيرة")
        );

      }

    });


    request.on("end", ()=>{

      try {

        resolve(
          body ? JSON.parse(body) : {}
        );

      } catch {

        reject(
          new Error("صيغة البيانات غير صحيحة")
        );

      }

    });


    request.on("error", reject);


  });

}



function isAdmin(request){

  return (
    request.headers["x-admin-password"] ===
    readDatabase().adminPassword
  );

}



function validateQuestions(questions){

  if(!Array.isArray(questions)){
    return false;
  }


  return questions.every(question=>{

    return (

      question.text &&

      Array.isArray(question.options) &&

      question.options.length === 4 &&

      [0,1,2,3].includes(
        Number(question.answer)
      )

    );

  });

}

const server = http.createServer(async (request, response) => {

  try {

    const url = new URL(
      request.url,
      "http://localhost"
    );

    const pathname = url.pathname;


    // الصفحات الرئيسية

    if (
      request.method === "GET" &&
      pathname === "/"
    ) {
      return sendFile(response, "index.html");
    }


    if (
      request.method === "GET" &&
      pathname === "/exam"
    ) {
      return sendFile(response, "exam.html");
    }


    if (
      request.method === "GET" &&
      pathname === "/admin"
    ) {
      return sendFile(response, "admin.html");
    }


    if (
      request.method === "GET" &&
      pathname === "/style.css"
    ) {
      return sendFile(response, "style.css");
    }


    if (
      request.method === "GET" &&
      pathname === "/app.js"
    ) {
      return sendFile(response, "app.js");
    }



    // عرض كل الاختبارات

    if (
      request.method === "GET" &&
      pathname === "/api/exams"
    ) {

      const database = readDatabase();


      return sendJSON(response, 200,

        database.exams.map(exam => ({

          id: exam.id,

          title: exam.title,

          duration: exam.duration,

          attempts: exam.attempts || 1,

          questionCount:
            exam.questions.length

        }))

      );

    }



    // عرض اختبار واحد

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
          item.id === Number(examMatch[1])
        );


      if(!exam){
w
        return sendJSON(response,404,{
          error:"الاختبار غير موجود"
        });

      }



      return sendJSON(response,200,{

        id: exam.id,

        title: exam.title,

        duration: exam.duration,


        questions:
          exam.questions.map(question=>({

            id: question.id,

            text: question.text,

            options: question.options

          }))

      });

    }



    // إرسال الإجابات

    if(
      request.method === "POST" &&
      pathname === "/api/submit"
    ){

      const body =
        await readRequestBody(request);


      const database =
        readDatabase();



      const exam =
        database.exams.find(
          item =>
          item.id === Number(body.examId)
        );


      if(!exam){

        return sendJSON(response,404,{
          error:"الاختبار غير موجود"
        });

      }



      const studentName =
        String(body.name || "").trim();


      const studentId =
        String(body.studentId || "").trim();



      if(!studentName || !studentId){

        return sendJSON(response,400,{
          error:
          "اسم الطالب ورقم الطالب مطلوبان"
        });

      }



      const maxAttempts =
        exam.attempts || 1;



      const usedAttempts =
        database.results.filter(result=>

          result.examId === exam.id &&

          result.studentId === studentId

        ).length;



      if(usedAttempts >= maxAttempts){

        return sendJSON(response,403,{

          error:
          "لقد استنفدت جميع المحاولات المسموح بها"

        });

      }



      const answers =
        body.answers || {};


      let score = 0;


      exam.questions.forEach(question=>{


        if(
          Number(answers[question.id]) ===
          Number(question.answer)
        ){

          score++;

        }


      });



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



      database.results.unshift(result);


      saveDatabase(database);



      return sendJSON(response,201,result);


    }
// تسجيل دخول الإدارة

if (
  request.method === "POST" &&
  pathname === "/api/admin/login"
) {

  const body =
    await readRequestBody(request);


  if (
    String(body.password || "") !==
    readDatabase().adminPassword
  ) {

    return sendJSON(response,401,{
      error:"كلمة المرور غير صحيحة"
    });

  }


  return sendJSON(response,200,{
    success:true
  });

}



// حماية مسارات الإدارة

if(
  pathname.startsWith("/api/admin/") &&
  !isAdmin(request)
){

  return sendJSON(response,401,{
    error:"غير مصرح لك"
  });

}



// بيانات الإدارة

if(
  request.method === "GET" &&
  pathname === "/api/admin/data"
){

  return sendJSON(
    response,
    200,
    readDatabase()
  );

}
// حفظ إعدادات الصفحة الرئيسية
if (
  request.method === "PUT" &&
  pathname === "/api/admin/settings"
) {

  const body = await readRequestBody(request);

  const database = readDatabase();

  database.settings = {
    title: String(body.title || ""),
    description: String(body.description || ""),
    buttonText: String(body.buttonText || ""),
    backgroundColor: String(body.backgroundColor || "#ffffff"),
    titleColor: String(body.titleColor || "#000000"),
    buttonColor: String(body.buttonColor || "#2563eb"),
    textColor: String(body.textColor || "#000000")
  };

  saveDatabase(database);

  return sendJSON(response, 200, {
    success: true
  });
}


// إضافة إشعار للطلاب
if (
  request.method === "POST" &&
  pathname === "/api/admin/notifications"
) {

  const body = await readRequestBody(request);

  const database = readDatabase();

  database.notifications.unshift({
    id: Date.now(),
    title: String(body.title || ""),
    message: String(body.message || ""),
    date: new Date().toISOString()
  });

  saveDatabase(database);

  return sendJSON(response, 201, {
    success: true
  });
}


// تغيير كلمة المرور

if(
  request.method === "PUT" &&
  pathname === "/api/admin/password"
){

  const body =
    await readRequestBody(request);


  const database =
    readDatabase();



  if(
    String(body.oldPassword || "") !==
    database.adminPassword
  ){

    return sendJSON(response,400,{
      error:"كلمة المرور الحالية غير صحيحة"
    });

  }



  const newPassword =
    String(body.newPassword || "").trim();



  if(!newPassword){

    return sendJSON(response,400,{
      error:"كلمة المرور الجديدة فارغة"
    });

  }



  database.adminPassword =
    newPassword;


  saveDatabase(database);



  return sendJSON(response,200,{
    success:true
  });

}



// إضافة اختبار

if(
  request.method === "POST" &&
  pathname === "/api/admin/exams"
){

  const body =
    await readRequestBody(request);


  const database =
    readDatabase();



  const exam = {

    id: Date.now(),

    title:
      String(body.title || "").trim(),

    duration:
      Number(body.duration),

    attempts:
      Number(body.attempts) || 1,

    questions:
      body.questions || []

  };



  if(
    !exam.title ||
    !validateQuestions(exam.questions)
  ){

    return sendJSON(response,400,{
      error:"بيانات الاختبار غير صحيحة"
    });

  }



  database.exams.push(exam);


  saveDatabase(database);



  return sendJSON(response,201,exam);

}



// تعديل اختبار أو حذفه

const adminExamMatch =
  pathname.match(
    /^\/api\/admin\/exams\/(\d+)$/
  );



if(
  request.method === "PUT" &&
  adminExamMatch
){

  const body =
    await readRequestBody(request);


  const database =
    readDatabase();



  const exam =
    database.exams.find(
      item =>
      item.id === Number(adminExamMatch[1])
    );


  if(!exam){

    return sendJSON(response,404,{
      error:"الاختبار غير موجود"
    });

  }



  exam.title =
    String(body.title || "").trim();


  exam.duration =
    Number(body.duration);


  exam.attempts =
    Number(body.attempts) || 1;



  exam.questions =
    body.questions || [];



  saveDatabase(database);



  return sendJSON(response,200,exam);

}



if(
  request.method === "DELETE" &&
  adminExamMatch
){

  const database =
    readDatabase();


  database.exams =
    database.exams.filter(
      item =>
      item.id !== Number(adminExamMatch[1])
    );


  saveDatabase(database);



  return sendJSON(response,200,{
    success:true
  });

}



// أي رابط غير موجود

return sendJSON(response,404,{
  error:"الصفحة غير موجودة"
});


} catch(error){

  console.error(error);


  return sendJSON(response,500,{
    error:"حدث خطأ داخل السيرفر"
  });

}


});



server.listen(PORT,"0.0.0.0",()=>{

  console.log("");
  console.log("تم تشغيل الموقع بنجاح");
  console.log("http://localhost:3000");
  console.log("لوحة الإدارة: http://localhost:3000/admin");
  console.log("");

});
