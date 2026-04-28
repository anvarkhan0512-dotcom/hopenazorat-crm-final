export type Language = 'uz' | 'ru' | 'en';

export interface Translations {
  [key: string]: {
    uz: string;
    ru: string;
    en: string;
  };
}

export const translations: Translations = {
  dashboard: {
    uz: 'Boshqaruv paneli',
    ru: 'Панель управления',
    en: 'Dashboard',
  },
  students: {
    uz: 'Talabalar',
    ru: 'Студенты',
    en: 'Students',
  },
  groups: {
    uz: 'Guruhlar',
    ru: 'Группы',
    en: 'Groups',
  },
  payments: {
    uz: "To'lovlar",
    ru: 'Платежи',
    en: 'Payments',
  },
  debtors: {
    uz: 'Qarzdorlar',
    ru: 'Должники',
    en: 'Debtors',
  },
  invoices: {
    uz: 'Hisob-fakturalar',
    ru: 'Счета-фактуры',
    en: 'Invoices',
  },
  bills: {
    uz: 'Qarzdorlar (eski)',
    ru: 'Счета (старая)',
    en: 'Debtors (old)',
  },
  reports: {
    uz: 'Hisobotlar',
    ru: 'Отчеты',
    en: 'Reports',
  },
  login: {
    uz: 'Kirish',
    ru: 'Войти',
    en: 'Login',
  },
  logout: {
    uz: 'Chiqish',
    ru: 'Выйти',
    en: 'Logout',
  },
  add: {
    uz: "Qo'shish",
    ru: 'Добавить',
    en: 'Add',
  },
  edit: {
    uz: 'Tahrirlash',
    ru: 'Редактировать',
    en: 'Edit',
  },
  delete: {
    uz: "O'chirish",
    ru: 'Удалить',
    en: 'Delete',
  },
  save: {
    uz: 'Saqlash',
    ru: 'Сохранить',
    en: 'Save',
  },
  cancel: {
    uz: 'Bekor qilish',
    ru: 'Отмена',
    en: 'Cancel',
  },
  search: {
    uz: 'Qidirish',
    ru: 'Поиск',
    en: 'Search',
  },
  filter: {
    uz: 'Filtr',
    ru: 'Фильтр',
    en: 'Filter',
  },
  name: {
    uz: 'Ism',
    ru: 'Имя',
    en: 'Name',
  },
  phone: {
    uz: 'Telefon',
    ru: 'Телефон',
    en: 'Phone',
  },
  group: {
    uz: 'Guruh',
    ru: 'Группа',
    en: 'Group',
  },
  status: {
    uz: 'Holat',
    ru: 'Статус',
    en: 'Status',
  },
  active: {
    uz: 'Faol',
    ru: 'Активный',
    en: 'Active',
  },
  inactive: {
    uz: 'Nofaol',
    ru: 'Неактивный',
    en: 'Inactive',
  },
  totalStudents: {
    uz: 'Jami talabalar',
    ru: 'Всего студентов',
    en: 'Total Students',
  },
  activeGroups: {
    uz: 'Faol guruhlar',
    ru: 'Активные группы',
    en: 'Active Groups',
  },
  paymentsThisMonth: {
    uz: "Bu oy to'lovlar",
    ru: 'Платежи за этот месяц',
    en: 'Payments This Month',
  },
  debtorsCount: {
    uz: 'Qarzdorlar soni',
    ru: 'Количество должников',
    en: 'Debtors Count',
  },
  studentName: {
    uz: "Talaba ismi",
    ru: 'Имя студента',
    en: 'Student Name',
  },
  phoneNumber: {
    uz: 'Telefon raqami',
    ru: 'Номер телефона',
    en: 'Phone Number',
  },
  selectGroup: {
    uz: 'Guruhni tanlang',
    ru: 'Выберите группу',
    en: 'Select Group',
  },
  selectStatus: {
    uz: 'Holatni tanlang',
    ru: 'Выберите статус',
    en: 'Select Status',
  },
  groupName: {
    uz: 'Guruh nomi',
    ru: 'Название группы',
    en: 'Group Name',
  },
  teacherName: {
    uz: "O'qituvchi ismi",
    ru: 'Имя преподавателя',
    en: 'Teacher Name',
  },
  schedule: {
    uz: 'Jadval',
    ru: 'Расписание',
    en: 'Schedule',
  },
  price: {
    uz: 'Narx',
    ru: 'Цена',
    en: 'Price',
  },
  amount: {
    uz: 'Summa',
    ru: 'Сумма',
    en: 'Amount',
  },
  date: {
    uz: 'Sana',
    ru: 'Дата',
    en: 'Date',
  },
  monthlyPrice: {
    uz: 'Oylik narx',
    ru: 'Ежемесячная цена',
    en: 'Monthly Price',
  },
  paymentDate: {
    uz: "To'lov sanasi",
    ru: 'Дата платежа',
    en: 'Payment Date',
  },
  addPayment: {
    uz: "To'lov qo'shish",
    ru: 'Добавить платеж',
    en: 'Add Payment',
  },
  paymentHistory: {
    uz: "To'lovlar tarixi",
    ru: 'История платежей',
    en: 'Payment History',
  },
  noDebt: {
    uz: "Qarzi yo'q",
    ru: 'Нет долга',
    en: 'No Debt',
  },
  hasDebt: {
    uz: 'Qarzdor',
    ru: 'Должник',
    en: 'Has Debt',
  },
  dailyReport: {
    uz: 'Kunlik hisobot',
    ru: 'Ежедневный отчет',
    en: 'Daily Report',
  },
  monthlyReport: {
    uz: 'Oylik hisobot',
    ru: 'Ежемесячный отчет',
    en: 'Monthly Report',
  },
  totalIncome: {
    uz: 'Jami daromad',
    ru: 'Общий доход',
    en: 'Total Income',
  },
  totalDebt: {
    uz: 'Jami qarz',
    ru: 'Общий долг',
    en: 'Total Debt',
  },
  selectDate: {
    uz: 'Sanalni tanlang',
    ru: 'Выберите дату',
    en: 'Select Date',
  },
  allGroups: {
    uz: 'Barcha guruhlar',
    ru: 'Все группы',
    en: 'All Groups',
  },
  total: {
    uz: 'Jami',
    ru: 'Всего',
    en: 'Total',
  },
  paid: {
    uz: "To'langan",
    ru: 'Оплачено',
    en: 'Paid',
  },
  unpaid: {
    uz: "To'lanmagan",
    ru: 'Не оплачено',
    en: 'Unpaid',
  },
  username: {
    uz: 'Foydalanuvchi nomi',
    ru: 'Имя пользователя',
    en: 'Username',
  },
  password: {
    uz: 'Parol',
    ru: 'Пароль',
    en: 'Password',
  },
  loginTitle: {
    uz: 'Tizimga kirish',
    ru: 'Вход в систему',
    en: 'Login to System',
  },
  admin: {
    uz: 'Admin',
    ru: 'Админ',
    en: 'Admin',
  },
  manager: {
    uz: 'Manager',
    ru: 'Менеджер',
    en: 'Manager',
  },
  welcome: {
    uz: 'Xush kelibsiz',
    ru: 'Добро пожаловать',
    en: 'Welcome',
  },
  noData: {
    uz: 'Ma\'lumot yo\'q',
    ru: 'Нет данных',
    en: 'No data',
  },
  success: {
    uz: 'Muvaffaqiyatli',
    ru: 'Успешно',
    en: 'Success',
  },
  error: {
    uz: 'Xatolik',
    ru: 'Ошибка',
    en: 'Error',
  },
  loginError: {
    uz: 'Login yoki parol xato',
    ru: 'Неверный логин или пароль',
    en: 'Invalid username or password',
  },
  parentRegisterFooter: {
    uz: 'Ota-ona sifatida ro‘yxatdan o‘tish',
    ru: 'Регистрация для родителей',
    en: 'Parent registration',
  },
  confirmDelete: {
    uz: "O'chirishni tasdiqlaysizmi?",
    ru: 'Вы уверены, что хотите удалить?',
    en: 'Are you sure you want to delete?',
  },
  studentAdded: {
    uz: 'Talaba muvaffaqiyatli qo\'shildi',
    ru: 'Студент успешно добавлен',
    en: 'Student added successfully',
  },
  studentUpdated: {
    uz: 'Talaba muvaffaqiyatli yangilandi',
    ru: 'Студент успешно обновлен',
    en: 'Student updated successfully',
  },
  studentDeleted: {
    uz: 'Talaba muvaffaqiyatli o\'chirildi',
    ru: 'Студент успешно удален',
    en: 'Student deleted successfully',
  },
  groupAdded: {
    uz: 'Guruh muvaffaqiyatli qo\'shildi',
    ru: 'Группа успешно добавлена',
    en: 'Group added successfully',
  },
  groupUpdated: {
    uz: 'Guruh muvaffaqiyatli yangilandi',
    ru: 'Группа успешно обновлена',
    en: 'Group updated successfully',
  },
  groupDeleted: {
    uz: 'Guruh muvaffaqiyatli o\'chirildi',
    ru: 'Группа успешно удалена',
    en: 'Group deleted successfully',
  },
  paymentAdded: {
    uz: "To'lov muvaffaqiyatli qo'mshildi",
    ru: 'Платеж успешно добавлен',
    en: 'Payment added successfully',
  },
  paymentDeleted: {
    uz: "To'lov muvaffaqiyatli o'chirildi",
    ru: 'Платеж успешно удален',
    en: 'Payment deleted successfully',
  },
  language: {
    uz: 'Til',
    ru: 'Язык',
    en: 'Language',
  },
  uzbek: {
    uz: 'O\'zbekcha',
    ru: 'Узбекский',
    en: 'Uzbek',
  },
  russian: {
    uz: 'Ruscha',
    ru: 'Русский',
    en: 'Russian',
  },
  english: {
    uz: 'Inglizcha',
    ru: 'Английский',
    en: 'English',
  },
  actions: {
    uz: 'Amallar',
    ru: 'Действия',
    en: 'Actions',
  },
  assignStudents: {
    uz: 'Talabalarni biriktirish',
    ru: 'Назначить студентов',
    en: 'Assign Students',
  },
  viewStudents: {
    uz: 'Talabalarni ko\'rish',
    ru: 'Посмотреть студентов',
    en: 'View Students',
  },
  createdAt: {
    uz: 'Yaratilgan vaqt',
    ru: 'Время создания',
    en: 'Created At',
  },
  lastPayment: {
    uz: "Oxirgi to'lov",
    ru: 'Последний платеж',
    en: 'Last Payment',
  },
  balance: {
    uz: 'Balans',
    ru: 'Баланс',
    en: 'Balance',
  },
  viewDetails: {
    uz: 'Batafsil',
    ru: 'Подробнее',
    en: 'View Details',
  },
  today: {
    uz: 'Bugun',
    ru: 'Сегодня',
    en: 'Today',
  },
  thisWeek: {
    uz: 'Shu hafta',
    ru: 'На этой неделе',
    en: 'This Week',
  },
  thisMonth: {
    uz: 'Shu oy',
    ru: 'В этом месяце',
    en: 'This Month',
  },
  selectStudent: {
    uz: 'Talabani tanlang',
    ru: 'Выберите студента',
    en: 'Select Student',
  },
  studentsCount: {
    uz: 'Talabalar soni',
    ru: 'Количество студентов',
    en: 'Students Count',
  },
  analytics: {
    uz: 'Analitika',
    ru: 'Аналитика',
    en: 'Analytics',
  },
  income: {
    uz: 'Daromad',
    ru: 'Доход',
    en: 'Income',
  },
  newStudents: {
    uz: 'Yangi talabalar',
    ru: 'Новые студенты',
    en: 'New Students',
  },
  export: {
    uz: 'Eksport',
    ru: 'Экспорт',
    en: 'Export',
  },
  generateInvoices: {
    uz: 'Hisob-fakturalar yaratish',
    ru: 'Создание счетов-фактур',
    en: 'Generate Invoices',
  },
  discounts: {
    uz: 'Chegirmalar',
    ru: 'Скидки',
    en: 'Discounts',
  },
  addDiscount: {
    uz: "Chegirma qo'shish",
    ru: 'Добавить скидку',
    en: 'Add Discount',
  },
  discountAmount: {
    uz: 'Chegirma miqdori',
    ru: 'Сумма скидки',
    en: 'Discount Amount',
  },
  discountReason: {
    uz: 'Chegirma sababi',
    ru: 'Причина скидки',
    en: 'Discount Reason',
  },
  familyDiscount: {
    uz: 'Oilaviy chegirma',
    ru: 'Семейная скидка',
    en: 'Family Discount',
  },
  activeDiscounts: {
    uz: 'Faol chegirmalar',
    ru: 'Активные скидки',
    en: 'Active Discounts',
  },
totalSavings: {
    uz: 'Jami tejash',
    ru: 'Общая экономия',
    en: 'Total Savings',
  },
  attendance: {
    uz: 'Davomat',
    ru: 'Посещаемость',
    en: 'Attendance',
  },
  present: {
    uz: 'Keldi',
    ru: 'Присутствовал',
    en: 'Present',
  },
  absent: {
    uz: 'Keldi emas',
    ru: 'Отсутствовал',
    en: 'Absent',
  },
  late: {
    uz: 'Kechikdi',
    ru: 'Опоздал',
    en: 'Late',
  },
  excused: {
    uz: 'Sababli',
    ru: 'Уважительная',
    en: 'Excused',
  },
  makeup: {
    uz: 'Qoplamadi',
    ru: 'Отработка',
    en: 'Make-up',
  },
  attendanceRate: {
    uz: 'Davomat %',
    ru: 'Посещаемость %',
    en: 'Attendance %',
  },
  markAttendance: {
    uz: 'Davomat belgilash',
    ru: 'Отметить посещаемость',
    en: 'Mark Attendance',
  },
  reminders: {
    uz: 'Eslatmalar',
    ru: 'Напоминания',
    en: 'Reminders',
  },
  paymentCycle: {
    uz: "To'lov sikli",
    ru: 'Период оплаты',
    en: 'Payment Cycle',
  },
  nextPayment: {
    uz: 'Keyingi to\'lov',
    ru: 'Следующий платеж',
    en: 'Next Payment',
  },
  overdue: {
    uz: 'Qarzdor',
    ru: 'Должник',
    en: 'Overdue',
  },
  upcoming: {
    uz: 'Kutilmoqda',
    ru: 'Предстоящие',
    en: 'Upcoming',
  },
  print: {
    uz: 'Chop etish',
    ru: 'Печать',
    en: 'Print',
  },
  teacherHome: {
    uz: 'Ustoz kabineti',
    ru: 'Кабинет преподавателя',
    en: 'Teacher home',
  },
  homeworkMenu: {
    uz: 'Uy vazifalari',
    ru: 'Домашние задания',
    en: 'Homework',
  },
  parentHome: {
    uz: 'Farzandlar',
    ru: 'Мои дети',
    en: 'My children',
  },
  studentHome: {
    uz: 'Talaba kabineti',
    ru: 'Кабинет ученика',
    en: 'Student home',
  },
  homeworkParent: {
    uz: 'Vazifalar',
    ru: 'Задания',
    en: 'Homework',
  },
  financeAdmin: {
    uz: 'Moliya (ustozlar)',
    ru: 'Финансы (преподаватели)',
    en: 'Finance (teachers)',
  },
};

export function t(key: string, lang: Language = 'uz'): string {
  return translations[key]?.[lang] || key;
}