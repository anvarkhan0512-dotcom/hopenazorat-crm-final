# Ma'lumotlarni ko'chirish yo'riqnomasi 
 
 ## Yangi CRM ga ma'lumotlarni o'tkazish: 
 
 1. Boss dashboard → Markaz → "Ma'lumotlarni yuklab olish" 
 2. JSON fayl yuklab olinadi 
 3. Yangi Vercel loyihasini oching (Trae bilan) 
 4. Bu JSON faylni Trae ga bering: 
    "Import this data to new CRM database" 
 5. Trae import script yozadi va ishga tushiradi 
 
 ## Import script (Trae uchun): 
 Yangi loyihada bu promptni ishlating: 
 "I have a JSON export file from Hope Study CRM. 
 Create a seed script that imports this data 
 to the new MongoDB database. 
 The file contains: students, groups, payments, 
 attendance, discounts collections."
