
const SUPABASE_URL = "https://rrxqfdizabgwrtydrppf.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_7amqMXxqc15asyXn8vIigQ_4D6XVg_s"

const supabaseReady =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
  window.supabase

const db = supabaseReady
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

const appViews = {
  landing: document.getElementById("landing-view"),
  auth: document.getElementById("auth-view"),
  dashboard: document.getElementById("dashboard-view")
}

const weekdays = [
  { key: "monday", label: "ორშაბათი" },
  { key: "tuesday", label: "სამშაბათი" },
  { key: "wednesday", label: "ოთხშაბათი" },
  { key: "thursday", label: "ხუთშაბათი" },
  { key: "friday", label: "პარასკევი" }
]

const subjects = [
  "ქართული ლიტერატურა",
  "მათემატიკა",
  "ქართული ენა",
  "ინგლისური",
  "გერმანული",
  "რუსული",
  "ისტორია",
  "საქართველოს ისტორია",
  "ხელოვნება",
  "მუსიკა",
  "ფიზიკა",
  "ქიმია",
  "მოქალაქეობა",
  "გეოგრაფია",
  "ბიოლოგია"
]

const lessonTimes = [
  { start: "09:00", end: "09:45" },
  { start: "09:50", end: "10:35" },
  { start: "10:40", end: "11:25" },
  { start: "11:35", end: "12:20" },
  { start: "12:25", end: "13:10" },
  { start: "13:15", end: "14:00" },
  { start: "14:05", end: "14:50" }
]

let currentUser = null
let currentProfile = null
let savedLessons = []
let toastTimer = null

document.getElementById("year").textContent = new Date().getFullYear()

function showView(name) {
  Object.entries(appViews).forEach(([key, element]) => {
    element.classList.toggle("hidden", key !== name)
  })

  window.scrollTo({ top: 0, behavior: "smooth" })
}

function showAuth(mode = "register") {
  showView("auth")
  setAuthMode(mode)
}

function setAuthMode(mode) {
  const isRegister = mode === "register"

  document.getElementById("register-form").classList.toggle("hidden", !isRegister)
  document.getElementById("login-form").classList.toggle("hidden", isRegister)
  document.getElementById("register-tab").classList.toggle("active", isRegister)
  document.getElementById("login-tab").classList.toggle("active", !isRegister)

  document.getElementById("auth-heading").innerHTML = isRegister
    ? "შექმენი შენი<br><span>Smart Focus</span><br>ანგარიში."
    : "კეთილი იყოს<br><span>შენი დაბრუნება.</span>"

  clearAuthMessage()
}

function showAuthMessage(message, type = "error") {
  const element = document.getElementById("auth-message")
  element.textContent = message
  element.className = `message ${type}`
}

function clearAuthMessage() {
  const element = document.getElementById("auth-message")
  element.textContent = ""
  element.className = "message hidden"
}

function setButtonLoading(button, loading, label) {
  button.disabled = loading
  button.style.opacity = loading ? ".65" : "1"

  const text = button.querySelector(".button-label")

  if (text) {
    text.textContent = loading ? "მიმდინარეობს..." : label
  }
}

function showToast(message) {
  const toast = document.getElementById("toast")
  toast.textContent = message
  toast.classList.add("show")

  clearTimeout(toastTimer)

  toastTimer = setTimeout(() => {
    toast.classList.remove("show")
  }, 3400)
}

function showConfigurationWarning() {
  showAuthMessage("საიტი ჯერ Supabase-ს არ უკავშირდება. შეამოწმე Project URL და Publishable Key.")
}

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries())
}

document.getElementById("start-register").addEventListener("click", () => showAuth("register"))
document.getElementById("start-login").addEventListener("click", () => showAuth("login"))
document.getElementById("header-login").addEventListener("click", () => showAuth("login"))
document.getElementById("back-home").addEventListener("click", () => showView("landing"))
document.getElementById("register-tab").addEventListener("click", () => setAuthMode("register"))
document.getElementById("login-tab").addEventListener("click", () => setAuthMode("login"))

document.getElementById("register-form").addEventListener("submit", async event => {
  event.preventDefault()
  clearAuthMessage()

  if (!db) {
    showConfigurationWarning()
    return
  }

  const form = event.currentTarget
  const data = getFormData(form)
  const button = form.querySelector('button[type="submit"]')

  if (data.email.toLowerCase() === data.parentEmail.toLowerCase()) {
    showAuthMessage("მოსწავლისა და მშობლის ელფოსტები განსხვავებული უნდა იყოს.")
    return
  }

  if (data.password.length < 8) {
    showAuthMessage("პაროლი მინიმუმ 8 სიმბოლოს უნდა შეიცავდეს.")
    return
  }

  setButtonLoading(button, true, "ანგარიშის შექმნა")

  try {
    const { data: result, error } = await db.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          age: Number(data.age),
          parent_first_name: data.parentFirstName.trim(),
          parent_last_name: data.parentLastName.trim(),
          parent_email: data.parentEmail.trim().toLowerCase(),
          parent_consent: true
        }
      }
    })

    if (error) throw error

    if (result.session) {
      currentUser = result.user
      await loadStudentWorkspace()
      showToast("ანგარიში წარმატებით შეიქმნა!")
    } else {
      form.reset()
      setAuthMode("login")
      showAuthMessage("შეამოწმე ელფოსტა და დაადასტურე ანგარიში. ამის შემდეგ შეძლებ შესვლას.", "success")
    }
  } catch (error) {
    showAuthMessage(getFriendlyError(error))
  } finally {
    setButtonLoading(button, false, "ანგარიშის შექმნა")
  }
})

document.getElementById("login-form").addEventListener("submit", async event => {
  event.preventDefault()
  clearAuthMessage()

  if (!db) {
    showConfigurationWarning()
    return
  }

  const form = event.currentTarget
  const data = getFormData(form)
  const button = form.querySelector('button[type="submit"]')

  setButtonLoading(button, true, "შესვლა")

  try {
    const { data: result, error } = await db.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password
    })

    if (error) throw error

    currentUser = result.user
    await loadStudentWorkspace()
  } catch (error) {
    showAuthMessage(getFriendlyError(error))
  } finally {
    setButtonLoading(button, false, "შესვლა")
  }
})

function getFriendlyError(error) {
  const message = error?.message || "უცნობი შეცდომა"

  if (message.toLowerCase().includes("invalid login credentials")) {
    return "ელფოსტა ან პაროლი არასწორია."
  }

  if (message.toLowerCase().includes("already registered")) {
    return "ამ ელფოსტით ანგარიში უკვე არსებობს. სცადე შესვლა."
  }

  if (message.toLowerCase().includes("password should be")) {
    return "პაროლი მინიმუმ 8 სიმბოლოს უნდა შეიცავდეს."
  }

  if (message.toLowerCase().includes("email not confirmed")) {
    return "ჯერ დაადასტურე ელფოსტა და შემდეგ სცადე შესვლა."
  }

  return message
}

async function loadStudentWorkspace() {
  if (!db || !currentUser) return

  const { data: profile, error: profileError } = await db
    .from("student_profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle()

  if (profileError) {
    showToast("პროფილის ჩატვირთვა ვერ მოხერხდა: " + profileError.message)
    return
  }

  currentProfile = profile

  if (!currentProfile) {
    showToast("პროფილი ვერ მოიძებნა. დაუკავშირდი ადმინისტრატორს.")
    return
  }

  const { data: lessons, error: lessonsError } = await db
    .from("school_lessons")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("weekday")
    .order("lesson_number")

  if (lessonsError) {
    showToast("ცხრილის ჩატვირთვა ვერ მოხერხდა: " + lessonsError.message)
    return
  }

  savedLessons = lessons || []
  renderDashboard()
  showView("dashboard")
}

function renderDashboard() {
  const firstName = currentProfile?.first_name || "მოსწავლე"
  const lastName = currentProfile?.last_name || ""

  document.getElementById("student-name").textContent = firstName
  document.getElementById("sidebar-name").textContent = `${firstName} ${lastName}`.trim()
  document.getElementById("user-avatar").textContent = firstName.charAt(0).toUpperCase()

  document.getElementById("today-label").textContent = new Intl.DateTimeFormat("ka-GE", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date())

  const activeDays = new Set(savedLessons.map(lesson => lesson.weekday)).size

  document.getElementById("days-count").innerHTML = `${activeDays}<span>/5</span>`
  document.getElementById("lessons-count").textContent = savedLessons.length

  renderTimetableSummary()
}

function formatTime(value) {
  return String(value || "").slice(0, 5)
}

function addMinutes(time, minutes) {
  const [hours, mins] = time.split(":").map(Number)
  const total = hours * 60 + mins + minutes

  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

function renderTimetableSummary() {
  const container = document.getElementById("timetable-summary")

  if (!savedLessons.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>▦</span>
        <strong>ცხრილი ჯერ არ დაგიმატებია</strong>
        <small>აირჩიე საგნები თითოეული დღისთვის და Smart Focus ავტომატურად შექმნის შენს განრიგს.</small>
      </div>
    `
    return
  }

  container.innerHTML = weekdays.map(day => {
    const dayLessons = savedLessons
      .filter(lesson => lesson.weekday === day.key)
      .sort((a, b) => a.lesson_number - b.lesson_number)

    if (!dayLessons.length) return ""

    const lastLesson = dayLessons[dayLessons.length - 1]
    const reminder = addMinutes(formatTime(lastLesson.end_time), 15)

    return `
      <div class="day-summary">
        <div class="day-name">${day.label}</div>
        <div class="day-summary-content">
          ${dayLessons.map(lesson => `
            <div class="timetable-lesson">
              <span class="timetable-lesson-number">${lesson.lesson_number}</span>
              <div class="timetable-lesson-info">
                <strong>${lesson.subject || "საგანი"}</strong>
                <small>${formatTime(lesson.start_time)} – ${formatTime(lesson.end_time)}</small>
              </div>
            </div>
          `).join("")}
          <span class="reminder-chip">შეხსენება · ${reminder}</span>
        </div>
      </div>
    `
  }).join("")
}

function createLessonRow(subject = "") {
  const row = document.createElement("div")
  row.className = "lesson-row"

  const select = document.createElement("select")
  select.className = "lesson-subject"
  select.setAttribute("aria-label", "აირჩიე საგანი")
  select.required = true

  const placeholder = document.createElement("option")
  placeholder.value = ""
  placeholder.textContent = "აირჩიე საგანი"
  select.appendChild(placeholder)

  subjects.forEach(item => {
    const option = document.createElement("option")
    option.value = item
    option.textContent = item

    if (item === subject) {
      option.selected = true
    }

    select.appendChild(option)
  })

  const removeButton = document.createElement("button")
  removeButton.type = "button"
  removeButton.className = "remove-lesson"
  removeButton.textContent = "×"
  removeButton.setAttribute("aria-label", "გაკვეთილის წაშლა")

  const timeLabel = document.createElement("span")
  timeLabel.className = "lesson-row-time"

  row.append(select, timeLabel, removeButton)

  removeButton.addEventListener("click", () => {
    row.remove()
    updateLessonRowNumbers(row.closest(".schedule-day"))
  })

  return row
}

function updateLessonRowNumbers(section) {
  if (!section) return

  const rows = section.querySelectorAll(".lesson-row")

  rows.forEach((row, index) => {
    const time = lessonTimes[index]
    row.querySelector(".lesson-row-time").textContent =
      `${index + 1}. ${time.start} – ${time.end}`
  })

  const addButton = section.querySelector(".add-lesson")
  addButton.disabled = rows.length >= 7
  addButton.textContent = rows.length >= 7
    ? "მაქსიმუმ 7 გაკვეთილი"
    : "+ გაკვეთილის დამატება"
}

function openTimetableModal() {
  const wrapper = document.getElementById("schedule-days")
  wrapper.innerHTML = ""

  weekdays.forEach(day => {
    const section = document.createElement("section")
    section.className = "schedule-day"
    section.dataset.weekday = day.key

    const existing = savedLessons
      .filter(lesson => lesson.weekday === day.key)
      .sort((a, b) => a.lesson_number - b.lesson_number)

    section.innerHTML = `
      <div class="schedule-day-header">
        <strong>${day.label}</strong>
        <button class="add-lesson" type="button">+ გაკვეთილის დამატება</button>
      </div>
      <div class="lesson-rows"></div>
      <div class="day-hint">აირჩიე საგნები თანმიმდევრობით. დროები ავტომატურად განისაზღვრება.</div>
    `

    const rows = section.querySelector(".lesson-rows")

    existing.forEach(lesson => {
      rows.appendChild(createLessonRow(lesson.subject || ""))
    })

    section.querySelector(".add-lesson").addEventListener("click", () => {
      if (rows.children.length >= 7) return

      rows.appendChild(createLessonRow())
      updateLessonRowNumbers(section)
    })

    updateLessonRowNumbers(section)
    wrapper.appendChild(section)
  })

  document.getElementById("schedule-feedback").textContent = ""
  document.getElementById("timetable-modal").classList.remove("hidden")
}

function closeTimetableModal() {
  document.getElementById("timetable-modal").classList.add("hidden")
}

document.getElementById("edit-timetable").addEventListener("click", openTimetableModal)
document.getElementById("add-timetable").addEventListener("click", openTimetableModal)
document.getElementById("side-timetable").addEventListener("click", openTimetableModal)
document.getElementById("close-modal").addEventListener("click", closeTimetableModal)
document.getElementById("modal-backdrop").addEventListener("click", closeTimetableModal)

function collectTimetable() {
  const lessons = []
  const errors = []

  document.querySelectorAll(".schedule-day").forEach(section => {
    const weekday = section.dataset.weekday
    const rows = [...section.querySelectorAll(".lesson-row")]
    const selectedSubjects = []

    rows.forEach((row, index) => {
      const subject = row.querySelector(".lesson-subject").value
      const dayName = weekdays.find(day => day.key === weekday).label

      if (!subject) {
        errors.push(`${dayName}: აირჩიე ${index + 1} გაკვეთილის საგანი.`)
        return
      }

      if (selectedSubjects.includes(subject)) {
        errors.push(`${dayName}: ერთი და იგივე საგანი ორჯერ არ აირჩიო.`)
        return
      }

      selectedSubjects.push(subject)

      const time = lessonTimes[index]

      lessons.push({
        weekday,
        lesson_number: index + 1,
        subject,
        start_time: time.start,
        end_time: time.end
      })
    })
  })

  return { lessons, errors }
}

document.getElementById("save-timetable").addEventListener("click", async () => {
  if (!db || !currentUser) return

  const { lessons, errors } = collectTimetable()
  const feedback = document.getElementById("schedule-feedback")

  if (errors.length) {
    feedback.textContent = errors[0]
    feedback.style.color = "var(--danger)"
    return
  }

  if (!lessons.length) {
    feedback.textContent = "აირჩიე მინიმუმ ერთი გაკვეთილი."
    feedback.style.color = "var(--danger)"
    return
  }

  const button = document.getElementById("save-timetable")
  button.disabled = true
  button.style.opacity = ".6"

  try {
    const { error: deleteError } = await db
      .from("school_lessons")
      .delete()
      .eq("user_id", currentUser.id)

    if (deleteError) throw deleteError

    const rows = lessons.map(lesson => ({
      user_id: currentUser.id,
      weekday: lesson.weekday,
      lesson_number: lesson.lesson_number,
      subject: lesson.subject,
      start_time: lesson.start_time,
      end_time: lesson.end_time
    }))

    const { error: insertError } = await db
      .from("school_lessons")
      .insert(rows)

    if (insertError) throw insertError

    savedLessons = rows
    renderDashboard()
    closeTimetableModal()
    showToast("სკოლის ცხრილი წარმატებით შეინახა!")
  } catch (error) {
    feedback.textContent = "შენახვა ვერ მოხერხდა: " + error.message
    feedback.style.color = "var(--danger)"
  } finally {
    button.disabled = false
    button.style.opacity = "1"
  }
})

document.getElementById("logout-button").addEventListener("click", async () => {
  if (!db) return

  const { error } = await db.auth.signOut()

  if (error) {
    showToast("გასვლა ვერ მოხერხდა: " + error.message)
    return
  }

  currentUser = null
  currentProfile = null
  savedLessons = []

  showView("landing")
  showToast("ანგარიშიდან გამოხვედი.")
})

async function initializeApp() {
  if (!db) return

  const { data, error } = await db.auth.getSession()

  if (error) {
    console.error(error)
    return
  }

  if (data.session) {
    currentUser = data.session.user
    await loadStudentWorkspace()
  }

  db.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      currentUser = null
      currentProfile = null
      savedLessons = []
      showView("landing")
    }
  })
}

initializeApp()
