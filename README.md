# EduCRM v1.0.0 - Education Center Management System

## 🌟 Features

### Core Features
- **Dashboard**: Real-time statistics, income charts, debtor tracking
- **Students Management**: Add, edit, delete, search, filter students
- **Groups Management**: Create groups, assign students, track schedule
- **Payments**: Track payments, monthly billing, payment history
- **Debtors**: Automatic debtor detection, debt tracking
- **Reports**: Daily and monthly reports, export capabilities

### Performance Features
- **In-Memory Caching**: Fast response for 100+ concurrent users
- **Database Indexes**: Optimized MongoDB queries
- **Connection Pooling**: Efficient database connections

### Integration Features
- **Telegram Bot**: Real-time notifications (setup required)
- **Local Backup**: Offline data storage with localStorage
- **API Ready**: Easy to extend for mobile apps

### Multi-Language Support
- 🇺🇿 Uzbek (default)
- 🇷🇺 Russian
- 🇬🇧 English

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup MongoDB
Ensure MongoDB is reachable and update `.env.local`:
```
MONGODB_URI=mongodb://<your-host>:27017/edu-crm
```

### 3. Seed Database
```bash
npx ts-node seed.ts
```
This creates admin user: **admin / admin123**

### 4. Start Server
```bash
npm run dev
```

### 5. Open in Browser
```
http://<your-host>:3000
```

---

## 📱 Usage

### Login
- Username: `admin`
- Password: `admin123`

### Main Features

#### Dashboard
- View total students, active groups
- See payments this month
- Monitor debtors
- Income charts (weekly/monthly)

#### Students
- Click "+ Add" to add new student
- Fill: Name, Phone, Group, Monthly Price, Status
- Search by name or phone
- Filter by status (active/inactive) or group

#### Groups
- Create new group with name, teacher, schedule, price
- View assigned students
- Track group capacity

#### Payments
- Add payment for student
- Select month and year
- View payment history
- Filter by student/month

#### Debtors
- Automatic list of unpaid students
- Shows total debt amount
- Track payment status

#### Reports
- Daily/Monthly reports
- Export data
- Print reports

---

## 🔧 Configuration

### Telegram Bot Setup (Optional)

1. Create bot via @BotFather on Telegram
2. Get bot token
3. Add to `.env.local`:
```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```
4. Restart server

Telegram notifications:
- New students added
- Payments received
- New debtors
- Daily reports

---

## 📁 Project Structure

```
/app                 - Next.js pages
  /api              - API routes
  /dashboard        - Dashboard page
  /students        - Students CRUD
  /groups          - Groups CRUD
  /payments        - Payments CRUD
  /debtors         - Debtors list
  /reports        - Reports page
  /login          - Login page

/components         - Reusable UI components
/lib               - Utilities
  /cache          - In-memory cache
  /telegram       - Telegram bot utilities
  /translations   - Multi-language strings

/models            - MongoDB models
  - User
  - Student
  - Group
  - Payment
```

---

## 🔐 Security

- Passwords hashed with bcrypt
- JWT authentication
- HTTP-only cookies
- Input validation

---

## 📊 Performance

- Connection pooling (10-50 connections)
- API response caching (30-60s)
- Database indexes for fast queries
- Optimized for 100+ concurrent users

---

## 🛠️ Troubleshooting

### MongoDB Connection Error
```
Check MongoDB is running: mongod
Or update MONGODB_URI in .env.local
```

### Port Already in Use
```
PORT=3001 npm run dev
```

### Build Error
```
npm install
npm run build
```

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|-------|----------|------------|
| GET | /api/dashboard | Dashboard stats |
| GET | /api/students | List students |
| POST | /api/students | Add student |
| PUT | /api/students/:id | Update student |
| DELETE | /api/students/:id | Delete student |
| GET | /api/groups | List groups |
| POST | /api/groups | Add group |
| PUT | /api/groups/:id | Update group |
| DELETE | /api/groups/:id | Delete group |
| GET | /api/payments | List payments |
| POST | /api/payments | Add payment |
| DELETE | /api/payments/:id | Delete payment |
| POST | /api/telegram/send | Send Telegram message |

---

## 📄 License

MIT License - © 2026 EduCRM

---

## 🔗 Related

- Next.js 14 Documentation
- MongoDB Documentation
- Mongoose ODM